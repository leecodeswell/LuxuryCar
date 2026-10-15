# AUREL — live 3D automotive study

A text-free, desktop-focused React/Vite/Three.js experience. Scrolling directs three real-time scenes using the same Ferrari model. There is no video playback and no free-look or orbit control.

1. **Ceiling-lit studio / rain:** a continuous overview and straight side-tracking shots, a wide rear arc, then rain building during the inward move and a closer rear-to-front pass. The studio has no walls or ceiling plane. Suspended hexagonal LED fixtures have cylindrical aluminum housings, round diffusers, joined corners, and suspension cables. Rain includes varied streaks, near-camera softness, floor rings, ballistic splashes, surface beads, and layered drifting mist.
2. **Sprayed soap:** the wet car stays in the dark studio. A pressurized fan enters from off screen and sweeps from front to rear, progressively depositing the lather coat. Fine pores, dense surface froth, gravity trails, and ground suds remain; floating soap bubbles are removed. The spray ends before the final moving hero composition.
3. **Desert void:** hard sunlight in an uninterrupted sand-colored expanse. The ground fades into a matching background, with no courtyard walls, fins, paving, or visible sky geometry. Dust, controlled glare, and subtle heat shimmer remain.

Brief dips to black cover environment cuts. All three camera paths have continuous velocity and no static scroll holds; the studio side tracks retain their horizontal optical axes. A small shared translation of position and aim keeps the camera moving gently while scroll is idle, without adding free-look or orbit control. Native scrolling remains reversible. Rain and mist begin together during the rear-to-car approach (local studio progress 0.64–0.80).

In the two studio chapters, an occasional pair of brief light pulses modulates the actual key/fill/rim lights, LED emission, and reflection-environment intensity. The cycle is 15.5 seconds, with pulses separated by 0.95 seconds. Reduced-motion mode disables autonomous camera drift, light pulses, particle motion, and scroll easing while preserving scroll-directed shot navigation.

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

- `src/cinematography.js`: the three chapter ranges, old studio shots, new authored flights, rain timing, and reversible cut fades.
- `src/Scene.jsx`: one shared model, camera, clock, and effect state. Only the active environment is mounted.
- `src/Car.jsx` and `src/surface-materials.js`: physically based paint/glass, world-space water and foam detail, deterministic surface samples, and instanced beads/froth.
- `src/Environments.jsx`: instanced hexagon fixtures, reflection capture, wet floor, hard sunlight, seamless desert expanse, and wash chamber.
- `src/Weather.jsx`: GPU rain, ballistic splashes, off-screen soap spray, layered mist, and sunlit dust. Raindrops fall continuously while stationary unless reduced motion is enabled.
- `src/Effects.jsx`: HDR bloom, controlled sunlight glare, heat shimmer, tone mapping, antialiasing, and transition fades.

See [rendering research and tradeoffs](docs/rendering-notes.md) for implementation details, and [studio research and product-showcase flow](docs/showcase-research.md) for the deeper Lusion, Utsubo, Active Theory, and Lumette review. No new model or paid asset was added.

## Validation

`test:camera` checks the original side-on passes, larger rear distance, camera clearance, continuous new flights, and chapter cuts. `test:smoke` checks the live desktop renderer, all three chapters, rain/droplet visibility, animation at rest, progressive soap application, wall-free studio and modeled LED tubes, approach-timed weather, camera drift, studio light pulses, removed floating bubbles, desert simplicity, backward transitions, no visible interface or free look, no video, and local-only runtime requests. It uses system Chromium when available; otherwise install Playwright Chromium. Software-rendered graphics checks can take several minutes. Artifacts are under `/tmp/aurel-desktop-*`.

## Attribution

The Ferrari model is credited to **vicent091036**, via the [Three.js car materials example](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_materials_car.html). Original creator link: <https://sketchfab.com/models/57bf6cc56931426e87494f554df1dab6>. Original geometry is retained, with adapted materials, lighting, surface effects, and cinematography.

The unused legacy studio HDRI retained in the asset folder is **Studio Small 03, Greg Zaal / Poly Haven**, CC0: <https://polyhaven.com/a/studio_small_03>. It is no longer loaded: the studio reflection environment is generated from the modeled fixtures and authored light sources. Software notices are in `public/licenses/`. AUREL is an independent concept with no affiliation to Ferrari S.p.A.
