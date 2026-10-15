# AUREL — live 3D automotive study

A text-free, desktop-focused React/Vite/Three.js experience. Scrolling directs one continuous live 3D car showcase. There is no video playback or free-look control.

1. **Reveal and rain (0–60%):** horizontal side tracks connect to a wide rear arc. Rain, mist, glimmering microbeads, 12,000 geometric beads, and up to 256 surface-following water runners build during the inward move.
2. **Thick sprayed foam (60–100%):** the camera continues directly into an off-screen soap application. A raised lather blanket, pore relief, 18,000 froth instances, and panel runoff cover the car. No foam pools or ground suds remain. The rain curtain fades out through the soap opening; mist persists after spraying ends.

The wall-free studio, solid suspended LED hexagons, floor, car, and reflection rig remain mounted throughout. The desert is removed. There is no cut or fade between rain and soap. Camera position, aim, lens, and global velocity match at the join; subtle idle translation keeps the rig moving without orbiting.

Three authored camera moments trigger dramatic lighting failures: a brief flicker, complete blackout, bright overcorrection, undershoot, then recovery. Events finish while scrolling is idle and do not repeat on a timer. Reduced motion disables these failures and autonomous movement. Native scroll remains reversible.

## Develop

Use the existing checkout at `/workspace/LuxuryCar`. Cloud tasks are already isolated; do not create another worktree unless explicitly requested. In Codespaces, open the repository folder and use its terminal.

Requires Node.js 22.12+; this environment uses Node 24.

```bash
npm ci --include=dev --cache /tmp/luxurycar-npm-cache --no-audit --no-fund
npm run dev -- --port 3000 --strictPort
```

Including development dependencies ensures Vite is available even when `NODE_ENV=production`. Open port 3000 from the Codespaces **Ports** tab. Keep the terminal running. After dependency changes, restart Vite; use `--force` if it reports an outdated optimized dependency.

```bash
npm run build
npm run preview -- --port 4173 --strictPort
npm run test:camera
npm run test:smoke
```

The static production output is `dist/`. URLs assume hosting at the origin root. No credentials, backend, paid service, Blender bake, or external runtime asset request is required. The old render cache is ignored and unused.

## Rendering

This is live WebGL rasterization with physically based materials, HDR/environment reflections, a planar floor reflection, shadow maps, and postprocessing. It does not perform ray tracing or a fluid simulation. The original free demo mesh still limits close-up asset detail. Desktop is the current visual and test priority; mobile has not been optimized or validated for this iteration.

- `src/cinematography.js`: the two continuous phase ranges, authored camera paths, matching join tangents, and weather timing.
- `src/Scene.jsx`: one shared model, camera, clock, lighting director, and effect state. The studio remains mounted.
- `src/Car.jsx` and `src/surface-materials.js`: physically based paint/glass, world-space water and thick foam detail, deterministic surface samples, and instanced beads/froth.
- `src/Environments.jsx`: solid suspended hexagon fixtures, persistent reflection capture, and wet floor.
- `src/Weather.jsx`: GPU rain, ballistic splashes, off-screen soap spray, persistent layered mist. Raindrops fall continuously while stationary unless reduced motion is enabled.
- `src/water-runners.js`: pretraced downhill paths on the actual body, using the built-in Three.js Octree.
- `src/lighting.js`: authored lighting cues and the nonrepeating failure/recovery envelope.
- `src/Effects.jsx`: HDR bloom, tone mapping, antialiasing, and the lighting-failure blackout shutter.

See [rendering research and tradeoffs](docs/rendering-notes.md) for implementation details, and [studio research and product-showcase flow](docs/showcase-research.md) for the deeper Lusion, Utsubo, Active Theory, and Lumette review. No new model or paid asset was added.

## Validation

`test:camera` checks horizontal tracks, rear clearance, continuously moving paths, exact phase-join position/velocity, rain timing, and authored lighting lifecycle. `test:smoke` checks the desktop renderer, bead/runner counts and movement, persistent object identities across the soap join, pixel-black lighting failure, bright recovery, thick foam, absent ground suds/desert, persistent mist after spraying, reverse scrolling, and local-only runtime requests. It uses system Chromium when available; otherwise install Playwright Chromium. Software-rendered graphics checks can take several minutes. Artifacts are under `/tmp/aurel-desktop-*`.

## Attribution

The Ferrari model is credited to **vicent091036**, via the [Three.js car materials example](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_materials_car.html). Original creator link: <https://sketchfab.com/models/57bf6cc56931426e87494f554df1dab6>. Original geometry is retained, with adapted materials, lighting, surface effects, and cinematography.

The unused legacy studio HDRI retained in the asset folder is **Studio Small 03, Greg Zaal / Poly Haven**, CC0: <https://polyhaven.com/a/studio_small_03>. It is no longer loaded: the studio reflection environment is generated from the modeled fixtures and authored light sources. Software notices are in `public/licenses/`. AUREL is an independent concept with no affiliation to Ferrari S.p.A.
