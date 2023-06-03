# WebGPU Model Visualizer

<script src="pako.js"></script>
<script src="model_visualizer.js" defer></script>
<p id="webgpuCheck"></p>
<p id="webgpuFPS"></p>
<p id="webgpuModelInformation"></p>
<p id="webgpuTextureInformation"></p>
<center>
	<canvas id="webgpuCanvas" width="980" height="550"></canvas>
</center>
<div>
	<input id="webgpuFile" type="file" accept=".obj,.pcd,.png">
	<div style="float: right;">
		<div style="float: left; margin-right: 10px;">
			<b>Primitive:</b>
			<input type="radio" name="webgpuPrimitive" id="triangles" value="triangles" checked>
			<label for="triangles">Triangles</label>
			<input type="radio" name="webgpuPrimitive" id="points" value="points">
			<label for="points">Points</label>
		</div>
		<b>Rendering mode:</b>
		<select name="Rendering mode" id="webgpuRenderingMode">
			<option value="solidColor">Solid Color</option>
			<option value="normals">Normals</option>
			<option value="uv">UV</option>
			<option value="colors">Vertex Colors</option>
			<option value="tangents">Tangents</option>
			<option value="simpleShading">Simple Shading</option>
			<option value="texture">Texture</option>
		</select>
	</div>
</div>
<div style="margin-top: 10px;">
	<button id="webgpuResetCamera">Reset camera</button> <button id="webgpuCalculateTangents">Calculate tangents (Lengyel, 2001)</button>
</div>
<p id="webgpuFileCheck"></p>

Supported model formats:
- **.obj**
- **.pcd** (Point Cloud Data)

Supported image formats:
- **.png**

Click on the canvas to control the camera.

Use **WASD** to move the camera.

Use **arrow keys** to rotate the camera.

Use **space** to go up and **left shift** to go down.
