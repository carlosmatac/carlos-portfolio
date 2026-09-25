import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createCloudVolume } from "../clouds/cloud-volume";
import {
  ALHAMBRA, enclosureHalfWidth, granadaCamera, granadaView, marchTerrain, patrolPoint, random, ridgeZ, terrainHeight,
  type GranadaView,
} from "./granada-art";
import { trackPointer } from "./pointer";
import type { CityFrame, CityQuality, CityScene } from "./types";

type Vec3 = [number, number, number];

/** Lighting shared by every surface: cool moonlight, warm floodlights on the Sabika, the cursor lantern and fog. */
const LIGHTING = /* glsl */ `
  uniform vec3 lantern; uniform float lanternPower; uniform float time;
  uniform vec3 fogColor; uniform float fogDensity;
  const vec3 MOON = vec3(-0.6137, 0.6918, 0.3808);
  const vec3 FLOOD = vec3(0.0949, 0.2847, 0.9539);
  const vec3 WARM = vec3(1.0, 0.56, 0.26);
  float glow(vec3 p, float r) { vec3 d = p - lantern; return lanternPower * exp(-dot(d, d) / (r * r)); }
  vec3 applyFog(vec3 color, float dist) { return mix(color, fogColor, 1.0 - exp(-pow(dist * fogDensity, 1.5))); }
  float floodMask(vec3 p) {
    float across = p.z - (-2.0 + 0.06 * p.x);
    float alhambra = exp(-pow(across / 8.5, 2.0)) * smoothstep(-33.0, -27.0, p.x) * (1.0 - smoothstep(30.0, 40.0, p.x));
    float generalife = exp(-pow(across / 6.0, 2.0)) * smoothstep(44.0, 48.0, p.x) * (1.0 - smoothstep(62.0, 68.0, p.x)) * 0.6;
    return alhambra + generalife;
  }
  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }`;

const WORLD_VERTEX = /* glsl */ `
  varying vec3 vWorld; varying vec3 vNormal; varying vec3 vColor;
  uniform float time;
  void main() {
    vec3 p = position;
    vec3 n = normal;
    vColor = vec3(1.0);
    #ifdef USE_COLOR
      vColor = color;
    #endif
    #ifdef USE_INSTANCING
      #ifdef SWAY
        vec3 origin = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        p.x += sin(time * 0.75 + origin.x * 0.9 + origin.z * 0.4) * 0.06 * p.y * p.y;
      #endif
      p = (instanceMatrix * vec4(p, 1.0)).xyz;
      n = mat3(instanceMatrix) * n;
    #endif
    #ifdef USE_INSTANCING_COLOR
      vColor *= instanceColor;
    #endif
    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorld = world.xyz;
    vNormal = normalize(mat3(modelMatrix) * n);
    gl_Position = projectionMatrix * viewMatrix * world;
  }`;

