# Live 3D rendering notes

The user prefers the original live car over the offline-film experiment. This version extends that live experience and keeps the original studio shot structure. The soap and sunlight sequences are real-time 3D chapters, with desktop as the current priority. No additional model, paid asset, render service, or pre-rendered footage is used.

## Primary material reviewed

| Source | Verified material | Applied treatment |
| --- | --- | --- |
| [Google Filament material documentation](https://github.com/google/filament/blob/main/docs/Materials.md.html), especially clear coat and iridescence | Distinguishes the dielectric clearcoat over car paint from base metallic response. Describes thin-film reflection as angle- and thickness-dependent interference, with useful film thicknesses on the order of visible wavelengths. | Separate paint, water, and opaque froth materials. Floating thin-film bubbles were removed at the user’s request. Dense lather uses rough, nonmetallic shading instead of treating the entire coat as transparent glass. |
| [Three.js physical material shader](https://github.com/mrdoob/three.js/blob/dev/src/renderers/shaders/ShaderLib/meshphysical.glsl.js) and [physical transmission example](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_materials_physical_transmission.html) | Physical shading has distinct roughness, metalness, clearcoat normals, transmission, and IOR. Transmission and alpha opacity represent different effects. | Dielectric water beads use IOR 1.333, surface thickness, and transmission. World-space microbeads perturb both base and clearcoat normals; wetness reduces roughness. Foam replaces the metallic response with a rough white layer and reduces the clearcoat. |
| [Drei Environment](https://github.com/pmndrs/drei/blob/master/src/core/Environment.tsx) and the installed implementation | Supports a captured scene environment with authored light shapes, and finite capture frames. | Visible ceiling-only instanced hexagon fixtures are also represented in the captured lighting rig so their shapes appear in the car's reflections. The rig is recaptured when the environment changes, not six times on every animation frame. |
| [Three.js UnrealBloomPass](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/postprocessing/UnrealBloomPass.js) | Uses a downsampled mip chain to spread bright highlights at several scales. | Restrained HDR bloom emphasizes fixtures and sun glints. Final tone mapping is applied after the HDR effects. Excessive glow was reduced after reviewing actual browser frames. |

These sources informed material and rendering decisions. Studio artwork and proprietary site code were not copied. See [showcase research](showcase-research.md) for the further studio research and its application to pacing and future copy.

## Water

The first chapter preserves the old side-on tracking shots and rain cue. The rear camera is substantially farther away, and the room's walls have moved beyond that flight.

The installed React Three Fiber version copies ShaderMaterial uniform wrappers when applying props. Weather materials explicitly bind the live uniform objects to the material, so frame-loop wetness, time, density, and spray updates reach GLSL. Regression checks inspect the actual material values, in addition to mesh visibility.

Rain uses 9,000 instanced camera-facing streaks animated on the GPU, with variable speed, width, length, lighting, and near-camera softness. Varying fall speeds and lengths replace uniform CPU-updated lines. Depth testing lets the car occlude rain, and a simple vehicle envelope suppresses streaks beneath the body. This is an approximation, not mesh-accurate rain collision.

Two water scales serve different viewing distances: geometric surface beads give silhouette and highlight detail, while world-space microbeads and vertical rivulets supply finer normal detail. Geometry deposition is staggered across the rainfall onset. Ground impact rings and shallow animated ripples connect the rain to the floor. Ground impacts also launch 1,800 short ballistic splash particles. Mist now uses 32 depth-tested upright billboards with advected fractal noise, soft boundaries, floor-height attenuation, and approximate vehicle exclusion. This replaces the single horizontal mist plane; it is not volumetric light transport or scene-depth soft-particle rendering.

## Foam

A thin raised surface coat, rough pore detail, 9,000 instanced froth bubbles, runoff trails, and ground lather make the soap visibly different from white paint. There are no floating soap-film bubbles. A noisy continuous spray fan and 4,800 droplets enters from an off-screen source and sweeps front-to-rear. The same deposition progress controls the spray target, a world-space front across the coating, and the visibility of surface froth. The car begins wet and uncoated; the spray starts, builds the coat, then stops before the final composition. The layer is artist-authored, with procedural coverage and gravity-oriented trails; it does not simulate fluid flow, bubble coalescence, or multiple scattering through a real foam volume.

## Cost and limits

The shadow pass uses variance maps, whose float samplers remain compatible with the planar reflection across scene transitions. A hardware comparison sampler produced a reproducible type mismatch in the environment transition in the installed stack. Desktop checks now assert native WebGL status at scene boundaries.

Instancing keeps fixture and particle draw calls low. Shadow maps are refreshed when sets change because the car is stationary. The shared model remains mounted while environments switch. The desert uses a hard directional light and warm hemisphere lighting against a sand-colored background, with exponential distance fog merging the ground into the void. A 768-pixel planar reflection, a limited transmission buffer, HDR bloom, and multisample antialiasing favor desktop rendering quality without a live path tracer. The environment has no exposed GPU; browser validation uses software WebGL and is not a measurement of visitors' hardware performance.

The demo car's geometry and missing production textures remain fidelity limits. This implementation improves materials, lighting, weather, and shot design without claiming production automotive realism. Mobile tuning is deferred at the user's request.
