import hashlib
import json
from pathlib import Path
from PIL import Image

here = Path(__file__).resolve().parent
root = here.parents[1]
metadata = json.loads((here / 'assets.json').read_text())
for asset in metadata['assets']:
    name = Path(asset['file']).name
    if name.startswith('poster') or name.startswith('plate'):
        image = Image.open(here / ('poster.png' if name.startswith('poster') else 'plate-render.png')).convert('RGB')
        image = image.resize((asset['width'], asset['height']), Image.Resampling.LANCZOS)
        destination = root / asset['file']
        image.save(destination, 'WEBP', quality=94, method=6)
        asset['bytes'] = destination.stat().st_size
        asset['sha256'] = hashlib.sha256(destination.read_bytes()).hexdigest()
metadata['renderer'] = 'Blender 5.2.2 / Cycles CPU / 16 samples / Standard color transform / camera-projected matte and cloth mesh'
(here / 'assets.json').write_text(json.dumps(metadata, indent=2) + '\n')
print('Exported Blender plate and poster; original concept unchanged.')
