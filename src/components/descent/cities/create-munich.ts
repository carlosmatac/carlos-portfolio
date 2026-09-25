import * as THREE from "three";
import { createCloudVolume } from "../clouds/cloud-volume";
import { createDotMatrix, DOT_MATRIX_GLSL } from "./dot-matrix";
import {
  aimPoint, HAT_LOGO, helicopterGoal, jetPair, munichCamera, munichCell, munichView, PAD, random, stepHelicopter, WAYPOINTS,
  type MunichView,
} from "./munich-art";
import { trackPointer } from "./pointer";
import type { CityFrame, CityQuality, CityScene } from "./types";

type Vec3 = [number, number, number];

/**
 * Mission display: a halftone of dots whose size follows luminance, coloured on a tactical ramp (HAT blue → cyan → white)
 * with warm sources in amber. The brightest cells become squares; the cursor trail leaves plus signs and the
 * thermal sight turns its dots into diamonds, framed by targeting brackets.
 */
const DISPLAY_FRAGMENT = /* glsl */ `
  ${DOT_MATRIX_GLSL}
  uniform float lock;
  vec3 tactical(float t) {
    vec3 c = mix(vec3(0.03, 0.06, 0.16), vec3(0.14, 0.29, 0.66), smoothstep(0.0, 0.35, t));
    c = mix(c, vec3(0.3, 0.82, 1.0), smoothstep(0.35, 0.75, t));
    return mix(c, vec3(0.92, 0.97, 1.0), smoothstep(0.78, 1.0, t));
  }
  vec3 thermal(float t) {
    vec3 c = mix(vec3(0.02, 0.0, 0.06), vec3(0.32, 0.03, 0.5), smoothstep(0.0, 0.3, t));
    c = mix(c, vec3(0.95, 0.25, 0.12), smoothstep(0.25, 0.6, t));
    c = mix(c, vec3(1.0, 0.8, 0.2), smoothstep(0.55, 0.85, t));
    return mix(c, vec3(1.0), smoothstep(0.85, 1.0, t));
  }
  void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 size = vec2(6.0) * micro;
    vec2 index = floor(frag / size), local = frag - index * size;
    vec2 centre = (index + 0.5) * size / resolution;
    vec3 field = trailAt(centre);
    vec3 colour = texture2D(source, centre - field.xy * field.z * 0.03).rgb * ready;
    float peak = max(colour.r, max(colour.g, colour.b));
    float light = 1.0 - exp(-mix(luma(colour), peak, 0.5) * 2.6);
    float sweep = exp(-pow((vUv.y - (1.0 - fract(time / 7.0))) * 30.0, 2.0));
    light = pow(light, 1.15) * storyLight() + sweep * 0.12 * step(0.04, light);
    float distanceToMouse = length((index + 0.5) * size - mouse);
    float sight = lens * (1.0 - smoothstep(lensRadius * 0.85, lensRadius, distanceToMouse));
    float level = clamp(light + (hash(index * 1.37) - 0.5) * 0.08, 0.0, 1.0);
    float scramble = step(0.25, field.z) * step(0.35, hash(index + floor(time * 18.0)));
    float flicker = step(0.965, hash(index + floor(time * 1.5))) * step(0.1, level);
    vec2 q = local / size * 2.0 - 1.0;
    float radius = level < 0.07 ? 0.0 : 0.2 + 0.64 * sqrt(level), square = max(abs(q.x), abs(q.y));
    float mark;
    if (scramble + flicker > 0.5) mark = step(min(abs(q.x), abs(q.y)), 0.18) * step(square, max(radius, 0.55));
    else if (sight > 0.5) mark = step(abs(q.x) + abs(q.y), radius * 1.2);
    else if (level > 0.84) mark = step(square, 0.7);
    else mark = step(length(q), radius);
    bool ink = mark > 0.5;
    float warmth = clamp((colour.r - colour.b) / max(peak, 1e-4), 0.0, 1.0), blueness = clamp((colour.b - colour.r) / max(peak, 1e-4), 0.0, 1.0);
    vec3 tone = mix(tactical(light), vec3(1.0, 0.6, 0.14) * (0.45 + 0.7 * light), smoothstep(0.3, 0.65, warmth));
    tone = mix(tone, vec3(0.16, 0.42, 1.0) * (0.5 + 0.8 * light), smoothstep(0.3, 0.6, blueness) * step(0.3, light));
    tone = mix(tone, vec3(1.0, 0.55, 0.1) * (0.6 + field.z), scramble * 0.8);
    tone = mix(tone, thermal(light), sight);
    float rim = lens * (1.0 - smoothstep(0.0, max(1.5, micro * 1.2), abs(distanceToMouse - lensRadius * 0.95)));
    vec3 ground = vec3(0.006, 0.009, 0.022) + vec3(0.008, 0.012, 0.03) * sight + vec3(0.1, 0.25, 0.5) * rim;
    vec3 result = ink ? tone * 1.15 : ground;
    // Targeting brackets and crosshair around the cursor.
    vec2 d = abs(frag - mouse);
    float box = lensRadius * 0.62, arm = lensRadius * 0.2, stroke = max(1.0, micro);
    float brackets = step(box - stroke, max(d.x, d.y)) * step(max(d.x, d.y), box) * step(box - arm, min(d.x, d.y));
    float cross = step(d.x, stroke * 0.5) * step(d.y, arm * 0.6) + step(d.y, stroke * 0.5) * step(d.x, arm * 0.6);
    result = mix(result, mix(vec3(0.35, 0.8, 1.0), vec3(1.0, 0.6, 0.12), lock), clamp(brackets + cross, 0.0, 1.0) * lens);
    gl_FragColor = vec4(result, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

function place(mesh: THREE.Mesh, x: number, y: number, z: number) { mesh.position.set(x, y, z); return mesh; }

function logoGeometry(depth: number) {
  const shape = (points: [number, number][]) => new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const grey = HAT_LOGO.grey.map(points => new THREE.ExtrudeGeometry(shape(points), { depth, bevelEnabled: false }));
  const triangle = shape(HAT_LOGO.blue.outer);
  triangle.holes.push(new THREE.Path(HAT_LOGO.blue.inner.map(([x, y]) => new THREE.Vector2(x, y))));
  // "TEC" in blocky strokes under the mark, wide enough to survive the halftone.
  const bar = (x: number, y: number, w: number, h: number) => new THREE.BoxGeometry(w, h, depth).translate(x + w / 2, y + h / 2, depth / 2);
  const t = 0.075, top = -0.16, bottom = -0.56;
  const letters: THREE.BufferGeometry[] = [
    bar(0.72, top - t, 0.36, t), bar(0.9 - t / 2, bottom, t, top - bottom - t),
    bar(1.22, bottom, t, top - bottom), ...[top - t, (top + bottom - t) / 2, bottom].map(y => bar(1.22, y, 0.3, t)),
    bar(1.7, bottom, t, top - bottom), bar(1.7, top - t, 0.32, t), bar(1.7, bottom, 0.32, t),
  ];
  return { grey, blue: new THREE.ExtrudeGeometry(triangle, { depth, bevelEnabled: false }), letters };
}

/** Airbus H145: rounded cabin, tapered boom, Fenestron tail, skids and a four-blade rotor. Nose points to −x. */
function buildHelicopter(own: <T extends THREE.BufferGeometry>(g: T) => T, mat: <T extends THREE.Material>(m: T) => T) {
  const root = new THREE.Group(); root.name = "H145";
  const body = new THREE.Group(); root.add(body);
  const paint = mat(new THREE.MeshStandardMaterial({ color: 0xb8c2d6, roughness: 0.4, metalness: 0.2, emissive: 0x0a0e16 }));
  const stripe = mat(new THREE.MeshStandardMaterial({ color: 0x1f4bb0, emissive: 0x0d2466, roughness: 0.4 }));
  const glass = mat(new THREE.MeshStandardMaterial({ color: 0x050709, roughness: 0.05, metalness: 0.9, emissive: 0x0a1830 }));
  const cabin = new THREE.Mesh(own(new THREE.SphereGeometry(1, 28, 16).scale(2.3, 1.05, 1.0)), paint);
  cabin.position.set(-0.4, 0, 0);
  const band = new THREE.Mesh(own(new THREE.SphereGeometry(1.01, 28, 4, 0, Math.PI * 2, Math.PI * 0.52, Math.PI * 0.1).scale(2.3, 1.05, 1.0)), stripe);
  band.position.copy(cabin.position);
  const canopy = new THREE.Mesh(own(new THREE.SphereGeometry(1.02, 20, 12, Math.PI * 0.75, Math.PI * 0.5, Math.PI * 0.18, Math.PI * 0.42).scale(2.3, 1.05, 1.0)), glass);
  canopy.position.copy(cabin.position);
  const boom = new THREE.Mesh(own(new THREE.CylinderGeometry(0.2, 0.42, 5.2, 12).rotateZ(Math.PI / 2)), paint);
  boom.position.set(3.9, 0.35, 0);
  const fenestron = new THREE.Mesh(own(new THREE.TorusGeometry(0.55, 0.2, 10, 24)), paint);
  fenestron.position.set(6.6, 0.75, 0);
  const fin = new THREE.Mesh(own(new THREE.BoxGeometry(0.9, 1.3, 0.12)), paint); fin.position.set(6.9, 1.6, 0); fin.rotation.z = -0.35;
  const stabiliser = new THREE.Mesh(own(new THREE.BoxGeometry(0.6, 0.08, 2.2)), paint); stabiliser.position.set(5.6, 0.35, 0);
  const engine = new THREE.Mesh(own(new THREE.BoxGeometry(2.2, 0.55, 1.1)), paint); engine.position.set(0.5, 1.15, 0);
  body.add(cabin, band, canopy, boom, fenestron, fin, stabiliser, engine);
  const skid = own(new THREE.CylinderGeometry(0.06, 0.06, 4.2, 6).rotateZ(Math.PI / 2)), strut = own(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 6));
  for (const z of [0.95, -0.95]) {
    const s = new THREE.Mesh(skid, paint); s.position.set(-0.3, -1.45, z); body.add(s);
    for (const x of [-1.2, 0.7]) { const t = new THREE.Mesh(strut, paint); t.position.set(x, -1.05, z * 0.85); t.rotation.x = z > 0 ? -0.25 : 0.25; body.add(t); }
  }
  const hot = mat(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.9, 0.25) }));
  for (const z of [0.35, -0.35]) { const exhaust = new THREE.Mesh(own(new THREE.SphereGeometry(0.16, 8, 6)), hot); exhaust.position.set(1.65, 1.2, z); body.add(exhaust); }
  const rotor = new THREE.Group(); rotor.position.set(0.2, 1.65, 0); rotor.name = "Rotor";
  const blade = own(new THREE.BoxGeometry(5.6, 0.05, 0.28).translate(2.8, 0, 0));
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(blade, paint); b.rotation.y = i * Math.PI / 2; rotor.add(b); }
  const disc = new THREE.Mesh(own(new THREE.RingGeometry(5.2, 5.6, 48).rotateX(-Math.PI / 2)), mat(new THREE.MeshBasicMaterial({ color: 0x8aa0d0, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide })));
  rotor.add(disc);
  body.add(rotor);
  const nav = (colour: number, x: number, y: number, z: number) => {
    const light = new THREE.Mesh(own(new THREE.SphereGeometry(0.12, 8, 6)), mat(new THREE.MeshBasicMaterial({ color: new THREE.Color(colour).multiplyScalar(3) })));
    light.position.set(x, y, z); body.add(light); return light;
  };
  nav(0xff2020, 0.2, -0.2, 1.05); nav(0x20ff60, 0.2, -0.2, -1.05);
  const beacon = nav(0xff3010, 0.4, 1.5, 0), strobe = nav(0xffffff, 7.0, 2.3, 0);
  const search = new THREE.SpotLight(0xe8f0ff, 2400, 120, 0.2, 0.5, 1.4);
  search.position.set(-2.2, -0.9, 0); search.target.position.set(-3, -30, -4);
  const beam = new THREE.Mesh(own(new THREE.ConeGeometry(5, 30, 24, 1, true).translate(0, -15, 0)),
    mat(new THREE.MeshBasicMaterial({ color: 0x9fb8ff, transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })));
  beam.position.copy(search.position);
  beam.lookAt(search.target.position); beam.rotateX(-Math.PI / 2);
  body.add(search, search.target, beam);
  return { root, body, rotor, beacon, strobe };
}

/** Eurofighter Typhoon silhouette: canard-delta, single fin, afterburner. Flies towards −x. */
function buildJet(own: <T extends THREE.BufferGeometry>(g: T) => T, material: THREE.Material, burner: THREE.Material) {
  const jet = new THREE.Group();
  const fuselage = new THREE.Mesh(own(new THREE.ConeGeometry(0.9, 16, 12).rotateZ(Math.PI / 2)), material);
  const delta = new THREE.Shape([new THREE.Vector2(-1, 0), new THREE.Vector2(6, 5.5), new THREE.Vector2(7, 5.5), new THREE.Vector2(7, -5.5), new THREE.Vector2(6, -5.5)]);
  const wing = new THREE.Mesh(own(new THREE.ShapeGeometry(delta).rotateX(-Math.PI / 2)), material);
  const canard = new THREE.Mesh(own(new THREE.BoxGeometry(0.8, 0.08, 4)), material); canard.position.set(-5, 0.2, 0);
  const fin = new THREE.Mesh(own(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(4, 0), new THREE.Vector2(7.4, 0), new THREE.Vector2(7.2, 3.6), new THREE.Vector2(6.4, 3.6)]))), material);
  const flame = new THREE.Mesh(own(new THREE.SphereGeometry(0.7, 10, 8).scale(2.2, 1, 1)), burner); flame.position.set(8.6, 0, 0);
  jet.add(fuselage, wing, canard, fin, flame);
  return jet;
}

export function createMunich(quality: CityQuality = "desktop"): CityScene {
  const mobile = quality === "mobile";
  const atmosphere = createCloudVolume(quality);
  const materials: THREE.Material[] = [], geometries: THREE.BufferGeometry[] = [];
  const own = <T extends THREE.BufferGeometry>(g: T) => { geometries.push(g); return g; };
  const mat = <T extends THREE.Material>(m: T) => { materials.push(m); return m; };
  const rng = random(2024);

  const world = new THREE.Scene();
  world.name = "Munich_Mission";
  world.fog = new THREE.FogExp2(0x070a12, 0.00045);
  const eye = new THREE.PerspectiveCamera(40, 1, 0.5, 14000);
  world.add(new THREE.HemisphereLight(0x5670a8, 0x100c10, 0.55));
  const sun = new THREE.DirectionalLight(0xff9a5a, 1.4); sun.position.set(-600, 120, -900); world.add(sun);

  // Föhn dusk: clear teal sky over a glowing band behind the Alps.
  const sky = new THREE.Mesh(own(new THREE.SphereGeometry(11000, 32, 16)), mat(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 vDir; void main(){
      float y = max(vDir.y, 0.0);
      vec3 c = mix(vec3(0.7, 0.3, 0.12), vec3(0.05, 0.065, 0.12), smoothstep(0.0, 0.035, y));
      c = mix(c, vec3(0.024, 0.032, 0.06), smoothstep(0.03, 0.08, y));
      c = mix(c, vec3(0.006, 0.009, 0.02), smoothstep(0.08, 0.5, y));
      c += vec3(0.45, 0.16, 0.04) * pow(max(dot(vDir, normalize(vec3(-0.5, 0.02, -0.86))), 0.0), 16.0) * (1.0 - smoothstep(0.0, 0.12, y));
      gl_FragColor = vec4(c, 1.0); }`,
  })));
  world.add(sky);
  const starPositions: number[] = [];
  for (let i = 0; i < (mobile ? 260 : 420); i++) {
    const theta = rng() * Math.PI * 2, y = 0.08 + rng() * 0.9, r = Math.sqrt(1 - y * y);
    starPositions.push(Math.cos(theta) * r * 4500, y * 4500, Math.sin(theta) * r * 4500);
  }
  const starGeometry = own(new THREE.BufferGeometry());
  starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
  world.add(new THREE.Points(starGeometry, mat(new THREE.PointsMaterial({ color: 0x7f93c0, size: 2.5, sizeAttenuation: false, fog: false }))));

  // The Alps: a ridged range with snow and alpenglow.
  const alps = new THREE.PlaneGeometry(16000, 1600, mobile ? 220 : 380, mobile ? 36 : 56).rotateX(-Math.PI / 2).translate(0, 0, -3300);
  const pos = alps.attributes.position;
  const noise = (x: number, z: number) => Math.sin(x * 0.004 + Math.sin(z * 0.003) * 2) * Math.cos(z * 0.005 - x * 0.001);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), depth = Math.min(1, Math.max(0, (-z - 2550) / 450)) * Math.min(1, Math.max(0, (z + 4000) / 600));
    let h = 0, amp = 1, f = 1;
    for (let o = 0; o < 5; o++) { h += (1 - Math.abs(noise(x * f + o * 91, z * f - o * 37))) ** 2 * amp; amp *= 0.5; f *= 2.1; }
    pos.setY(i, h * 190 * depth - 30);
  }
  alps.computeVertexNormals();
  const alpsMesh = new THREE.Mesh(own(alps), mat(new THREE.ShaderMaterial({
    fog: false,
    vertexShader: `varying vec3 vN; varying vec3 vP; void main(){ vN = normal; vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 vN; varying vec3 vP; void main(){
      vec3 n = normalize(vN);
      float snow = smoothstep(80.0, 120.0, vP.y + (n.y - 0.7) * 60.0);
      float glow = 0.3 + 0.7 * pow(max(dot(n, normalize(vec3(-0.75, 0.3, 0.3))), 0.0), 1.4);
      vec3 rock = vec3(0.012, 0.015, 0.03) * (0.2 + glow);
      vec3 c = mix(rock, vec3(1.0, 0.45, 0.24) * (0.08 + 1.6 * glow), snow);
      c = mix(c, vec3(0.1, 0.13, 0.24), 0.05);
      gl_FragColor = vec4(c, 1.0); }`,
  })));
  alpsMesh.name = "Alps";
  world.add(alpsMesh);

  // Munich: a low city plane of lit blocks, the Frauenkirche, the Olympiaturm and BMW's four cylinders.
  const ground = new THREE.Mesh(own(new THREE.PlaneGeometry(9000, 2400).rotateX(-Math.PI / 2).translate(0, 0, -900)), mat(new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 1 })));
  world.add(ground);
  const blockMaterial = mat(new THREE.MeshStandardMaterial({ color: 0x1a1d27, roughness: 0.9 }));
  const blocks = new THREE.InstancedMesh(own(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0)), blockMaterial, mobile ? 500 : 900);
  const windows: number[] = [], windowColours: number[] = [];
  const matrix4 = new THREE.Matrix4();
  for (let i = 0; i < blocks.count; i++) {
    const x = -1400 + rng() * 2800, z = -140 - rng() * 1100, w = 14 + rng() * 26, h = 8 + rng() * 22 * (1 - Math.abs(x) / 1600);
    blocks.setMatrixAt(i, matrix4.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion(), new THREE.Vector3(w, h, w * (0.6 + rng()))));
    for (let k = 0; k < 6; k++) if (rng() < 0.75) {
      windows.push(x + (rng() - 0.5) * w, rng() * h, z + w * 0.5); const warm = rng() < 0.8;
      windowColours.push(warm ? 1.4 : 0.6, warm ? 0.85 : 0.8, warm ? 0.4 : 1.2);
    }
  }
  const windowGeometry = own(new THREE.BufferGeometry());
  windowGeometry.setAttribute("position", new THREE.Float32BufferAttribute(windows, 3));
  windowGeometry.setAttribute("color", new THREE.Float32BufferAttribute(windowColours, 3));
  world.add(blocks, new THREE.Points(windowGeometry, mat(new THREE.PointsMaterial({ size: 3.5, vertexColors: true, sizeAttenuation: false }))));
  const landmark = mat(new THREE.MeshStandardMaterial({ color: 0x3b3f4d, emissive: 0x2a2018, roughness: 0.8 }));
  const frauenkirche = new THREE.Group(); frauenkirche.name = "Landmark_Frauenkirche";
  frauenkirche.add(place(new THREE.Mesh(own(new THREE.BoxGeometry(70, 32, 34)), landmark), 38, 16, 0));
  for (const z of [-9, 9]) {
    frauenkirche.add(place(new THREE.Mesh(own(new THREE.BoxGeometry(14, 82, 14)), landmark), 0, 41, z));
    frauenkirche.add(place(new THREE.Mesh(own(new THREE.SphereGeometry(8.5, 16, 12).scale(1, 1.5, 1)), landmark), 0, 86, z));
    frauenkirche.add(place(new THREE.Mesh(own(new THREE.CylinderGeometry(1.2, 1.8, 10, 8)), landmark), 0, 102, z));
  }
  frauenkirche.position.set(-120, 0, -520); frauenkirche.rotation.y = 0.4;
  const olympia = new THREE.Group(); olympia.name = "Landmark_Olympiaturm";
  olympia.add(place(new THREE.Mesh(own(new THREE.CylinderGeometry(4, 7, 190, 12)), landmark), 0, 95, 0));
  olympia.add(place(new THREE.Mesh(own(new THREE.CylinderGeometry(15, 12, 16, 20)), landmark), 0, 190, 0));
  olympia.add(place(new THREE.Mesh(own(new THREE.CylinderGeometry(1, 1.5, 70, 6)), landmark), 0, 233, 0));
  const olympiaLight = new THREE.Mesh(own(new THREE.SphereGeometry(2.4, 8, 6)), mat(new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.3, 0.1) })));
  olympiaLight.position.set(0, 270, 0); olympia.add(olympiaLight);
  olympia.position.set(260, 0, -900);
  const bmw = new THREE.Group(); bmw.name = "Landmark_BMW";
  for (const [x, z] of [[0, 0], [22, 8], [10, 26], [-12, 18]]) bmw.add(place(new THREE.Mesh(own(new THREE.CylinderGeometry(11, 11, 99, 20)), landmark), x, 50, z));
  bmw.position.set(360, 0, -800);
  world.add(frauenkirche, olympia, bmw);

  // HAT.tec: the rooftop with its helipad and illuminated sign.
  const building = new THREE.Mesh(own(new THREE.BoxGeometry(46, PAD[1], 40).translate(0, PAD[1] / 2, 0)), mat(new THREE.MeshStandardMaterial({ color: 0x1b1f28, roughness: 0.7 })));
  building.position.set(PAD[0], 0, PAD[2]);
  const deck = new THREE.Mesh(own(new THREE.CylinderGeometry(12, 12, 0.3, 48)), mat(new THREE.MeshStandardMaterial({ color: 0x151920, roughness: 0.6 })));
  deck.position.set(PAD[0], PAD[1] + 0.15, PAD[2]);
  const ring = new THREE.Mesh(own(new THREE.RingGeometry(10.7, 11, 64).rotateX(-Math.PI / 2)), mat(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.22, 0.24, 0.3) })));
  ring.position.set(PAD[0], PAD[1] + 0.32, PAD[2]);
  world.add(building, deck, ring);
  const logo = new THREE.Group(); logo.name = "HAT_Logo";
  const shapes = logoGeometry(0.05);
  const grey = mat(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 1.15, 1.25) })), blue = mat(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.08, 0.3, 2.6), fog: false }));
  [...shapes.grey, ...shapes.letters].forEach(g => logo.add(new THREE.Mesh(own(g), grey)));
  logo.add(new THREE.Mesh(own(shapes.blue), blue));
  // A lit rooftop sign faces the city from the edge of the helipad roof.
  logo.children.forEach(child => child.position.set(-HAT_LOGO.width / 2, 0.52, 0));
  logo.scale.setScalar(5.2);
  logo.rotation.y = -0.64;
  logo.position.set(PAD[0] - 16, PAD[1] + 1.2, PAD[2] + 18);
  world.add(logo);
  const signFrame = new THREE.Mesh(own(new THREE.BoxGeometry(HAT_LOGO.width * 5.2 + 1, 0.4, 0.4)), mat(new THREE.MeshStandardMaterial({ color: 0x2a2f3a })));
  signFrame.position.set(PAD[0] - 16, PAD[1] + 1.0, PAD[2] + 18); signFrame.rotation.y = -0.64;
  world.add(signFrame);
  const padLights: number[] = [];
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; padLights.push(PAD[0] + Math.cos(a) * 11.8, PAD[1] + 0.5, PAD[2] + Math.sin(a) * 11.8); }
  const padGeometry = own(new THREE.BufferGeometry()); padGeometry.setAttribute("position", new THREE.Float32BufferAttribute(padLights, 3));
  world.add(new THREE.Points(padGeometry, mat(new THREE.PointsMaterial({ color: new THREE.Color(0.4, 2.4, 0.9), size: 5, sizeAttenuation: false }))));
  const floodlight = new THREE.PointLight(0xcfe0ff, 900, 60, 1.6); floodlight.position.set(PAD[0] - 16, PAD[1] + 10, PAD[2] + 16); world.add(floodlight);

  // Mission route: HAT triangles as waypoints, joined by a dashed line.
  const amber = mat(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.1, 0.2), side: THREE.DoubleSide }));
  const marker = shapes.blue.clone(); own(marker); marker.center();
  const markers = WAYPOINTS.map((p, i) => {
    const m = new THREE.Mesh(marker, amber); m.position.set(...p); m.scale.setScalar(5 + i * 16); world.add(m); return m;
  });
  const route: number[] = [];
  const points = [new THREE.Vector3(PAD[0], PAD[1] + 10, PAD[2]), ...WAYPOINTS.map(p => new THREE.Vector3(...p))];
  for (let i = 0; i < points.length - 1; i++) for (let k = 0; k < 12; k += 2) {
    route.push(...points[i].clone().lerp(points[i + 1], k / 12).toArray(), ...points[i].clone().lerp(points[i + 1], (k + 1) / 12).toArray());
  }
  const routeGeometry = own(new THREE.BufferGeometry()); routeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(route, 3));
  world.add(new THREE.LineSegments(routeGeometry, mat(new THREE.LineBasicMaterial({ color: new THREE.Color(1.6, 0.8, 0.15) }))));

  const heli = buildHelicopter(own, mat);
  heli.root.rotation.y = 2.5; heli.root.scale.setScalar(1.7);
  const heliLight = new THREE.DirectionalLight(0xdfe8ff, 0.9); heliLight.position.set(-40, 60, 60); heliLight.target = heli.root; world.add(heliLight);
  world.add(heli.root);
  const jetMaterial = mat(new THREE.MeshStandardMaterial({ color: 0x5a6070, roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide }));
  const burner = mat(new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.2, 0.3) }));
  const jets = [buildJet(own, jetMaterial, burner), buildJet(own, jetMaterial, burner)];
  jets.forEach((j, i) => { j.name = `Eurofighter_${i + 1}`; j.scale.setScalar(1.6); world.add(j); });
  const contrailGeometry = own(new THREE.BoxGeometry(1, 1.4, 1.4).translate(0.5, 0, 0));
  const contrailMaterial = mat(new THREE.MeshBasicMaterial({ color: 0xc8d4ee, transparent: true, opacity: 0.35, depthWrite: false }));
  const contrails = jets.map(() => { const c = new THREE.Mesh(contrailGeometry, contrailMaterial); world.add(c); return c; });

  const matrix = createDotMatrix({ name: "Munich_Mission_Display", world, eye, fragmentShader: DISPLAY_FRAGMENT, uniforms: { lock: { value: 0 } }, cellMicro: 6 });
  const { scene, camera } = matrix;
  scene.userData.technique = "Procedural 3D mission scene re-drawn as a digit matrix on a tactical palette, with a thermal cursor sight.";

  const cursor = trackPointer();
  let view: MunichView = munichView(1440, 900), width = 1440, disposed = false, lastSeconds = 0;
  let current: CityFrame = { arrivalT: 1, visitT: 0, departureT: 0, ambientSeconds: 0, reduced: false };
  let flight = { position: helicopterGoal(null, 0, false), velocity: [0, 0, 0] as Vec3 };
  const follow = { x: 0, y: 0 }, projected = new THREE.Vector3(), ray = new THREE.Vector3();
  const api: CityScene = {
    id: "munich-mission", assetStage: "render", scene, camera, atmosphere,
    get status() { return disposed ? "disposed" : atmosphere.status === "error" ? "error" : atmosphere.status === "ready" ? "ready" : "loading"; },
    update(frame) {
      current = frame;
      const seconds = frame.ambientSeconds, dt = Math.min(0.1, Math.max(0, seconds - lastSeconds));
      lastSeconds = seconds;
      const ease = (tau: number) => 1 - Math.exp(-dt / tau);
      const hovering = cursor.hovering(seconds), pointer = cursor.state;
      follow.x += ((hovering ? pointer.x : 0) - follow.x) * ease(0.8);
      follow.y += ((hovering ? pointer.y : 0) - follow.y) * ease(0.8);
      const excursion = frame.reduced ? 0 : 1 - frame.arrivalT * (1 - frame.departureT);
      const pose = munichCamera(view, excursion, frame.reduced ? [0, 0] : [follow.x, follow.y]);
      eye.position.set(...pose.position); eye.lookAt(...pose.target); eye.updateMatrixWorld();

      ray.set(pointer.x, pointer.y, 0.5).unproject(eye).sub(eye.position).normalize();
      const goal = helicopterGoal(hovering ? aimPoint(eye.position.toArray() as Vec3, ray.toArray() as Vec3) : null, seconds, frame.reduced);
      const step = frame.reduced ? { position: goal, velocity: [0, 0, 0] as Vec3, bank: 0, pitch: 0 } : stepHelicopter(flight, goal, dt);
      flight = { position: step.position, velocity: step.velocity };
      heli.root.position.set(...step.position);
      heli.body.rotation.set(step.bank, 0, step.pitch);
      heli.rotor.rotation.y += frame.reduced ? 0 : dt * 28;
      heli.beacon.visible = frame.reduced || seconds % 1.2 < 0.15;
      heli.strobe.visible = !frame.reduced && seconds % 1.6 < 0.08;
      olympiaLight.visible = frame.reduced || seconds % 2 < 1;

      const pair = jetPair(seconds, frame.reduced);
      [pair.lead, pair.wing].forEach((p, i) => {
        jets[i].position.set(...p); jets[i].visible = pair.visible;
        contrails[i].position.set(p[0] + 14, p[1], p[2]); contrails[i].scale.x = pair.trail; contrails[i].visible = pair.visible;
      });
      markers.forEach(m => m.quaternion.copy(eye.quaternion));

      projected.set(...step.position).project(eye);
      const lock = hovering && Math.hypot(projected.x - pointer.x, (projected.y - pointer.y) / eye.aspect) < 0.12;
      matrix.uniforms.lock.value += (Number(lock) - matrix.uniforms.lock.value) * ease(0.15);
      matrix.update({ seconds, dt, excursion, reduced: frame.reduced, hovering, pointer, cellCss: munichCell(width, excursion) });
    },
    resize(w, h) {
      view = munichView(w, h); width = w;
      matrix.resize(w, h, view.fov);
      api.update(current);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cursor.dispose();
      new Set(geometries).forEach(g => g.dispose());
      new Set(materials).forEach(m => m.dispose());
      blocks.dispose();
      matrix.dispose(); atmosphere.dispose(); world.clear();
    },
  };
  api.resize(1440, 900, quality);
  return api;
}
