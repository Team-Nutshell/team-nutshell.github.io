# WebGPU Shader Editor

<script src="shader_editor.js" defer></script>
<p id="webgpuCheck"></p>
<canvas id="webgpuCanvas" width="800" height="600"></canvas>
<br>
<button id="webgpuRefreshFragmentShader">Run</button>
<p id="webgpuFragmentShader" contenteditable="true"></p>
<br>
<p id="webgpuFragmentShaderCompilationMessage"></p>

Use **WASD** to move the camera.

Use **arrow keys** to rotate the camera.

Pre-defined variables:
```
time: f32 - Current timestamp, starting from 0.0 at application launch.
cameraPosition: vec3f - Current position of the camera.
cameraDirection: vec3f - Current direction of the camera.
```