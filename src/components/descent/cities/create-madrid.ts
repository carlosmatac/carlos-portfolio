import * as THREE from "three";
import { createCloudVolume } from "../clouds/cloud-volume";
import {
  assembly, CLUSTERS, madridCamera, madridView, nearest, pipelines, random, sampleEmbeddings, sampleTowers, TOWERS,
  type MadridView,
} from "./madrid-art";
import { trackPointer } from "./pointer";
import type { CityFrame, CityQuality, CityScene } from "./types";

type Vec3 = [number, number, number];
export type MadridScene = CityScene & { readonly neighbours: { index: number; distance: number }[] };
type CloudItem = { position: Vec3; scatter: Vec3; colour: Vec3; size: number; shape: number; normal?: Vec3 };

const SHARED_GLSL = /* glsl */ `
  uniform float time; uniform float assemble; uniform vec2 mouse; uniform float pointer; uniform float scale;
  uniform float pixelRatio; uniform float aspect; uniform vec3 ripple; uniform float story; uniform vec2 resolution;`;
const QUIET_GLSL = /* glsl */ `
  float quietStory() {
    vec2 p = gl_FragCoord.xy / resolution;
    float quiet = story > 1.5 ? smoothstep(0.44, 0.6, p.y) : smoothstep(0.06, 0.44, p.x);
    return mix(1.0, quiet * 0.85 + 0.15, step(0.5, story));
  }`;

/**
 * Data points drawn as small symbols. They settle floor by floor while landing, part around the cursor
 * and brighten under a query ripple; embeddings light up when they are the cursor's nearest neighbours.
 */
const POINT_VERTEX = /* glsl */ `
  attribute vec3 scatter; attribute vec3 aNormal; attribute float aSize; attribute float aShape; attribute float aPhase; attribute float aHighlight;
  varying vec3 vColor; varying float vShape;
  ${SHARED_GLSL}
  void main() {
    vec3 p = position;
    #ifdef FOG
      p.x = mod(p.x + time * (0.8 + aPhase * 1.5) + 180.0, 360.0) - 180.0;
      p.y += sin(time * 0.3 + aPhase * 20.0) * 0.8;
    #endif
    #ifdef SKY
      p += 0.7 * vec3(sin(time * 0.21 + aPhase * 30.0), cos(time * 0.17 + aPhase * 20.0), sin(time * 0.13 + aPhase * 11.0));
    #endif
    float settle = clamp(assemble * 1.8 - position.y / 90.0 - aPhase * 0.25, 0.0, 1.0);
    settle = settle * settle * (3.0 - 2.0 * settle);
    p = mix(scatter, p, settle);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vec2 ndc = gl_Position.xy / gl_Position.w, fromMouse = (ndc - mouse) * vec2(aspect, 1.0);
    float dist = length(fromMouse);
    #ifndef SKY
      float push = pointer * 0.08 * pow(max(0.0, 1.0 - dist / 0.26), 2.0);
      gl_Position.xy += (dist > 1e-4 ? fromMouse / dist : vec2(0.0)) / vec2(aspect, 1.0) * push * gl_Position.w;
    #endif
    float wave = ripple.z < 2.5 ? exp(-pow((length((ndc - ripple.xy) * vec2(aspect, 1.0)) - ripple.z * 1.1) * 8.0, 2.0)) * (1.0 - ripple.z / 2.5) : 0.0;
    float near = pointer * (1.0 - smoothstep(0.0, 0.3, dist));
    float facing = dot(aNormal, aNormal) > 0.5 ? mix(0.22, 1.0, smoothstep(-0.2, 0.3, dot(aNormal, normalize(cameraPosition - p)))) : 1.0;
    vColor = color * facing * (0.35 + 0.65 * settle) * (1.0 + 0.5 * near + 2.2 * aHighlight + 1.6 * wave);
    vShape = aShape;
    gl_PointSize = clamp(aSize * scale / -mv.z, 1.0 * pixelRatio, 9.0 * pixelRatio) * (1.0 + 0.9 * aHighlight + 0.6 * wave);
  }`;