/** Contoured relief: the lantern warms the isolines and casts a Nasrid eight-point lattice around itself. */
const TERRAIN_FRAGMENT = /* glsl */ `
  varying vec3 vWorld; varying vec3 vNormal;
  ${LIGHTING}
  float lattice(vec2 p) {
    float c = cos(time * 0.05), s = sin(time * 0.05);
    p = mat2(c, -s, s, c) * p / 2.3;
    vec2 q = fract(p) - 0.5;
    float star = min(max(abs(q.x), abs(q.y)) - 0.25, (abs(q.x) + abs(q.y)) * 0.7071 - 0.25);
    float inner = min(max(abs(q.x), abs(q.y)) - 0.11, (abs(q.x) + abs(q.y)) * 0.7071 - 0.11);
    float w = fwidth(star) * 1.2 + 0.004;
    return max(1.0 - smoothstep(0.0, w, abs(star)), 0.6 * (1.0 - smoothstep(0.0, w, abs(inner))));
  }
  void main() {
    vec3 n = normalize(vNormal);
    float h = vWorld.y, dist = length(vWorld - cameraPosition);
    float far = smoothstep(-70.0, -170.0, vWorld.z);
    float spacing = mix(0.75, 5.0, far), lineStrength = mix(0.24, 0.55 * smoothstep(28.0, 42.0, h), far), vegetation = mix(1.0, 0.3, far);
    float grazing = smoothstep(0.04, 0.22, abs(dot(normalize(cameraPosition - vWorld), n)));
    float moon = max(dot(n, MOON), 0.0);
    float snow = smoothstep(40.0, 42.5, h + (n.y - 0.7) * 22.0 + (fbm(vWorld.xz * 0.06) - 0.5) * 22.0);
    vec3 ground = mix(vec3(0.020, 0.024, 0.034), vec3(0.010, 0.017, 0.014), vegetation * smoothstep(0.45, 0.9, n.y));
    vec3 color = ground * (0.2 + 1.5 * moon) * vec3(0.55, 0.66, 1.0);
    color = mix(color, vec3(0.42, 0.5, 0.7) * (0.22 + 1.2 * moon), snow);
    color += WARM * 0.05 * floodMask(vWorld) * smoothstep(-2.0, 8.0, h);
    float f = h / spacing, fw = fwidth(f);
    float major = mod(floor(f + 0.5), 5.0) < 0.5 ? 1.0 : 0.0;
    float line = (1.0 - min(abs(fract(f - 0.5) - 0.5) / max(fw, 1e-4), 1.0)) * (1.0 - smoothstep(0.2, 0.5, fw)) * exp(-dist * mix(0.007, 0.0025, major * (1.0 - far))) * grazing;
    float g = glow(vWorld, 9.0);
    color += line * (vec3(0.3, 0.38, 0.56) * lineStrength * (0.45 + 0.9 * major) * (0.45 + moon + snow) + WARM * g * 1.6);
    color += WARM * g * (0.07 + 0.55 * lattice(vWorld.xz - lantern.xz));
    gl_FragColor = vec4(applyFog(color, dist), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

const SOLID_FRAGMENT = /* glsl */ `
  varying vec3 vWorld; varying vec3 vNormal; varying vec3 vColor;
  uniform float flood;
  ${LIGHTING}
  void main() {
    vec3 n = normalize(vNormal);
    if (!gl_FrontFacing) n = -n;
    float moon = max(dot(n, MOON), 0.0);
    vec3 light = vec3(0.42, 0.52, 0.85) * (0.09 + 0.5 * moon);
    float falloff = clamp(1.4 - (vWorld.y - 7.0) * 0.08, 0.28, 1.4);
    light += WARM * 1.25 * flood * floodMask(vWorld) * falloff * (0.12 + 0.88 * pow(max(dot(n, FLOOD), 0.0), 1.5));
    light += vec3(1.0, 0.82, 0.6) * glow(vWorld, 6.0) * 3.2;
    gl_FragColor = vec4(applyFog(vColor * light, length(vWorld - cameraPosition)), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

const MIST_FRAGMENT = /* glsl */ `
  varying vec3 vWorld; varying vec3 vNormal; varying vec3 vColor;
  uniform vec3 tint; uniform float opacity; uniform float seed; uniform vec2 heightRange;
  ${LIGHTING}
  void main() {
    float v = clamp((vWorld.y - heightRange.x) / (heightRange.y - heightRange.x), 0.0, 1.0);
    float n = fbm(vec2(vWorld.x * 0.02 + time * 0.011 + seed, vWorld.y * 0.05 - time * 0.004 + seed * 3.1));
    float alpha = opacity * smoothstep(0.0, 0.5, v) * (1.0 - smoothstep(0.4, 1.0, v)) * smoothstep(0.3, 0.8, n);
    float g = glow(vWorld, 12.0);
    alpha *= 1.0 - 0.9 * g;
    vec3 color = applyFog(tint * (0.7 + 0.6 * n), length(vWorld - cameraPosition) * 0.6);
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

const POINTS_VERTEX = /* glsl */ `
  attribute float aSize; attribute float aPhase;
  uniform float time; uniform float scale; uniform float pixelRatio; uniform float twinkle; uniform float worldSize; uniform float fogDensity;
  varying vec3 vColor;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float flicker = 1.0 + twinkle * (0.3 * sin(time * (0.9 + aPhase * 2.2) + aPhase * 40.0) + 0.12 * sin(time * 6.0 * aPhase + aPhase * 9.0));
    vec3 world = (modelMatrix * vec4(position, 1.0)).xyz;
    vColor = color * flicker * exp(-pow(length(world - cameraPosition) * fogDensity, 1.5));
    gl_PointSize = worldSize > 0.5 ? clamp(aSize * scale / -mv.z, 1.2 * pixelRatio, 7.0 * pixelRatio) : aSize * pixelRatio;
    gl_Position = projectionMatrix * mv;
  }`;
const POINTS_FRAGMENT = /* glsl */ `
  varying vec3 vColor; uniform float intensity;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, r);
    gl_FragColor = vec4(vColor * a * a * intensity, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
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
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
  return geometry.translate(0, 0, -width / 2).rotateY(Math.PI / 2);
}

