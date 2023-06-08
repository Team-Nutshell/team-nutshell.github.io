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
@group(0) @binding(4) var<uniform> mouse: vec2i;
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
const toDeg = 180.0 / 3.1415926535897932384626433832795;
const toRad = 3.1415926535897932384626433832795 / 180.0;
var cameraPosition = new Float32Array([0.0, 0.0, 0.0]);
var cameraDirection = normalize(new Float32Array([0.0, 0.0, 1.0]));
var cameraYaw = Math.atan2(cameraDirection[2], cameraDirection[0]) * toDeg;
var cameraPitch = -Math.asin(cameraDirection[1]) * toDeg;
const cameraSpeed = 0.005;
const cameraSensitivity = 0.24;
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
var mouseX;
var mouseY;
var canvas = document.querySelector("#webgpuCanvas");
var fps = document.querySelector("#webgpuFPS");
var numFrames = 0;
var fpsTime = (new Date()).getTime();
var fpsText = "FPS: 0";
var frametimeText = "Frametime: 0ms";
var refreshButton = document.querySelector("#webgpuRefreshFragmentShader");
var editableFragmentShader = document.querySelector("#webgpuFragmentShader");
new ResizeObserver(() => {
    refreshButton.style.height = editableFragmentShader.style.height;
}).observe(editableFragmentShader);
var shiftInEditorPressed = false;
const urlShaderBase64 = location.hash.substring(1).replace(/%3D/g, "=");
if (urlShaderBase64.length > 0) {
    try {
        editableFragmentShader.textContent = atob(urlShaderBase64);
    }
    catch (e) {
        editableFragmentShader.textContent = defaultFragmentShader;
    }
}
else {
    editableFragmentShader.textContent = defaultFragmentShader;
}
var compilationMessage = document.querySelector("#webgpuFragmentShaderCompilationMessage");
window.addEventListener("hashchange", (event) => {
    const urlShaderBase64 = location.hash.substring(1).replace(/%3D/g, "=");
    if (urlShaderBase64.length > 0) {
        try {
            editableFragmentShader.value = atob(urlShaderBase64);
            refreshFragmentShader = true;
        }
        catch (e) {
        }
    }
}, false);
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
        if (event.code == "ShiftLeft" || event.code == "ShiftRight") {
            shiftInEditorPressed = true;
        }
        if (event.code == "Tab") {
            const start = editableFragmentShader.selectionStart;
            const end = editableFragmentShader.selectionEnd;
            var finalCursorStartPosition = start;
            var finalCursorEndPosition = end;
            if (!shiftInEditorPressed) {
                if (start == end) {
                    editableFragmentShader.focus();
                    if (document.execCommand) { // Deprecated
                        document.execCommand("insertText", false, "\t");
                    }
                    finalCursorStartPosition++;
                    finalCursorEndPosition++;
                }
                else {
                    var newlinePosition;
                    // Before selection start
                    if ((newlinePosition = editableFragmentShader.value.substring(0, start).lastIndexOf("\n")) != -1) {
                        editableFragmentShader.selectionStart = newlinePosition + 1;
                        editableFragmentShader.selectionEnd = newlinePosition + 1;
                    }
                    else { // Text start
                        editableFragmentShader.selectionStart = 0;
                        editableFragmentShader.selectionEnd = 0;
                    }
                    editableFragmentShader.focus();
                    if (document.execCommand) { // Deprecated
                        document.execCommand("insertText", false, "\t");
                    }
                    finalCursorStartPosition++;
                    finalCursorEndPosition++;
                    var tmpStart = finalCursorStartPosition;
                    // In selection
                    while ((newlinePosition = editableFragmentShader.value.indexOf("\n", tmpStart)) != -1) {
                        if (newlinePosition >= finalCursorEndPosition) {
                            break;
                        }
                        editableFragmentShader.selectionStart = newlinePosition + 1;
                        editableFragmentShader.selectionEnd = newlinePosition + 1;
                        editableFragmentShader.focus();
                        if (document.execCommand) { // Deprecated
                            document.execCommand("insertText", false, "\t");
                        }
                        tmpStart = newlinePosition + 1;
                        finalCursorEndPosition++;
                    }
                }
            }
            else {
                var tabPosition;
                // Before selection start
                var tmpValue = editableFragmentShader.value.substring(0, finalCursorStartPosition);
                if (((tabPosition = tmpValue.lastIndexOf("\t")) != -1) && (tabPosition > tmpValue.lastIndexOf("\n"))) {
                    editableFragmentShader.selectionStart = tabPosition + 1;
                    editableFragmentShader.selectionEnd = tabPosition + 1;
                    editableFragmentShader.focus();
                    if (document.execCommand) { // Deprecated
                        document.execCommand("delete", false);
                    }
                    finalCursorStartPosition--;
                    finalCursorEndPosition--;
                }
                var tmpStart = finalCursorStartPosition;
                // In selection
                while ((tabPosition = editableFragmentShader.value.indexOf("\t", editableFragmentShader.value.indexOf("\n", tmpStart))) != -1) {
                    if (tabPosition >= finalCursorEndPosition) {
                        break;
                    }
                    editableFragmentShader.selectionStart = tabPosition + 1;
                    editableFragmentShader.selectionEnd = tabPosition + 1;
                    editableFragmentShader.focus();
                    if (document.execCommand) { // Deprecated
                        document.execCommand("delete", false);
                    }
                    tmpStart = tabPosition + 1;
                    finalCursorEndPosition--;
                }
            }
            editableFragmentShader.selectionStart = finalCursorStartPosition;
            editableFragmentShader.selectionEnd = finalCursorEndPosition;
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
    else if (event.target == editableFragmentShader) {
        if (event.code == "ShiftLeft" || event.code == "ShiftRight") {
            shiftInEditorPressed = false;
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
            if (event.target == document.querySelector("#webgpuRefreshFragmentShader")) {
                if (editableFragmentShader.value.replace(/\s+/g, "").length > 0) {
                    location.hash = btoa(editableFragmentShader.value);
                    refreshFragmentShader = true;
                }
                else {
                    location.hash = "";
                }
            }
            else if (event.target == document.querySelector("#webgpuResetCamera")) {
                cameraPosition = new Float32Array([0.0, 0.0, 0.0]);
                cameraDirection = normalize(new Float32Array([0.0, 0.0, 1.0]));
                cameraYaw = Math.atan2(cameraDirection[2], cameraDirection[0]) * toDeg;
                cameraPitch = -Math.asin(cameraDirection[1]) * toDeg;
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
                label: "Uniform buffer",
                size: 1024 + 8,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
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
                    },
                    {
                        binding: 4,
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
                    },
                    {
                        binding: 4,
                        resource: {
                            buffer: this.uniformBuffer,
                            offset: 1024
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
                layout: this.device.createPipelineLayout({
                    label: "To SRGB render pipeline layout",
                    bindGroupLayouts: [
                        toSRGBBindGroupLayout
                    ]
                }),
                vertex: {
                    module: this.vertexShaderModule,
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
            numFrames++;
            var currentTime = (new Date()).getTime();
            if ((currentTime - fpsTime) >= 1000.0) {
                fpsText = "FPS: " + numFrames;
                numFrames = 0;
                fpsTime += 1000.0;
            }
            frametimeText = "Frametime: " + deltaTime.toFixed(2) + "ms";
            fps.textContent = fpsText + " - " + frametimeText;
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
                        layout: this.device.createPipelineLayout({
                            label: "Render pipeline layout",
                            bindGroupLayouts: [
                                this.bindGroupLayout
                            ]
                        }),
                        vertex: {
                            module: this.vertexShaderModule,
                            entryPoint: "main"
                        },
                        primitive: {
                            topology: "triangle-list",
                            frontFace: "ccw",
                            cullMode: "back"
                        },
                        fragment: {
                            module: fragmentShaderModule,
                            entryPoint: "main",
                            targets: [{
                                    format: "rgba16float"
                                }]
                        }
                    });
                }
                refreshFragmentShader = false;
            }
            var xOffset = 0.0;
            var yOffset = 0.0;
            if (upPressed) {
                yOffset -= cameraSensitivity * deltaTime;
            }
            if (leftPressed) {
                xOffset += cameraSensitivity * deltaTime;
            }
            if (downPressed) {
                yOffset += cameraSensitivity * deltaTime;
            }
            if (rightPressed) {
                xOffset -= cameraSensitivity * deltaTime;
            }
            cameraYaw = (cameraYaw + xOffset) % 360.0;
            cameraPitch = Math.max(-89.0, Math.min(89.0, cameraPitch + yOffset));
            const yawRad = cameraYaw * toRad;
            const pitchRad = cameraPitch * toRad;
            cameraDirection[0] = Math.cos(pitchRad) * Math.cos(yawRad);
            cameraDirection[1] = -Math.sin(pitchRad);
            cameraDirection[2] = Math.cos(pitchRad) * Math.sin(yawRad);
            cameraDirection = normalize(cameraDirection);
            if (wPressed) {
                cameraPosition[0] += cameraDirection[0] * (cameraSpeed * deltaTime);
                cameraPosition[1] += cameraDirection[1] * (cameraSpeed * deltaTime);
                cameraPosition[2] += cameraDirection[2] * (cameraSpeed * deltaTime);
            }
            if (aPressed) {
                const t = normalize(new Float32Array([-cameraDirection[2], 0.0, cameraDirection[0]]));
                cameraPosition[0] += t[0] * (cameraSpeed * deltaTime);
                cameraPosition[2] += t[2] * (cameraSpeed * deltaTime);
            }
            if (sPressed) {
                cameraPosition[0] -= cameraDirection[0] * (cameraSpeed * deltaTime);
                cameraPosition[1] -= cameraDirection[1] * (cameraSpeed * deltaTime);
                cameraPosition[2] -= cameraDirection[2] * (cameraSpeed * deltaTime);
            }
            if (dPressed) {
                const t = normalize(new Float32Array([-cameraDirection[2], 0.0, cameraDirection[0]]));
                cameraPosition[0] -= t[0] * (cameraSpeed * deltaTime);
                cameraPosition[2] -= t[2] * (cameraSpeed * deltaTime);
            }
            if (spacePressed) {
                cameraPosition[1] += cameraSpeed * deltaTime;
            }
            if (shiftPressed) {
                cameraPosition[1] -= cameraSpeed * deltaTime;
            }
            const uniformDataTime = new Float32Array([timestamp / 1000.0]);
            const uniformDataResolution = new Uint32Array([canvas.width, canvas.height]);
            const uniformDataMouse = new Int32Array([mouseX, mouseY]);
            this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformDataTime.buffer, 0, 4);
            this.device.queue.writeBuffer(this.uniformBuffer, 256, cameraPosition.buffer, 0, 12);
            this.device.queue.writeBuffer(this.uniformBuffer, 512, cameraDirection.buffer, 0, 12);
            this.device.queue.writeBuffer(this.uniformBuffer, 768, uniformDataResolution.buffer, 0, 8);
            this.device.queue.writeBuffer(this.uniformBuffer, 1024, uniformDataMouse.buffer, 0, 8);
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
                    }]
            });
            renderPassEncoder.setPipeline(this.renderPipeline);
            renderPassEncoder.setBindGroup(0, this.renderPipelineBindGroup);
            renderPassEncoder.draw(3, 1, 0, 0);
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
