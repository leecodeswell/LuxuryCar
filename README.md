# AUREL — Cinematic automotive study

A text-free, scroll-driven car film with descending front-quarter shots, a high offset rear sweep, rain, and a swooping return to the front. Mouse movement and dragging do not steer the camera.

The primary film is **offline path-traced in Blender Cycles**, with guided denoising, AgX color, and compressed frame scrubbing in the browser. It does **not** perform live browser ray tracing. Foreground rain/mist stays animated at rest. A lazy-loaded Three.js scene supplies a live rasterized fallback when media cannot load.

## Develop

Use the existing checkout. Cloud tasks are already isolated; do not create another worktree unless requested. In GitHub Codespaces, open the repository folder and use its terminal.

Requires Node.js 22.12+ (validated with Node 24).

```bash
npm ci --include=dev --cache /tmp/luxurycar-npm-cache --no-audit --no-fund
npm run dev -- --port 3000
```

Including development dependencies ensures Vite is installed even if `NODE_ENV=production`. Keep the terminal running and open port 3000 through the Codespaces **Ports** tab. No credentials, backend, database, or external runtime asset requests are needed.

```bash
npm run build
npm run preview -- --port 4173
npm run test:camera
npm run test:smoke
```

`dist/` is the static production output. URLs assume hosting at the origin root. Pre-rendered media is checked in; normal development and builds do not need Blender or rerender the film.

## Rendering and research

Read [the research and implementation decision](docs/visual-research.md) for primary sources from Lusion, Active Theory, Utsubo, and the Three.js path-tracing project. Live studio sites were blocked by the cloud network; the original Lumette reel was not inspected, and its technology is not asserted.

- `src/camera-path.json`: shared camera position, aim, lens, banking, and rain timing.
- `src/CinematicFilm.jsx`: compressed-buffer loading, bounded forward/backward seeking, and reduced-motion handling. Loading the selected compressed file into a Blob enables random seeking on hosts without HTTP range support.
- `src/Atmosphere.jsx`: lightweight foreground compositing, clipped to the film frame.
- `src/Scene.jsx`: optional live WebGL fallback using the same drone path.
- `scripts/render_film.py`: Cycles scene, physical materials and refractive water geometry.
- `scripts/grade_frame.py`: normal/albedo-guided denoising, AgX, depth haze, and restrained bloom.
- `public/cinema/manifest.json`: actual source size, samples, renderer, and interpolation details.

The shipped film is a 1280×720 preview made using the free source model and this CPU environment. Camera transitions use continuous Hermite curves; there is no flat rear hold. H.264/VP9 playback is interpolated for smoother scrubbing. This does not restore detail absent from the original demo model. The film keeps its full frame on portrait screens instead of cropping the car.

## Optional film regeneration

This is a separate, expensive content-authoring step. It is **not** part of npm install, development startup, or production build. Requires Blender 4.3+, FFmpeg with H.264/VP9 encoders, and Python 3.12+. The saved Blender scene and source frames remain in the ignored `.cinema-cache/` directory.

```bash
npm run cinema:prepare
python3 -m venv .cinema-cache/venv
.cinema-cache/venv/bin/python -m pip install --cache-dir /tmp/luxurycar-pip-cache -r scripts/requirements-render.txt
python3 scripts/setup_oidn.py
.cinema-cache/venv/bin/python scripts/bake_cinema.py --oidn .cinema-cache/tools/oidn-2.5.1.x86_64.linux/bin/oidnDenoise
```

The OIDN helper verifies the pinned official release checksum before extracting it. The default OpenColorIO config path matches this machine's Blender installation; use `--ocio /path/to/blender/datafiles/colormanagement/config.ocio` elsewhere. `--samples` and `--threads` control quality and CPU use. The source script currently selects CPU rendering; a suitable local GPU and Blender device configuration would allow higher-resolution/high-sample renders without paying for a render service.

The bake resumes existing matching frames. It refuses to silently mix changed render settings with an old cache. Preserve or remove the generated numeric PNG/EXR files and `render-info.json` when intentionally changing the source scene, grading, or timeline. Do not remove the original source GLB. See `.cinema-cache/render.log` and the bake's frame counts for diagnostics.

## Validation

The camera unit tests verify smooth derivatives, clearance from the car/floor, high offset rear framing, and the rain cue. Browser tests verify actual decoded frame changes, forward/reverse seeking, silent paused playback, no visible interface, mobile framing, and fallback WebGL rendering. Browser tests use system Chromium when available; otherwise install Playwright Chromium. Test artifacts are written to `/tmp/aurel-*`.

## Credits

[Asset and rendering credits](public/cinema/credits.txt) are served at `/cinema/credits.txt`. The Ferrari model is credited to **vicent091036**, via the [Three.js car materials example](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_materials_car.html). The fallback HDRI is **Studio Small 03, Greg Zaal / Poly Haven**, CC0. Software notices are in `public/licenses/`.

AUREL is an independent concept and has no affiliation with Ferrari S.p.A. No paid or noncommercial-only replacement car asset was added.
