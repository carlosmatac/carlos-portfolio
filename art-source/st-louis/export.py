import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageFilter

parser = argparse.ArgumentParser()
parser.add_argument('--input', type=Path, default=Path(__file__).parent)
parser.add_argument('--preview', action='store_true')
args = parser.parse_args()
root = Path(__file__).resolve().parents[2]
destination = root / 'public/images/cities/st-louis'
destination.mkdir(parents=True, exist_ok=True)
assets = []
for name, filename, sizes in [('arch', 'arch-render', [(1920, 2240), (960, 1120)]), ('clouds', 'cloud-bank', [(2048, 1024), (1024, 512)])]:
    image = Image.open(args.input / (name + ('-preview' if args.preview else '') + '.png')).convert('RGBA')
    if name == 'clouds':
        image = image.convert('RGBa').filter(ImageFilter.GaussianBlur(0.65)).convert('RGBA')
        image.putalpha(image.getchannel('A').point([round(255 * (1 - (1 - a / 255) ** 2.2)) for a in range(256)]))
    for index, size in enumerate(sizes):
        exported = image.copy()
        exported.thumbnail(size, Image.Resampling.LANCZOS)
        path = destination / (filename + ('-mobile' if index else '') + '.webp')
        exported.save(path, 'WEBP', quality=94 if name == 'arch' else 90, method=6, exact=True)
        assets.append({'file':str(path.relative_to(root)), 'width':exported.width, 'height':exported.height, 'bytes':path.stat().st_size, 'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
metadata = {
    'source':'arch-clouds.blend',
    'generator':'build.py',
    'blender':'5.2.2 LTS',
    'renderer':'Cycles CPU, transparent RGBA, AgX',
    'arch_samples':128,
    'cloud_samples':128,
    'cloud_alpha_optical_density':2.2,
    'cloud_edge_filter_pixels':0.65,
    'preview':args.preview,
    'provenance':'Original parametric arch and procedural cloud volume created for this portfolio. No third-party models, images or HDRIs.',
    'assets':assets,
}
if not args.preview:
    (Path(__file__).parent/'assets.json').write_text(json.dumps(metadata,indent=2)+'\n')
print(json.dumps(metadata,indent=2))
