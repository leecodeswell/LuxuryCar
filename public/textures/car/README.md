# Car surface assets

Generated with `scripts/build-car-textures.py` and `scripts/rasterize-car-badges.mjs`.
Run `scripts/optimize-car-textures.py` afterwards to generate the lossless WebP
files used by the browser. PNGs remain authoring sources. Paint, leather and
rubber grain now render procedurally instead of downloading their noise maps.
The horse in `horse-source.svg` comes from Simple Icons, Ferrari icon:
https://github.com/simple-icons/simple-icons/blob/develop/icons/ferrari.svg
Source brand URL: https://www.ferrari.com
Icon license: CC0-1.0 (included). Brand/trademark rights are not transferred.

Badge layout and tileable PBR maps were authored for this project. Normal maps
use the OpenGL +Y convention. Normal/roughness maps are linear data; colour,
badge and emissive maps are sRGB. See docs/material-research.md.
