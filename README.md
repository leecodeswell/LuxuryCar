# AUREL — live 3D automotive study

A React/Vite/Three.js site for AUREL, a concept luxury car-detailing atelier, built around one continuous live 3D car-wash showcase. There is no video playback or free-look control.

## Site

The animation plays inside a pinned story section (`.story-track`, 1800svh); the scene itself is unchanged. Story progress is measured on that track only, so the content below never advances the animation, and the canvas stops rendering once the story scrolls away.

- **Persistent UI:** wordmark and tagline top-left, *Book a detail* CTA top-right, a left-rail stage index (click to jump), a gloss-unit gauge with a per-stage readout on the right, and a centre reticle. The overlay follows the camera's damped progress.
- **Eight stages** matched to the animation: Arrival (0%), Profile (7%), Survey (21%), Rain (38.4%, copy after the blackout), Strobe (54%), Foam (60%), Rinse (82%), Delivery (95.5%). Each has a two-line skewed headline and one line of copy; content lives in `src/site-content.js`.
- **After the story:** a tilted marquee, six numbered services with prices, process, results, a booking form (concept only: nothing is sent), FAQ and footer. The header nav appears once the story has played.
- Works at phone widths (compact rail and gauge); `prefers-reduced-motion` removes the overlay transitions, marquee and hint animation alongside the scene's own reduced-motion behaviour. Fonts (Archivo Black, IBM Plex Mono, Manrope) are bundled from Fontsource, so there are still no external runtime requests.

1. **Reveal and rain (0–60%):** horizontal side tracks connect to a wide rear arc. At the original rain onset (38.4% of total scroll), the lights fail. Dense rain, taller layered mist, glimmering microbeads, 12,000 geometric beads, and surface-following water runners switch on under complete blackout and are already present when the lights recover. From 54% to 60% a hard strobe fires over a near-black room while the solid 3D foam-chamber conveyor (metal channels, rounded cyan diffusers, moving slatted belts and raised floor bars) glows underneath and stays lit through the entire foam, body rinse, floor wash and final shot; the mist burns off between flashes and is gone when the wash begins.
2. **Heavy sprayed foam (60–82%):** off-screen application builds an almost complete raised white coat, with pore relief, panel streaks, and 18,000 froth instances. The glass and wheels are coated too. Five broad, connected runoff regions surround the car, with 1,800 geometric froth clusters on the floor.
3. **Pressure-water rinse (82–100%):** a broad full-width water fan and distributed impact spray sweep rear to front. A smooth wash envelope carries the jet and clearing edge past the cockpit without panel probing or changes of contact lane. After the body clears, two floor-directed fans sweep front to rear through the ground foam, clearing the pools and geometric froth. The air stays clear through the final wet hero shot.

The wall-free studio, solid suspended LED hexagons, floor, car, and reflection rig remain mounted throughout. The desert is removed. There is no cut or fade between rain, soap, and rinse. Camera position, aim, lens, and global velocity match at both joins; subtle idle translation keeps the rig moving without orbiting.

The single authored rain-onset cue triggers a dramatic lighting failure: a brief flicker, complete blackout, bright overcorrection, undershoot, then recovery. Events finish while scrolling is idle and do not repeat on a timer. Reduced motion disables these failures and autonomous movement. Native scroll remains reversible.

Four hidden colour spotlights (magenta, cyan, amber, violet) have no visible fixtures; only their light reaches the car and floor. The opener uses restrained magenta/cyan accents and broad softboxes to preserve the floor reflection. The colour spots strengthen during the first side pan (6–19%), flood violet across the side-to-rear transition (17–25%), rim the wide rear arc in cyan (27–36%), kick amber through the rain approach (41–52%), tint the foam build at reduced level (63–81%), sweep violet then amber across the rinse (84–95%), and all fire together for the finale (96–100%). They stay dark through the rain blackout and the strobe. Under reduced motion the strobe becomes a steady dim and does not flash.

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