function buildAlhambra() {
  const parts: THREE.BufferGeometry[] = [];
  const wall = new THREE.Color(0.56, 0.27, 0.14), stone = new THREE.Color(0.5, 0.34, 0.22);
  const tile = new THREE.Color(0.3, 0.12, 0.07), patio = new THREE.Color(0.04, 0.035, 0.03);
  const add = (geometry: THREE.BufferGeometry, color: THREE.Color, x: number, y: number, z: number, angle = 0) =>
    parts.push(paint(geometry.rotateY(angle).translate(x, y, z), color));
  const merlons = (x: number, y: number, z: number, length: number, angle: number) => {
    const count = Math.max(2, Math.floor(length / 0.5));
    for (let i = 0; i < count; i++) {
      const u = (i + 0.5) / count - 0.5;
      add(new THREE.BoxGeometry(0.2, 0.24, 0.3), wall, x + Math.cos(angle) * u * length, y + 0.12, z - Math.sin(angle) * u * length, angle);
    }
  };
  // Walls follow the lens-shaped enclosure; the northern face towards the Albaicín carries battlements.
  for (const side of [1, -1]) {
    let previous: Vec3 | null = null;
    for (let x = -24.6; x <= 31; x += 1.3) {
      const z = ridgeZ(x) + side * enclosureHalfWidth(x);
      const point: Vec3 = [x, terrainHeight(x, z), z];
      if (previous) {
        const dx = point[0] - previous[0], dz = point[2] - previous[2], length = Math.hypot(dx, dz) + 0.15;
        const mx = (point[0] + previous[0]) / 2, mz = (point[2] + previous[2]) / 2;
        const ground = Math.min(point[1], previous[1]), top = Math.max(point[1], previous[1]) + 1.3, angle = -Math.atan2(dz, dx);
        add(new THREE.BoxGeometry(length, top - ground + 2.5, 0.4), wall, mx, (top + ground - 2.5) / 2, mz, angle);
        if (side === 1) merlons(mx, top, mz, length, angle);
      }
      previous = point;
    }
  }
  for (let x = -21; x < 30; x += 4.2) {
    for (const side of [1, -1]) {
      if (ALHAMBRA.some(block => Math.abs(block.x - x) < 2 && Math.sign(block.dz) === side && Math.abs(block.dz) > 3)) continue;
      const z = ridgeZ(x) + side * enclosureHalfWidth(x), ground = terrainHeight(x, z), h = 2.3 + ((x * 7) % 3 + 3) % 3 * 0.3;
      add(new THREE.BoxGeometry(1.1, h + 2.5, 1.1), wall, x, ground + (h - 2.5) / 2, z, -Math.atan(0.06));
      merlons(x, ground + h, z + 0.55 * side, 1.1, 0);
    }
  }
  for (const block of ALHAMBRA) {
    const z = ridgeZ(block.x) + block.dz, ground = terrainHeight(block.x, z), top = ground + block.h;
    const angle = (block.angle ?? 0) - Math.atan(0.06);
    const color = block.kind === "palace" || block.kind === "church" ? stone : wall;
    add(new THREE.BoxGeometry(block.w, block.h + 2.5, block.d), color, block.x, ground + (block.h - 2.5) / 2, z, angle);
    if (block.kind === "palace") {
      add(new THREE.CylinderGeometry(block.w * 0.28, block.w * 0.28, 0.12, 32), patio, block.x, top + 0.02, z);
      continue;
    }
    if (block.roof === "pitched") {
      const roof = block.kind === "tower" ? new THREE.ConeGeometry(Math.max(block.w, block.d) * 0.72, 0.8, 4).rotateY(Math.PI / 4).translate(0, 0.4, 0)
        : prism(block.w * 1.04, block.d * 1.08, Math.min(block.w, block.d) * 0.32);
      add(roof, tile, block.x, top, z, angle);
      continue;
    }
    for (const [dx, dz, length, rotation] of [[0, block.d / 2, block.w, 0], [0, -block.d / 2, block.w, 0], [block.w / 2, 0, block.d, Math.PI / 2], [-block.w / 2, 0, block.d, Math.PI / 2]]) {
      const c = Math.cos(angle), s = Math.sin(angle);
      merlons(block.x + dx * c + dz * s, top, z - dx * s + dz * c, length * 0.95, angle + rotation);
    }
    if (block.roof === "belfry") {
      add(new THREE.BoxGeometry(0.62, 0.85, 0.62), wall, block.x + 0.25, top + 0.42, z - 0.2, angle);
      add(new THREE.ConeGeometry(0.5, 0.42, 4).rotateY(Math.PI / 4), tile, block.x + 0.25, top + 1.05, z - 0.2, angle);
    }
  }
  const geometry = mergeGeometries(parts)!;
  parts.forEach(part => part.dispose());
  return geometry;
}

