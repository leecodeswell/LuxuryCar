"""Lossless delivery copies of the artwork used at runtime. Originals remain sources."""
from pathlib import Path
from PIL import Image, ImageChops

root = Path(__file__).resolve().parents[1] / 'public/textures/car'
names = ['badges', 'carbon-color', 'carbon-normal', 'lens-normal', 'tail-color', 'tail-emission']
for name in names:
    source = Image.open(root / f'{name}.png').convert('RGB')
    target = root / f'{name}.webp'
    source.save(target, 'WEBP', lossless=True, method=6)
    assert ImageChops.difference(source, Image.open(target).convert('RGB')).getbbox() is None
    print(f'{name}: {target.stat().st_size:,} bytes, identical decoded pixels')