The static production output is `dist/`. Local builds use the origin root; set `VITE_BASE_PATH=/LuxuryCar/` for a repository subpath. Models, textures, and Draco decoders respect Vite's base path. No credentials, backend, paid service, Blender bake, or external runtime asset request is required. The old render cache is ignored and unused.

## GitHub Pages

In repository **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source. `.github/workflows/pages.yml` builds and deploys pushes to `main`, using the base path supplied by GitHub Pages. It also supports **Actions → Deploy to GitHub Pages → Run workflow**, including after enabling Pages if the first run failed. The default project URL is https://leecodeswell.github.io/LuxuryCar/.

## Rendering

This is live WebGL rasterization with physically based materials, HDR/environment reflections, a planar floor reflection, shadow maps, and postprocessing. It does not perform ray tracing or a fluid simulation. The original free demo mesh still limits close-up asset detail. The site layout is checked at desktop and phone widths; 3D rendering performance on phones has not been profiled.

- `src/cinematography.js`: the three continuous phase ranges, authored camera paths, matching join tangents, and weather timing.
- `src/Scene.jsx`: one shared model, camera, clock, lighting director, and effect state. The studio remains mounted.
- `src/Car.jsx` and `src/surface-materials.js`: physically based paint/glass, world-space water, heavy foam, and spatial rinse detail, deterministic surface samples, and instanced beads/froth.
- `src/Environments.jsx`: solid suspended hexagon fixtures, persistent reflection capture, and wet floor with a clearer opening reflection.
- `src/conveyor.js`: instanced metal channels, capsule LED diffusers, end caps, raised crossbars and moving belt slats; illuminated throughout the wash.
- `src/Weather.jsx`: GPU rain, ballistic splashes, off-screen soap and water spray, impact aerosol, broad ground foam pools, layered mist. Raindrops fall continuously while stationary unless reduced motion is enabled.
- `src/spray-contact.js`: smooth full-width spray rig and the shared floor-clearing mask.
- `src/water-runners.js`: pretraced downhill paths on the actual body, using the built-in Three.js Octree.
- `src/weather-reveal.js`: weather latch synchronized to the rain-onset blackout.
- `src/lighting.js`: authored lighting cue and the nonrepeating failure/recovery envelope.
- `src/stage-lighting.js`, `src/Spotlights.jsx`: pre-wash strobe, mist clearing, conveyor glow, and the four hidden spotlight cues.
- `src/Effects.jsx`: HDR bloom, tone mapping, antialiasing, and the lighting-failure blackout shutter.

See [rendering research and tradeoffs](docs/rendering-notes.md) for implementation details, and [studio research and product-showcase flow](docs/showcase-research.md) for the deeper Lusion, Utsubo, Active Theory, and Lumette review. No new model or paid asset was added.

## Validation

`test:camera` checks horizontal tracks, rear clearance, continuously moving paths, exact phase-join position/velocity, rain timing, and authored lighting lifecycle. `test:smoke` checks the site overlay, stage tracking, content sections and phone layout (`tests/site.spec.js`), plus the desktop renderer, bead/runner counts and movement, persistent object identities across both joins, pixel-black lighting failure, bright recovery, heavy foam, broad ground pools, body/floor rinse, no desert, strobe-cleared mist and the conveyor reveal, reverse scrolling, and local-only runtime requests. It uses system Chromium when available; otherwise install Playwright Chromium. Software-rendered graphics checks can take several minutes. Artifacts are under `/tmp/aurel-desktop-*`.

## Attribution

The Ferrari model is credited to **vicent091036**, via the [Three.js car materials example](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_materials_car.html). Original creator link: <https://sketchfab.com/models/57bf6cc56931426e87494f554df1dab6>. Original geometry is retained, with adapted materials, lighting, surface effects, and cinematography.

The unused legacy studio HDRI retained in the asset folder is **Studio Small 03, Greg Zaal / Poly Haven**, CC0: <https://polyhaven.com/a/studio_small_03>. It is no longer loaded: the studio reflection environment is generated from the modeled fixtures and authored light sources. Software notices are in `public/licenses/`. AUREL is an independent concept with no affiliation to Ferrari S.p.A.
