# Startup and loading

The old loader was an empty dark layer. The car's mount effect dismissed it
before a complete frame had been drawn. Offscreen rendering could also be
paused before initialization finished. These were independent of download speed.

## Changes

- A small HTML/CSS loader paints before JavaScript is available. React replaces
  it with the same visual, an animated amber orb, actual preparation stages, a
  slower-load reassurance, and a link to browse services while loading.
- The site shell loads independently of the 3D bundle. Car, texture and droplet
  path requests begin together; the HTML starts the model download early.
- Scene shaders warm with `compileAsync` before the reflection and main render
  loops start. Browsers supporting parallel shader compilation can keep the
  loading interface responsive during this work.
- Readiness follows two completed scene renders, rather than asset mount. Startup
  continues if the visitor skips the hero; offscreen pausing begins after ready.
- Asset, scene and shader errors lead to a retry/services state rather than
  silently removing the loading layer.
- Source textures are loaded without eager GPU uploads; only the configured
  material copies are uploaded. Render targets are capped at 3.2 million pixels
  and title textures at 5 million pixels on large/high-DPI screens. Standard
  desktop resolution, antialiasing and DOM text sharpness are preserved.

## Assets and CPU work

| Work | Before | After |
| --- | --- | --- |
| Car texture downloads | 8,822,630 bytes / 10 PNGs | 670,810 bytes / 6 lossless WebPs |
| Shell entry JavaScript (build output, before gzip) | about 677 KB plus Three.js | about 20 KB; 3D code loads separately |
| Droplet surface paths | Octree construction and ray tracing in every browser | 38,040-byte baked path asset |

Texture traffic is 92.4% smaller. The retained badge, carbon and lamp artwork has
identical decoded pixels; `python scripts/optimize-car-textures.py` verifies this.
Paint, rubber and leather micrograin is procedural, filtered using screen-space
derivatives to avoid distant shimmer, and hidden by foam like the previous
maps. Badge resolution, lamp detail, particle counts and camera paths are retained.

An isolated Node CPU profile measured roughly 7.7 seconds building the old
water paths, versus roughly 4 milliseconds decoding the baked asset. The paths follow the same body
mesh, preserve the random stream used by the foam, and quantize positions to
0.1 mm. Run `node scripts/bake-water-runners.mjs` when the model changes. A unit
check compares the asset's embedded model checksum with the current GLB.

## Verification

Use `npm run test:camera` and `npm run test:smoke -- tests/startup.spec.js` for
asset/checksum checks, cold startup without scrolling, early HTML feedback,
skipping the loader, and failed-asset recovery. The material and wash browser
checks cover the procedural finish and baked droplets in the existing sequence.

Timing in this cloud uses Chromium with SwiftShader and is not a measurement of
physical desktop GPU performance. Network payload reduction and removal of the
runtime ray-tracing job are independent of that limitation.

A fresh production-build browser check at 900×600 measured loader readiness at
28.8 seconds before these changes and 12.2 seconds after them. The new ready
condition is stricter: two scene renders have completed. This is a local
software-rendered sample, not a promised page-load time for visitors. A roughly
9-second long task remains in this software graphics environment. The screen
continues to give loading feedback; device-specific graphics preparation can
still delay interaction.
