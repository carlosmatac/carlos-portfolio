import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';

const lobes = [
  [-39, 2, -3, 14, 9, 6], [-27, 1, 0, 14, 10, 8], [-12, 2, -2, 17, 10, 7],
  [2, 3, 1, 16, 10, 10], [19, 0, -2, 17, 9, 7], [35, 3, -3, 14, 9, 6],
  [-22, -5, -4, 12, 9, 5], [-2, -6, -4, 15, 8, 5], [23, -5, -5, 14, 8, 5],
  [-4, 4, 7, 8, 7, 8], [11, 2, 6, 8, 7, 7], [-27, 4, 4, 7, 7, 7],
].map(([x, z, y, rx, rz, ry]) => [x, y, -z, rx, ry, rz]);
const clamp = x => Math.max(0, Math.min(1, x));
const mix = (a, b, t) => a + (b - a) * t;
const perlin = new ImprovedNoise();
function density(x, y, z) {
  let field = -10;
  for (const [cx, cy, cz, rx, ry, rz] of lobes) {
    field = Math.max(field, 1 - Math.hypot((x-cx)/rx, (y-cy)/ry, (z-cz)/rz));
  }
  if (field < -0.5) return 0;
  const turbulence = perlin.noise(x*.22,y*.22,z*.22)*.42
    + perlin.noise(x*.65+13,y*.65,z*.65)*.2 + perlin.noise(x*1.35,y*1.35+7,z*1.35)*.1;
  const edge = clamp((60-Math.abs(x))/4) * clamp((18-Math.abs(z))/3) * clamp((y+14)/3) * clamp((20-y)/3);
  return clamp(Math.max(0, field + turbulence) ** 1.5 * .85) * edge;
}
function build(width, height, depth, file) {
  const field = new Float32Array(width * height * depth);
  const index = (x,y,z) => (z * height + y) * width + x;
  for (let z = 0; z < depth; z++) for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    field[index(x,y,z)] = density(x/(width-1)*120-60, y/(height-1)*34-14, z/(depth-1)*36-18);
  }
  function sample(x, y, z) {
    if (x < 0 || y < 0 || z < 0 || x >= width-1 || y >= height-1 || z >= depth-1) return 0;
    const a = Math.floor(x), b = Math.floor(y), c = Math.floor(z), u = x-a, v = y-b, w = z-c;
    return mix(mix(mix(field[index(a,b,c)],field[index(a+1,b,c)],u),mix(field[index(a,b+1,c)],field[index(a+1,b+1,c)],u),v),
      mix(mix(field[index(a,b,c+1)],field[index(a+1,b,c+1)],u),mix(field[index(a,b+1,c+1)],field[index(a+1,b+1,c+1)],u),v),w);
  }
  const bytes = new Uint8Array(field.length * 2);
  for (let z = 0; z < depth; z++) for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = index(x,y,z), d = field[i];
    let light = 1;
    if (d > 0) {
      light = 0;
      for (const direction of [[-.48,.82,.31],[-.25,.9,.36]]) {
        let opticalDepth = 0;
        for (let step = 1; step <= 16; step++) {
          const distance = step * 1.1;
          opticalDepth += sample(x+direction[0]*distance*(width-1)/120,
            y+direction[1]*distance*(height-1)/34, z+direction[2]*distance*(depth-1)/36)*1.1;
        }
        light += Math.exp(-opticalDepth * 1.4) / 2;
      }
    }
    bytes[i*2] = Math.round(d*255);
    bytes[i*2+1] = Math.round(light*255);
  }
  const compressed = gzipSync(bytes, { level: 9 });
  writeFileSync(new URL(`../../public/textures/clouds/${file}`, import.meta.url), compressed);
  return { file, dimensions: [width,height,depth], bytes: compressed.length, decodedBytes: bytes.length,
    sha256: createHash('sha256').update(compressed).digest('hex') };
}
const assets = [build(256,96,96,'cumulus-desktop.bin.gz'), build(128,64,64,'cumulus-mobile.bin.gz')];
writeFileSync(new URL('./assets.json', import.meta.url), JSON.stringify({
  provenance: 'Original procedural ellipsoid density field adapted from art-source/st-louis/build.py; no external assets',
  format: 'Gzip-compressed RG8, x fastest, Y up; R extinction density, G directional light transmittance; linear data',
  rebuild: 'node art-source/clouds/build-volume.mjs',
  bounds: [[-60,-14,-18],[60,20,18]], assets,
}, null, 2)+'\n');
console.log(assets);
