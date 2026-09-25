import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createCloudVolume } from "../clouds/cloud-volume";
import { createDotMatrix, DOT_MATRIX_GLSL } from "./dot-matrix";
import {
  ALHAMBRA, enclosureHalfWidth, gliderCells, gliderDirection, granadaCamera, granadaCell, granadaView, MOON, moonPosition, random, ridgeZ, terrainHeight,
  type GranadaView,
} from "./granada-art";
import { trackPointer } from "./pointer";
import type { CityFrame, CityQuality, CityScene } from "./types";

type Vec3 = [number, number, number];

/** Glider stamps as 3×3 bitmasks (bit = row * 3 + column, row 0 at the bottom), one per diagonal. */
const GLIDER_MASKS = [0, 1, 2, 3].map(direction => gliderCells(0, 0, direction).reduce((bits, [x, y]) => bits | (1 << (y * 3 + x)), 0));

/**
 * Nasrid halftone: fine cells whose dot grows with luminance in the render's hue, graded towards azulejo colours.
 * The brightest cells and every cell under the cursor become eight-point stars; Game of Life cells are emerald crosses.
 */
const DISPLAY_FRAGMENT = /* glsl */ `
  ${DOT_MATRIX_GLSL}
  uniform sampler2D life;
  float star(vec2 q, float r) { return min(max(abs(q.x), abs(q.y)), (abs(q.x) + abs(q.y)) * 0.7071) - r; }
  void main() {
    vec2 frag = gl_FragCoord.xy, size = vec2(6.0) * micro;
    vec2 index = floor(frag / size), local = frag - index * size, centre = (index + 0.5) * size / resolution;
    vec3 field = trailAt(centre);
    vec3 colour = texture2D(source, centre - field.xy * field.z * 0.03).rgb * ready;
    float peak = max(colour.r, max(colour.g, colour.b));
    float quiet = storyLight();
    float light = pow(1.0 - exp(-mix(luma(colour), peak, 0.5) * 2.5), 1.1) * quiet;
    float level = clamp(light + (hash(index * 1.37) - 0.5) * 0.06, 0.0, 1.0);
    vec2 q = local / size * 2.0 - 1.0;
    float near = lens * (1.0 - smoothstep(lensRadius * 0.7, lensRadius, length((index + 0.5) * size - mouse)));
    float radius = level < 0.07 ? 0.0 : 0.2 + 0.64 * sqrt(level);
    float mark = near > 0.5 || level > 0.84 ? step(star(q, radius * 0.72), 0.0) : step(length(q), radius);
    vec3 hue = colour / max(peak, 1e-4);
    float cool = clamp((colour.b - colour.r) / max(peak, 1e-4), 0.0, 1.0);
    vec3 tone = mix(hue, vec3(0.3, 0.62, 0.82), smoothstep(0.1, 0.6, cool) * 0.6) * mix(0.25, 1.15, light);
    vec4 cell = texture2D(life, centre);
    if (cell.r > 0.5) {
      mark = step(min(abs(q.x), abs(q.y)), 0.22) * step(max(abs(q.x), abs(q.y)), 0.8);
      tone = vec3(0.3, 1.1, 0.8) * mix(0.35, 1.0, quiet);
    } else if (cell.g > 0.1 && mark < 0.5) {
      mark = step(length(q), 0.3 * cell.g);
      tone = vec3(0.12, 0.5, 0.45) * cell.g;
    }
    gl_FragColor = vec4(mark > 0.5 ? tone : vec3(0.005, 0.006, 0.012), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

/**
 * One Game of Life generation. Gliders are stamped in from the cursor or the idle sky; cells die at the border
 * and after a maximum age, so the board never silts up with debris.
 */
const LIFE_FRAGMENT = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D state; uniform vec2 texel; uniform float reset; uniform vec4 glider;
  const int MASKS[4] = int[4](${GLIDER_MASKS.join(", ")});
  float alive(vec2 o) { return step(0.5, texture2D(state, vUv + o * texel).r); }
  void main() {
    vec4 current = texture2D(state, vUv);
    float n = alive(vec2(-1.0, -1.0)) + alive(vec2(0.0, -1.0)) + alive(vec2(1.0, -1.0)) + alive(vec2(-1.0, 0.0))
      + alive(vec2(1.0, 0.0)) + alive(vec2(-1.0, 1.0)) + alive(vec2(0.0, 1.0)) + alive(vec2(1.0, 1.0));
    float a = (n > 2.5 && n < 3.5) || (current.r > 0.5 && n > 1.5 && n < 2.5) ? 1.0 : 0.0;
    vec2 cell = floor(vUv / texel), cells = floor(1.0 / texel + 0.5);
    float age = a > 0.5 ? current.b + 1.0 / 90.0 : 0.0;
    if (age >= 1.0 || cell.x < 1.0 || cell.y < 1.0 || cell.x > cells.x - 2.0 || cell.y > cells.y - 2.0) { a = 0.0; age = 0.0; }
    vec2 d = cell - glider.xy;
    if (glider.w > 0.5 && d.x >= 0.0 && d.y >= 0.0 && d.x < 3.0 && d.y < 3.0 && ((MASKS[int(glider.z)] >> (int(d.y) * 3 + int(d.x))) & 1) == 1) { a = 1.0; age = 0.0; }
    float fade = a > 0.5 ? 1.0 : current.g * 0.7;
    gl_FragColor = reset > 0.5 ? vec4(0.0) : vec4(a, fade, age, 1.0);
  }`;

