# AUREL — An automotive study

A full-screen, real-time 3D Ferrari experience built with React, Three.js, and React Three Fiber. A text-free, scroll-driven film: offset overview, dry side tracking pass, rear view, rainfall, and a wet rear-to-front side tracking pass.

## Develop

Use the existing checkout at `/workspace/LuxuryCar`. Cloud tasks are already isolated; no additional worktree is necessary.

Requires Node.js 22.12+ (validated with Node 24) and npm. No API keys, backend, database, or external runtime asset requests are needed.

```bash
npm ci --include=dev --cache /tmp/luxurycar-npm-cache --no-audit --no-fund
npm run dev -- --port 3000
```

Run these commands from the repository root (already open in GitHub Codespaces). Including development dependencies ensures Vite is installed even when NODE_ENV is production. The temporary npm cache keeps installation compatible with the cloud filesystem's writable directories. Leave the development server running during interactive work.

```bash
npm run build
npm run preview -- --port 3000
```

`dist/` is the production output. It can be hosted as a static site. All URLs assume deployment at the origin root.

## Browser validation

```bash
npm run test:smoke
```

The two Playwright checks use system Chromium when available, or Playwright's Chromium otherwise (`npx playwright install chromium` on machines without a browser). They exercise actual WebGL model rendering, the ordered camera sequence, fixed side-on optical axes, delayed rain, wet surfaces, absence of text and free-look controls, and mobile framing. The runner starts Vite if needed. Screenshots and test outputs go to `/tmp/aurel-*` rather than the checkout. Software rendering makes the browser checks slower than interaction on a hardware-accelerated device.

## Experience

Scroll down to play the sequence; scroll back to reverse it. There are no visible titles, navigation, controls, paint selectors, or audio. Mouse movement and dragging do not change the camera.

1. Centered offset overview of the car in a dark studio.
2. A straight side-on pass from front to rear.
3. Rear view, held as the rain starts.
4. A closer side-on pass from rear to front with wet paint and water droplets.

The side passes move the camera and its target together along the vehicle's longitudinal axis. Camera height, distance, lens, and orientation remain constant during each pass. Mobile framing dollies out along the same optical axis. Reduced-motion preferences remove scroll smoothing.

## Scene implementation

`src/cinematography.js` defines the shot sequence and rain cue. `src/Scene.jsx` contains physically based materials, local studio HDR lighting, planar floor reflection, refractive surface droplets, procedural wet-paint normals, and rain. `src/App.jsx` only connects scroll position and loading/error state to the scene.

The current vehicle is a real-time mesh. Production-grade macro shots would benefit from a higher-resolution vehicle asset; replacing it also requires checking material names, scale, camera framing, and surface sampling.

## Asset credits

- Ferrari 458 Italia model: **vicent091036**, credited by the [Three.js car example](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_materials_car.html). [Original model](https://sketchfab.com/models/57bf6cc56931426e87494f554df1dab6). The GLB and ambient-occlusion image are retained locally from that example. Vehicle geometry was retained; paint, glass, rims, lighting, and weather have been adapted.
- Studio Small 03 HDRI: **Greg Zaal / Poly Haven**, [CC0](https://polyhaven.com/a/studio_small_03), distributed through [drei-assets](https://github.com/pmndrs/drei-assets).
- Draco decoder: **Google**, Apache 2.0. Three.js: MIT. Notices are in `public/licenses/`.

AUREL is a fictional independent creative concept and has no affiliation with Ferrari S.p.A. Vehicle names, marks, and design belong to their respective owners.
