# WebGPU Shader Editor

<script src="shader_editor.js" defer></script>
<p id="webgpuCheck"></p>
<button id="webgpuRefreshFragmentShader" style="width: 100%;">Run</button>
<center>
	<canvas id="webgpuCanvas" width="980" height="600"></canvas>
</center>
<textarea class="highlight" id="webgpuFragmentShader" spellcheck="false" style="width: 100%; height: 600px; overflow-y: scroll; white-space: break-spaces; padding: 10px; border-style: solid; border-width: 1px; resize: none;"></textarea>
<p class="highlight" id="webgpuFragmentShaderCompilationMessage" style="width: 100%; white-space: break-spaces; padding: 10px; border-style: solid; border-width: 1px; border-color: rgb(175, 0, 0);"></p>

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