function terrain(width: number, depth: number, segmentsX: number, segmentsZ: number, centerZ: number) {
  const geometry = new THREE.PlaneGeometry(width, depth, segmentsX, segmentsZ).rotateX(-Math.PI / 2).translate(0, 0, centerZ);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) position.setY(i, terrainHeight(position.getX(i), position.getZ(i)));
  geometry.deleteAttribute("uv");
  geometry.computeVertexNormals();
  return geometry;
}

export function createGranada(quality: CityQuality = "desktop"): CityScene {
  const scene = new THREE.Scene();
  scene.name = "Granada_Procedural_Night";
  scene.userData.technique = "Procedural Three.js diorama: contoured relief, instanced architecture and vegetation, cursor lantern.";
  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 1600);
  const atmosphere = createCloudVolume(quality);
  const mobile = quality === "mobile";
  const shared = {
    lantern: { value: new THREE.Vector3(0, -100, 0) }, lanternPower: { value: 0 }, time: { value: 0 },
    fogColor: { value: new THREE.Color(0.026, 0.032, 0.062) }, fogDensity: { value: 0.0034 },
  };
  const root = new THREE.Group();
  root.name = "CityRoot";
  scene.add(root);

  const sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 vDir;
      void main(){
        float y = vDir.y;
        vec3 color = mix(vec3(0.026, 0.032, 0.062), vec3(0.002, 0.003, 0.009), smoothstep(-0.02, 0.42, y));
        color += vec3(0.035, 0.026, 0.05) * exp(-pow((y - 0.03) / 0.07, 2.0)) * (0.6 + 0.4 * smoothstep(-0.6, 0.6, -vDir.x));
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  sky.name = "Sky"; sky.renderOrder = -100; sky.frustumCulled = false;
  scene.add(sky);

  const terrainMaterial = new THREE.ShaderMaterial({ uniforms: { ...shared }, vertexShader: WORLD_VERTEX, fragmentShader: TERRAIN_FRAGMENT });
  const ground = new THREE.Mesh(terrain(360, 234, mobile ? 150 : 240, mobile ? 98 : 156, 28), terrainMaterial);
  ground.name = "Ground";
  const sierra = new THREE.Mesh(terrain(1100, 420, mobile ? 180 : 280, mobile ? 70 : 110, -296), terrainMaterial);
  sierra.name = "Sierra";
  root.add(ground, sierra);

  const solid = (flood: number, options: { vertexColors?: boolean; sway?: boolean } = {}) => new THREE.ShaderMaterial({
    uniforms: { ...shared, flood: { value: flood } }, vertexColors: options.vertexColors ?? false,
    defines: options.sway ? { SWAY: "" } : {}, vertexShader: WORLD_VERTEX, fragmentShader: SOLID_FRAGMENT,
  });
  const alhambra = new THREE.Mesh(buildAlhambra(), solid(1, { vertexColors: true }));
  alhambra.name = "Landmark_Alhambra";
  root.add(alhambra);

  const rng = random(37);
  const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), color = new THREE.Color();
  const up = new THREE.Vector3(0, 1, 0);
  function instanced(name: string, geometry: THREE.BufferGeometry, material: THREE.Material, items: { position: Vec3; scale: Vec3; angle: number; color: THREE.Color }[]) {
    const mesh = new THREE.InstancedMesh(geometry, material, items.length);
    items.forEach((item, i) => {
      quaternion.setFromAxisAngle(up, item.angle);
      mesh.setMatrixAt(i, matrix.compose(new THREE.Vector3(...item.position), quaternion, new THREE.Vector3(...item.scale)));
      mesh.setColorAt(i, item.color);
    });
    mesh.name = name; mesh.frustumCulled = false;
    root.add(mesh);
    return mesh;
  }

  const cypressProfile = Array.from({ length: 9 }, (_, i) => {
    const t = i / 8;
    return new THREE.Vector2(0.5 * Math.pow(Math.sin(Math.PI * (0.12 + 0.88 * t)), 0.6) * (1 - t * 0.35), t);
  });
  const cypresses: { position: Vec3; scale: Vec3; angle: number; color: THREE.Color }[] = [];
  const cypress = (x: number, z: number, height = 1.5 + rng() * 0.9) => {
    const w = 0.42 + rng() * 0.16;
    cypresses.push({ position: [x, terrainHeight(x, z) - 0.2, z], scale: [w, height, w], angle: rng() * 6, color: color.setRGB(0.05, 0.085 + rng() * 0.03, 0.06).clone() });
  };
  for (let x = 31.5; x < 49; x += 0.9) { cypress(x, ridgeZ(x) + 1.1); cypress(x, ridgeZ(x) - 1.1); }
  for (let x = 49; x < 60; x += 0.8) { cypress(x, ridgeZ(x) - 1.3, 1.3); cypress(x, ridgeZ(x) + 2.6, 1.3); }
  for (let i = 0; i < 30; i++) { const x = -3 + rng() * 24; cypress(x, ridgeZ(x) + 1.5 + rng() * 2.8, 1.2 + rng() * 0.6); }
  for (let i = 0; i < (mobile ? 120 : 220); i++) cypress(-90 + rng() * 170, 24 + rng() * 48);

  const trees: typeof cypresses = [];
  for (let i = 0; i < (mobile ? 1400 : 2600); i++) {
    const x = -42 + rng() * 108, across = (rng() * 2 - 1) * 19, z = ridgeZ(x) + across;
    const inside = Math.abs(across) < enclosureHalfWidth(x) + 0.9;
    if ((inside && rng() > 0.12) || terrainHeight(x, z) < 0.6 || (x > 32 && Math.abs(across) < 2.6)) continue;
    const r = 0.32 + rng() * 0.38;
    trees.push({ position: [x, terrainHeight(x, z) + r * 0.35, z], scale: [r, r * (0.65 + rng() * 0.35), r], angle: rng() * 6, color: new THREE.Color(0.028 + rng() * 0.015, 0.05 + rng() * 0.03, 0.036) });
  }
  const treeGeometry = new THREE.IcosahedronGeometry(1, 0), cypressGeometry = new THREE.LatheGeometry(cypressProfile, 8);
  instanced("Trees", treeGeometry, solid(0.3), trees);
  instanced("Cypress", cypressGeometry, solid(0.5, { sway: true }), cypresses);

  // Albaicín: whitewashed houses and tiled roofs stepping down towards the Darro.
  const houses: typeof cypresses = [], roofs: typeof cypresses = [];
  const lights: { position: Vec3; color: Vec3; size: number }[] = [];
  const houseGeometry = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), roofGeometry = prism(1, 1, 0.42);
  for (let z = 24; z < (mobile ? 90 : 72); z += mobile ? 1.5 : 1.2) {
    for (let x = -110; x < 70; x += mobile ? 1.55 : 1.25) {
      const hx = x + (rng() - 0.5) * 0.7, hz = z + (rng() - 0.5) * 0.5;
      if (rng() < 0.3 || Math.hypot(hx + 22, hz - 74) < 9 || (hx > 20 && hz < 40)) continue;
      const w = 0.7 + rng() * 0.5, d = 0.65 + rng() * 0.4, h = 0.45 + rng() * 0.55, angle = (rng() - 0.5) * 0.5;
      const base = Math.min(terrainHeight(hx - w / 2, hz - d / 2), terrainHeight(hx + w / 2, hz + d / 2), terrainHeight(hx - w / 2, hz + d / 2), terrainHeight(hx + w / 2, hz - d / 2));
      const shade = 0.5 + rng() * 0.14;
      houses.push({ position: [hx, base - 0.4, hz], scale: [w, h + 0.4, d], angle, color: new THREE.Color(shade, shade, shade * 1.06) });
      if (rng() < 0.8) roofs.push({ position: [hx, base + h, hz], scale: [w * 1.08, 0.55, d * 1.1], angle, color: new THREE.Color(0.26 + rng() * 0.08, 0.11, 0.065) });
      if (rng() < 0.3) {
        const warmth = 0.6 + rng() * 0.9;
        lights.push({ position: [hx + (rng() - 0.5) * w * 0.5, base + h * 0.55, hz + d / 2 + 0.05], color: [warmth, warmth * 0.6, warmth * 0.28], size: 0.16 });
      }
    }
  }
  instanced("Albaicin_Houses", houseGeometry, solid(0.25), houses);
  instanced("Albaicin_Roofs", roofGeometry, solid(0.25), roofs);

  for (let x = -110; x < 60; x += 2.1) {
    const z = 16.5 + Math.sin(x * 0.08) * 1.6;
    lights.push({ position: [x, terrainHeight(x, z) + 0.5, z], color: [1, 0.55, 0.22], size: 0.36 });
  }
  for (let i = 0; i < (mobile ? 1100 : 2200); i++) {
    const x = -170 + rng() * 350, z = -100 + rng() * 124, y = terrainHeight(x, z);
    if (y > 3 || (x < 20 && rng() < 0.55)) continue;
    const warmth = 0.5 + rng() * 0.8;
    lights.push({ position: [x, y + 0.4, z], color: [warmth, warmth * 0.58, warmth * 0.25], size: 0.35 + rng() * 0.35 });
  }
  for (let x = -22; x < 30; x += 2.6) {
    const z = ridgeZ(x) + enclosureHalfWidth(x) + 0.7;
    lights.push({ position: [x, terrainHeight(x, z) + 0.3, z], color: [1.6, 0.85, 0.4], size: 0.42 });
  }

  const pointsMaterial = (options: { worldSize: boolean; twinkle: number; fogDensity: number }) => new THREE.ShaderMaterial({
    uniforms: {
      time: shared.time, scale: { value: 1 }, pixelRatio: { value: 1 }, intensity: { value: 1 },
      twinkle: { value: options.twinkle }, worldSize: { value: Number(options.worldSize) }, fogDensity: { value: options.fogDensity },
    },
    vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: POINTS_VERTEX, fragmentShader: POINTS_FRAGMENT,
  });
  function points(name: string, items: { position: Vec3; color: Vec3; size: number }[], material: THREE.ShaderMaterial) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(items.flatMap(item => item.position), 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(items.flatMap(item => item.color), 3));
    geometry.setAttribute("aSize", new THREE.Float32BufferAttribute(items.map(item => item.size), 1));
    geometry.setAttribute("aPhase", new THREE.Float32BufferAttribute(items.map(() => rng()), 1));
    const mesh = new THREE.Points(geometry, material);
    mesh.name = name; mesh.frustumCulled = false;
    root.add(mesh);
    return mesh;
  }
  points("Night_Lights", lights, pointsMaterial({ worldSize: true, twinkle: 0.35, fogDensity: 0.0026 }));
  const stars = Array.from({ length: mobile ? 700 : 1400 }, () => {
    const theta = rng() * Math.PI * 2, y = 0.04 + Math.pow(rng(), 1.4) * 0.96, r = Math.sqrt(1 - y * y), b = 0.25 + rng() * 0.75;
    return { position: [Math.cos(theta) * r * 900, y * 900, Math.sin(theta) * r * 900] as Vec3, color: [b * 0.8, b * 0.87, b] as Vec3, size: 0.9 + rng() * 1.4 };
  });
  const starField = points("Stars", stars, pointsMaterial({ worldSize: false, twinkle: 0.8, fogDensity: 0 }));
  const lanternMaterial = pointsMaterial({ worldSize: true, twinkle: 0.2, fogDensity: 0.002 });
  const lanternMesh = points("Lantern", [{ position: [0, 0, 0], color: [1.6, 0.9, 0.42], size: 1.6 }], lanternMaterial);

  [
    { z: 14, y: [-3, 10], width: 320, tint: [0.07, 0.075, 0.11], opacity: 0.32, seed: 1.3 },
    { z: -74, y: [-10, 30], width: 560, tint: [0.075, 0.07, 0.11], opacity: 0.45, seed: 4.7 },
    { z: -118, y: [-6, 44], width: 800, tint: [0.08, 0.08, 0.125], opacity: 0.4, seed: 8.1 },
  ].forEach(layer => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(layer.width, layer.y[1] - layer.y[0]), new THREE.ShaderMaterial({
      uniforms: { ...shared, tint: { value: new THREE.Vector3(...layer.tint) }, opacity: { value: layer.opacity }, seed: { value: layer.seed }, heightRange: { value: new THREE.Vector2(layer.y[0], layer.y[1]) } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide, vertexShader: WORLD_VERTEX, fragmentShader: MIST_FRAGMENT,
    }));
    mesh.position.set(0, (layer.y[0] + layer.y[1]) / 2, layer.z);
    mesh.name = `Mist_${layer.z}`;
    root.add(mesh);
  });

  // Cursor input: a mouse or pen steers the lantern and a gentle parallax; touch keeps the ambient patrol.
  const cursor = trackPointer(), pointer = cursor.state;

  let view: GranadaView = granadaView(1440, 900), disposed = false, lastSeconds = 0;
  let current: CityFrame = { arrivalT: 1, visitT: 0, departureT: 0, ambientSeconds: 0, reduced: false };
  const follow = { x: 0, y: 0, active: 0 };
  const lantern = new THREE.Vector3(0, -100, 0), aim = new THREE.Vector3(), target = new THREE.Vector3();
  const picker = new THREE.Raycaster();
  const api: CityScene = {
    id: "granada-sky", assetStage: "render", scene, camera, atmosphere,
    get status() { return disposed ? "disposed" : atmosphere.status === "error" ? "error" : atmosphere.status === "ready" ? "ready" : "loading"; },
    update(frame) {
      current = frame;
      const seconds = frame.ambientSeconds, dt = Math.min(0.1, Math.max(0, seconds - lastSeconds));
      lastSeconds = seconds;
      const ease = (tau: number) => 1 - Math.exp(-dt / tau);
      const hovering = cursor.hovering(seconds);
      follow.active += (Number(hovering) - follow.active) * ease(0.6);
      follow.x += ((hovering ? pointer.x : 0) - follow.x) * ease(0.5);
      follow.y += ((hovering ? pointer.y : 0) - follow.y) * ease(0.5);
      const ambient = frame.reduced ? 0 : 1 - follow.active;
      const sway: [number, number] = frame.reduced ? [0, 0]
        : [follow.x + ambient * Math.sin(seconds * 0.05) * 0.3, follow.y + ambient * Math.sin(seconds * 0.031) * 0.2];
      const excursion = frame.reduced ? 0 : 1 - frame.arrivalT * (1 - frame.departureT);
      const pose = granadaCamera(view, excursion, sway);
      camera.position.set(...pose.position);
      camera.lookAt(...pose.target);
      camera.updateMatrixWorld();
      sky.position.copy(camera.position);
      starField.position.copy(camera.position);
      shared.time.value = frame.reduced ? 0 : seconds;

      let goal: Vec3 | null = null, power = 0;
      if (hovering) {
        aim.set(pointer.x, pointer.y, 0.5).unproject(camera).sub(camera.position).normalize();
        const hit = marchTerrain(camera.position.toArray() as Vec3, aim.toArray() as Vec3);
        picker.set(camera.position, aim);
        const facade = picker.intersectObject(alhambra, false)[0];
        if (facade && (!hit || facade.distance < camera.position.distanceTo(target.set(...hit)))) {
          goal = facade.point.addScaledVector(aim, -1.6).toArray() as Vec3; power = 1;
        } else if (hit) { goal = [hit[0], hit[1] + 2.2, hit[2]]; power = 1; }
      } else if (!frame.reduced) { goal = patrolPoint(seconds); power = 0.55; }
      if (goal) {
        target.set(...goal);
        if (shared.lanternPower.value < 0.02 || lantern.distanceTo(target) > 60) lantern.copy(target);
        else lantern.lerp(target, ease(0.12));
      }
      shared.lanternPower.value += (power * (1 - excursion) - shared.lanternPower.value) * ease(0.3);
      shared.lantern.value.copy(lantern);
      lanternMesh.position.copy(lantern);
      lanternMaterial.uniforms.intensity.value = shared.lanternPower.value;
    },
    resize(width, height) {
      view = granadaView(width, height);
      camera.aspect = Math.max(1, width) / Math.max(1, height);
      camera.fov = view.fov;
      camera.updateProjectionMatrix();
      const ratio = Math.min(window.devicePixelRatio || 1, width < 700 ? 1.5 : 2);
      const scale = height * ratio / (2 * Math.tan(THREE.MathUtils.degToRad(view.fov / 2)));
      root.traverse(object => {
        if (object instanceof THREE.Points) {
          const uniforms = (object.material as THREE.ShaderMaterial).uniforms;
          uniforms.scale.value = scale; uniforms.pixelRatio.value = ratio;
        }
      });
      api.update(current);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cursor.dispose();
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          geometries.add(object.geometry);
          (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
        }
      });
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      root.traverse(object => { if (object instanceof THREE.InstancedMesh) object.dispose(); });
      atmosphere.dispose(); scene.clear();
    },
  };
  api.resize(1440, 900, quality);
  return api;
}
