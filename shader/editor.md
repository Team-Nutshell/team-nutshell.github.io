# WebGPU Shader Editor

<script src="shader_editor.js" defer></script>
<p id="webgpuCheck"></p>
<center>
	<canvas id="webgpuCanvas" width="980" height="600"></canvas>
</center>
<br>
<button id="webgpuRefreshFragmentShader">Run</button>
<textarea class="highlight" id="webgpuFragmentShader"></textarea>
<p class="highlight" id="webgpuFragmentShaderCompilationMessage"></p>

Click on the canvas to control the camera.

Use **WASD** to move the camera.

Use **arrow keys** to rotate the camera.

Use **space** to go up and **left shift** to go down.

Pre-defined variables:
```
time: f32 - Current timestamp, starting from 0.0 at application launch.
cameraPosition: vec3f - Current position of the camera, starting at vec3f(0.0, 0.0, 0.0).
cameraDirection: vec3f - Current direction of the camera, starting at vec3f(0.0, 0.0, 1.0).
resolution: vec2u - Resolution, is 980u by 600u pixels.
```