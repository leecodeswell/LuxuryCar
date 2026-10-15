# Live 3D rendering notes

The user prefers the original live car over the offline-film experiment. This version extends that live experience and keeps the original studio shot structure. The new sunlight and foam sequences are real-time 3D chapters, with desktop as the current priority. No additional model, paid asset, render service, or pre-rendered footage is used.

## Primary material reviewed

| Source | Verified material | Applied treatment |
| --- | --- | --- |
| [Google Filament material documentation](https://github.com/google/filament/blob/main/docs/Materials.md.html), especially clear coat and iridescence | Distinguishes the dielectric clearcoat over car paint from base metallic response. Describes thin-film reflection as angle- and thickness-dependent interference, with useful film thicknesses on the order of visible wavelengths. | Separate paint, water, opaque froth, and thin-film bubble materials. Soap-film bubbles use Three.js physical iridescence, IOR 1.333, and a 280–650 nm film range. Dense lather uses rough, nonmetallic shading instead of treating the entire coat as transparent glass. |
| [Three.js Sky source and references](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/objects/Sky.js) | Describes the Preetham analytical daylight model, its atmospheric scattering parameters, and environment-map use. The installed Drei sky uses this family of analytical sky rendering. | A daylight sky and a matching hard directional sun replace the indoor backdrop. Pale stone, warm ground bounce, and real geometry give the new environment scale. Sunlight glare is gated by the projected sun's image brightness rather than being permanently painted over the screen. |
| [Three.js physical material shader](https://github.com/mrdoob/three.js/blob/dev/src/renderers/shaders/ShaderLib/meshphysical.glsl.js) and [physical transmission example](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_materials_physical_transmission.html) | Physical shading has distinct roughness, metalness, clearcoat normals, transmission, and IOR. Transmission and alpha opacity represent different effects. | Dielectric water beads use IOR 1.333, surface thickness, and transmission. World-space microbeads perturb both base and clearcoat normals; wetness reduces roughness. Foam replaces the metallic response with a rough white layer and reduces the clearcoat. |
| [Drei Environment](https://github.com/pmndrs/drei/blob/master/src/core/Environment.tsx) and the installed implementation | Supports a captured scene environment with authored light shapes, and finite capture frames. | Visible instanced hexagon fixtures are also represented in the captured lighting rig so their shapes appear in the car's reflections. The rig is recaptured when the environment changes, not six times on every animation frame. |
| [Three.js UnrealBloomPass](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/postprocessing/UnrealBloomPass.js) | Uses a downsampled mip chain to spread bright highlights at several scales. | Restrained HDR bloom emphasizes fixtures and sun glints. Final tone mapping is applied after the HDR effects. Excessive glow was reduced after reviewing actual browser frames. |

These sources informed material and rendering decisions. Studio artwork and proprietary site code were not copied. See [showcase research](showcase-research.md) for the further studio research and its application to pacing and future copy.

## Water

The first chapter preserves the old side-on tracking shots and rain cue. The rear camera is substantially farther away, and the room's walls have moved beyond that flight.

Rain uses instanced camera-facing streaks animated on the GPU. Varying fall speeds and lengths replace uniform CPU-updated lines. Depth testing lets the car occlude rain, and a simple vehicle envelope suppresses streaks beneath the body. This is an approximation, not mesh-accurate rain collision.

Two water scales serve different viewing distances: geometric surface beads give silhouette and highlight detail, while world-space microbeads and vertical rivulets supply finer normal detail. Geometry deposition is staggered across the rainfall onset. Ground impact rings and shallow animated ripples connect the rain to the floor. Mist is a lightweight composited surface effect, not volumetric light transport.

## Foam

A thin raised surface coat, rough pore detail, 9,000 instanced froth bubbles, runoff trails, and ground lather make the soap visibly different from white paint. Thin-film bubbles are a separate transmissive material and drift slowly in the wash chamber. The layer is artist-authored, with procedural coverage and gravity-oriented trails; it does not simulate fluid flow, bubble coalescence, or multiple scattering through a real foam volume.

## Cost and limits

The shadow pass uses variance maps, whose float samplers remain compatible with the planar reflection across scene transitions. A hardware comparison sampler produced a reproducible type mismatch in the sunlight-to-wash transition in the installed stack. Desktop checks now assert native WebGL status at scene boundaries.

Instancing keeps fixture and particle draw calls low. Shadow maps are refreshed when sets change because the car is stationary. The shared model remains mounted while environments switch. A 768-pixel planar reflection, a limited transmission buffer, HDR bloom, and multisample antialiasing favor desktop rendering quality without a live path tracer. The environment has no exposed GPU; browser validation uses software WebGL and is not a measurement of visitors' hardware performance.

The demo car's geometry and missing production textures remain fidelity limits. This implementation improves materials, lighting, weather, and shot design without claiming production automotive realism. Mobile tuning is deferred at the user's request.
