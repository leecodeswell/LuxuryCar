"""Deterministic, tileable PBR maps. Requires Python, numpy and Pillow.
Run this, then node scripts/rasterize-car-badges.mjs for the vector badge atlas.
"""
from pathlib import Path
import re
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / 'public/textures/car'
ROOT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(458)
size = 1024
y, x = np.mgrid[:size, :size] / size

def save(name, data):
    Image.fromarray(np.uint8(np.clip(data, 0, 1)*255)).save(ROOT / name, optimize=True)

def normal(name, height, strength):
    # Periodic derivatives: maps repeat without a seam. OpenGL (+Y) convention.
    dx = (np.roll(height, -1, 1)-np.roll(height, 1, 1))*strength
    dy = (np.roll(height, -1, 0)-np.roll(height, 1, 0))*strength
    # PNG rows run downward; TextureLoader flips them into upward UV V.
    n = np.stack([-dx, dy, np.ones_like(dx)], axis=-1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    save(name, n*.5+.5)

grain = rng.random((size, size))
normal('paint-normal.png', grain, .28)
save('paint-roughness.png', .78+.18*grain)
u, v = x*32, y*32
over = ((np.floor(u)+np.floor(v)) % 4 < 2)
strand = np.where(over, np.sin(v*2*np.pi), np.sin(u*2*np.pi))
thread = np.where(over, np.cos(v*2*np.pi*5), np.cos(u*2*np.pi*5))
carbon = .13+.075*strand+.02*thread
save('carbon-color.png', np.stack([carbon*.8, carbon*.88, carbon], axis=-1))
normal('carbon-normal.png', strand*.5+thread*.035, 1.5)
leather = grain*.2
for f, a in [(32, .26), (71, .12), (139, .05)]:
    leather += a*np.sin(x*2*np.pi*f + np.sin(y*2*np.pi*13))*np.sin(y*2*np.pi*f)
normal('leather-normal.png', leather, 1.3)
normal('rubber-normal.png', grain*.25 + .12*np.sin(x*2*np.pi*170), .9)
# Concentric moulded optical grooves, not coarse noise on the red lens.
r = np.sqrt((x-.5)**2+(y-.5)**2)
normal('lens-normal.png', np.sin(r*2*np.pi*100)*.12, 1.1)
ring = np.exp(-((r-.40)/.035)**4)
save('tail-emission.png', np.stack([ring, ring*.025, ring*.008], axis=-1))
save('tail-color.png', np.stack([.16+.5*ring, .008+ring*.015, .012+ring*.008], axis=-1))

horse = re.search(r'<path d="([^"]+)"', (ROOT/'horse-source.svg').read_text()).group(1)
def icon(x, y, w, h):
    return f'<svg x="{x}" y="{y}" width="{w}" height="{h}" viewBox="0 0 24 24"><path d="{horse}" fill="#13150f"/></svg>'
svg = '<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="2048" viewBox="0 0 1024 1024">'
svg += '<rect width="1024" height="1024" fill="#efbb0c"/>'
# Atlas quadrants: hood, fender shield, wheel/steering cap, tachometer.
svg += '<rect x="6" y="6" width="500" height="500" rx="16" fill="#cbbd82"/><rect x="12" y="12" width="488" height="488" rx="10" fill="#f2c329"/>'
svg += '<path d="M20 20H178V57H20Z" fill="#198746"/><path d="M178 20H334V57H178Z" fill="#f4f4ed"/><path d="M334 20H492V57H334Z" fill="#c82e31"/>'
svg += icon(81, 68, 350, 350) + '<text x="256" y="476" text-anchor="middle" font-family="serif" font-weight="bold" font-size="64" fill="#16180d">Ferrari</text>'
svg += '<path d="M523 12H1013L994 246Q982 415 768 505Q554 415 542 246Z" fill="#171910"/><path d="M532 22H1004L984 245Q968 405 768 492Q568 405 552 245Z" fill="#f3c313"/>'
svg += '<path d="M535 24H690V55H538Z" fill="#198746"/><path d="M690 24H846V55H690Z" fill="#f4f4ed"/><path d="M846 24H1002L999 55H846Z" fill="#c82e31"/>'
svg += icon(606, 61, 322, 322) + '<text x="768" y="435" text-anchor="middle" font-family="serif" font-style="italic" font-size="75" fill="#171910">S F</text>'
svg += '<circle cx="256" cy="768" r="250" fill="#333a3c"/><circle cx="256" cy="768" r="237" fill="#c5c8bd"/><circle cx="256" cy="768" r="226" fill="#e9bd16"/>' + icon(92, 575, 328, 382)
svg += '<circle cx="768" cy="768" r="247" fill="#151a1c"/><circle cx="768" cy="768" r="221" fill="#e2ad20"/>'
for i in range(61):
    a = np.deg2rad(-220+i*4.7)
    radius = 198 if i % 5 else 184
    x1, y1 = 768+radius*np.cos(a), 768+radius*np.sin(a)
    x2, y2 = 768+209*np.cos(a), 768+209*np.sin(a)
    svg += f'<path d="M{x1} {y1}L{x2} {y2}" stroke="#151a1c" stroke-width="{3 if i%5 else 6}"/>'
    if i % 10 == 0:
        tx, ty = 768+158*np.cos(a), 775+158*np.sin(a)
        svg += f'<text x="{tx}" y="{ty}" text-anchor="middle" font-family="sans-serif" font-size="30" fill="#151a1c">{i//5}</text>'
svg += '<path d="M768 777L669 659" stroke="#d32619" stroke-width="8"/><circle cx="768" cy="768" r="19" fill="#1c2021"/>'
svg += '</svg>'
(ROOT/'badges.svg').write_text(svg)
print('Generated seamless material maps and badge atlas source.')