function paint(geometry: THREE.BufferGeometry, color: THREE.Color) {
  const count = geometry.attributes.position.count, colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) color.toArray(colors, i * 3);
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.deleteAttribute("uv");
  return geometry.index ? geometry.toNonIndexed() : geometry;
}
function prism(width: number, depth: number, rise: number) {
  const shape = new THREE.Shape([new THREE.Vector2(-depth / 2, 0), new THREE.Vector2(depth / 2, 0), new THREE.Vector2(0, rise)]);
  return new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false }).translate(0, 0, -width / 2).rotateY(Math.PI / 2);
}

/** Walls along the lens-shaped enclosure, towers, palaces and the Generalife, merged with per-part colours. */
function buildAlhambra() {
  const parts: THREE.BufferGeometry[] = [];
  const wall = new THREE.Color(0.8, 0.42, 0.22), stone = new THREE.Color(0.78, 0.6, 0.42);
  const tile = new THREE.Color(0.36, 0.14, 0.08), patio = new THREE.Color(0.04, 0.035, 0.03);
  const add = (geometry: THREE.BufferGeometry, color: THREE.Color, x: number, y: number, z: number, angle = 0) =>
    parts.push(paint(geometry.rotateY(angle).translate(x, y, z), color));
  for (const side of [1, -1]) {
    let previous: Vec3 | null = null;
    for (let x = -24.6; x <= 31; x += 1.3) {
      const z = ridgeZ(x) + side * enclosureHalfWidth(x), point: Vec3 = [x, terrainHeight(x, z), z];
      if (previous) {
        const dx = point[0] - previous[0], dz = point[2] - previous[2], length = Math.hypot(dx, dz) + 0.15;
        const ground = Math.min(point[1], previous[1]), top = Math.max(point[1], previous[1]) + 1.4;
        add(new THREE.BoxGeometry(length, top - ground + 2.5, 0.5), wall, (point[0] + previous[0]) / 2, (top + ground - 2.5) / 2, (point[2] + previous[2]) / 2, -Math.atan2(dz, dx));
      }
      previous = point;
    }
  }
  for (let x = -21; x < 30; x += 4.2) for (const side of [1, -1]) {
    if (ALHAMBRA.some(block => Math.abs(block.x - x) < 2 && Math.sign(block.dz) === side && Math.abs(block.dz) > 3)) continue;
    const z = ridgeZ(x) + side * enclosureHalfWidth(x), ground = terrainHeight(x, z), h = 2.4 + ((x * 7) % 3 + 3) % 3 * 0.3;
    add(new THREE.BoxGeometry(1.2, h + 2.5, 1.2), wall, x, ground + (h - 2.5) / 2, z, -Math.atan(0.06));
  }
  for (const block of ALHAMBRA) {
    const z = ridgeZ(block.x) + block.dz, ground = terrainHeight(block.x, z), top = ground + block.h, angle = (block.angle ?? 0) - Math.atan(0.06);
    add(new THREE.BoxGeometry(block.w, block.h + 2.5, block.d), block.kind === "palace" || block.kind === "church" ? stone : wall, block.x, ground + (block.h - 2.5) / 2, z, angle);
    if (block.kind === "palace") add(new THREE.CylinderGeometry(block.w * 0.28, block.w * 0.28, 0.12, 32), patio, block.x, top + 0.02, z);
    else if (block.roof === "pitched") add(block.kind === "tower" ? new THREE.ConeGeometry(Math.max(block.w, block.d) * 0.72, 0.8, 4).rotateY(Math.PI / 4).translate(0, 0.4, 0)
      : prism(block.w * 1.04, block.d * 1.08, Math.min(block.w, block.d) * 0.32), tile, block.x, top, z, angle);
    else if (block.roof === "belfry") {
      add(new THREE.BoxGeometry(0.62, 0.85, 0.62), wall, block.x + 0.25, top + 0.42, z - 0.2, angle);
      add(new THREE.ConeGeometry(0.5, 0.42, 4).rotateY(Math.PI / 4), tile, block.x + 0.25, top + 1.05, z - 0.2, angle);
    }
  }
  const geometry = mergeGeometries(parts)!;
  parts.forEach(part => part.dispose());
  return geometry;
}

