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
const defaultFragmentShader = `@fragment
fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
	return vec4f(0.0, 0.0, 0.0, 1.0);
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
var url = new URL(location.href);
const urlShaderBase64 = url.searchParams.get("s");
if (urlShaderBase64) {
    editableFragmentShader.textContent = atob(urlShaderBase64);
}
else {
    editableFragmentShader.textContent = defaultFragmentShader;
}
var compilationMessage = document.querySelector("#webgpuFragmentShaderCompilationMessage");
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
                if (editableFragmentShader.value.replace(/\s+/g, "").length > 0) {
                    url.searchParams.set("s", btoa(editableFragmentShader.value));
                    history.replaceState(null, null, url);
                    refreshFragmentShader = true;
                }
                else {
                    url.searchParams.delete("s");
                    history.replaceState(null, null, url);
                }
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
            refreshFragmentShader = true;
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
                        const errorLine = (preDefinedFragmentShader + editableFragmentShader.value).split("\n", message.lineNum)[message.lineNum - 1].trim();
                        compilationMessage.textContent += "Line: " + message.lineNum + ", Position: " + message.linePos + ": " + message.message + ((message.lineNum != 0) ? ("\n" + errorLine) : "") + "\n";
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
            uniformDataTime[0] = timestamp / 1000.0;
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