const POINT_FRAGMENT = /* glsl */ `
  varying vec3 vColor; varying float vShape;
  ${SHARED_GLSL}
  ${QUIET_GLSL}
  void main() {
    vec2 q = gl_PointCoord * 2.0 - 1.0;
    float box = max(abs(q.x), abs(q.y)), ink;
    int shape = int(vShape + 0.5);
    if (shape == 0) ink = step(length(q), 0.6);
    else if (shape == 1) ink = step(min(abs(q.x), abs(q.y)), 0.2) * step(box, 0.9);
    else if (shape == 2) ink = step(box, 0.85) * step(0.45, box);
    else if (shape == 3) ink = step(abs(q.x) + abs(q.y), 0.9);
    else ink = step(box, 0.62);
    if (ink < 0.5) discard;
    gl_FragColor = vec4(vColor * quietStory(), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

/** Packets moving along Bézier pipelines, each with a short fading tail. */
const PACKET_VERTEX = /* glsl */ `
  attribute vec3 p0; attribute vec3 p1; attribute vec3 p2; attribute vec3 p3; attribute vec3 colourA; attribute vec3 colourB;
  attribute float aOffset; attribute float aSpeed; attribute float aTail; attribute float aSize;
  varying vec3 vColor; varying float vShape;
  ${SHARED_GLSL}
  void main() {
    float t = fract(aOffset + time * aSpeed - aTail * 0.018), u = 1.0 - t;
    vec3 p = u * u * u * p0 + 3.0 * u * u * t * p1 + 3.0 * u * t * t * p2 + t * t * t * p3;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float fade = smoothstep(0.0, 0.06, t) * (1.0 - smoothstep(0.94, 1.0, t)) * (1.0 - aTail) * smoothstep(0.75, 1.0, assemble);
    vColor = mix(colourA, colourB, t) * fade;
    vShape = aTail > 0.0 ? 0.0 : 4.0;
    gl_PointSize = clamp(aSize * scale / -mv.z, 1.0 * pixelRatio, 7.0 * pixelRatio) * (1.0 - 0.5 * aTail);
  }`;

export function createMadrid(quality: CityQuality = "desktop"): MadridScene {
  const mobile = quality === "mobile";
  const atmosphere = createCloudVolume(quality);
  const rng = random(28);
  const scene = new THREE.Scene();
  scene.name = "Madrid_Data_Skyline";
  scene.userData.technique = "Cuatro Torres as sampled point clouds with ETL pipelines and an embedding space queried by the cursor.";
  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 3000);
  const uniforms = {
    time: { value: 0 }, assemble: { value: 1 }, mouse: { value: new THREE.Vector2(9, 9) }, pointer: { value: 0 },
    scale: { value: 1 }, pixelRatio: { value: 1 }, aspect: { value: 1 }, ripple: { value: new THREE.Vector3(0, 0, 9) },
    story: { value: 1 }, resolution: { value: new THREE.Vector2(1, 1) },
  };

  const sky = new THREE.Mesh(new THREE.SphereGeometry(2400, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 vDir; void main(){
      float y = max(vDir.y, 0.0);
      vec3 c = mix(vec3(0.07, 0.035, 0.08), vec3(0.02, 0.018, 0.05), smoothstep(0.0, 0.12, y));
      c = mix(c, vec3(0.003, 0.004, 0.012), smoothstep(0.1, 0.55, y));
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  }));
  sky.name = "Sky"; sky.renderOrder = -1;
  scene.add(sky);

  const pointMaterial = (defines: Record<string, string> = {}) => new THREE.ShaderMaterial({
    uniforms, defines, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: POINT_VERTEX, fragmentShader: POINT_FRAGMENT,
  });
  function cloud(name: string, items: CloudItem[], material: THREE.ShaderMaterial) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(items.flatMap(p => p.position), 3));
    geometry.setAttribute("scatter", new THREE.Float32BufferAttribute(items.flatMap(p => p.scatter), 3));
    geometry.setAttribute("aNormal", new THREE.Float32BufferAttribute(items.flatMap(p => p.normal ?? [0, 0, 0]), 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(items.flatMap(p => p.colour), 3));
    geometry.setAttribute("aSize", new THREE.Float32BufferAttribute(items.map(p => p.size), 1));
    geometry.setAttribute("aShape", new THREE.Float32BufferAttribute(items.map(p => p.shape), 1));
    geometry.setAttribute("aPhase", new THREE.Float32BufferAttribute(items.map(() => rng()), 1));
    geometry.setAttribute("aHighlight", new THREE.Float32BufferAttribute(new Float32Array(items.length), 1));
    const points = new THREE.Points(geometry, material);
    points.name = name; points.frustumCulled = false;
    scene.add(points);
    return points;
  }
  const scatterOf = (p: Vec3, spread: number, lift: number): Vec3 => {
    const a = rng() * Math.PI * 2, b = Math.acos(2 * rng() - 1), r = spread * (0.4 + rng());
    return [p[0] + Math.sin(b) * Math.cos(a) * r, p[1] + lift + Math.cos(b) * r, p[2] + Math.sin(b) * Math.sin(a) * r];
  };

  // The Cuatro Torres: floor rings read like rows of a table; lit rows are amber, crowns carry plus signs.
  const towers = sampleTowers().map(s => {
    const crown = s.position[1] > TOWERS[s.tower].height * 0.93;
    return {
      position: s.position, normal: s.normal, scatter: scatterOf(s.position, 70, 50),
      colour: (s.lit ? [1.2, 0.72, 0.3] : crown ? [0.8, 0.7, 1.15] : [0.3, 0.35, 0.72]) as Vec3,
      size: s.lit ? 0.75 : 0.6, shape: crown ? 1 : 4,
    };
  });
  cloud("Cuatro_Torres", towers, pointMaterial());

  // Ground: a dim data lake grid, brighter along the Castellana, with drifting fog between the bases.
  const ground: CloudItem[] = [];
  const step = mobile ? 2.8 : 2.2;
  for (let x = -170; x <= 170; x += step) for (let z = -170; z <= 90; z += step) {
    if (TOWERS.some(t => Math.hypot(x - t.x, z - t.z) < 8)) continue;
    const avenue = Math.abs(z - 16) < 3;
    const p: Vec3 = [x + (rng() - 0.5) * 0.4, 0, z + (rng() - 0.5) * 0.4];
    ground.push({ position: p, scatter: scatterOf(p, 40, 10), colour: avenue ? [0.3, 0.3, 0.55] : [0.09, 0.1, 0.22], size: 0.5, shape: rng() < 0.08 ? 1 : 0 });
  }
  cloud("Data_Lake", ground, pointMaterial());
  const fog = Array.from({ length: mobile ? 1400 : 2600 }, () => {
    const p: Vec3 = [-180 + rng() * 360, rng() * rng() * 12, -120 + rng() * 170];
    return { position: p, scatter: scatterOf(p, 30, 5), colour: [0.2, 0.16, 0.3] as Vec3, size: 0.9, shape: 0 };
  });
  cloud("Fog", fog, pointMaterial({ FOG: "" }));

  // Embedding space: clustered points above the skyline that the cursor queries.
  const embeddingSamples = sampleEmbeddings(mobile ? 1100 : 1900);
  const embeddings = cloud("Embeddings", embeddingSamples.map(e => ({
    position: e.position, scatter: scatterOf(e.position, 50, 30), colour: CLUSTERS[e.cluster].colour.map(c => c * 0.55) as Vec3,
    size: 1.15, shape: e.cluster % 2 ? 3 : 1,
  })), pointMaterial({ SKY: "" }));
  const highlight = embeddings.geometry.attributes.aHighlight as THREE.BufferAttribute;

  // Aviation lights on the four crowns.
  const beacons = cloud("Beacons", TOWERS.map(t => {
    const p: Vec3 = [t.x, t.height + 1.5, t.z];
    return { position: p, scatter: p, colour: [3, 0.25, 0.15] as Vec3, size: 1.4, shape: 0 };
  }), pointMaterial());

  // Pipelines: faint guides plus moving packets; the Castellana carries two lanes of traffic.
  const curves = pipelines();
  const lanes: [Vec3, Vec3, Vec3, Vec3][] = [
    [[180, 0.4, 14.5], [60, 0.4, 14.5], [-60, 0.4, 14.5], [-180, 0.4, 14.5]],
    [[-180, 0.4, 17.5], [-60, 0.4, 17.5], [60, 0.4, 17.5], [180, 0.4, 17.5]],
  ];
  const guides: number[] = [];
  curves.forEach(([a, b, c, d]) => {
    const at = (t: number) => { const u = 1 - t; return [0, 1, 2].map(i => u * u * u * a[i] + 3 * u * u * t * b[i] + 3 * u * t * t * c[i] + t * t * t * d[i]); };
    for (let i = 0; i < 40; i++) guides.push(...at(i / 40), ...at((i + 1) / 40));
  });
  const guideGeometry = new THREE.BufferGeometry();
  guideGeometry.setAttribute("position", new THREE.Float32BufferAttribute(guides, 3));
  const guideLines = new THREE.LineSegments(guideGeometry, new THREE.LineBasicMaterial({ color: new THREE.Color(0.1, 0.09, 0.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  guideLines.name = "Pipeline_Guides";
  scene.add(guideLines);
  const packetData: Record<string, number[]> = { p0: [], p1: [], p2: [], p3: [], colourA: [], colourB: [], aOffset: [], aSpeed: [], aTail: [], aSize: [], position: [] };
  const addPackets = (curve: [Vec3, Vec3, Vec3, Vec3], count: number, speed: number, a: Vec3, b: Vec3, size: number, tail: number) => {
    for (let i = 0; i < count; i++) {
      const offset = rng(), rate = speed * (0.85 + rng() * 0.3);
      for (let k = 0; k <= tail; k++) {
        curve.forEach((p, j) => packetData[`p${j}`].push(...p));
        packetData.colourA.push(...a); packetData.colourB.push(...b);
        packetData.aOffset.push(offset); packetData.aSpeed.push(rate); packetData.aTail.push(k / (tail + 1)); packetData.aSize.push(size);
        packetData.position.push(0, 0, 0);
      }
    }
  };
  curves.forEach((curve, i) => addPackets(curve, i < 4 ? 10 : 6, i < 4 ? 0.06 : 0.1, [0.3, 0.95, 1.2], [0.9, 0.5, 1.4], 1.1, 4));
  addPackets(lanes[0], mobile ? 26 : 44, 0.035, [1.6, 1.5, 1.3], [1.6, 1.5, 1.3], 0.9, 3);
  addPackets(lanes[1], mobile ? 26 : 44, 0.035, [1.6, 0.18, 0.12], [1.6, 0.18, 0.12], 0.9, 3);
  const packetGeometry = new THREE.BufferGeometry();
  for (const [key, values] of Object.entries(packetData)) packetGeometry.setAttribute(key, new THREE.Float32BufferAttribute(values, key.startsWith("a") ? 1 : 3));
  const packets = new THREE.Points(packetGeometry, new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexShader: PACKET_VERTEX, fragmentShader: POINT_FRAGMENT,
  }));
  packets.name = "Pipelines"; packets.frustumCulled = false;
  scene.add(packets);

  // Nearest-neighbour links drawn from the closest embedding to the next ones: a vector search made visible.
  const K = 12;
  const linkGeometry = new THREE.BufferGeometry();
  linkGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(K * 4 * 3), 3));
  const links = new THREE.LineSegments(linkGeometry, new THREE.LineBasicMaterial({ color: new THREE.Color(0.9, 0.65, 0.42), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  links.name = "Neighbour_Links"; links.frustumCulled = false;
  scene.add(links);

  const cursor = trackPointer();
  const onDown = (event: PointerEvent) => {
    uniforms.ripple.value.set(event.clientX / Math.max(1, window.innerWidth) * 2 - 1, 1 - event.clientY / Math.max(1, window.innerHeight) * 2, 0);
  };
  window.addEventListener("pointerdown", onDown, { passive: true });

  let view: MadridView = madridView(1440, 900), size = { width: 1440, height: 900 }, disposed = false, lastSeconds = 0;
  let current: CityFrame = { arrivalT: 1, visitT: 0, departureT: 0, ambientSeconds: 0, reduced: false };
  const follow = { x: 0, y: 0 }, projected = new Float32Array(embeddingSamples.length * 2), glow = new Float32Array(embeddingSamples.length);
  const worldPoint = new THREE.Vector3(), lit = new Set<number>();
  let neighbours: { index: number; distance: number }[] = [];
  const api: MadridScene = {
    id: "madrid-latent", assetStage: "render", scene, camera, atmosphere,
    get status() { return disposed ? "disposed" : atmosphere.status === "error" ? "error" : atmosphere.status === "ready" ? "ready" : "loading"; },
    get neighbours() { return neighbours; },
    update(frame) {
      current = frame;
      const seconds = frame.ambientSeconds, dt = Math.min(0.1, Math.max(0, seconds - lastSeconds));
      lastSeconds = seconds;
      const ease = (tau: number) => 1 - Math.exp(-dt / tau);
      const hovering = cursor.hovering(seconds), pointer = cursor.state;
      follow.x += ((hovering ? pointer.x : 0) - follow.x) * ease(0.9);
      follow.y += ((hovering ? pointer.y : 0) - follow.y) * ease(0.9);
      const excursion = frame.reduced ? 0 : 1 - frame.arrivalT * (1 - frame.departureT);
      const pose = madridCamera(view, excursion, frame.reduced ? [0, 0] : [follow.x, follow.y]);
      camera.position.set(...pose.position); camera.lookAt(...pose.target); camera.updateMatrixWorld();
      sky.position.copy(camera.position);

      uniforms.time.value = frame.reduced ? 0 : seconds;
      uniforms.assemble.value = assembly(frame.arrivalT, frame.departureT, frame.reduced);
      uniforms.pointer.value += (Number(hovering) * (1 - excursion) - uniforms.pointer.value) * ease(0.3);
      uniforms.ripple.value.z = frame.reduced ? 9 : uniforms.ripple.value.z + dt;
      beacons.visible = frame.reduced || seconds % 1.5 < 0.5;

      // Touch and idle visitors see a slow automatic query drifting through the clusters.
      const query: [number, number] = hovering ? [pointer.x, pointer.y] : [0.35 + 0.35 * Math.sin(seconds * 0.11), 0.55 + 0.2 * Math.sin(seconds * 0.17)];
      uniforms.mouse.value.set(hovering ? pointer.x : 9, hovering ? pointer.y : 9);
      embeddings.updateMatrixWorld();
      for (let i = 0; i < embeddingSamples.length; i++) {
        worldPoint.set(...embeddingSamples[i].position).project(camera);
        projected[i * 2] = worldPoint.z < 1 ? (worldPoint.x * 0.5 + 0.5) * size.width : -1e5;
        projected[i * 2 + 1] = (0.5 - worldPoint.y * 0.5) * size.height;
      }
      const active = uniforms.assemble.value > 0.9;
      neighbours = active ? nearest(projected, [(query[0] * 0.5 + 0.5) * size.width, (0.5 - query[1] * 0.5) * size.height], K, size.width < 700 ? 120 : 190, size.width < 700 ? 16 : 26) : [];
      const decay = frame.reduced ? 0 : Math.exp(-dt / 0.35);
      lit.forEach(i => { glow[i] *= decay; if (glow[i] < 0.01) { glow[i] = 0; lit.delete(i); } });
      neighbours.forEach((n, rank) => { glow[n.index] = Math.max(glow[n.index], 1 - rank / (K + 2)); lit.add(n.index); });
      lit.forEach(i => highlight.setX(i, glow[i]));
      for (let i = 0; i < highlight.count; i++) if (!lit.has(i) && highlight.getX(i) !== 0) highlight.setX(i, 0);
      highlight.needsUpdate = true;

      const segments = linkGeometry.attributes.position as THREE.BufferAttribute;
      let v = 0;
      if (neighbours.length) {
        // The query vector sits under the cursor at the depth of its best match; links fan out to the top-k.
        const depth = worldPoint.set(...embeddingSamples[neighbours[0].index].position).project(camera).z;
        const origin = worldPoint.set(query[0], query[1], depth).unproject(camera).clone();
        neighbours.forEach((n, i) => {
          segments.setXYZ(v++, origin.x, origin.y, origin.z); segments.setXYZ(v++, ...embeddingSamples[n.index].position);
          if (i) { segments.setXYZ(v++, ...embeddingSamples[neighbours[i - 1].index].position); segments.setXYZ(v++, ...embeddingSamples[n.index].position); }
        });
      }
      linkGeometry.setDrawRange(0, v);
      segments.needsUpdate = true;
    },
    resize(width, height) {
      view = madridView(width, height);
      size = { width: Math.max(1, width), height: Math.max(1, height) };
      camera.aspect = size.width / size.height; camera.fov = view.fov; camera.updateProjectionMatrix();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      uniforms.pixelRatio.value = ratio;
      uniforms.scale.value = size.height * ratio / (2 * Math.tan(THREE.MathUtils.degToRad(view.fov / 2)));
      uniforms.aspect.value = camera.aspect;
      uniforms.resolution.value.set(Math.round(size.width * ratio), Math.round(size.height * ratio));
      uniforms.story.value = width >= 700 && width / Math.max(1, height) >= 0.9 ? 1 : 2;
      api.update(current);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cursor.dispose();
      window.removeEventListener("pointerdown", onDown);
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments) {
          geometries.add(object.geometry);
          (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => materials.add(m));
        }
      });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
      atmosphere.dispose(); scene.clear();
    },
  };
  api.resize(1440, 900, quality);
  return api;
}
