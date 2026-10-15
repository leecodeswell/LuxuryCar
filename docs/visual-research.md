# Visual research and rendering decision

The requested references informed the overhaul before application changes. Research access was limited: the cloud egress proxy returned HTTP 403 for the public Lumette, Lusion, Active Theory, and Utsubo domains. The Instagram reel was not watchable here. **No claim is made that Lumette uses any particular renderer or implementation.** Specific domain additions were saved in the environment draft so live-site research can continue after the user saves them.

The following primary material was actually retrieved and read from the studios' GitHub repositories, together with renderer documentation. No studio artwork or proprietary code was copied.

| Source | Verified material | Applied strategy |
| --- | --- | --- |
| [Lusion — WebGL Scroll Sync](https://github.com/lusionltd/WebGL-Scroll-Sync) | Describes the timing mismatch between native scrolling and WebGL's animation frame; discusses a single shared rendering surface and synchronization tradeoffs. | One normalized, frame-driven scroll timeline. No independent DOM scene animation. The specific absolute-canvas workaround is unnecessary because this experience has no DOM-aligned elements. |
| [Active Theory — ActiveFrame](https://github.com/activetheory/activeframe) | A published pipeline for encoded video with frame-accurate browser navigation, aimed at interactive scrubbing and predictable media delivery. | Render expensive fixed-camera imagery offline; scrub compressed frames in the browser. This project uses native H.264/VP9 video, not ActiveFrame's beta `.af` format or its source code. One seek stays in flight to prevent a backlog. |
| [Utsubo — studio/open-source overview](https://github.com/utsuboco/readme) and [glTF Curve Exporter](https://github.com/utsuboco/gltf_curve_exporter) | Describes their real-time 3D and art-direction work and provides tools for moving authored curves from Blender into browser scenes. | Authored camera position, aim, lens, and restrained banking. A shared Hermite path drives the Blender render and live 3D fallback. No pointer-driven orbit. |
| [Three GPU Path Tracer](https://github.com/gkjohnson/three-gpu-pathtracer), [WebGPU API](https://github.com/gkjohnson/three-gpu-pathtracer/blob/main/src/webgpu/API.md) | Progressive samples accumulate; changes to camera, materials, or transforms restart the image. Moving-camera previews may use reduced resolution. The current implementation requires WebGPU. | Do not promise smooth, noise-free live path tracing while the camera and rain continually move. Use Cycles offline for this fixed cinematic brief, with a clearly identified rasterized WebGL fallback. |
| [Khronos Car Concept authoring notes](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept) | Documents physically based car paint, tiled tire normals, ambient occlusion, UV cleanup, and asset optimization. | Treat asset detail, material setup, and lighting as separate requirements. Camera movement and postprocessing cannot manufacture missing tire, interior, emblem, or bodywork detail. The concept asset was evaluated but not substituted into this project. |

## Rendering changes

- Offline Blender Cycles light transport, reflections, dielectric glass, and water refraction.
- Rebuilt clearcoat paint, forged aluminium, steel rotors, rubber, carbon, and interior materials. The demo's plain grey brake materials were a visible defect.
- Large photographic area lights, darker continuous studio architecture, and correct contact/reflection on the floor.
- Normal/albedo-guided Intel Open Image Denoise followed by AgX grading. The official OIDN binary was checked against the SHA-256 digest on its GitHub release.
- Depth-composited aerial haze and restrained highlight bloom are **compositing**, not path-traced volumetric simulation. A lightweight foreground rain/mist layer stays alive while the scroll-controlled film is stationary.
- Smooth, continuously differentiable camera paths with high offset rear sweeps rather than a flat rear view. The return flight crosses the other side of the car and descends toward its front quarter.
- All text, navigation, free-look, and paint controls remain absent from the visual experience.

## Free-resource limit

The user selected free assets and this machine. No paid model or render service is used. Promising demo Porsche/LaFerrari assets were examined, but their noncommercial restrictions make them poor replacements for a generally publishable project. The original Three.js Ferrari is retained, with its attribution.

The current four-CPU environment has no exposed GPU. The shipped film is a denoised 1280×720 preview; it does not turn the original demo mesh into a production automotive asset. Final microscopic detail would require a better licensed source asset. Higher sampling and resolution can be regenerated with the included free Blender workflow, preferably on a machine with a GPU.

## Honest runtime description

The primary experience is **interactive, scroll-scrubbed offline path-traced footage**, not live browser ray tracing. H.264/VP9 playback and a composited atmosphere run in the browser. The optional Three.js fallback is live rasterization. `public/cinema/manifest.json` records actual render settings, sample count, source size, and interpolation. No “RTX enabled” or unsupported quality claims are shown in the product.
