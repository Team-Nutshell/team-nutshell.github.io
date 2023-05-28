var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const vertexShader = `
struct VertexShaderOutput {
	@builtin(position) pos: vec4f,
	@location(0) uv: vec2f
}

@vertex
fn main(@builtin(vertex_index) vertexIndex: u32) -> VertexShaderOutput {
	var output: VertexShaderOutput;
	output.uv = vec2f(f32((vertexIndex << 1u) & 2u), f32(vertexIndex & 2u));
	output.pos = vec4f(output.uv * 2.0 - 1.0, 0.0, 1.0);

	return output;
}
`;
const preDefinedFragmentShader = `
@group(0) @binding(0) var<uniform> time: f32;
@group(0) @binding(1) var<uniform> cameraPosition: vec3f;
@group(0) @binding(2) var<uniform> cameraDirection: vec3f;
@group(0) @binding(3) var<uniform> resolution: vec2u;
`;
const fragmentShader = `const M_PI: f32 = 3.1415926535897932384626433832795;

const MAX_STEPS: u32 = 256u;
const MAX_DISTANCE: f32 = 1000.0;
const EPSILON: f32 = 0.0001;
const MAX_BOUNCES: u32 = 1u;

struct Material {
	diffuse: vec3f,
	metallicRoughness: vec2f
}

struct Object {
	dist: f32,
	mat: Material
}

struct Light {
	lightType: u32, // 0 = Directional, 1 = Point, 2 = Spot
	position: vec3f,
	direction: vec3f,
	color: vec3f,
	cutoffs: vec2f
}

// GLSL-type mod()
fn glslmod(a: f32, b: f32) -> f32 {
	var m: f32 = a % b;
	if (m < 0.0) {
		if (b < 0.0) {
			m -= b;
		} else {
			m += b;
		}
	}

	return m;
}

// Random
fn rand1D(seed: f32) -> f32 {
	return fract(sin(seed));
}

fn rand2D(seed: vec2f) -> f32 {
	return fract(sin(dot(seed, vec2f(12.9898, 78.233))) * 43758.5453123);
}

fn noise1D(seed: f32) -> f32 {
	let i: f32 = floor(seed);
	let f: f32 = fract(seed);

	return mix(rand1D(i), rand1D(i + 1.0), smoothstep(0.0, 1.0, f));
}

fn noise2D(seed: vec2f) -> f32 {
	let i: vec2f = floor(seed);
	let f: vec2f = fract(seed);

	let a: f32 = rand2D(i);
	let b: f32 = rand2D(i + vec2f(1.0, 0.0));
	let c: f32 = rand2D(i + vec2f(0.0, 1.0));
	let d: f32 = rand2D(i + vec2f(1.0, 1.0));

	let u: vec2f = smoothstep(vec2f(0.0), vec2f(1.0), f);

	return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

fn noise2DFreq(seed: vec2f, freq: f32) -> f32 {
	let unit: f32 = f32(resolution.x) / freq;
	let ij: vec2f = floor(seed / unit);
	var xy: vec2f = vec2f(glslmod(seed.x, unit), glslmod(seed.y, unit)) / unit;
	xy = 0.5 * (1.0 - cos(M_PI * xy));

	let a: f32 = rand2D(ij);
	let b: f32 = rand2D(ij + vec2f(1.0, 0.0));
	let c: f32 = rand2D(ij + vec2f(0.0, 1.0));
	let d: f32 = rand2D(ij + vec2f(1.0, 1.0));

	let x1: f32 = mix(a, b, xy.x);
	let x2: f32 = mix(c, d, xy.x);

	return mix(x1, x2, xy.y);
}

fn fbm(p: vec2f) -> f32 {
	let ca = cos(M_PI / 4.0);
	let sa = sin(M_PI / 4.0);
	var ptmp: vec2f = p;
	var res: f32 = 0.0;
	var amp: f32 = 0.5;
	let freq: f32 = 1.95;
	for(var i: u32 = 0u; i < 2u; i++) {
		res += amp * noise2D(ptmp);
		amp *= 0.5;
		ptmp = ptmp * freq * mat2x2f(ca, -sa, sa, ca) - res * 0.4;
	}

	return res;
}

// Shapes
// Sphere
// r = radius
fn shSphere(p: vec3f, r: f32) -> f32 {
	return length(p) - r;
}

// Quad
// a = first vertex
// b = second vertex
// c = third vertex
// d = fourth vertex
fn shQuad(p: vec3f, a: vec3f, b: vec3f, c: vec3f, d: vec3f) -> f32 {
	let ba: vec3f = b - a;
	let pa: vec3f = p - a;
	let cb: vec3f = c - b;
	let pb: vec3f = p - b;
	let dc: vec3f = d - c;
	let pc: vec3f = p - c;
	let ad: vec3f = a - d;
	let pd: vec3f = p - d;
	let n: vec3f = cross(ba, ad);
	let pba: vec3f = ba * clamp(dot(ba, pa) / dot(ba, ba), 0.0, 1.0) - pa;
	let pcb: vec3f = cb * clamp(dot(cb, pb) / dot(cb, cb), 0.0, 1.0) - pb;
	let pdc: vec3f = dc * clamp(dot(dc, pc) / dot(dc, dc), 0.0, 1.0) - pc;
	let pad: vec3f = ad * clamp(dot(ad, pd) / dot(ad, ad), 0.0, 1.0) - pd;

	if ((sign(dot(cross(ba, n), pa)) +
	sign(dot(cross(cb, n), pb)) +
	sign(dot(cross(dc, n), pc)) +
	sign(dot(cross(ad, n), pd))) < 3.0) {
		return sqrt(min(min(min(dot(pba, pba), dot(pcb, pcb)), dot(pdc, pdc)), dot(pad, pad)));
	}
	else {
		let ndotpa: f32 = dot(n, pa);
		return sqrt(ndotpa * ndotpa / dot(n, n));
	}
}

// Infinite plane
// n = normal, must be normalized
// dist = distance from the origin
fn shPlane(p: vec3f, n: vec3f, dist: f32) -> f32 {
	return dot(p, n) + dist;
}

// Box
// b = length, height and width of the box
fn shBox(p: vec3f, b: vec3f) -> f32 {
	let d: vec3f = abs(p) - b;

	return length(max(d, vec3f(0.0))) + min(max(max(d.x, d.y), d.z), 0.0);
}

// Infinite box
// b = depends on p, can represent length, height and width
fn shBox2(p: vec2f, b: vec2f) -> f32 {
	let d: vec2f = abs(p) - b;

	return length(max(d, vec2f(0.0))) + min(max(d.x, d.y), 0.0);
}

// Triangle
// a = first vertex
// b = second vertex
// c = third vertex
fn shTriangle(p: vec3f, a: vec3f, b: vec3f, c: vec3f) -> f32 {
	let ba: vec3f = b - a;
	let pa: vec3f = p - a;
	let cb: vec3f = c - b;
	let pb: vec3f = p - b;
	let ac: vec3f = a - c;
	let pc: vec3f = p - c;
	let n: vec3f = cross(ba, ac);
	let pba: vec3f = ba * clamp(dot(ba, pa) / dot(ba, ba), 0.0, 1.0) - pa;
	let pcb: vec3f = cb * clamp(dot(cb, pb) / dot(cb, cb), 0.0, 1.0) - pb;
	let pac: vec3f = ac * clamp(dot(ac, pc) / dot(ac, ac), 0.0, 1.0) - pc;

	if ((sign(dot(cross(ba, n), pa)) +
	sign(dot(cross(cb, n), pb)) +
	sign(dot(cross(ac, n), pc))) < 2.0) {
		return sqrt(min(min(dot(pba, pba), dot(pcb, pcb)), dot(pac, pac)));
	}
	else {
		let ndotpa: f32 = dot(n, pa);
		return sqrt(ndotpa * ndotpa / dot(n, n));
	}
}

// Triangular prism
fn shTriangularPrism(p: vec3f, h: vec2f) -> f32 {
	let q: vec3f = abs(p);

	return max(q.z - h.y, max(q.x * 0.866025 + p.y * 0.5, -p.y) - h.x * 0.5);
}

// Cone
// sc = (sin of the angle, cos of the angle)
// h = height
fn shCone(p: vec3f, sc: vec2f, h: f32) -> f32 {
	let q: vec2f = h * vec2f(sc.x / sc.y, -1.0);
	let w: vec2f = vec2f(length(p.xz), p.y);
	let a: vec2f = w - q * clamp(dot(w, q) / dot(q, q), 0.0, 1.0);
	let b: vec2f = w - q * vec2f(clamp(w.x / q.x, 0.0, 1.0));
	let k: f32 = sign(q.y);
	let d: f32 = min(dot(a, a), dot(b, b));
	let s: f32 = max(k * (w.x * q.y - w.y * q.x), k * (w.y * q.y));

	return sign(s) * sqrt(d);
}

// Cylinder
// r = radius
// h = height
fn shCylinder(p: vec3f, r: f32, h: f32) -> f32 {
	let d: f32 = length(p.xz) - r;
	
	return max(d, abs(p.y) - h);
}

// Torus
// r = radius
// d = distance to the center
fn shTorus(p: vec3f, r: f32, d: f32) -> f32 {
	return length(vec2(length(p.xz) - d, p.y)) - r;
}

// Capped Torus
// sc = (sin of the angle, cos of the angle)
// r = radius
// d = distance to the center
fn shCappedTorus(p: vec3f, sc: vec2f, r: f32, d: f32) -> f32 {
	let p2: vec3f = vec3f(abs(p.x), p.yz);
	var k: f32;
	if ((sc.y * p2.x) > (sc.x * p2.y)) {
		k = dot(p2.xy, sc);
	}
	else {
		k = length(p2.xy);
	}

	return sqrt(dot(p2, p2) + d * d - 2.0 * d * k) - r;	
}

// Link in a chain
// l = length
// r = radius
// d = distance to the center
fn shLink(p: vec3f, l: f32, r: f32, d: f32) -> f32 {
	let q: vec3f = vec3f(p.x, max(abs(p.y) - l, 0.0), p.z);

	return length(vec2(length(q.xy) - d, q.z)) - r;
}

// Operations
fn opUnion(a: Object, b: Object) -> Object {
	if (a.dist < b.dist) {
		return a;
	}
	else {
		return b;
	}
}

fn opSmoothUnion(a: Object, b: Object, k: f32) -> Object {
	let h: f32 = max(k - abs(a.dist - b.dist), 0.0);
	let newDist: f32 = min(a.dist, b.dist) - h * h * 0.25 / k;

	let bf: f32 = (h / k) * (h / k) * 0.5;
	var blendFactor: f32;
	if (a.dist < b.dist) {
		blendFactor = bf;
	}
	else {
		blendFactor = (1.0 - bf);
	}

	let newMat: Material = Material(mix(a.mat.diffuse, b.mat.diffuse, blendFactor), mix(a.mat.metallicRoughness, b.mat.metallicRoughness, blendFactor));

	return Object(newDist, newMat);
}

fn opIntersection(a: Object, b: Object) -> Object {
	if (a.dist > b.dist) {
		return a;
	}
	else {
		return b;
	}
}

fn opSmoothIntersection(a: Object, b: Object, k: f32) -> Object {
	var object: Object = opSmoothUnion(Object(-a.dist, a.mat), Object(-b.dist, b.mat), k);
	object.dist *= -1.0;

	return object;
}

fn opDifference(a: Object, b: Object) -> Object {
	if (a.dist > -b.dist) {
		return a;
	}
	else {
		return Object(-b.dist, b.mat);
	}
}

fn opSmoothDifference(a: Object, b: Object, k: f32) -> Object {
	var object: Object = opSmoothUnion(b, Object(-a.dist, a.mat), k);
	object.dist *= -1.0;

	return object;
}

fn opMin(o: Object, x: f32) -> Object {
	return Object(min(o.dist, x), o.mat);
}

fn opMax(o: Object, x: f32) -> Object {
	return Object(max(o.dist, x), o.mat);
}

fn opRound(o: Object, r: f32) -> Object {
	return Object(o.dist - r, o.mat);
}

fn opOnion(o: Object, t: f32) -> Object {
	return Object(abs(o.dist) - t, o.mat);
}

// Transform
fn rotate(p: vec2f, angle: f32) -> vec2f {
	return cos(angle) * p + sin(angle) * vec2f(p.y, -p.x);
}

// Ray Infinite Repeat
// p = ray position
// n = period on each axis
fn rayRepeat(p: vec3f, n: vec3f) -> vec3f {
	return vec3f(glslmod(p.x, n.x), glslmod(p.y, n.y), glslmod(p.z, n.z)) - (n / 2.0);
}

// Ray Finite Repeat
// p = ray position
// n = period on each axis
// l = number of repetitions on each axis
fn rayFiniteRepeat(p: vec3f, n: f32, l: vec3f) -> vec3f {
	return p - n * clamp(round(p / n), -l, l);
}

// Scene
fn pR(p: vec2f) -> vec2f {
	let a: f32 = sin(0.5 * time / 1000.0);

	return cos(a) * p.xy + sin(a) * vec2f(p.y, -p.x);
}

fn displace(p: vec3f) -> f32 {
	return sin(p.x + 4.0 * time / 1000.0) * sin(p.y + sin(2.0 * time / 1000.0)) * sin(p.z + 6.0 * time / 1000.0);
}

fn scene(p: vec3f) -> Object {
	let nutshellWorldPosition: vec3f = vec3f(0.0, 0.0, 15.0);
	let pNutshellHole: vec3f = vec3f(rotate(p.xy, 1.5), p.z);
	var p2: vec3f = vec3f(p.x, pR(p.yz));
	p2 = rayRepeat(p, vec3f(5.0));
	let sphere: Object = Object(shSphere(p - nutshellWorldPosition, 5.0 + displace(p2)), Material(vec3f(1.0, 1.0, 1.0), vec2f(0.5 , 1.0)));
	let nutshellHole: Object = Object(shTriangularPrism(pNutshellHole - vec3f(-1.0, -3.5, 0.0) - nutshellWorldPosition, vec2f(7.0, 5.0)), Material(vec3f(0.0, 0.0, 0.0), vec2f(0.0, 0.5)));

	let scene: Object = opSmoothDifference(sphere, nutshellHole, 2.0);

	return scene;
}

// Background
fn background(p: vec3f) -> vec3f {
	return vec3f(fbm(p.zx), fbm(p.yx), fbm(p.xy));
}

// Camera
const up: vec3f = vec3f(0.0, 1.0, 0.0);

fn camera() -> mat3x3f {
	let forward: vec3f = normalize(cameraDirection);
	let right: vec3f = normalize(cross(up, forward));
	let realUp: vec3f = cross(forward, right);

	return mat3x3f(right, realUp, forward);
}

// Lights
const LIGHTS_COUNT: u32 = 2u;
fn lights() -> array<Light, LIGHTS_COUNT> {
	var l: array<Light, LIGHTS_COUNT>;
	l[0] = Light(0u, vec3f(0.0), vec3f(1.0, -1.0, 0.0), vec3f(1.0, 1.0, 1.0), vec2f(0.0));
	l[1] = Light(1u, vec3f(1.0, 1.0, 0.0), vec3f(0.0), vec3f(1.0, 0.0, 0.0), vec2f(0.0));
	
	return l;
}

fn raymarch(o: vec3f, d: vec3f) -> Object {
	var object: Object = Object(0.0, Material(vec3f(0.0), vec2f(0.0)));
	for (var i: u32 = 0u; i < MAX_STEPS; i++) {
		let p: vec3f = o + object.dist * d;
		let objectHit: Object = scene(p);
		if (abs(objectHit.dist) < EPSILON) {
			break;
		}
		object.dist += objectHit.dist;
		object.mat = objectHit.mat;
		if (object.dist > MAX_DISTANCE) {
			break;
		}
	}

	return object;
}

// Compute normal
fn normal(p: vec3f) -> vec3f {
	let e: vec2f = vec2f(EPSILON, 0.0);
	let n: vec3f = vec3f(scene(p).dist) - vec3f(scene(p - e.xyy).dist, scene(p - e.yxy).dist, scene(p - e.yyx).dist);

	return normalize(n);
}

// BRDF
fn distribution(NdotH: f32, roughness: f32) -> f32 {
	let a: f32 = roughness * roughness;
	let aSquare: f32 = a * a;
	let NdotHSquare: f32 = NdotH * NdotH;
	let denom: f32 = NdotHSquare * (aSquare - 1.0) + 1.0;

	return aSquare / (M_PI * denom * denom);
}

fn fresnel(cosTheta: f32, f0: vec3f) -> vec3f {
	return f0 + (1.0 - f0) * pow(1.0 - cosTheta, 5.0);
}

fn g(NdotV: f32, roughness: f32) -> f32 {
	let r: f32 = roughness + 1.0;
	let k: f32 = (r * r) / 8.0;
	let denom: f32 = NdotV * (1.0 - k) + k;

	return NdotV / denom;
}

fn smith(LdotN: f32, VdotN: f32, roughness: f32) -> f32 {
	let gv: f32 = g(VdotN, roughness);
	let gl: f32 = g(LdotN, roughness);

	return gv * gl;
}

fn diffuseFresnelCorrection(ior: vec3f) -> vec3f {
	let iorSquare: vec3f = ior * ior;
	var TIR: vec3f;
	if (ior.x < 1.0) {
		TIR.x = 1.0;
	}
	else {
		TIR.x = 0.0;
	}
	if (ior.y < 1.0) {
		TIR.y = 1.0;
	}
	else {
		TIR.y = 0.0;
	}
	if (ior.z < 1.0) {
		TIR.z = 1.0;
	}
	else {
		TIR.z = 0.0;
	}
	let invDenum: vec3f = mix(vec3f(1.0), vec3f(1.0) / (iorSquare * iorSquare * (vec3f(554.33) * 380.7 * ior)), TIR);
	var num: vec3f = ior * mix(vec3f(0.1921156102251088), ior * 298.25 - 261.38 * iorSquare + 138.43, TIR);
	num += mix(vec3f(0.8078843897748912), vec3f(-1.07), TIR);

	return num * invDenum;
}

fn brdf(LdotH: f32, NdotH: f32, VdotH: f32, LdotN: f32, VdotN: f32, diffuse: vec3f, metallic: f32, roughness: f32) -> vec3f {
	let d: f32 = distribution(NdotH, roughness);
	let f: vec3f = fresnel(LdotH, mix(vec3f(0.04), diffuse, metallic));
	let fT: vec3f = fresnel(LdotN, mix(vec3f(0.04), diffuse, metallic));
	let fTIR: vec3f = fresnel(VdotN, mix(vec3f(0.04), diffuse, metallic));
	let g: f32 = smith(LdotN, VdotN, roughness);
	let dfc: vec3f = diffuseFresnelCorrection(vec3f(1.05));

	let lambertian: vec3f = diffuse / M_PI;

	return (d * f * g) / max(4.0 * LdotN * VdotN, 0.001) + ((vec3f(1.0) - fT) * (vec3f(1.0 - fTIR)) * lambertian) * dfc;
}

fn shade(p: vec3f, d: vec3f, n: vec3f, lightPos: vec3f, lightColor: vec3f, diffuse: vec3f, metallic: f32, roughness: f32) -> vec3f {
	let l: vec3f = normalize(lightPos - p);
	let v: vec3f = -d;
	let h: vec3f = normalize(v + l);

	let LdotH: f32 = max(dot(l, h), 0.0);
	let NdotH: f32 = max(dot(n, h), 0.0);
	let VdotH: f32 = max(dot(v, h), 0.0);
	let LdotN: f32 = max(dot(l, n), 0.0);
	let VdotN: f32 = max(dot(v, n), 0.0);

	let brdf: vec3f = brdf(LdotH, NdotH, VdotH, LdotN, VdotN, diffuse, metallic, roughness);
	
	return lightColor * brdf * LdotN;
}

// Shadows
fn shadows(p: vec3f, n: vec3f, lightPos: vec3f) -> f32 {
	var res: f32 = 1.0;
	var dist: f32 = 0.01;
	let lightSize: f32 = 0.15;
	for (var i: u32 = 0u; i < MAX_STEPS; i++) {
		let hit: f32 = scene(p + lightPos * dist).dist;
		res = min(res, hit / (dist * lightSize));
		dist += hit;
		if (hit < EPSILON || dist > 60.0) {
			break;
		}
	}

	return clamp(res, 0.0, 1.0);
}

// Ambient Occlusion
fn ambientOcclusion(p: vec3f, n: vec3f) -> f32 {
	var ao: f32 = 0.0;
	var weight: f32 = 1.0;
	for (var i: u32 = 0u; i < 8u; i++) {
		let len: f32 = 0.01 + 0.02 * f32(i * i);
		let dist: f32 = scene(p + n * len).dist;
		ao += (len - dist) * weight;
		weight *= 0.85;
	}

	return 1.0 - clamp(0.6 * ao, 0.0, 1.0);
}

// Render
fn render(o: vec3f, d: vec3f) -> vec3f {
	var tmpo: vec3f = o;
	var tmpd: vec3f = d;

	var lightsList: array<Light, LIGHTS_COUNT> = lights();

	let fogDensity: f32 = 0.0008;

	var frac: f32 = 1.0;
	var color: vec3f = vec3f(0.0, 0.0, 0.0);
	for (var depth: u32 = 0u; depth < MAX_BOUNCES + 1u; depth++) {
		var localColor: vec3f = vec3f(0.0, 0.0, 0.0);

		// Raymarch
		let object: Object = raymarch(tmpo, tmpd);
		let p: vec3f = tmpo + object.dist * tmpd;
		
		let n: vec3f = normal(p);
		let metallic: f32 = object.mat.metallicRoughness.x;
		if (object.dist <= MAX_DISTANCE) {
			// Object properties
			let diffuse: vec3f = object.mat.diffuse;
			let roughness: f32 = object.mat.metallicRoughness.y;
			let ao: f32 = ambientOcclusion(p, n);

			// Local color
			for (var lightIndex: u32 = 0u; lightIndex < LIGHTS_COUNT; lightIndex++) {
				// Directional Light
				if (lightsList[lightIndex].lightType == 0u) {
					let l: vec3f = normalize(-lightsList[lightIndex].direction);
					let lc: vec3f = lightsList[lightIndex].color;
					localColor += shade(p, tmpd, n, l, lc, diffuse, metallic, roughness) * shadows(p, n, l);
				}
				// Point Light
				else if (lightsList[lightIndex].lightType == 1u) {
					let l: vec3f = normalize(lightsList[lightIndex].position - p);
					let distance: f32 = length(lightsList[lightIndex].position - p);
					let attenuation: f32 = 1.0 / (distance * distance);
					let lc: vec3f = lightsList[lightIndex].color * attenuation;
					localColor += shade(p, tmpd, n, l, lc, diffuse, metallic, roughness) * shadows(p, n, l);
				}
				// Spot Light
				else if (lightsList[lightIndex].lightType == 2u) {
					let l: vec3f = normalize(lightsList[lightIndex].position - p);
					let ld: vec3f = lightsList[lightIndex].direction;
					let theta: f32 = dot(l, normalize(-ld));
					let epsilon: f32 = cos(lightsList[lightIndex].cutoffs.y - lightsList[lightIndex].cutoffs.x);
					let intensity: f32 = clamp((theta - cos(lightsList[lightIndex].cutoffs.x)) / epsilon, 0.0, 1.0);
					let lc: vec3f = lightsList[lightIndex].color;
					localColor += shade(p, tmpd, n, l, lc * intensity, diffuse * intensity, metallic, roughness) * shadows(p, n, l);
				}
			}
			localColor *= ao;
			localColor = mix(localColor, background(p), 1.0 - exp(-fogDensity * object.dist * object.dist));
		}
		else {
			color += background(p) * frac;
			return color;
		}

		color += localColor * frac;
		frac *= metallic;

		// Early stop as the impact on the final color will not be consequent
		if (frac < 0.05) {
			break;
		}

		tmpo = p + (n * EPSILON);
		tmpd = reflect(tmpd, n);
	}

	return color;
}

@fragment
fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
	let cameraMatrix: mat3x3f = camera();

	let dim: vec2f = vec2f(f32(resolution.x), f32(resolution.y));
	let newUv: vec2f = (2.0 * (uv * dim) - dim) / dim.y;
	let d: vec3f = cameraMatrix * normalize(vec3f(newUv, 2.0));

	let color: vec3f = render(cameraPosition, d);

	return vec4f(color, 1.0);
}
`;
const toSRGBFragmentShader = `
@group(0) @binding(0) var colorTexture: texture_2d<f32>;
@group(0) @binding(1) var colorSampler: sampler;

@fragment
fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
	return vec4f(pow(textureSample(colorTexture, colorSampler, vec2f(uv.x, 1.0 - uv.y)).xyz, vec3f(1.0/2.2)), 1.0);
}
`;
var refreshFragmentShader = false;
var inCanvas = true;
var wPressed = false;
var aPressed = false;
var sPressed = false;
var dPressed = false;
var upPressed = false;
var leftPressed = false;
var downPressed = false;
var rightPressed = false;
var spacePressed = false;
var shiftPressed = false;
const toDeg = 180.0 / 3.1415926535897932384626433832795;
const toRad = 3.1415926535897932384626433832795 / 180.0;
var canvas = document.querySelector("#webgpuCanvas");
var editableFragmentShader = document.querySelector("#webgpuFragmentShader");
editableFragmentShader.style.width = "100%";
editableFragmentShader.style.height = "600px";
editableFragmentShader.style.overflowY = "scroll";
editableFragmentShader.style.whiteSpace = "break-spaces";
editableFragmentShader.style.paddingLeft = "10px";
editableFragmentShader.style.paddingRight = "10px";
editableFragmentShader.style.paddingTop = "10px";
editableFragmentShader.style.paddingBottom = "10px";
editableFragmentShader.style.borderStyle = "solid";
editableFragmentShader.style.borderWidth = "1px";
editableFragmentShader.style.resize = "none";
editableFragmentShader.spellcheck = false;
editableFragmentShader.textContent = fragmentShader;
var compilationMessage = document.querySelector("#webgpuFragmentShaderCompilationMessage");
compilationMessage.style.width = "100%";
compilationMessage.style.overflowY = "scroll";
compilationMessage.style.whiteSpace = "break-spaces";
compilationMessage.style.paddingLeft = "10px";
compilationMessage.style.paddingRight = "10px";
compilationMessage.style.paddingTop = "10px";
compilationMessage.style.paddingBottom = "10px";
compilationMessage.style.borderStyle = "solid";
compilationMessage.style.borderWidth = "1px";
compilationMessage.style.borderColor = "rgba(175, 0, 0, 255)";
document.addEventListener("keydown", (event) => {
    if (inCanvas) {
        switch (event.code) {
            case "KeyW":
                wPressed = true;
                break;
            case "KeyA":
                aPressed = true;
                break;
            case "KeyS":
                sPressed = true;
                break;
            case "KeyD":
                dPressed = true;
                break;
            case "ArrowUp":
                upPressed = true;
                event.preventDefault();
                break;
            case "ArrowLeft":
                leftPressed = true;
                event.preventDefault();
                break;
            case "ArrowDown":
                downPressed = true;
                event.preventDefault();
                break;
            case "ArrowRight":
                rightPressed = true;
                event.preventDefault();
                break;
            case "Space":
                spacePressed = true;
                event.preventDefault();
                break;
            case "ShiftLeft":
                shiftPressed = true;
                event.preventDefault();
                break;
        }
    }
    else if (event.target == editableFragmentShader) {
        if (event.code == "Tab") {
            const start = editableFragmentShader.selectionStart;
            editableFragmentShader.focus();
            if (document.execCommand) { // Deprecated
                document.execCommand("insertText", false, "\t");
            }
            event.preventDefault();
        }
    }
}, false);
document.addEventListener("keyup", (event) => {
    if (inCanvas) {
        switch (event.code) {
            case "KeyW":
                wPressed = false;
                break;
            case "KeyA":
                aPressed = false;
                break;
            case "KeyS":
                sPressed = false;
                break;
            case "KeyD":
                dPressed = false;
                break;
            case "ArrowUp":
                upPressed = false;
                break;
            case "ArrowLeft":
                leftPressed = false;
                break;
            case "ArrowDown":
                downPressed = false;
                break;
            case "ArrowRight":
                rightPressed = false;
                break;
            case "Space":
                spacePressed = false;
                break;
            case "ShiftLeft":
                shiftPressed = false;
                break;
        }
    }
}, false);
document.addEventListener("click", (event) => {
    if (event.button == 0) {
        if (event.target == canvas) {
            inCanvas = true;
        }
        else {
            if (event.target == document.querySelector("#webgpuRefreshFragmentShader")) {
                refreshFragmentShader = true;
            }
            inCanvas = false;
            wPressed = false;
            aPressed = false;
            sPressed = false;
            dPressed = false;
            upPressed = false;
            leftPressed = false;
            downPressed = false;
            rightPressed = false;
            spacePressed = false;
            shiftPressed = false;
        }
    }
}, false);
function normalize(vector) {
    const length = Math.sqrt(vector.map(x => x * x).reduce((a, b) => a + b));
    return vector.map(x => x / length);
}
class Renderer {
    constructor() {
        this.cameraPosition = new Float32Array([0.0, 0.0, 0.0]);
        this.cameraDirection = normalize(new Float32Array([0.0, 0.0, 1.0]));
        this.cameraYaw = Math.atan2(this.cameraDirection[2], this.cameraDirection[0]) * toDeg;
        this.cameraPitch = -Math.asin(this.cameraDirection[1]) * toDeg;
        this.cameraSpeed = 0.005;
        this.cameraSensitivity = 0.24;
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!navigator.gpu) {
                const webgpuCheck = document.querySelector("#webgpuCheck");
                webgpuCheck.textContent = "Your web browser does not support WebGPU.";
                throw Error("WebGPU is not supported.");
            }
            this.adapter = yield navigator.gpu.requestAdapter();
            if (!this.adapter) {
                throw Error("Could not request WebGPU adapter.");
            }
            this.device = yield this.adapter.requestDevice({
                label: "Device"
            });
            if (!this.device) {
                throw Error("Could not request WebGPU device.");
            }
            this.context = canvas.getContext("webgpu");
            this.context.configure({
                device: this.device,
                format: navigator.gpu.getPreferredCanvasFormat(),
                colorSpace: "srgb"
            });
            this.colorTexture = this.device.createTexture({
                label: "Color texture",
                size: {
                    width: canvas.width,
                    height: canvas.height
                },
                mipLevelCount: 1,
                sampleCount: 1,
                dimension: "2d",
                format: "rgba16float",
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
            });
            this.colorTextureView = this.colorTexture.createView({
                label: "Color texture view"
            });
            this.colorSampler = this.device.createSampler({
                label: "Color sampler",
                addressModeU: "clamp-to-edge",
                addressModeV: "clamp-to-edge",
                addressModeW: "clamp-to-edge",
                magFilter: "nearest",
                minFilter: "nearest",
                mipmapFilter: "nearest",
                lodMinClamp: 0,
                lodMaxClamp: 0,
                maxAnisotropy: 1
            });
            this.uniformBuffer = this.device.createBuffer({
                size: 768 + 8,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });
            this.vertexShaderModule = this.device.createShaderModule({
                label: "Vertex shader module",
                code: vertexShader
            });
            const fragmentShaderModule = this.device.createShaderModule({
                label: "Fragment shader module",
                code: preDefinedFragmentShader + fragmentShader
            });
            this.bindGroupLayout = this.device.createBindGroupLayout({
                label: "Bind group layout",
                entries: [{
                        binding: 0,
                        visibility: GPUShaderStage.FRAGMENT,
                        buffer: {
                            type: "uniform"
                        }
                    },
                    {
                        binding: 1,
                        visibility: GPUShaderStage.FRAGMENT,
                        buffer: {
                            type: "uniform"
                        }
                    },
                    {
                        binding: 2,
                        visibility: GPUShaderStage.FRAGMENT,
                        buffer: {
                            type: "uniform"
                        }
                    },
                    {
                        binding: 3,
                        visibility: GPUShaderStage.FRAGMENT,
                        buffer: {
                            type: "uniform"
                        }
                    }]
            });
            this.renderPipelineBindGroup = this.device.createBindGroup({
                layout: this.bindGroupLayout,
                entries: [{
                        binding: 0,
                        resource: {
                            buffer: this.uniformBuffer,
                            offset: 0
                        }
                    },
                    {
                        binding: 1,
                        resource: {
                            buffer: this.uniformBuffer,
                            offset: 256,
                        }
                    },
                    {
                        binding: 2,
                        resource: {
                            buffer: this.uniformBuffer,
                            offset: 512
                        }
                    },
                    {
                        binding: 3,
                        resource: {
                            buffer: this.uniformBuffer,
                            offset: 768
                        }
                    }]
            });
            this.renderPipeline = this.device.createRenderPipeline({
                label: "Render pipeline",
                vertex: {
                    module: this.vertexShaderModule,
                    entryPoint: "main"
                },
                fragment: {
                    module: fragmentShaderModule,
                    entryPoint: "main",
                    targets: [{
                            format: "rgba16float"
                        }]
                },
                primitive: {
                    topology: "triangle-list"
                },
                layout: this.device.createPipelineLayout({
                    label: "Render pipeline layout",
                    bindGroupLayouts: [
                        this.bindGroupLayout
                    ]
                })
            });
            const toSRGBFragmentShaderModule = this.device.createShaderModule({
                label: "To SRGB fragment shader module",
                code: toSRGBFragmentShader
            });
            const toSRGBBindGroupLayout = this.device.createBindGroupLayout({
                label: "To SRGB bind group layout",
                entries: [{
                        binding: 0,
                        visibility: GPUShaderStage.FRAGMENT,
                        texture: {
                            sampleType: "float",
                            viewDimension: "2d",
                            multisampled: false
                        }
                    },
                    {
                        binding: 1,
                        visibility: GPUShaderStage.FRAGMENT,
                        sampler: {
                            type: "non-filtering"
                        }
                    }]
            });
            this.toSRGBRenderPipelineBindGroup = this.device.createBindGroup({
                layout: toSRGBBindGroupLayout,
                entries: [{
                        binding: 0,
                        resource: this.colorTextureView
                    },
                    {
                        binding: 1,
                        resource: this.colorSampler
                    }]
            });
            this.toSRGBRenderPipeline = this.device.createRenderPipeline({
                label: "To SRGB render pipeline",
                vertex: {
                    module: this.vertexShaderModule,
                    entryPoint: "main"
                },
                fragment: {
                    module: toSRGBFragmentShaderModule,
                    entryPoint: "main",
                    targets: [{
                            format: navigator.gpu.getPreferredCanvasFormat()
                        }]
                },
                primitive: {
                    topology: "triangle-list"
                },
                layout: this.device.createPipelineLayout({
                    label: "To SRGB render pipeline layout",
                    bindGroupLayouts: [
                        toSRGBBindGroupLayout
                    ]
                })
            });
        });
    }
    update(timestamp) {
        return __awaiter(this, void 0, void 0, function* () {
            const deltaTime = timestamp - this.previousTime;
            this.previousTime = timestamp;
            if (refreshFragmentShader) {
                compilationMessage.textContent = "";
                const fragmentShaderModule = this.device.createShaderModule({
                    label: "Fragment shader module",
                    code: preDefinedFragmentShader + editableFragmentShader.value
                });
                var compilationSuccess = true;
                if (fragmentShaderModule.getCompilationInfo) {
                    const compilationInfo = yield fragmentShaderModule.getCompilationInfo();
                    for (const message of compilationInfo.messages) {
                        if (message.type == "error") {
                            compilationMessage.textContent += "Error: ";
                            compilationSuccess = false;
                        }
                        else if (message.type == "warning") {
                            compilationMessage.textContent += "Warning: ";
                        }
                        else if (message.type == "info") {
                            compilationMessage.textContent += "Info: ";
                        }
                        const errorLine = (preDefinedFragmentShader + editableFragmentShader.value).split("\n", message.lineNum)[message.lineNum - 1].slice(0, -1);
                        compilationMessage.textContent += "Line: " + message.lineNum + ", Position: " + message.linePos + ": " + message.message + "\n" + errorLine + "\n";
                    }
                }
                if (compilationSuccess) {
                    this.renderPipeline = this.device.createRenderPipeline({
                        label: "Render pipeline",
                        vertex: {
                            module: this.vertexShaderModule,
                            entryPoint: "main"
                        },
                        fragment: {
                            module: fragmentShaderModule,
                            entryPoint: "main",
                            targets: [{
                                    format: "rgba16float"
                                }]
                        },
                        primitive: {
                            topology: "triangle-list"
                        },
                        layout: this.device.createPipelineLayout({
                            label: "Render pipeline layout",
                            bindGroupLayouts: [
                                this.bindGroupLayout
                            ]
                        })
                    });
                }
                refreshFragmentShader = false;
            }
            var xOffset = 0.0;
            var yOffset = 0.0;
            if (upPressed) {
                yOffset -= this.cameraSensitivity * deltaTime;
            }
            if (leftPressed) {
                xOffset += this.cameraSensitivity * deltaTime;
            }
            if (downPressed) {
                yOffset += this.cameraSensitivity * deltaTime;
            }
            if (rightPressed) {
                xOffset -= this.cameraSensitivity * deltaTime;
            }
            this.cameraYaw = (this.cameraYaw + xOffset) % 360.0;
            this.cameraPitch = Math.max(-89.0, Math.min(89.0, this.cameraPitch + yOffset));
            const yawRad = this.cameraYaw * toRad;
            const pitchRad = this.cameraPitch * toRad;
            this.cameraDirection[0] = Math.cos(pitchRad) * Math.cos(yawRad);
            this.cameraDirection[1] = -Math.sin(pitchRad);
            this.cameraDirection[2] = Math.cos(pitchRad) * Math.sin(yawRad);
            this.cameraDirection = normalize(this.cameraDirection);
            if (wPressed) {
                this.cameraPosition[0] += this.cameraDirection[0] * (this.cameraSpeed * deltaTime);
                this.cameraPosition[1] += this.cameraDirection[1] * (this.cameraSpeed * deltaTime);
                this.cameraPosition[2] += this.cameraDirection[2] * (this.cameraSpeed * deltaTime);
            }
            if (aPressed) {
                const t = normalize(new Float32Array([-this.cameraDirection[2], 0.0, this.cameraDirection[0]]));
                this.cameraPosition[0] += t[0] * (this.cameraSpeed * deltaTime);
                this.cameraPosition[2] += t[1] * (this.cameraSpeed * deltaTime);
            }
            if (sPressed) {
                this.cameraPosition[0] -= this.cameraDirection[0] * (this.cameraSpeed * deltaTime);
                this.cameraPosition[1] -= this.cameraDirection[1] * (this.cameraSpeed * deltaTime);
                this.cameraPosition[2] -= this.cameraDirection[2] * (this.cameraSpeed * deltaTime);
            }
            if (dPressed) {
                const t = normalize(new Float32Array([-this.cameraDirection[2], 0.0, this.cameraDirection[0]]));
                this.cameraPosition[0] -= t[0] * (this.cameraSpeed * deltaTime);
                this.cameraPosition[2] -= t[1] * (this.cameraSpeed * deltaTime);
            }
            if (spacePressed) {
                this.cameraPosition[1] += this.cameraSpeed * deltaTime;
            }
            if (shiftPressed) {
                this.cameraPosition[1] -= this.cameraSpeed * deltaTime;
            }
            const timeArrayBuffer = new ArrayBuffer(4);
            const uniformDataTime = new Float32Array(timeArrayBuffer);
            uniformDataTime[0] = timestamp;
            const cameraPositionArrayBuffer = new ArrayBuffer(12);
            const uniformDataCameraPosition = new Float32Array(cameraPositionArrayBuffer);
            uniformDataCameraPosition[0] = this.cameraPosition[0];
            uniformDataCameraPosition[1] = this.cameraPosition[1];
            uniformDataCameraPosition[2] = this.cameraPosition[2];
            const cameraDirectionArrayBuffer = new ArrayBuffer(12);
            const uniformDataCameraDirection = new Float32Array(cameraDirectionArrayBuffer);
            uniformDataCameraDirection[0] = this.cameraDirection[0];
            uniformDataCameraDirection[1] = this.cameraDirection[1];
            uniformDataCameraDirection[2] = this.cameraDirection[2];
            const resolutionArrayBuffer = new ArrayBuffer(8);
            const uniformDataResolution = new Uint32Array(resolutionArrayBuffer);
            uniformDataResolution[0] = canvas.width;
            uniformDataResolution[1] = canvas.height;
            this.device.queue.writeBuffer(this.uniformBuffer, 0, timeArrayBuffer, 0, 4);
            this.device.queue.writeBuffer(this.uniformBuffer, 256, cameraPositionArrayBuffer, 0, 12);
            this.device.queue.writeBuffer(this.uniformBuffer, 512, cameraDirectionArrayBuffer, 0, 12);
            this.device.queue.writeBuffer(this.uniformBuffer, 768, resolutionArrayBuffer, 0, 8);
            const commandEncoder = this.device.createCommandEncoder({
                label: "Command encoder"
            });
            const renderPassEncoder = commandEncoder.beginRenderPass({
                label: "Render pass",
                colorAttachments: [{
                        clearValue: {
                            r: 0.0,
                            g: 0.0,
                            b: 0.0,
                            a: 0.0
                        },
                        loadOp: "clear",
                        storeOp: "store",
                        view: this.colorTextureView
                    }]
            });
            renderPassEncoder.setPipeline(this.renderPipeline);
            renderPassEncoder.setBindGroup(0, this.renderPipelineBindGroup);
            renderPassEncoder.draw(3, 1, 0, 0);
            renderPassEncoder.end();
            const toSRGBRenderPassEncoder = commandEncoder.beginRenderPass({
                label: "To SRGB render pass",
                colorAttachments: [{
                        clearValue: {
                            r: 0.0,
                            g: 0.0,
                            b: 0.0,
                            a: 0.0
                        },
                        loadOp: "clear",
                        storeOp: "store",
                        view: this.context.getCurrentTexture().createView({
                            label: "View"
                        })
                    }]
            });
            toSRGBRenderPassEncoder.setPipeline(this.toSRGBRenderPipeline);
            toSRGBRenderPassEncoder.setBindGroup(0, this.toSRGBRenderPipelineBindGroup);
            toSRGBRenderPassEncoder.draw(3, 1, 0, 0);
            toSRGBRenderPassEncoder.end();
            this.device.queue.submit([commandEncoder.finish()]);
            window.requestAnimationFrame(this.update.bind(this));
        });
    }
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        let renderer = new Renderer();
        yield renderer.init();
        renderer.update(0);
    });
}
run();
