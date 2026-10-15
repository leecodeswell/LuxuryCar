# Continuous rain, foam, and rinse studio

One live car, floor, camera rig, fixture array, reflection capture, and mist system remain mounted for the whole experience. The desert chapter and all chapter-cut fades are removed. Desktop remains the current priority.

## Flow

The dry reveal, horizontal side pass, wide rear arc, and rainy inward approach occupy the first 60% of scroll. Soap application occupies 60–82%; body rinsing and the floor wash occupy 82–100%. The soap path begins at the exact position, target, lens, and roll of the rain path's final shot. Its initial tangent is scaled by the chapter durations, matching velocity in global scroll space. There is no environment swap, camera teleport, fade, or exposure step at the join.

The studio has no walls or ceiling plane. Twenty-one suspended hexagonal LED fixtures use round aluminum housings, luminous cylindrical diffusers, rounded corner joints, and suspension cables. The photographic room HDR is unused. A single procedural environment capture contains the modeled lights and authored reflection sources.

## Authored lighting failures

`src/lighting.js` triggers a recovery envelope when the rendered camera crosses global scroll position 0.384, the original start of the rainy inward approach. This is one weather-reveal event, not a repeating timer. Rain and denser, taller mist switch from absent to fully present during the complete-blackout portion of the event; they do not fade in through the lit studio. Each event completes while scrolling is idle; rewinding across the onset rearms it for another forward pass. Fast scrolling plays the latest crossed cue rather than queuing a succession of failures.

The envelope briefly flickers, goes completely dark, overshoots to seven times normal illumination, drops below normal, then regulates over 1.9 seconds. Actual LED emission, ambient/key/fill/rim lighting, environment intensity, and weather shading follow the same gain. Exposure briefly rises during the overshoot. A final HDR shutter guarantees full black during the blackout interval, including emissive car parts, mist, rain, and bloom. The additive CSS grade was removed so it cannot tint a black frame. This shutter is unrelated to the soap boundary.

Reduced-motion mode suppresses lighting failures, autonomous camera drift, particle movement, and camera easing. The camera paths still follow deliberate scrolling.

## Water and persistent atmosphere

The existing world-space bead normal field and clearcoat glimmer are preserved, with additional fine-scale relief. Geometric water beads increase from 2,800 to 12,000. Surface deposition remains staggered as the rain builds during the inward approach.

Up to 256 larger moving droplets follow downhill paths traced against the actual body mesh. Three.js's built-in Octree constructs an acceleration structure during setup; short rays sample the exterior at progressively lower heights. Paths break at missing surfaces or large jumps, rather than crossing wheel openings or floating across seams. The frame loop samples the precomputed curves and orients elongated drops along their tangents. There are no per-frame raycasts, new model assets, or new dependencies. This is an authored surface-flow approximation, not a fluid solver or droplet coalescence simulation.

The rain curtain and floor splashes fade smoothly during the first 16% of the soap pass, independently of surface wetness and persistent mist, so no particle system pops off at the join. Rain uses GPU-animated streaks, camera-distance softness, varied fall speeds, floor impact rings, and ballistic splash particles. Thirty-two depth-tested mist wisps use animated fractal noise, soft boundaries, floor-height attenuation, and approximate vehicle exclusion. Mist reaches full density with the rain and remains at that density throughout soap application and after the spray stops; it no longer follows spray intensity.

The installed React Three Fiber version copies ShaderMaterial uniform wrappers when applying props. Weather materials explicitly bind the live uniform objects so time, density, wetness, spray, and light-gain changes reach GLSL.

## Thick foam on the car

The off-screen fan progressively sweeps from front to rear. The deposited surface raises the exterior by approximately 18 mm, with about 4 mm of lump variation, rough pore relief, and 18,000 surface froth instances. The coat replaces metallic response with opaque, rough white shading and covers glass, wheels, and exterior hardware as well as the body. Panel runoff remains. Five broad irregular runoff regions on the floor carry another 1,800 froth clusters. A spatial floor-wash mask clears both the base pools and these clusters under the floor-directed jets.

The body jet follows a smooth wash envelope across the full body width. It does not probe triangles or change contact lanes around the open cockpit. The footprint spans 140% of the body width, with a dense particle curtain, broad continuous fan, and distributed short-lived rebound spray. The clearing edge follows the same smooth longitudinal sweep. The body wash finishes before two floor jets sweep the ground pools. Neither floor nor body foam disappears through a global opacity fade.

The coating is procedural and artist-authored. It does not simulate spray collision, viscosity, drainage, bubble collapse, or multiple scattering through real lather.

## Sources and limits

| Primary source | Application |
| --- | --- |
| [Filament material documentation](https://github.com/google/filament/blob/main/docs/Materials.md.html) | Separate dielectric clearcoat/water from rough, opaque, nonmetallic foam. |
| [Three.js physical shaders](https://github.com/mrdoob/three.js/blob/dev/src/renderers/shaders/ShaderLib/meshphysical.glsl.js) | Distinct roughness, metalness, clearcoat normals, transmission, thickness, and IOR. Water uses IOR 1.333. |
| [Three.js Octree implementation](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/math/Octree.js) | World-space triangle construction and closest ray intersection for pretraced surface-water paths. |
| [Drei Environment](https://github.com/pmndrs/drei/blob/master/src/core/Environment.tsx) | One captured reflection rig without repeated scene/environment replacement. |
| [Three.js UnrealBloomPass](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/postprocessing/UnrealBloomPass.js) | HDR highlights bloom before final tone mapping and the blackout shutter. |

This remains real-time rasterization, with a 768-pixel planar floor reflection, a reduced transmission buffer, variance shadow maps, HDR bloom, and multisample antialiasing. Geometry and texture quality of the original free demo car limit ultimate fidelity. Software-browser checks verify rendering and behavior, not a visitor's hardware frame rate. Mobile tuning remains deferred.
