import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createCloudVolume } from "../clouds/cloud-volume";
import { brnoCamera, brnoCell, brnoView, GLYPHS, random, tramState, TRAM_CYCLE, TRAM_STOP_X, type BrnoView } from "./brno-art";
import { trackPointer } from "./pointer";
import type { CityFrame, CityQuality, CityScene } from "./types";

const FULLSCREEN_VERTEX = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

/** Cursor trail: a decaying velocity/density field advected with a small cross blur. */
const TRAIL_FRAGMENT = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D previous; uniform vec2 texel; uniform vec2 from; uniform vec2 to;
  uniform float aspect; uniform float decay; uniform float drawing; uniform float packed;
  vec3 decode(vec4 c) { return packed > 0.5 ? vec3(c.xy * 2.0 - 1.0, c.z) : c.xyz; }
  void main() {
    vec3 field = decode(texture2D(previous, vUv)) * 0.4
      + (decode(texture2D(previous, vUv + vec2(texel.x, 0.0))) + decode(texture2D(previous, vUv - vec2(texel.x, 0.0)))
      + decode(texture2D(previous, vUv + vec2(0.0, texel.y))) + decode(texture2D(previous, vUv - vec2(0.0, texel.y)))) * 0.15;
    field *= decay;
    vec2 scale = vec2(aspect, 1.0), a = from * scale, b = to * scale, p = vUv * scale, ab = b - a;
    float len = length(ab);
    float h = len > 0.0 ? clamp(dot(p - a, ab) / (len * len), 0.0, 1.0) : 0.0;
    float s = 1.0 - smoothstep(0.0, 0.09, length(p - a - ab * h));
    float deposit = clamp(len * 14.0, 0.0, 1.0) * s * s * drawing;
    field.xy = clamp(field.xy + (len > 0.0 ? ab / len : vec2(0.0)) * deposit, -1.0, 1.0);
    field.z = clamp(max(field.z, deposit), 0.0, 1.0);
    gl_FragColor = packed > 0.5 ? vec4(field.xy * 0.5 + 0.5, field.z, 1.0) : vec4(field, 1.0);
  }`;

/**
 * Dot-matrix display: each cell samples the render, maps its luminance to a 5×5 glyph and keeps its hue.
 * The cursor trail smears and splits the image; around the cursor the grid halves to reveal finer detail.
 */
const DISPLAY_FRAGMENT = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D source; uniform sampler2D trail;
  uniform vec2 resolution; uniform float micro; uniform vec2 mouse; uniform float lens; uniform float lensRadius;
  uniform float time; uniform float packed; uniform float ready; uniform float story;
  const int GLYPHS[8] = int[8](${GLYPHS.join(", ")});
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
  void main() {
    vec2 frag = gl_FragCoord.xy;
    float cell = micro * 6.0;
    vec2 coarse = floor(frag / cell);
    float near = lens * (1.0 - smoothstep(lensRadius * 0.6, lensRadius, length((coarse + 0.5) * cell - mouse)));
    bool fine = near > 0.5;
    float size = fine ? cell * 0.5 : cell;
    vec2 index = floor(frag / size), local = frag - index * size;
    vec2 centre = (index + 0.5) * size / resolution;
    vec4 t = texture2D(trail, centre);
    vec3 field = packed > 0.5 ? vec3(t.xy * 2.0 - 1.0, t.z) : t.xyz;
    vec2 offset = field.xy * field.z * 0.055;
    vec3 colour = vec3(
      texture2D(source, centre - offset * 1.35).r,
      texture2D(source, centre - offset).g,
      texture2D(source, centre - offset * 0.65).b) * ready;
    float light = 1.0 - exp(-mix(luma(colour), max(colour.r, max(colour.g, colour.b)), 0.55) * 2.4);
    float quiet = story > 1.5 ? smoothstep(0.44, 0.6, vUv.y) : smoothstep(0.06, 0.44, vUv.x);
    light = pow(light, 1.1) * mix(1.0, quiet * 0.9 + 0.1, step(0.5, story)) + field.z * (hash(index + floor(time * 14.0)) - 0.35) * 0.45;
    float level = clamp(floor(light * 8.0), 0.0, 7.0);
    bool ink;
    if (fine) {
      ivec2 m = ivec2(local / micro);
      float rank = m.x == 0 && m.y == 1 ? 0.0 : m.x == 1 && m.y == 0 ? 1.0 : m.x == 0 ? 2.0 : 3.0;
      ink = m.x < 2 && m.y < 2 && rank < light * 4.4 - 0.4;
    } else {
      ivec2 m = ivec2(local / micro);
      ink = m.x < 5 && m.y < 5 && ((GLYPHS[int(level)] >> ((4 - m.y) * 5 + m.x)) & 1) == 1;
    }
    vec3 hue = colour / max(max(colour.r, max(colour.g, colour.b)), 1e-4);
    hue = mix(hue, vec3(1.0, 0.93, 0.8), 0.1);
    vec3 ground = vec3(0.004, 0.005, 0.009);
    float matrix = step(abs(local.x - size * 0.42), micro * 0.5) * step(abs(local.y - size * 0.42), micro * 0.5) * 0.018;
    vec3 result = ink ? hue * mix(0.22, 1.15, light) : ground + matrix;
    gl_FragColor = vec4(result, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

function paintByHeight(geometry: THREE.BufferGeometry, bands: [number, THREE.Color][]) {
  const position = geometry.attributes.position, colors = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i), band = bands.find(([limit]) => y < limit) ?? bands[bands.length - 1];
    band[1].toArray(colors, i * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

/** Tatra T3 in the red and cream of Brno's transport company, travelling towards −x. */
function buildTram(materials: THREE.Material[], geometries: THREE.BufferGeometry[]) {
  const tram = new THREE.Group();
  tram.name = "Tram_Root";
  const own = <T extends THREE.BufferGeometry>(g: T) => { geometries.push(g); return g; };
  const mat = <T extends THREE.Material>(m: T) => { materials.push(m); return m; };
  const red = new THREE.Color(0.85, 0.05, 0.04), cream = new THREE.Color(1, 0.9, 0.7), grey = new THREE.Color(0.5, 0.5, 0.52);
  const [rb, rt] = [0.35, 0.75];
  const profile = new THREE.Shape()
    .moveTo(-7 + rb, 0.5).lineTo(7 - rb, 0.5).quadraticCurveTo(7, 0.5, 7, 0.5 + rb)
    .lineTo(7, 3.05 - rt).quadraticCurveTo(7, 3.05, 7 - rt, 3.05).lineTo(-7 + rt, 3.05)
    .quadraticCurveTo(-7, 3.05, -7, 3.05 - rt).lineTo(-7, 0.5 + rb).quadraticCurveTo(-7, 0.5, -7 + rb, 0.5);
  const shell = new THREE.ExtrudeGeometry(profile, { depth: 2.2, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 3, curveSegments: 8 }).translate(0, 0, -1.1);
  const body = new THREE.Mesh(own(paintByHeight(shell, [[1.3, red], [1.42, cream], [2.55, red], [2.95, cream], [9, grey]])),
    mat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.1, emissive: 0x3a1410, emissiveIntensity: 0.15 })));
  body.name = "Tram_Body";
  tram.add(body);
  const glass = mat(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.95, 0.66, 0.36) }));
  const doorGlass = mat(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.34, 0.2) }));
  const pane = own(new THREE.PlaneGeometry(1.34, 0.95)), door = own(new THREE.PlaneGeometry(1.2, 1.85));
  for (const side of [1, -1]) {
    for (let i = 0; i < 8; i++) {
      const x = -5.67 + i * 1.62;
      const doorway = side === 1 && (i === 0 || i === 4 || i === 7);
      const mesh = new THREE.Mesh(doorway ? door : pane, doorway ? doorGlass : glass);
      mesh.position.set(x, doorway ? 1.5 : 1.98, side * 1.235);
      mesh.rotation.y = side === 1 ? 0 : Math.PI;
      tram.add(mesh);
    }
  }
  const windscreen = new THREE.Mesh(own(new THREE.PlaneGeometry(2.0, 1.05)), mat(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.62, 0.34) })));
  windscreen.position.set(-7.13, 1.9, 0); windscreen.rotation.y = -Math.PI / 2;
  const sign = new THREE.Mesh(own(new THREE.PlaneGeometry(1.5, 0.26)), mat(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.3, 0.3) })));
  sign.position.set(-7.1, 2.62, 0); sign.rotation.y = -Math.PI / 2;
  tram.add(windscreen, sign);
  const lamp = own(new THREE.CircleGeometry(0.13, 16));
  for (const [x, z, colour] of [[-7.13, 0.8, 0xffffff], [-7.13, -0.8, 0xffffff], [7.13, 0.8, 0xff2010], [7.13, -0.8, 0xff2010]] as const) {
    const lampMesh = new THREE.Mesh(lamp, mat(new THREE.MeshBasicMaterial({ color: new THREE.Color(colour).multiplyScalar(x < 0 ? 4 : 2) })));
    lampMesh.position.set(x, 0.95, z); lampMesh.rotation.y = x < 0 ? -Math.PI / 2 : Math.PI / 2;
    tram.add(lampMesh);
  }
  const bogie = own(new THREE.BoxGeometry(2.6, 0.55, 2.1)), wheel = own(new THREE.CylinderGeometry(0.34, 0.34, 0.16, 16).rotateX(Math.PI / 2));
  const iron = mat(new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.7 }));
  const wheels: THREE.Mesh[] = [];
  for (const bx of [-4, 4]) {
    const b = new THREE.Mesh(bogie, iron); b.position.set(bx, 0.42, 0); tram.add(b);
    for (const dx of [-0.8, 0.8]) for (const z of [0.72, -0.72]) {
      const w = new THREE.Mesh(wheel, iron); w.position.set(bx + dx, 0.34, z); tram.add(w); wheels.push(w);
    }
  }
  const roofBox = new THREE.Mesh(own(new THREE.BoxGeometry(3.2, 0.32, 1.4)), iron);
  roofBox.position.set(2.2, 3.28, 0);
  tram.add(roofBox);
  const arm = own(new THREE.BoxGeometry(0.05, 1.5, 0.05)), bar = own(new THREE.BoxGeometry(0.06, 0.06, 1.3));
  const pantograph = new THREE.Group();
  for (const [x, y, angle] of [[-0.45, 3.65, -0.62], [0.45, 3.65, 0.62], [-0.45, 4.85, 0.62], [0.45, 4.85, -0.62]] as const) {
    const a = new THREE.Mesh(arm, iron); a.position.set(x, y, 0); a.rotation.z = angle; pantograph.add(a);
  }
  const bow = new THREE.Mesh(bar, iron); bow.position.set(0, 5.47, 0); pantograph.add(bow);
  pantograph.position.x = -1.5;
  tram.add(pantograph);
  const spark = new THREE.Mesh(own(new THREE.SphereGeometry(0.16, 10, 8)), mat(new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3.6, 5) })));
  spark.position.set(-1.5, 5.56, 0); spark.name = "Pantograph_Spark";
  const sparkLight = new THREE.PointLight(0x9fc4ff, 0, 16, 2);
  sparkLight.position.copy(spark.position);
  const interior = new THREE.PointLight(0xffb070, 6, 12, 1.6); interior.position.set(0, 2.2, 1.8);
  const headlight = new THREE.SpotLight(0xfff1d0, 60, 45, 0.45, 0.6, 1.4);
  headlight.position.set(-7.2, 1.1, 0); headlight.target.position.set(-30, 0, 0);
  tram.add(spark, sparkLight, interior, headlight, headlight.target);
  return { tram, wheels, spark, sparkLight };
}

export function createBrno(quality: CityQuality = "desktop"): CityScene {
  const mobile = quality === "mobile";
  const atmosphere = createCloudVolume(quality);
  const materials: THREE.Material[] = [], geometries: THREE.BufferGeometry[] = [];
  const own = <T extends THREE.BufferGeometry>(g: T) => { geometries.push(g); return g; };
  const mat = <T extends THREE.Material>(m: T) => { materials.push(m); return m; };
  const rng = random(1919);

  // The street is rendered off-screen and only ever seen through the dot-matrix display.
  const world = new THREE.Scene();
  world.name = "Brno_Street";
  world.fog = new THREE.FogExp2(0x3a2a2a, 0.0085);
  const eye = new THREE.PerspectiveCamera(36, 1, 0.3, 900);
  world.add(new THREE.HemisphereLight(0x8a7fa0, 0x1a100c, 0.35));
  const moon = new THREE.DirectionalLight(0x9fb2ff, 1.1); moon.position.set(-30, 40, 20); world.add(moon);

  const sky = new THREE.Mesh(own(new THREE.SphereGeometry(600, 32, 16)), mat(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 vDir; void main(){
      float y = max(vDir.y, 0.0);
      vec3 c = mix(vec3(0.62, 0.36, 0.2), vec3(0.16, 0.14, 0.2), smoothstep(0.0, 0.16, y));
      c = mix(c, vec3(0.015, 0.02, 0.05), smoothstep(0.12, 0.62, y));
      c += vec3(0.35, 0.18, 0.08) * pow(max(dot(vDir, normalize(vec3(0.7, 0.05, -0.7))), 0.0), 10.0);
      gl_FragColor = vec4(c, 1.0); }`,
  })));
  sky.renderOrder = -1;
  world.add(sky);
  const starPositions: number[] = [];
  for (let i = 0; i < (mobile ? 300 : 500); i++) {
    const theta = rng() * Math.PI * 2, y = 0.12 + rng() * 0.88, r = Math.sqrt(1 - y * y);
    starPositions.push(Math.cos(theta) * r * 500, y * 500, Math.sin(theta) * r * 500);
  }
  const starGeometry = own(new THREE.BufferGeometry());
  starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
  world.add(new THREE.Points(starGeometry, mat(new THREE.PointsMaterial({ color: 0x9aa6c8, size: 2, sizeAttenuation: false, fog: false }))));

  // Petrov on its hill: two slender neo-Gothic spires, floodlit above the rooftops.
  const stone = mat(new THREE.MeshStandardMaterial({ color: 0x0b0a0c, roughness: 1, fog: false }));
  const hill = new THREE.Mesh(own(new THREE.SphereGeometry(1, 32, 16)), mat(new THREE.MeshStandardMaterial({ color: 0x0c0e14, roughness: 1 })));
  hill.scale.set(70, 14, 40); hill.position.set(118, -6, -110);
  const petrov = new THREE.Group(); petrov.name = "Landmark_Petrov";
  const nave = new THREE.Mesh(own(new THREE.BoxGeometry(26, 11, 10)), stone); nave.position.set(8, 5.5, 0);
  const naveRoof = new THREE.Mesh(own(new THREE.CylinderGeometry(0.01, 7.4, 6, 4, 1).rotateY(Math.PI / 4).scale(1.9, 1, 0.72)), stone);
  naveRoof.position.set(8, 14, 0);
  petrov.add(nave, naveRoof);
  for (const z of [-3.2, 3.2]) {
    const tower = new THREE.Mesh(own(new THREE.BoxGeometry(4.2, 22, 4.2)), stone); tower.position.set(-6, 11, z);
    const spire = new THREE.Mesh(own(new THREE.ConeGeometry(2.4, 26, 8)), stone); spire.position.set(-6, 35, z);
    petrov.add(tower, spire);
  }
  petrov.position.set(115, 4, -105); petrov.rotation.y = -1.2; petrov.scale.setScalar(0.8);
  const spilberk = new THREE.Mesh(own(new THREE.BoxGeometry(46, 9, 16)), mat(new THREE.MeshStandardMaterial({ color: 0x0b0a0c, roughness: 1 })));
  spilberk.position.set(-70, 26, -190);
  const spilberkHill = new THREE.Mesh(hill.geometry, hill.material); spilberkHill.scale.set(80, 30, 40); spilberkHill.position.set(-70, -4, -200);
  world.add(hill, petrov, spilberkHill, spilberk);

  // Street: cobbles, two tracks, kerbs and a row of lit facades across the road.
  const road = new THREE.Mesh(own(new THREE.PlaneGeometry(400, 60).rotateX(-Math.PI / 2)), mat(new THREE.MeshStandardMaterial({ color: 0x1c1d22, roughness: 0.55, metalness: 0.1 })));
  road.position.z = -2;
  const kerbMaterial = mat(new THREE.MeshStandardMaterial({ color: 0x3b3a3c, roughness: 0.9 }));
  const farKerb = new THREE.Mesh(own(new THREE.BoxGeometry(400, 0.18, 4)), kerbMaterial); farKerb.position.set(0, 0.09, -8);
  const nearKerb = new THREE.Mesh(farKerb.geometry, kerbMaterial); nearKerb.position.set(0, 0.09, 9);
  const platform = new THREE.Mesh(own(new THREE.BoxGeometry(22, 0.28, 2.2)), kerbMaterial); platform.position.set(TRAM_STOP_X + 2, 0.14, 2.9);
  world.add(road, farKerb, nearKerb, platform);
  const rail = own(new THREE.BoxGeometry(400, 0.09, 0.08)), steel = mat(new THREE.MeshStandardMaterial({ color: 0x9aa0aa, roughness: 0.3, metalness: 0.2, emissive: 0x6c7890, emissiveIntensity: 0.5 }));
  for (const z of [0.72, -0.72, -2.48, -3.92]) { const r = new THREE.Mesh(rail, steel); r.position.set(0, 0.05, z); world.add(r); }
  const shelterMaterial = mat(new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.6 }));
  const shelterRoof = new THREE.Mesh(own(new THREE.BoxGeometry(5, 0.12, 1.8)), shelterMaterial); shelterRoof.position.set(TRAM_STOP_X + 5, 2.7, 3.1);
  const postGeometry = own(new THREE.BoxGeometry(0.08, 2.6, 0.08));
  for (const x of [TRAM_STOP_X + 2.8, TRAM_STOP_X + 7.2]) { const post = new THREE.Mesh(postGeometry, shelterMaterial); post.position.set(x, 1.4, 3.8); world.add(post); }
  const stopSign = new THREE.Mesh(own(new THREE.PlaneGeometry(0.9, 0.5)), mat(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.3, 0.6) })));
  stopSign.position.set(TRAM_STOP_X - 1.5, 2.5, 3.7);
  const stopLight = new THREE.SpotLight(0xffd7a0, 160, 45, 0.55, 0.8, 1.5);
  stopLight.position.set(TRAM_STOP_X - 6, 9, 9); stopLight.target.position.set(TRAM_STOP_X, 1.6, 0);
  const frontLight = new THREE.SpotLight(0xdfe6ff, 140, 40, 0.5, 0.8, 1.5);
  frontLight.position.set(-13, 7, 9); frontLight.target.position.set(TRAM_STOP_X - 6, 1.5, 0);
  world.add(shelterRoof, stopSign, stopLight, stopLight.target, frontLight, frontLight.target);

  const facadeMaterial = mat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
  const litWindow = mat(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.7, 0.45, 0.24) }));
  const darkWindow = mat(new THREE.MeshStandardMaterial({ color: 0x07080c, roughness: 0.15, metalness: 0.6 }));
  const facades: THREE.BufferGeometry[] = [], lit: THREE.Matrix4[] = [], dim: THREE.Matrix4[] = [];
  for (let x = -160; x < 160;) {
    const w = 8 + rng() * 5, h = 13 + rng() * 7, shade = 0.05 + rng() * 0.06;
    const block = new THREE.BoxGeometry(w - 0.3, h, 9).translate(x + w / 2, h / 2, -46);
    const tint = new THREE.Color(shade, shade * (0.92 + rng() * 0.08), shade * (0.82 + rng() * 0.1));
    facades.push(paintByHeight(block, [[h, tint]]), paintByHeight(new THREE.BoxGeometry(w, 0.5, 9.6).translate(x + w / 2, h - 0.3, -45.8), [[h + 1, tint.clone().multiplyScalar(1.2)]]));
    const columns = Math.floor((w - 1.4) / 1.9), floors = Math.floor((h - 2.5) / 3.1);
    for (let f = 0; f < floors; f++) for (let c = 0; c < columns; c++) {
      const m = new THREE.Matrix4().makeTranslation(x + 1.2 + c * ((w - 2.4) / Math.max(1, columns - 1)), 3.2 + f * 3.1, -41.45);
      (rng() < 0.14 ? lit : dim).push(m);
    }
    x += w;
  }
  const facadeGeometry = own(mergeGeometries(facades)!);
  facades.forEach(part => part.dispose());
  const facadeMesh = new THREE.Mesh(facadeGeometry, facadeMaterial); facadeMesh.name = "Facades";
  world.add(facadeMesh);
  const windowGeometry = own(new THREE.PlaneGeometry(1.0, 1.6));
  for (const [list, material] of [[lit, litWindow], [dim, darkWindow]] as const) {
    const mesh = new THREE.InstancedMesh(windowGeometry, material, list.length);
    list.forEach((m, i) => mesh.setMatrixAt(i, m));
    world.add(mesh);
  }

  // Catenary masts, span wires, contact wires and hanging lamps.
  const mast = own(new THREE.CylinderGeometry(0.09, 0.12, 7.4, 8)), wire = own(new THREE.BoxGeometry(400, 0.03, 0.03)), span = own(new THREE.BoxGeometry(0.03, 0.03, 6.6));
  const metal = mat(new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.5, metalness: 0.6 }));
  const bulb = own(new THREE.SphereGeometry(0.22, 12, 8)), bulbMaterial = mat(new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.9, 0.9) }));
  for (let x = -100; x <= 100; x += 25) {
    const m = new THREE.Mesh(mast, metal); m.position.set(x, 3.7, -5.6); world.add(m);
    const s = new THREE.Mesh(span, metal); s.position.set(x, 6.6, -2.3); world.add(s);
    const b = new THREE.Mesh(bulb, bulbMaterial); b.position.set(x + 0.01, 6.3, 0.9); world.add(b);
  }
  for (const z of [0, -3.2]) { const w = new THREE.Mesh(wire, metal); w.position.set(0, 5.6, z); world.add(w); }
  for (const x of [-25, 0, 25, 50]) { const light = new THREE.PointLight(0xffb266, 110, 30, 1.7); light.position.set(x, 6.1, 1); world.add(light); }

  const { tram, wheels, spark, sparkLight } = buildTram(materials, geometries);
  world.add(tram);

  // Display: fullscreen dot-matrix; its onBeforeRender draws the street and the cursor trail with the shared renderer.
  const scene = new THREE.Scene();
  scene.name = "Brno_Dot_Matrix";
  scene.userData.technique = "Procedural 3D street rendered off-screen and re-drawn as a 5×5 glyph matrix with a cursor trail.";
  scene.userData.world = world; scene.userData.eye = eye;
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 10);
  const displayUniforms = {
    source: { value: null as THREE.Texture | null }, trail: { value: null as THREE.Texture | null },
    resolution: { value: new THREE.Vector2(1, 1) }, micro: { value: 1 }, mouse: { value: new THREE.Vector2(-1e4, -1e4) },
    lens: { value: 0 }, lensRadius: { value: 120 }, time: { value: 0 }, packed: { value: 0 }, ready: { value: 0 }, story: { value: 1 },
  };
  const display = new THREE.Mesh(own(new THREE.PlaneGeometry(2, 2)), mat(new THREE.ShaderMaterial({
    uniforms: displayUniforms, depthTest: false, depthWrite: false, vertexShader: FULLSCREEN_VERTEX, fragmentShader: DISPLAY_FRAGMENT,
  })));
  display.name = "Dot_Matrix"; display.frustumCulled = false;
  scene.add(display);
  const trailUniforms = {
    previous: { value: null as THREE.Texture | null }, texel: { value: new THREE.Vector2(1, 1) }, from: { value: new THREE.Vector2() }, to: { value: new THREE.Vector2() },
    aspect: { value: 1 }, decay: { value: 0.9 }, drawing: { value: 0 }, packed: { value: 0 },
  };
  const trailScene = new THREE.Scene();
  const trailQuad = new THREE.Mesh(display.geometry, mat(new THREE.ShaderMaterial({ uniforms: trailUniforms, vertexShader: FULLSCREEN_VERTEX, fragmentShader: TRAIL_FRAGMENT, depthTest: false, depthWrite: false })));
  trailQuad.frustumCulled = false;
  trailScene.add(trailQuad);
  let targets: { source: THREE.WebGLRenderTarget; trail: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget] } | null = null;
  let size = { width: 1440, height: 900, ratio: 1 }, trailPending = false;
  display.onBeforeRender = renderer => {
    const float = renderer.extensions.has("EXT_color_buffer_float");
    const sw = Math.max(1, Math.round(size.width * size.ratio / 2)), sh = Math.max(1, Math.round(size.height * size.ratio / 2));
    const tw = Math.max(1, Math.ceil(size.width / 8)), th = Math.max(1, Math.ceil(size.height / 8));
    if (!targets) {
      const type = float ? THREE.HalfFloatType : THREE.UnsignedByteType;
      const trail = () => new THREE.WebGLRenderTarget(tw, th, { type, depthBuffer: false });
      targets = { source: new THREE.WebGLRenderTarget(sw, sh, { type }), trail: [trail(), trail()] };
      targets.source.texture.colorSpace = THREE.LinearSRGBColorSpace;
      displayUniforms.packed.value = trailUniforms.packed.value = Number(!float);
      const previous = renderer.getRenderTarget(), clear = renderer.getClearColor(new THREE.Color()), alpha = renderer.getClearAlpha();
      renderer.setClearColor(float ? 0x000000 : 0x808000, 1);
      for (const t of targets.trail) { renderer.setRenderTarget(t); renderer.clear(); }
      renderer.setClearColor(clear, alpha); renderer.setRenderTarget(previous);
    }
    targets.source.setSize(sw, sh);
    targets.trail.forEach(t => t.setSize(tw, th));
    const previous = renderer.getRenderTarget();
    renderer.setRenderTarget(targets.source);
    renderer.render(world, eye);
    if (trailPending) {
      trailUniforms.previous.value = targets.trail[0].texture;
      trailUniforms.texel.value.set(1 / tw, 1 / th);
      renderer.setRenderTarget(targets.trail[1]);
      renderer.render(trailScene, camera);
      targets.trail.reverse();
      trailPending = false;
    }
    renderer.setRenderTarget(previous);
    displayUniforms.source.value = targets.source.texture;
    displayUniforms.trail.value = targets.trail[0].texture;
    displayUniforms.ready.value = 1;
  };

  const cursor = trackPointer();
  let view: BrnoView = brnoView(1440, 900), disposed = false, lastSeconds = 0, landedAt: number | null = null;
  let current: CityFrame = { arrivalT: 1, visitT: 0, departureT: 0, ambientSeconds: 0, reduced: false };
  const follow = { x: 0, y: 0, active: 0 }, lastUv = new THREE.Vector2(-1, -1), uv = new THREE.Vector2();
  const api: CityScene = {
    id: "brno-pixel", assetStage: "render", scene, camera, atmosphere,
    get status() { return disposed ? "disposed" : atmosphere.status === "error" ? "error" : atmosphere.status === "ready" ? "ready" : "loading"; },
    update(frame) {
      current = frame;
      const seconds = frame.ambientSeconds, dt = Math.min(0.1, Math.max(0, seconds - lastSeconds));
      lastSeconds = seconds;
      landedAt = frame.arrivalT < 1 ? null : landedAt ?? seconds;
      const ease = (tau: number) => 1 - Math.exp(-dt / tau);
      const hovering = cursor.hovering(seconds), pointer = cursor.state;
      follow.active += (Number(hovering) - follow.active) * ease(0.4);
      follow.x += ((hovering ? pointer.x : 0) - follow.x) * ease(0.6);
      follow.y += ((hovering ? pointer.y : 0) - follow.y) * ease(0.6);
      const excursion = frame.reduced ? 0 : 1 - frame.arrivalT * (1 - frame.departureT);
      const pose = brnoCamera(view, excursion, frame.reduced ? [0, 0] : [follow.x, follow.y]);
      eye.position.set(...pose.position); eye.lookAt(...pose.target); eye.updateMatrixWorld();

      // The tram brakes into the stop as the visitor lands; during the arrival its position depends only on arrivalT.
      const lead = TRAM_CYCLE.approach - 2.2;
      const tramTime = landedAt === null ? Math.max(0, lead - (1 - frame.arrivalT) * 4) : seconds - landedAt + lead;
      const state = tramState(tramTime, frame.reduced);
      tram.position.x = state.x;
      tram.visible = state.phase !== "gap";
      wheels.forEach(w => { w.rotation.z = frame.reduced ? 0 : state.x / 0.34; });
      const flicker = Math.sin(Math.floor(tramTime * 16) * 12.9898) * 43758.5453;
      const sparking = !frame.reduced && state.speed > 2 && flicker - Math.floor(flicker) > 0.55;
      spark.visible = sparking; sparkLight.intensity = sparking ? 40 : 0;

      const micro = Math.max(1, Math.round(size.ratio * brnoCell(size.width, excursion) / 6));
      displayUniforms.micro.value = micro;
      displayUniforms.time.value = frame.reduced ? 0 : seconds;
      displayUniforms.lens.value += ((hovering ? 1 : 0) * (1 - excursion) - displayUniforms.lens.value) * ease(0.25);
      displayUniforms.mouse.value.set((pointer.x * 0.5 + 0.5) * size.width * size.ratio, (pointer.y * 0.5 + 0.5) * size.height * size.ratio);
      uv.set(pointer.x * 0.5 + 0.5, pointer.y * 0.5 + 0.5);
      trailUniforms.from.value.copy(lastUv.x < 0 ? uv : lastUv);
      trailUniforms.to.value.copy(uv);
      trailUniforms.drawing.value = Number(hovering && !frame.reduced);
      trailUniforms.decay.value = Math.exp(-dt / 0.45);
      lastUv.copy(uv);
      trailPending = true;
    },
    resize(width, height) {
      view = brnoView(width, height);
      size = { width: Math.max(1, width), height: Math.max(1, height), ratio: Math.min(window.devicePixelRatio || 1, 1.5) };
      eye.aspect = camera.aspect = size.width / size.height;
      eye.fov = view.fov;
      eye.updateProjectionMatrix(); camera.updateProjectionMatrix();
      displayUniforms.resolution.value.set(Math.round(size.width * size.ratio), Math.round(size.height * size.ratio));
      displayUniforms.lensRadius.value = (width < 700 ? 80 : 130) * size.ratio;
      displayUniforms.story.value = width >= 700 && width / Math.max(1, height) >= 0.9 ? 1 : 2;
      trailUniforms.aspect.value = eye.aspect;
      api.update(current);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cursor.dispose();
      new Set(geometries).forEach(g => g.dispose());
      new Set(materials).forEach(m => m.dispose());
      world.traverse(object => { if (object instanceof THREE.InstancedMesh) object.dispose(); });
      if (targets) { targets.source.dispose(); targets.trail.forEach(t => t.dispose()); targets = null; }
      atmosphere.dispose(); world.clear(); scene.clear();
    },
  };
  api.resize(1440, 900, quality);
  return api;
}
