import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

here = Path(__file__).resolve().parent
root = here.parents[1]
source = root / 'design/granada-concepts/01-alhambra-sobre-las-nubes.png'
image = Image.open(source).convert('RGB')
w, h = image.size
assert (w, h) == (1672, 941)
flag = Image.new('RGB', (192, 112))
for y in range(flag.height):
    for x in range(flag.width):
        u, v = x / (flag.width - 1), y / (flag.height - 1)
        flag.putpixel((x, y), image.getpixel((round(939 + u * 16), round(50 + u * 3 + v * 10))))
flag = flag.filter(ImageFilter.GaussianBlur(1.2))
flag.save(here / 'flag.png')
plate = image.copy()
for y in range(46, 70):
    left, right = image.getpixel((932, y)), image.getpixel((965, y))
    for x in range(938, 963):
        t = (x - 932) / 33
        plate.putpixel((x, y), tuple(round(a * (1 - t) + b * t) for a, b in zip(left, right)))
plate.save(here / 'plate.png')
mask = Image.new('L', image.size)
draw = ImageDraw.Draw(mask)
draw.polygon([(0, 230), (350, 217), (552, 225), (620, 238), (598, 288), (540, 334), (492, 405), (477, 473), (416, 499), (395, 551), (466, 586), (508, 676), (560, 791), (547, 941), (0, 941)], fill=255)
draw.polygon([(85, 418), (239, 391), (386, 406), (461, 455), (432, 511), (181, 511), (80, 481)], fill=0)
mask = mask.filter(ImageFilter.MinFilter(31)).filter(ImageFilter.GaussianBlur(13))
mask.save(here / 'cloud-mask.png')
cloud = plate.convert('RGBA')
cloud.putalpha(mask)
cloud.save(here / 'cloud-layer.png')
assets = []
destination = root / 'public/images/cities/granada'
for filename, original in [('plate', plate), ('cloud-mask', mask), ('flag', flag), ('poster', image)]:
    variants = [('desktop', 1672), ('mobile', 1100)] if filename in ('plate', 'poster') else [('shared', 836 if filename == 'cloud-mask' else 192)]
    for quality, width in variants:
        exported = original.copy()
        exported.thumbnail((width, width), Image.Resampling.LANCZOS)
        path = destination / (filename + ('-mobile' if quality == 'mobile' else '') + '.webp')
        exported.save(path, 'WEBP', quality=94 if filename != 'cloud-mask' else 95, method=6)
        assets.append({'file': str(path.relative_to(root)), 'width': exported.width, 'height': exported.height, 'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
metadata = {
    'source': str(source.relative_to(root)), 'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'provenance': 'User-selected generated concept; layered camera projection, not a reconstructed architectural model.',
    'editable_scene': 'granada-clouds.blend', 'generator': 'prepare.py, build.py, export.py',
    'layers': ['fixed architectural and mountain matte', 'masked cloud advection', 'independent animated flag mesh', 'runtime volumetric foreground mist'],
    'flag_anchor_pixels': [938, 50], 'flag_size_pixels': [20, 12],
    'animation': 'Analytic pinned cloth, reversible absolute time; cloud UV drift. No video or cloth simulation cache.',
    'assets': assets,
}
(here / 'assets.json').write_text(json.dumps(metadata, indent=2) + '\n')
print(json.dumps(metadata, indent=2))
