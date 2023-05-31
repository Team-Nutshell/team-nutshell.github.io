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
@group(0) @binding(0) var<uniform> cameraViewProj: mat4x4f;

struct SolidColorVertexShaderOutput {
	@builtin(position) pos: vec4f
}

@vertex
fn solidColorMain(@location(0) position: vec3f) -> SolidColorVertexShaderOutput {
	var output: SolidColorVertexShaderOutput;
	output.pos = cameraViewProj * vec4f(position, 1.0);

	return output;
}

struct NormalVertexShaderOutput {
	@builtin(position) pos: vec4f,
	@location(0) normal: vec3f
}

@vertex
fn normalMain(@location(0) position: vec3f,
				@location(1) normal: vec3f) -> NormalVertexShaderOutput {
	var output: NormalVertexShaderOutput;
	output.pos = cameraViewProj * vec4f(position, 1.0);
	output.normal = normal;

	return output;
}

struct UVVertexShaderOutput {
	@builtin(position) pos: vec4f,
	@location(0) uv: vec2f
}

@vertex
fn uvMain(@location(0) position: vec3f,
			@location(1) uv: vec2f) -> UVVertexShaderOutput {
	var output: UVVertexShaderOutput;
	output.pos = cameraViewProj * vec4f(position, 1.0);
	output.uv = uv;

	return output;
}

struct vertexVertexShaderOutput {
	@builtin(position) pos: vec4f
}

@vertex
fn vertexMain(@location(0) position: vec3f) -> vertexVertexShaderOutput {
	var output: vertexVertexShaderOutput;
	output.pos = cameraViewProj * vec4f(position, 1.0);

	return output;
}
`;
const fragmentShader = `
@group(0) @binding(1) var<uniform> time: f32;
@group(0) @binding(2) var<uniform> resolution: vec2u;
@group(0) @binding(3) var<uniform> mouse: vec2i;

@fragment
fn solidColorMain() -> @location(0) vec4f {
	return vec4f(1.0, 0.0, 0.0, 1.0);
}

@fragment
fn normalMain(@location(0) normal: vec3f) -> @location(0) vec4f {
	return vec4f(normal, 1.0);
}