/** Relief with baked colours: dark slopes, wooded Sabika, patchy snow on Sierra Nevada. */
function terrain(width: number, depth: number, segmentsX: number, segmentsZ: number, centerZ: number) {
  const geometry = new THREE.PlaneGeometry(width, depth, segmentsX, segmentsZ).rotateX(-Math.PI / 2).translate(0, 0, centerZ);
  const position = geometry.attributes.position, colors = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), z = position.getZ(i), y = terrainHeight(x, z);
    position.setY(i, y);
    const snow = Math.min(1, Math.max(0, (y - 47 + Math.sin(x * 0.07) * 5 + Math.sin(z * 0.11 + x * 0.03) * 4) / 5));
    const base = [0.06, 0.066, 0.075];
    [0, 1, 2].forEach(c => { colors[i * 3 + c] = base[c] + (([0.85, 0.9, 1.0][c]) - base[c]) * snow; });
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.deleteAttribute("uv");
  geometry.computeVertexNormals();
  return geometry;
}

export function createGranada(quality: CityQuality = "desktop"): CityScene {
  const mobile = quality === "mobile";
  const atmosphere = createCloudVolume(quality);
  const rng = random(37);
  const materials: THREE.Material[] = [], geometries: THREE.BufferGeometry[] = [];
  const own = <T extends THREE.BufferGeometry>(g: T) => { geometries.push(g); return g; };
  const mat = <T extends THREE.Material>(m: T) => { materials.push(m); return m; };

  const world = new THREE.Scene();
  world.name = "Granada_Alhambra";
  world.fog = new THREE.FogExp2(0x070a14, 0.0012);
  const eye = new THREE.PerspectiveCamera(40, 1, 0.5, 1600);
  world.add(new THREE.HemisphereLight(0x5a6c9c, 0x120c0a, 0.5));
  const moonlight = new THREE.DirectionalLight(0xaec0ff, 1.6); moonlight.position.set(-220, 160, 240); world.add(moonlight);

  const sky = new THREE.Mesh(own(new THREE.SphereGeometry(1200, 32, 16)), mat(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 vDir; void main(){
      float y = max(vDir.y, 0.0);
      vec3 c = mix(vec3(0.07, 0.07, 0.13), vec3(0.018, 0.022, 0.05), smoothstep(0.0, 0.14, y));
      c = mix(c, vec3(0.004, 0.005, 0.012), smoothstep(0.14, 0.6, y));
      gl_FragColor = vec4(c, 1.0); }`,
  })));
  world.add(sky);
  const starPositions: number[] = [];
  for (let i = 0; i < 500; i++) {
    const theta = rng() * Math.PI * 2, y = 0.1 + rng() * 0.9, r = Math.sqrt(1 - y * y);
    starPositions.push(Math.cos(theta) * r * 1000, y * 1000, Math.sin(theta) * r * 1000);
  }
  const starGeometry = own(new THREE.BufferGeometry());
  starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(starGeometry, mat(new THREE.PointsMaterial({ color: 0x8c9cc8, size: 2, sizeAttenuation: false, fog: false })));
  world.add(stars);

  // The pomegranate moon: a lit red fruit with its crown of sepals, the emblem of Granada and the UGR.
  const moon = new THREE.Group(); moon.name = "Pomegranate_Moon";
  const fruit = mat(new THREE.ShaderMaterial({
    fog: false,
    vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 vN; void main(){
      float lit = 0.3 + 0.7 * smoothstep(-0.4, 0.8, dot(vN, normalize(vec3(-0.6, 0.5, 0.6))));
      gl_FragColor = vec4(vec3(1.5, 0.3, 0.2) * lit, 1.0); }`,
  }));
  moon.add(new THREE.Mesh(own(new THREE.SphereGeometry(MOON.radius, 32, 20).scale(1.04, 0.96, 1)), fruit));
  const sepal = own(new THREE.ConeGeometry(MOON.radius * 0.24, MOON.radius * 0.85, 6).translate(0, MOON.radius * 0.42, 0));
  const calyx = new THREE.Mesh(own(new THREE.CylinderGeometry(MOON.radius * 0.3, MOON.radius * 0.36, MOON.radius * 0.4, 12)), fruit);
  calyx.position.y = MOON.radius * 1.02;
  moon.add(calyx);
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(sepal, fruit), a = i / 6 * Math.PI * 2;
    s.position.set(Math.cos(a) * MOON.radius * 0.26, MOON.radius * 1.12, Math.sin(a) * MOON.radius * 0.26);
    s.rotation.set(Math.sin(a) * 0.62, 0, -Math.cos(a) * 0.62);
    moon.add(s);
  }
  moon.position.set(...MOON.position); moon.rotation.z = -0.2;
  world.add(moon);

  const relief = mat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  const ground = new THREE.Mesh(own(terrain(360, 234, mobile ? 150 : 220, mobile ? 98 : 144, 28)), relief); ground.name = "Ground";
  const sierra = new THREE.Mesh(own(terrain(1100, 420, mobile ? 180 : 260, mobile ? 70 : 100, -296)), relief); sierra.name = "Sierra";
  world.add(ground, sierra);

  // The Alhambra, floodlit from below as at night.
  const alhambra = new THREE.Mesh(own(buildAlhambra()), mat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, emissive: 0x6a3014, emissiveIntensity: 0.1 })));
  alhambra.name = "Landmark_Alhambra";
  world.add(alhambra);
  for (const x of [-18, -4, 10, 24]) {
    const flood = new THREE.SpotLight(0xffa860, 420, 50, 0.65, 0.9, 1.7);
    flood.position.set(x, terrainHeight(x, ridgeZ(x) + 12) - 1, ridgeZ(x) + 12);
    flood.target.position.set(x, terrainHeight(x, ridgeZ(x)) + 5, ridgeZ(x));
    world.add(flood, flood.target);
  }

  const matrix4 = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  function instanced(name: string, geometry: THREE.BufferGeometry, material: THREE.Material, items: { position: Vec3; scale: Vec3; angle: number }[]) {
    const mesh = new THREE.InstancedMesh(own(geometry), material, items.length);
    items.forEach((item, i) => mesh.setMatrixAt(i, matrix4.compose(new THREE.Vector3(...item.position), quaternion.setFromAxisAngle(up, item.angle), new THREE.Vector3(...item.scale))));
    mesh.name = name; mesh.frustumCulled = false;
    world.add(mesh);
    return mesh;
  }
  const cypressProfile = Array.from({ length: 9 }, (_, i) => new THREE.Vector2(0.5 * Math.pow(Math.sin(Math.PI * (0.12 + 0.88 * i / 8)), 0.6) * (1 - i / 8 * 0.35), i / 8));
  const cypresses: { position: Vec3; scale: Vec3; angle: number }[] = [];
  const cypress = (x: number, z: number, h = 1.5 + rng() * 0.9) => cypresses.push({ position: [x, terrainHeight(x, z) - 0.2, z], scale: [0.5, h, 0.5], angle: rng() * 6 });
  for (let x = 31.5; x < 49; x += 0.9) { cypress(x, ridgeZ(x) + 1.1); cypress(x, ridgeZ(x) - 1.1); }
  for (let i = 0; i < (mobile ? 120 : 220); i++) cypress(-90 + rng() * 170, 24 + rng() * 48);
  const trees: typeof cypresses = [];
  for (let i = 0; i < (mobile ? 1200 : 2200); i++) {
    const x = -42 + rng() * 108, across = (rng() * 2 - 1) * 19, z = ridgeZ(x) + across;
    if (Math.abs(across) < enclosureHalfWidth(x) + 0.9 || terrainHeight(x, z) < 0.6) continue;
    const r = 0.32 + rng() * 0.38;
    trees.push({ position: [x, terrainHeight(x, z) + r * 0.35, z], scale: [r, r * 0.8, r], angle: rng() * 6 });
  }
  const foliage = mat(new THREE.MeshStandardMaterial({ color: 0x3a5a44, roughness: 1 }));
  instanced("Cypress", new THREE.LatheGeometry(cypressProfile, 8), foliage, cypresses);
  instanced("Trees", new THREE.IcosahedronGeometry(1, 0), foliage, trees);

  // Albaicín: whitewashed houses stepping down to the Darro, with warm windows and street lamps.
  const houses: typeof cypresses = [], roofs: typeof cypresses = [], lights: number[] = [];
  for (let z = 24; z < (mobile ? 96 : 72); z += mobile ? 1.5 : 1.2) for (let x = -110; x < 70; x += mobile ? 1.55 : 1.25) {
    const hx = x + (rng() - 0.5) * 0.7, hz = z + (rng() - 0.5) * 0.5;
    if (rng() < 0.3 || Math.hypot(hx + 22, hz - 74) < 9 || (hx > 20 && hz < 40)) continue;
    const w = 0.7 + rng() * 0.5, d = 0.65 + rng() * 0.4, h = 0.45 + rng() * 0.55, angle = (rng() - 0.5) * 0.5;
    const base = Math.min(terrainHeight(hx - w / 2, hz - d / 2), terrainHeight(hx + w / 2, hz + d / 2));
    houses.push({ position: [hx, base - 0.4, hz], scale: [w, h + 0.4, d], angle });
    if (rng() < 0.8) roofs.push({ position: [hx, base + h, hz], scale: [w * 1.08, 0.55, d * 1.1], angle });
    if (rng() < 0.2) lights.push(hx, base + h * 0.55, hz + d / 2 + 0.05);
  }
  instanced("Albaicin_Houses", new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), mat(new THREE.MeshStandardMaterial({ color: 0xb8bcc8, roughness: 0.9 })), houses);
  instanced("Albaicin_Roofs", prism(1, 1, 0.42), mat(new THREE.MeshStandardMaterial({ color: 0x3a1a10, roughness: 0.9 })), roofs);
  for (let x = -110; x < 60; x += 2.1) { const z = 16.5 + Math.sin(x * 0.08) * 1.6; lights.push(x, terrainHeight(x, z) + 0.5, z); }
  const lightGeometry = own(new THREE.BufferGeometry());
  lightGeometry.setAttribute("position", new THREE.Float32BufferAttribute(lights, 3));
  world.add(new THREE.Points(lightGeometry, mat(new THREE.PointsMaterial({ color: new THREE.Color(1.8, 1.0, 0.45), size: 3, sizeAttenuation: false }))));

  // Game of Life: a ping-pong state at one texel per mosaic cell, stepped a few times per second.
  const lifeUniforms = {
    state: { value: null as THREE.Texture | null }, texel: { value: new THREE.Vector2(1, 1) },
    reset: { value: 1 }, glider: { value: new THREE.Vector4(0, 0, 0, 0) },
  };
  const lifeMaterial = mat(new THREE.ShaderMaterial({
    uniforms: lifeUniforms, depthTest: false, depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`, fragmentShader: LIFE_FRAGMENT,
  }));
  const lifeScene = new THREE.Scene(), lifeQuad = new THREE.Mesh(own(new THREE.PlaneGeometry(2, 2)), lifeMaterial);
  lifeQuad.frustumCulled = false; lifeScene.add(lifeQuad);
  let lifeTargets: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget] | null = null, grid = { cols: 1, rows: 1 }, tickPending = false;
  const matrix = createDotMatrix({
    name: "Granada_Mosaic", world, eye, fragmentShader: DISPLAY_FRAGMENT, cellMicro: 6, uniforms: { life: { value: null as THREE.Texture | null } },
    beforeDisplay(renderer) {
      if (!lifeTargets || lifeTargets[0].width !== grid.cols || lifeTargets[0].height !== grid.rows) {
        lifeTargets?.forEach(t => t.dispose());
        const make = () => new THREE.WebGLRenderTarget(grid.cols, grid.rows, {
          minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false,
        });
        lifeTargets = [make(), make()];
        lifeUniforms.reset.value = 1; tickPending = true;
      }
      if (tickPending) {
        lifeUniforms.state.value = lifeTargets[0].texture;
        lifeUniforms.texel.value.set(1 / grid.cols, 1 / grid.rows);
        renderer.setRenderTarget(lifeTargets[1]);
        renderer.render(lifeScene, matrix.camera);
        lifeTargets.reverse();
        tickPending = false;
        lifeUniforms.glider.value.w = 0; lifeUniforms.reset.value = 0;
      }
      matrix.uniforms.life.value = lifeTargets[0].texture;
    },
  });
  const { scene, camera } = matrix;
  scene.userData.technique = "Procedural Alhambra re-drawn as a Nasrid halftone, with Conway gliders launched by the cursor and a pomegranate moon.";
  scene.userData.life = { uniforms: lifeUniforms, get grid() { return grid; } };

  const cursor = trackPointer();
  let view: GranadaView = granadaView(1440, 900), width = 1440, disposed = false, lastSeconds = 0, clock = 0, nextGlider = 0;
  let current: CityFrame = { arrivalT: 1, visitT: 0, departureT: 0, ambientSeconds: 0, reduced: false };
  const follow = { x: 0, y: 0 }, launch = { x: 0, y: 0 };
  let aspect = 1.6;
  const api: CityScene = {
    id: "granada-sky", assetStage: "render", scene, camera, atmosphere,
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
      const pose = granadaCamera(view, excursion, frame.reduced ? [0, 0] : [follow.x * 0.6, follow.y * 0.6]);
      eye.position.set(...pose.position); eye.lookAt(...pose.target); eye.updateMatrixWorld();
      sky.position.copy(eye.position); stars.position.copy(eye.position);

      // Life ticks at ~9 Hz while landed; landing or reduced motion clears it.
      if (excursion > 0.02 || frame.reduced) { lifeUniforms.reset.value = 1; tickPending = true; clock = 0; }
      else {
        clock += dt;
        if (clock >= 1 / 9) {
          clock %= 1 / 9;
          tickPending = true;
          // A moving cursor launches a glider along its heading; an idle sky gets one every couple of seconds.
          const dx = pointer.x - launch.x, dy = pointer.y - launch.y;
          if (hovering && Math.hypot(dx * aspect, dy) > 0.06) {
            lifeUniforms.glider.value.set(Math.floor((pointer.x * 0.5 + 0.5) * grid.cols) - 1, Math.floor((pointer.y * 0.5 + 0.5) * grid.rows) - 1, gliderDirection(dx, dy), 1);
            launch.x = pointer.x; launch.y = pointer.y;
          } else if (!hovering && seconds >= nextGlider) {
            nextGlider = seconds + 1.6 + rng() * 1.4;
            lifeUniforms.glider.value.set(Math.floor(grid.cols * (0.4 + rng() * 0.5)), Math.floor(grid.rows * (0.55 + rng() * 0.35)), Math.floor(rng() * 4), 1);
          }
        }
      }
      const cellCss = granadaCell(width, excursion);
      matrix.update({ seconds, dt, excursion, reduced: frame.reduced, hovering, pointer, cellCss });
    },
    resize(w, h) {
      view = granadaView(w, h); width = w;
      moon.position.set(...moonPosition(w, h));
      matrix.resize(w, h, view.fov);
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5), micro = Math.max(1, Math.round(ratio * granadaCell(w, 0) / 6));
      grid = { cols: Math.max(1, Math.ceil(w * ratio / (6 * micro))), rows: Math.max(1, Math.ceil(h * ratio / (6 * micro))) };
      aspect = w / Math.max(1, h);
      api.update(current);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cursor.dispose();
      new Set(geometries).forEach(g => g.dispose());
      new Set(materials).forEach(m => m.dispose());
      world.traverse(object => { if (object instanceof THREE.InstancedMesh) object.dispose(); });
      lifeTargets?.forEach(t => t.dispose()); lifeTargets = null;
      matrix.dispose(); atmosphere.dispose(); world.clear();
    },
  };
  api.resize(1440, 900, quality);
  return api;
}
