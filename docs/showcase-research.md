# Research applied to the car showcase

The experience remains a live model and text-free at this stage. The eventual product page should explain the car through the imagery, then add concise copy at deliberate resting points. These are design decisions for this project, not claims that the studios use our implementation.

## Primary sources reviewed

- [Utsubo's Vectr case study](https://www.utsubo.com/blog/vectr-ai-startup-branding-case-study): the complete article describes a guided product journey, restrained visual identity, continuous transitions, and a real-time hero. It reports OffscreenCanvas rendering and an optimized Blender-to-GLB pipeline using instancing, Draco, and texture reduction. Its reported Lighthouse scores and asset reductions belong to Vectr; they have not been measured here. Applied here: a persistent car, three intentional environments, shared condition state, instanced detail, cached scene lighting, and breathing room at the start and end of the two new flights. Moving our renderer into a worker or migrating to WebGPU would be a separate architectural project, not an automatic quality improvement.
- [Lusion's studio site](https://lusion.co) describes its combination of design, motion, 3D, and development, and lists both interactive websites and rendered projects, including Porsche: Dream Machine. This distinction matters: a rendered automotive film is not evidence that the same quality runs interactively. [Lusion's WebGL Scroll Sync explanation](https://github.com/lusionltd/WebGL-Scroll-Sync) identifies native-scroll/rAF drift and explains a single-canvas approach, with an absolute-positioned, padded canvas workaround when visuals must align with scrolling DOM elements. Our current fixed full-screen scene has no anchored copy. We retain native scroll; when copy is added to the pinned stage, its transitions should use the same damped progress as the camera. The padded-canvas workaround is only relevant if the design later attaches 3D to independently scrolling document blocks.
- [Utsubo's glTF curve exporter](https://github.com/utsuboco/gltf_curve_exporter) preserves authored Bezier/NURBS control data for Three.js. Applied principle: author the camera path rather than permit free orbit. Our two new paths use continuous Hermite interpolation, gentle banking, and eased entry/exit holds. The original requested studio side tracks remain unchanged apart from the wider rear view. We have not installed the exporter or claimed that these paths came from Blender.
- [Active Theory's ActiveFrame documentation](https://github.com/activetheory/activeframe) describes frame-accurate WebCodecs decoding of encoded video samples and direct use in graphics contexts. It is a useful alternative for interactive films, but the user explicitly prefers the live model. No video decoding pipeline has been introduced. Active Theory's homepage provides little readable material without running its app, so this assessment relies on its published tool documentation rather than inferring proprietary renderer details.
- [Lumette's current public homepage](https://lumette.ai) is reachable as HTML and identifies cinematic 3D website kits, but its initial document does not expose the reel's scene or sufficient rendering detail. The Instagram reel has not been inspected. No attribution of ray tracing, fluid simulation, or a particular 3D pipeline is justified from that document.

## Flow and eventual copy

| Beat | Visual role now | Future copy opportunity |
| --- | --- | --- |
| Studio opening | Establish the silhouette and hexagonal studio identity | Model name and one short positioning line, in space clear of the car |
| Dry horizontal pass | Read the bodywork without distracting orbit | A single verified design or craftsmanship detail |
| Wide rear and rainfall | Establish scale, then introduce the condition change | Keep the onset largely free of copy; let the weather register |
| Wet return pass | Show beads, clearcoat response, and changing highlights | One short material detail; avoid unsupported performance claims |
| Sunlight | Change contrast and reveal the shape under hard daylight | Brief setting introduction during the opening hold; detail text after the move settles |
| Foam chamber and final hold | Contrast opaque lather with reflective paint, then resolve to a complete car composition | A clean resting point for a later product action; do not imply soap is an automotive feature |

The new chapters hold their first pose for 6% of local scroll and their last pose for 8%. The intervening motion eases into and out of continuous paths. Cuts briefly dip to black so an environment swap does not masquerade as a physical camera flight between distant sets. Reverse scrolling restores the previous environment and condition state.

Future copy should be real HTML, use the rendered camera clock, fade before fast repositioning, and stay out of the car's silhouette. The final composition must be reviewed with actual approved wording before choosing text alignment; no unverified specifications or invented brand claims have been added. A future product page also needs meaningful headings, navigation, and a clear action, even though this visual prototype intentionally omits them.

## Graphics priorities

Material separation, coherent reflection sources, varied particle scales, depth-tested rain, and restrained exposure do more for this model than indiscriminately adding glow. The visible hexagonal fixtures are represented in the reflection environment; water, paint, froth, and thin soap films use different material responses. See [rendering notes](rendering-notes.md) for implementation details and approximations. This is rasterized real-time rendering, not ray tracing or a fluid solver. The original model's geometry and texture quality remain the fidelity ceiling, and software-browser testing cannot establish desktop GPU frame rate.
