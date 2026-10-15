# AUREL — An automotive study

A full-screen, real-time 3D Ferrari experience built with React, Three.js, and React Three Fiber. Scroll through a studio reveal, rainfall, a wet-bodywork close-up, and a rear three-quarter view.

## Develop

Use the existing checkout at `/workspace/LuxuryCar`. Cloud tasks are already isolated; no additional worktree is necessary.

Requires Node.js 22.12+ (validated with Node 24) and npm. No API keys, backend, database, or external runtime asset requests are needed.

```bash
cd /workspace/LuxuryCar
npm ci --cache /tmp/luxurycar-npm-cache --no-audit --no-fund
npm run dev -- --port 3000
```

The temporary npm cache keeps installation compatible with the cloud filesystem's writable directories. Leave the development server running during interactive work.

```bash
npm run build
npm run preview -- --port 3000
```

`dist/` is the production output. It can be hosted as a static site. All URLs assume deployment at the origin root.

## Browser validation

```bash
npm run test:smoke
```

The two Playwright checks use system Chromium when available, or Playwright's Chromium otherwise (`npx playwright install chromium` on machines without a browser). They exercise actual WebGL model rendering, camera changes, wet surfaces, finishes, orbit controls, dialogs, audio toggling, and mobile layout. The runner starts Vite if needed. Screenshots and test outputs go to `/tmp/aurel-*` rather than the checkout. Software rendering makes the browser checks slower than interaction on a hardware-accelerated device.

## Experience

- Scroll or choose a chapter along the bottom to move the camera.
- Select one of three metallic finishes. Toggle the rain with the cloud control.
- Choose **Take a closer look** to orbit and zoom freely. Escape or **Back to the story** returns to the directed camera.
- Ambient studio and rain sound is synthesized locally and starts only after the sound button is clicked.
- **The machine** opens vehicle specifications; **About the study** includes model attribution.
- Mobile framing and reduced-motion settings are supported. WebGL and hardware acceleration give the best experience; software renderers can be substantially slower.

## Scene implementation

`src/Scene.jsx` contains the physically based car materials, local studio HDR lighting, planar floor reflection, instanced surface droplets, procedural wet-paint normals, rain, and camera keyframes. `src/App.jsx` drives the scroll narrative and accessible interface; `src/useAtmosphere.js` generates the audio.

The asset is a real-time mesh with material enhancements, rather than an offline path-traced film. A higher-resolution commissioned vehicle asset can replace `public/models/ferrari.glb` with corresponding material-name and camera adjustments.

## Asset credits

- Ferrari 458 Italia model: **vicent091036**, credited by the [Three.js car example](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_materials_car.html). [Original model](https://sketchfab.com/models/57bf6cc56931426e87494f554df1dab6). The GLB and ambient-occlusion image are retained locally from that example. Vehicle geometry was retained; paint, glass, rims, lighting, and weather have been adapted.
- Studio Small 03 HDRI: **Greg Zaal / Poly Haven**, [CC0](https://polyhaven.com/a/studio_small_03), distributed through [drei-assets](https://github.com/pmndrs/drei-assets).
- Draco decoder: **Google**, Apache 2.0. Three.js: MIT. Manrope and IBM Plex Mono: SIL Open Font License. Notices are in `public/licenses/`.

AUREL is a fictional independent creative concept and has no affiliation with Ferrari S.p.A. Vehicle names, marks, and design belong to their respective owners.