@fragment
fn uvMain(@location(0) uv: vec2f) -> @location(0) vec4f {
	return vec4f(uv, 0.0, 1.0);
}
`;
const toSRGBVertexShader = `
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
const toSRGBFragmentShader = `
@group(0) @binding(0) var colorTexture: texture_2d<f32>;
@group(0) @binding(1) var colorSampler: sampler;

@fragment
fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
	return vec4f(pow(textureSample(colorTexture, colorSampler, vec2f(1.0 - uv.x, 1.0 - uv.y)).xyz, vec3f(1.0/2.2)), 1.0);
}
`;
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
var mouseX;
var mouseY;
const toDeg = 180.0 / 3.1415926535897932384626433832795;
const toRad = 3.1415926535897932384626433832795 / 180.0;
var reloadMesh = false;
var dataVertexPositions;
var dataVertexNormals;
var dataVertexUV;
var dataIndices;
var canvas = document.querySelector("#webgpuCanvas");
var fps = document.querySelector("#webgpuFPS");
var nbFrames = 0;
var fpsTime = (new Date()).getTime();
var fpsText = "FPS: 0";
var frametimeText = "Frametime: 0ms";
var renderingModeSelection = document.querySelector("#webgpuRenderingMode");
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
document.addEventListener('mousemove', (event) => {
    const canvasPosition = canvas.getBoundingClientRect();
    mouseX = event.x - canvasPosition.left;
    mouseY = event.y - canvasPosition.top;
}, false);
document.addEventListener("click", (event) => {
    if (event.button == 0) {
        if (event.target == canvas) {
            inCanvas = true;
        }
        else {
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
function dot(v1, v2) {
    if (v1.length != v2.length) {
        throw Error("dot(v1, v2): v1 and v2 must be the same size.");
    }
    return v1.map((val, idx) => val * v2[idx]).reduce((a, b) => a + b);
}
function cross(v1, v2) {
    if ((v1.length != 3) || (v2.length != 3)) {
        throw Error("cross(v1, v2): v1 and v2 must have a size of 3.");
    }
    return new Float32Array([(v1[1] * v2[2]) - (v1[2] * v2[1]),
        (v1[2] * v2[0]) - (v1[0] * v2[2]),
        (v1[0] * v2[1]) - (v1[1] * v2[0])]);
}
function lookAtRH(from, to, up) {
    if ((from.length != 3) || (to.length != 3) || (up.length != 3)) {
        throw Error("lookAtRH(from, to, up): from, to and up must have a size of 3.");
    }
    const forward = normalize(to.map((val, idx) => val - from[idx]));
    const right = normalize(cross(forward, up));
    const realUp = cross(right, forward);
    return new Float32Array([right[0], realUp[0], -forward[0], 0.0,
        right[1], realUp[1], -forward[1], 0.0,
        right[2], realUp[2], -forward[2], 0.0,
        -dot(right, from), -dot(realUp, from), dot(forward, from), 1.0]);
}
function perspectiveRH(fovY, aspectRatio, near, far) {
    return new Float32Array([1.0 / (aspectRatio * Math.tan(fovY / 2.0)), 0.0, 0.0, 0.0,
        0.0, 1.0 / Math.tan(fovY / 2.0), 0.0, 0.0,
        0.0, 0.0, far / (near - far), -1.0,
        0.0, 0.0, -((far * near) / (far - near)), 0.0]);
}
function mat4x4Mult(m1, m2) {
    if ((m1.length != 16) || (m2.length != 16)) {
        throw Error("mat4x4Mult(m1, m2): m1 and m2 must have a size of 16.");
    }
    return new Float32Array([
        m1[0] * m2[0] + m1[4] * m2[1] + m1[8] * m2[2] + m1[12] * m2[3],
        m1[1] * m2[0] + m1[5] * m2[1] + m1[9] * m2[2] + m1[13] * m2[3],
        m1[2] * m2[0] + m1[6] * m2[1] + m1[10] * m2[2] + m1[14] * m2[3],
        m1[3] * m2[0] + m1[7] * m2[1] + m1[11] * m2[2] + m1[15] * m2[3],
        m1[0] * m2[4] + m1[4] * m2[5] + m1[8] * m2[6] + m1[12] * m2[7],
        m1[1] * m2[4] + m1[5] * m2[5] + m1[9] * m2[6] + m1[13] * m2[7],
        m1[2] * m2[4] + m1[6] * m2[5] + m1[10] * m2[6] + m1[14] * m2[7],
        m1[3] * m2[4] + m1[7] * m2[5] + m1[11] * m2[6] + m1[15] * m2[7],
        m1[0] * m2[8] + m1[4] * m2[9] + m1[8] * m2[10] + m1[12] * m2[11],
        m1[1] * m2[8] + m1[5] * m2[9] + m1[9] * m2[10] + m1[13] * m2[11],
        m1[2] * m2[8] + m1[6] * m2[9] + m1[10] * m2[10] + m1[14] * m2[11],
        m1[3] * m2[8] + m1[7] * m2[9] + m1[11] * m2[10] + m1[15] * m2[11],
        m1[0] * m2[12] + m1[4] * m2[13] + m1[8] * m2[14] + m1[12] * m2[15],
        m1[1] * m2[12] + m1[5] * m2[13] + m1[9] * m2[14] + m1[13] * m2[15],
        m1[2] * m2[12] + m1[6] * m2[13] + m1[10] * m2[14] + m1[14] * m2[15],
        m1[3] * m2[12] + m1[7] * m2[13] + m1[11] * m2[14] + m1[15] * m2[15]
    ]);
}
var fileCheck = document.querySelector("#webgpuFileCheck");
const fileReader = new FileReader();
var fileSelector = document.querySelector("#webgpuFile");
var modelInformation = document.querySelector("#webgpuModelInformation");
var nbVertices = 0;
var nbTriangles = 0;
fileSelector.addEventListener("change", (event) => {
    const file = fileSelector.files[0];
    const extension = file.name.substring(file.name.indexOf("."));
    if (extension != ".obj") {
        fileCheck.textContent = "\"" + extension + "\" model format is unsupported.";
        return;
    }
    else {
        fileCheck.textContent = "";
        fileReader.readAsText(file);
    }
}, false);
fileReader.addEventListener("loadend", (event) => {
    const lines = event.target.result.toString().split("\n");
    var positions = [];
    var normals = [];
    var uv = [];
    var uniqueVertices = new Map();
    var verticesPositions = [];
    var verticesNormals = [];
    var verticesUV = [];
    var vertexCount = 0;
    var indices = [];
    for (let line of lines) {
        if (line.length == 0) {
            continue;
        }
        if (line[0] == "#") {
            continue;
        }
        var tokens = [];
        var spacePosition;
        while ((spacePosition = line.indexOf(" ")) != -1) {
            tokens.push(line.substring(0, spacePosition));
            line = line.substring(spacePosition + 1);
        }
        tokens.push(line);
        if (tokens[0] == "v") {
            positions.push(new Float32Array([parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3])]));
        }
        else if (tokens[0] == "vn") {
            normals.push(new Float32Array([parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3])]));
        }
        else if (tokens[0] == "vt") {
            uv.push(new Float32Array([parseFloat(tokens[1]), parseFloat(tokens[2])]));
        }
        else if (tokens[0] == "f") {
            var tmpIndices = [];
            for (let token of tokens.slice(1)) {
                if (!uniqueVertices.has(token)) {
                    var faceIndices = [];
                    var tmpToken = token;
                    var slashPosition;
                    while ((slashPosition = tmpToken.indexOf("/")) != -1) {
                        faceIndices.push(tmpToken.substring(0, slashPosition));
                        tmpToken = tmpToken.substring(slashPosition + 1);
                    }
                    faceIndices.push(tmpToken);
                    for (let i = 0; i < faceIndices.length; i++) {
                        if (faceIndices[i].length > 0) {
                            if (i == 0) {
                                verticesPositions.push(positions[parseInt(faceIndices[i]) - 1][0]);
                                verticesPositions.push(positions[parseInt(faceIndices[i]) - 1][1]);
                                verticesPositions.push(positions[parseInt(faceIndices[i]) - 1][2]);
                            }
                            else if (i == 1) {
                                verticesUV.push(uv[parseInt(faceIndices[i]) - 1][0]);
                                verticesUV.push(uv[parseInt(faceIndices[i]) - 1][1]);
                            }
                            else if (i == 2) {
                                verticesNormals.push(normals[parseInt(faceIndices[i]) - 1][0]);
                                verticesNormals.push(normals[parseInt(faceIndices[i]) - 1][1]);
                                verticesNormals.push(normals[parseInt(faceIndices[i]) - 1][2]);
                            }
                        }
                    }
                    uniqueVertices[token] = vertexCount;
                    vertexCount++;
                }
                tmpIndices.push(uniqueVertices[token]);
            }
            if (tmpIndices.length == 3) {
                indices.push(tmpIndices[0]);
                indices.push(tmpIndices[1]);
                indices.push(tmpIndices[2]);
            }
            else if (tmpIndices.length == 4) {
                indices.push(tmpIndices[0]);
                indices.push(tmpIndices[1]);
                indices.push(tmpIndices[2]);
                indices.push(tmpIndices[0]);
                indices.push(tmpIndices[2]);
                indices.push(tmpIndices[3]);
            }
        }
    }
    dataVertexPositions = new Float32Array(verticesPositions);
    dataVertexNormals = new Float32Array(verticesNormals);
    dataVertexUV = new Float32Array(verticesUV);
    dataIndices = new Uint32Array(indices);
    nbVertices = vertexCount;
    nbTriangles = dataIndices.length / 3;
    reloadMesh = true;
}, false);
class Renderer {
    constructor() {
        this.mesh = {
            indexCount: 3,
            instanceCount: 1,
            firstIndex: 0,
            baseVertex: 0,
            firstInstance: 0
        };
        this.cameraPosition = new Float32Array([0.0, 0.0, -2.0]);
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
            this.depthTexture = this.device.createTexture({
                label: "Depth texture",
                size: {
                    width: canvas.width,
                    height: canvas.height
                },
                mipLevelCount: 1,
                sampleCount: 1,
                dimension: "2d",
                format: "depth32float",
                usage: GPUTextureUsage.RENDER_ATTACHMENT
            });
            this.depthTextureView = this.depthTexture.createView({
                label: "Depth texture view"
            });
            this.positionVertexBuffer = this.device.createBuffer({
                size: 268435456,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
            });
            this.normalVertexBuffer = this.device.createBuffer({
                size: 268435456,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
            });
            this.uvVertexBuffer = this.device.createBuffer({
                size: 268435456,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
            });
            this.indexBuffer = this.device.createBuffer({
                size: 268435456,
                usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
            });
            dataVertexPositions = new Float32Array([
                0.0, 0.5, 0.0,
                0.5, -0.5, 0.0,
                -0.5, -0.5, 0.0
            ]);
            dataVertexNormals = new Float32Array([
                0.0, 0.0, -1.0,
                0.0, 0.0, -1.0,
                0.0, 0.0, -1.0
            ]);
            dataVertexUV = new Float32Array([
                0.5, 0.5,
                0.5, 0.5,
                0.5, 0.5
            ]);
            dataIndices = new Uint32Array([0, 1, 2]);
            nbVertices = 3;
            nbTriangles = 1;
            reloadMesh = true;
            this.uniformBuffer = this.device.createBuffer({
                label: "Uniform buffer",
                size: 768 + 8,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });
            const vertexShaderModule = this.device.createShaderModule({
                label: "Vertex shader module",
                code: vertexShader
            });
            const fragmentShaderModule = this.device.createShaderModule({
                label: "Fragment shader module",
                code: fragmentShader
            });
            this.bindGroupLayout = this.device.createBindGroupLayout({
                label: "Bind group layout",
                entries: [{
                        binding: 0,
                        visibility: GPUShaderStage.VERTEX,
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
                            offset: 256
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
            this.solidColorRenderPipeline = this.device.createRenderPipeline({
                label: "Solid color render pipeline",
                layout: this.device.createPipelineLayout({
                    label: "Solid color render pipeline layout",
                    bindGroupLayouts: [
                        this.bindGroupLayout
                    ]
                }),
                vertex: {
                    module: vertexShaderModule,
                    entryPoint: "solidColorMain",
                    buffers: [{
                            arrayStride: 12,
                            stepMode: "vertex",
                            attributes: [{
                                    format: "float32x3",
                                    offset: 0,
                                    shaderLocation: 0
                                }]
                        }]
                },
                primitive: {
                    topology: "triangle-list",
                    frontFace: "ccw",
                    cullMode: "back"
                },
                depthStencil: {
                    format: "depth32float",
                    depthWriteEnabled: true,
                    depthCompare: "less"
                },
                fragment: {
                    module: fragmentShaderModule,
                    entryPoint: "solidColorMain",
                    targets: [{
                            format: "rgba16float"
                        }]
                }
            });
            this.normalRenderPipeline = this.device.createRenderPipeline({
                label: "Normal render pipeline",
                layout: this.device.createPipelineLayout({
                    label: "Normal render pipeline layout",
                    bindGroupLayouts: [
                        this.bindGroupLayout
                    ]
                }),
                vertex: {
                    module: vertexShaderModule,
                    entryPoint: "normalMain",
                    buffers: [{
                            arrayStride: 12,
                            stepMode: "vertex",
                            attributes: [{
                                    format: "float32x3",
                                    offset: 0,
                                    shaderLocation: 0
                                }]
                        },
                        {
                            arrayStride: 12,
                            stepMode: "vertex",
                            attributes: [{
                                    format: "float32x3",
                                    offset: 0,
                                    shaderLocation: 1
                                }]
                        }]
                },
                primitive: {
                    topology: "triangle-list",
                    frontFace: "ccw",
                    cullMode: "back"
                },
                depthStencil: {
                    format: "depth32float",
                    depthWriteEnabled: true,
                    depthCompare: "less"
                },
                fragment: {
                    module: fragmentShaderModule,
                    entryPoint: "normalMain",
                    targets: [{
                            format: "rgba16float"
                        }]
                }
            });
            this.uvRenderPipeline = this.device.createRenderPipeline({
                label: "UV render pipeline",
                layout: this.device.createPipelineLayout({
                    label: "UV render pipeline layout",
                    bindGroupLayouts: [
                        this.bindGroupLayout
                    ]
                }),
                vertex: {
                    module: vertexShaderModule,
                    entryPoint: "uvMain",
                    buffers: [{
                            arrayStride: 12,
                            stepMode: "vertex",
                            attributes: [{
                                    format: "float32x3",
                                    offset: 0,
                                    shaderLocation: 0
                                }]
                        },
                        {
                            arrayStride: 8,
                            stepMode: "vertex",
                            attributes: [{
                                    format: "float32x2",
                                    offset: 0,
                                    shaderLocation: 1
                                }]
                        }]
                },
                primitive: {
                    topology: "triangle-list",
                    frontFace: "ccw",
                    cullMode: "back"
                },
                depthStencil: {
                    format: "depth32float",
                    depthWriteEnabled: true,
                    depthCompare: "less"
                },
                fragment: {
                    module: fragmentShaderModule,
                    entryPoint: "uvMain",
                    targets: [{
                            format: "rgba16float"
                        }]
                }
            });
            this.vertexRenderPipeline = this.device.createRenderPipeline({
                label: "Vertex render pipeline",
                layout: this.device.createPipelineLayout({
                    label: "Vertex render pipeline layout",
                    bindGroupLayouts: [
                        this.bindGroupLayout
                    ]
                }),
                vertex: {
                    module: vertexShaderModule,
                    entryPoint: "vertexMain",
                    buffers: [{
                            arrayStride: 12,
                            stepMode: "vertex",
                            attributes: [{
                                    format: "float32x3",
                                    offset: 0,
                                    shaderLocation: 0
                                }]
                        }]
                },
                primitive: {
                    topology: "point-list",
                    frontFace: "ccw",
                    cullMode: "back"
                },
                depthStencil: {
                    format: "depth32float",
                    depthWriteEnabled: true,
                    depthCompare: "less"
                },
                fragment: {
                    module: fragmentShaderModule,
                    entryPoint: "solidColorMain",
                    targets: [{
                            format: "rgba16float"
                        }]
                }
            });
            const toSRGBVertexShaderModule = this.device.createShaderModule({
                label: "To SRGB vertex shader module",
                code: toSRGBVertexShader
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
                layout: this.device.createPipelineLayout({
                    label: "To SRGB render pipeline layout",
                    bindGroupLayouts: [
                        toSRGBBindGroupLayout
                    ]
                }),
                vertex: {
                    module: toSRGBVertexShaderModule,
                    entryPoint: "main"
                },
                primitive: {
                    topology: "triangle-list",
                    frontFace: "ccw",
                    cullMode: "back"
                },
                fragment: {
                    module: toSRGBFragmentShaderModule,
                    entryPoint: "main",
                    targets: [{
                            format: navigator.gpu.getPreferredCanvasFormat()
                        }]
                }
            });
        });
    }
    update(timestamp) {
        return __awaiter(this, void 0, void 0, function* () {
            const deltaTime = timestamp - this.previousTime;
            this.previousTime = timestamp;
            nbFrames++;
            var currentTime = (new Date()).getTime();
            if ((currentTime - fpsTime) >= 1000.0) {
                fpsText = "FPS: " + nbFrames;
                nbFrames = 0;
                fpsTime += 1000.0;
            }
            frametimeText = "Frametime: " + deltaTime.toFixed(2) + "ms";
            fps.textContent = fpsText + " - " + frametimeText;
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
                this.cameraPosition[2] += t[2] * (this.cameraSpeed * deltaTime);
            }
            if (sPressed) {
                this.cameraPosition[0] -= this.cameraDirection[0] * (this.cameraSpeed * deltaTime);
                this.cameraPosition[1] -= this.cameraDirection[1] * (this.cameraSpeed * deltaTime);
                this.cameraPosition[2] -= this.cameraDirection[2] * (this.cameraSpeed * deltaTime);
            }
            if (dPressed) {
                const t = normalize(new Float32Array([-this.cameraDirection[2], 0.0, this.cameraDirection[0]]));
                this.cameraPosition[0] -= t[0] * (this.cameraSpeed * deltaTime);
                this.cameraPosition[2] -= t[2] * (this.cameraSpeed * deltaTime);
            }
            if (spacePressed) {
                this.cameraPosition[1] += this.cameraSpeed * deltaTime;
            }
            if (shiftPressed) {
                this.cameraPosition[1] -= this.cameraSpeed * deltaTime;
            }
            if (reloadMesh) {
                this.device.queue.writeBuffer(this.positionVertexBuffer, 0, dataVertexPositions.buffer, 0, dataVertexPositions.length * 4);
                this.device.queue.writeBuffer(this.normalVertexBuffer, 0, dataVertexNormals.buffer, 0, dataVertexNormals.length * 4);
                this.device.queue.writeBuffer(this.uvVertexBuffer, 0, dataVertexUV.buffer, 0, dataVertexUV.length * 4);
                this.device.queue.writeBuffer(this.indexBuffer, 0, dataIndices.buffer, 0, dataIndices.length * 4);
                this.mesh.indexCount = dataIndices.length;
                modelInformation.textContent = "Vertices: " + nbVertices + ", Triangles: " + nbTriangles;
                reloadMesh = false;
            }
            const uniformDataCameraViewProj = mat4x4Mult(perspectiveRH(45.0 * toRad, canvas.width / canvas.height, 0.03, 100.0), lookAtRH(this.cameraPosition, this.cameraPosition.map((val, idx) => val + this.cameraDirection[idx]), new Float32Array([0.0, 1.0, 0.0])));
            const uniformDataTime = new Float32Array([timestamp / 1000.0]);
            const uniformDataResolution = new Uint32Array([canvas.width, canvas.height]);
            const uniformDataMouse = new Int32Array([mouseX, mouseY]);
            this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformDataCameraViewProj.buffer, 0, 64);
            this.device.queue.writeBuffer(this.uniformBuffer, 256, uniformDataTime.buffer, 0, 4);
            this.device.queue.writeBuffer(this.uniformBuffer, 512, uniformDataResolution.buffer, 0, 8);
            this.device.queue.writeBuffer(this.uniformBuffer, 768, uniformDataMouse.buffer, 0, 8);
            const commandEncoder = this.device.createCommandEncoder({
                label: "Command encoder"
            });
            const renderPassEncoder = commandEncoder.beginRenderPass({
                label: "Render pass",
                colorAttachments: [{
                        view: this.colorTextureView,
                        clearValue: {
                            r: 0.0,
                            g: 0.0,
                            b: 0.0,
                            a: 0.0
                        },
                        loadOp: "clear",
                        storeOp: "store"
                    }],
                depthStencilAttachment: {
                    view: this.depthTextureView,
                    depthClearValue: 1.0,
                    depthLoadOp: "clear",
                    depthStoreOp: "store",
                    depthReadOnly: false
                }
            });
            renderPassEncoder.setVertexBuffer(0, this.positionVertexBuffer, 0, this.positionVertexBuffer.size);
            if (renderingModeSelection.value == "solidColor") {
                renderPassEncoder.setPipeline(this.solidColorRenderPipeline);
            }
            else if (renderingModeSelection.value == "normals") {
                renderPassEncoder.setPipeline(this.normalRenderPipeline);
                renderPassEncoder.setVertexBuffer(1, this.normalVertexBuffer, 0, this.normalVertexBuffer.size);
            }
            else if (renderingModeSelection.value == "uv") {
                renderPassEncoder.setPipeline(this.uvRenderPipeline);
                renderPassEncoder.setVertexBuffer(1, this.uvVertexBuffer, 0, this.uvVertexBuffer.size);
            }
            else if (renderingModeSelection.value == "vertices") {
                renderPassEncoder.setPipeline(this.vertexRenderPipeline);
            }
            renderPassEncoder.setBindGroup(0, this.renderPipelineBindGroup);
            renderPassEncoder.setIndexBuffer(this.indexBuffer, "uint32", 0, this.indexBuffer.size);
            renderPassEncoder.drawIndexed(this.mesh.indexCount, this.mesh.instanceCount, this.mesh.firstIndex, this.mesh.baseVertex, this.mesh.firstInstance);
            renderPassEncoder.end();
            const toSRGBRenderPassEncoder = commandEncoder.beginRenderPass({
                label: "To SRGB render pass",
                colorAttachments: [{
                        view: this.context.getCurrentTexture().createView({
                            label: "View"
                        }),
                        clearValue: {
                            r: 0.0,
                            g: 0.0,
                            b: 0.0,
                            a: 0.0
                        },
                        loadOp: "clear",
                        storeOp: "store"
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
