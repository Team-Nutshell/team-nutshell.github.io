# Vulkan: VkRenderPass VS Dynamic Rendering

A question many beginners have when starting Vulkan is: **should I use VkRenderPass or dynamic rendering** to make a render pass to draw things. The short answer is simply: **if you support or plan to support mobile devices, use VkRenderPass, else, use dynamic rendering**.

But if you want a longer version of this answer, explaining why you should one use or the other, then this article will explain it.

## Render passes
A **render pass** is a state inside a **command buffer** where you can draw meshes into framebuffers. Basically, if you want to use [**vkCmdDraw**](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdDraw.html) [and](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdDrawIndexed.html) [other](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdDrawIndirect.html) [draw](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdDrawIndexedIndirect.html) [commands](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdDrawIndexedIndirectCount.html), you need to be inside a render pass, which will define on what color and depth images the result of the fragment shader will write to. A render pass will also allow you to decide [what you want to do with these images](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkAttachmentLoadOp.html) before and after writing on it: clearing it with a solid color (*VK_ATTACHMENT_LOAD_OP_CLEAR*), keep what's already on it and write over it (*VK_ATTACHMENT_LOAD_OP_LOAD*) or you simply don't care about the content of the image, as you will probably write over the entire image anyway (*VK_ATTACHMENT_LOAD_OP_DONT_CARE*). *Unrelated note*: if you write on the entire image, then it is unnecessary and probably slower to clear it rather than not caring about its content.

There are two ways to enter a render pass in Vulkan, creating a [**VkRenderPass**](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkRenderPass.html) object and using [**vkCmdBeginRenderPass**](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdBeginRenderPass.html) or using dynamic rendering with [**vkCmdBeginRendering**](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdBeginRendering.html). Obviously, if there are two ways, then they have different usages.

## VkRenderPass
Creating a [**VkRenderPass**](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkRenderPass.html) was the only way to enter a render pass before the release of the [VK_KHR_dynamic_rendering](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VK_KHR_dynamic_rendering.html) extension late 2021. A VkRenderPass is composed of multiple [**subpasses**](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkSubpassDescription.html), or multiple passes inside a render pass, especially useful for **tile-based rendering**.

### Tile-based rendering (TBR)
Tile-based rendering is the way mobile devices render meshes. The principle is to split the screen in tiles (for example, pieces of 16 by 16 pixels on ARM Mali GPUs) to build a list of geometry contained in each tile to then perform the shading tile by tile using this list of primitives contained in a tile, compared to the way desktop GPUs render objects by shading entire triangles, independently on their position on the screen.

![Tiles rendering](https://developer.samsung.com/sd2_images/game/tech_GPUFramebuffer_14.gif)

*Tiled rendering (left: color buffer, right: depth buffer) - [Samsung: GPU Framebuffer Memory: Understanding Tiling](https://developer.samsung.com/galaxy-gamedev/resources/articles/gpu-framebuffer.html)*

**Subpasses allow to chain operations that operate on the same tile to profit from tile-based rendering advantages**. For example, deferred rendering consists of two passes, one to build a G-Buffer containing the information about the scene in screen-space, and one to read these images and use these information to shade the objects. As the information needed about a pixel is contained in the same coordinates in the G-Buffer, deferred rendering is really efficient with tile-bases rendering. It can then be made using **a single VkRenderPass containing two subpasses**.

The goal of tile-based rendering is to reduce the amount of memory transfers to reduce energy consumption, which is a bigger concern on mobile devices than on computers. It obviously has some disadvantages on the way desktop GPUs render objects, starting with a bigger latency and forcing the order for some passes, as they may be incompatible with the tiles (for example: generating shadow maps would not use the same coordinates as deferred rendering).

**VkRenderPass** allow to take this into account and define these subpasses, with the appropriate [**dependencies**](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkSubpassDependency.html), the synchronization between subpasses.

## Dynamic rendering
Introduced in September 2021 with the [**VK_KHR_dynamic_rendering**](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VK_KHR_dynamic_rendering.html) extension then part of Vulkan 1.3's core in January 2022, dynamic rendering is the second way to enter a render pass.

Dynamic rendering comes from the realization that VkRenderPass are way too tedious for no performance gain on desktop. They require the creation of a VkRenderPass, with the definition of one or more subpasses (making more than one subpass on desktop is unnecessary) and creating a [VkFrameBuffer](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkFramebuffer.html) to store the image views. The VkRenderPass (or a [compatible one](https://registry.khronos.org/vulkan/specs/1.3-extensions/html/chap8.html#renderpass-compatibility)) must also be created before the graphics pipeline as a render pass is needed to understand on what kind of images the graphics pipeline will be used to write to.

With dynamic rendering, no more VkRenderPass nor VkFramebuffer, the images you will write on and what you will do with them before and after writing on them is now specified when recording commands in a command buffer, using [VkRenderingInfo](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkRenderingInfo.html), needed by [vkCmdBeginRendering](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdBeginRendering.html). Graphics pipelines also do not require a VkRenderPass anymore, as the format of the images are now specified in [VkPipelineRenderingCreateInfo](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkPipelineRenderingCreateInfo.html). Synchronization is now performed using classic [**pipeline barriers**](VkPipelineRenderingCreateInfo).

## Conclusion
Mobile GPUs render objects differently than desktop GPUs, and it was the reasoning behind Vulkan's VkRenderPass, as the API is cross-platform and works on desktop and mobile. With time, needs evolved and a simpler way to make render passes, for GPUs that do not get gain from multiple subpasses, has been made: dynamic rendering.

The conclusion is the same as the start of the article: **if you support or plan to support mobile devices, use VkRenderPass, else, use dynamic rendering**.