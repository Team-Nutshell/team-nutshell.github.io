# NutshellEngine's 2nd anniversary!

Today marks the **second anniversary of NutshellEngine**.

This devblog won't be as long as the [**first anniversary one**](1stanniversary.md), as most of what happened between the 1st anniversary and now is described in the [**1st release devblog**](1strelease.md).

## But a few things still happened
Between the first release and now, **2 months passed**, so a few things happened:
- In the first release devblog, I said "*It’s not yet possible to **specify values for scripts variables in the scene file (and editor)** but it’s still being designed.*", well not only it has been designed, it's also released in the [**0.1.0 version**](https://team-nutshell.itch.io/nutshellengine/devlog/795586/nutshellengine-010) of NutshellEngine! It's pretty basic at the moment and is done by parsing the script instead of a complex compiler analysis, but it works for the supported types (these supported types being boolean, integers, floats, string, mathematical vectors and quaternion). The editor adapts the Scriptable component widget when a new editable variable is detected, it's then written into the scene file and read by the runtime, which saves a lot of time when experimenting and avoids script duplication just to change a few values.

![Editable Script Variables](https://img.itch.zone/aW1nLzE3ODUyNjM5LmdpZg==/original/RGULLz.gif)

*Editable Script Variables, here, the background color is modified in the editor and read by the runtime*

- **A lot of Editor UX improvements**, with less clicks to do basic things, **guizmos**, general improvements, and the possibility to edit NutshellEngine's own file formats files (like *ntml* Material files) directly on the right panel of the editor, which is way more practical than opening a new window. And talking about materials, they got **improved**, they used to only accept images for textures, they now accept colors and values directly. This allows to experiment with some parameters without having to draw a 1x1 pixel to get the color needed.

![Edit Material files](https://img.itch.zone/aW1nLzE3ODUyNjc4LmdpZg==/original/PXuDqd.gif)
![Guizmos](https://img.itch.zone/aW1nLzE3NjQ0Mjg5LmdpZg==/original/rc7n4O.gif)

*Editing Materials on the right panel, directly updated, and guizmos*

- The runtime got some improvements, with **some new functions for some modules**, a new light type (*Ambient*) and a way to control the light's intensity, and **even though the Editor got worked on way more than the runtime in this period**, I estimate that **the runtime is in a pretty good state** at the moment so I can take some time to work on the Editor and **make the engine more accessible for everyone**.

![Light Intensity](https://img.itch.zone/aW1nLzE3NjQ0NDEyLmdpZg==/original/usWlfI.gif)

*Light intensity can be specified on the editor and controlled in scripts*

## Conclusion
A short article, as said earlier, most of what happened between the first anniversary and the first release is on the [**1st release devblog**](1strelease.md).

Releases and patch notes are available on [itch.io](https://team-nutshell.itch.io/nutshellengine).