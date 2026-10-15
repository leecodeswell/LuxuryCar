# Model material upgrade

## Sources reviewed

- [Three.js MeshPhysicalMaterial source and documentation](https://github.com/mrdoob/three.js/blob/dev/src/materials/MeshPhysicalMaterial.js): separate base roughness and dielectric clearcoat, correct IOR, normal maps and texture colour spaces. A metal substrate must not make printed enamel or rubber metallic.
- [Khronos clearcoat specification](https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_materials_clearcoat): the transparent coating has its own normal and roughness response. The paint's tiny base-layer grain therefore does not roughen the outer lacquer equally. The animated water layer remains on top.
- [Filament's physically based rendering notes](https://github.com/google/filament/blob/main/docs/Filament.md.html): readable materials need a consistent energy-conserving metallic/roughness workflow, correct linear colour handling, and roughness variation at the right scale. Added detail is deliberately restrained rather than turning every surface into a noisy bump map.
- [Three.js car example](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_materials_car.html): the source Ferrari model is designed for separate body, glass and detail material overrides. Inspection of our GLB confirmed it contains no image textures, and the badges and rear lenses have constant UVs.
- [Simple Icons Ferrari vector](https://github.com/simple-icons/simple-icons/blob/develop/icons/ferrari.svg): the prancing horse artwork is the original vector source for the authored badge atlas. [CC0 license](../public/textures/car/CC0-1.0.txt). Ferrari trademarks remain their owners' property; this is the existing independent model showcase.

## Applied changes

The 2048px atlas supplies separate hood enamel, fender shields, wheel/steering centres and instrument-dial artwork. New per-island projections keep the horse upright on both sides and avoid stretching one image over the whole yellow mesh. The existing sculpted chrome horses and lettering remain geometry, with polished metal rather than painted grey shading.

Tail lenses receive a dark red base, fine concentric optical grooves, glossy optical clearcoat and annular emission. Two small toroidal LED diffusers add a physical light guide at the rear lens plane. The reverse-lamp centres are separated from the source chrome mesh and given grooved dielectric optics, avoiding mirror-like silver discs. The centre brake strip has a separate material; bumper reflectors and calipers do not emit. The red mesh uses three material groups and the chrome mesh two, rather than creating a draw call for every triangle. Foam masks the illumination as it coats the lenses, then exposes it again during the rinse.

Graphite paint has a fine base normal/roughness map beneath a smoother clearcoat. Carbon is a repeating twill colour/normal pair beneath resin. Leather and tire rubber have different grain scales and roughness. Non-colour maps stay in linear data space; colour/emission maps use sRGB. Anisotropic filtering is capped to the client's supported value. UV changes operate on cloned geometry, leaving the cached GLB untouched. Owned textures, materials and geometry are disposed together.

All material maps except the attributed horse artwork are generated locally and deterministically. No paid textures or render service is needed. Regenerate using `python scripts/build-car-textures.py` (numpy and Pillow), then `node scripts/rasterize-car-badges.mjs` (Playwright Chromium). Generated assets are checked in, so deployment needs neither Python nor Blender.

## Tooling and limits

Blender 4.3.2 is installed in the cloud environment. The Draco model was decoded locally and imported into Blender for geometry/island inspection. This environment exposes no GPU device. It cannot access the user's computer or local Blender installation. The browser uses the viewer's GPU for the live experience; these changes add material detail to the existing raster renderer, not path tracing. Desktop performance still needs observation on a physical GPU; SwiftShader browser checks establish rendering correctness, not hardware frame rate.
