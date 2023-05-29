# WebGPU Shader Editor

<script src="shader_editor.js" defer></script>
<p id="webgpuCheck"></p>
<center>
	<canvas id="webgpuCanvas" width="980" height="550"></canvas>
</center>
<div style="height: 275px;">
	<textarea class="highlight" id="webgpuFragmentShader" spellcheck="false" style="width: 95%; height: 100%; overflow-y: scroll; white-space: break-spaces; padding: 10px; border-style: solid; border-width: 1px; resize: none;"></textarea>
	<button id="webgpuRefreshFragmentShader" style="width: 5%; height: 100%; float: right;">Run</button>
</div>
<p class="highlight" id="webgpuFragmentShaderCompilationMessage" style="width: 100%; height: 100px; overflow-y: scroll; white-space: break-spaces; padding: 10px; border-style: solid; border-width: 1px; border-color: rgb(175, 0, 0);"></p>

Click on the canvas to control the camera.

Use **WASD** to move the camera.

Use **arrow keys** to rotate the camera.

Use **space** to go up and **left shift** to go down.

Pre-defined variables:
```
time: f32 - Current timestamp in seconds, starting from 0.0 at application launch.
cameraPosition: vec3f - Current position of the camera, starting at vec3f(0.0, 0.0, 0.0).
cameraDirection: vec3f - Current direction of the camera, starting at vec3f(0.0, 0.0, 1.0).
resolution: vec2u - Resolution, is 980u by 600u pixels.
```