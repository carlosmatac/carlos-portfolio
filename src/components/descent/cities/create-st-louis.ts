import * as THREE from "three";
import { createCloudVolume } from "../clouds/cloud-volume";
import { createPointField, disposeScene, type CloudItem } from "./point-cloud";
import { trackPointer } from "./pointer";
import { ARCH, FLAG, sampleArch, sampleFlag, stLouisAssembly, stLouisCamera, stLouisView, type FlagPart, type StLouisView } from "./st-louis-art";
import type { CityFrame, CityQuality, CityScene } from "./types";

type Vec3 = [number, number, number];

function random(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const FLAG_COLOURS: Record<FlagPart, Vec3> = { red: [1.25, 0.14, 0.18], white: [0.85, 0.88, 1.0], blue: [0.12, 0.2, 0.95], star: [1.5, 1.5, 1.6] };

export function createStLouis(quality: CityQuality = "desktop"): CityScene {
  const mobile = quality === "mobile";
  const atmosphere = createCloudVolume(quality);
  const rng = random(1818);
  const scene = new THREE.Scene();
  scene.name = "StLouis_Data_Riverfront";
  scene.userData.technique = "Gateway Arch, flag and riverfront as sampled point clouds that part around the cursor.";
  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 3000);
  const field = createPointField(scene, rng), { cloud, scatterOf, material } = field;

  const sky = new THREE.Mesh(new THREE.SphereGeometry(2400, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 vDir; void main(){
      float y = max(vDir.y, 0.0);
      vec3 c = mix(vec3(0.05, 0.035, 0.09), vec3(0.016, 0.018, 0.05), smoothstep(0.0, 0.12, y));
      c = mix(c, vec3(0.003, 0.004, 0.012), smoothstep(0.1, 0.55, y));
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  }));
  sky.name = "Sky"; sky.renderOrder = -1;
  scene.add(sky);
  cloud("Stars", Array.from({ length: mobile ? 260 : 480 }, () => {
    const theta = Math.PI * (0.1 + rng() * 0.8), y = 0.12 + rng() * 0.8, r = Math.sqrt(1 - y * y);
    const p: Vec3 = [Math.cos(theta) * r * 900, y * 900, -Math.sin(theta) * r * 900];
    const b = 0.2 + rng() * 0.35;
    return { position: p, scatter: p, colour: [b * 0.8, b * 0.85, b] as Vec3, size: 2.2, shape: rng() < 0.15 ? 1 : 0 };
  }), material({ SKY: "" }));

  // The Gateway Arch: stainless steel brightening towards the crown, and its reflection breaking on the river.
  const arch = sampleArch(mobile ? 0.5 : 0.42);
  cloud("Gateway_Arch", arch.map(p => ({
    position: p.position, normal: p.normal, scatter: scatterOf(p.position, 70, 50),
    colour: [0.42 + 0.25 * p.height, 0.5 + 0.25 * p.height, 0.88 + 0.2 * p.height] as Vec3, size: 0.6, shape: 4,
  })), material());
  cloud("Arch_Reflection", arch.filter((_, i) => i % 3 === 0).map(p => {
    const position: Vec3 = [p.position[0], -p.position[1] * 0.92, p.position[2] + 16];
    return { position, scatter: scatterOf(position, 50, -20), colour: [0.09, 0.11, 0.26] as Vec3, size: 0.6, shape: 0 };
  }), material({ REFLECTION: "" }));
  cloud("Aviation_Light", [{ position: [0, ARCH.height + 1.4, 0] as Vec3, scatter: [0, ARCH.height + 30, 0] as Vec3, colour: [2.6, 0.2, 0.15] as Vec3, size: 1.3, shape: 0 }], material());

  // The Stars and Stripes on a pole between the legs.
  const flag = sampleFlag(mobile ? 0.5 : 0.42);
  cloud("US_Flag", flag.map(p => ({
    position: p.position, scatter: scatterOf(p.position, 40, 30), colour: FLAG_COLOURS[p.part],
    size: p.part === "star" ? 0.95 : 0.55, shape: p.part === "star" ? 1 : 4,
  })), material({ FLAG: "" }));
  const pole: CloudItem[] = [];
  for (let y = 0; y <= FLAG.y + FLAG.height + 1; y += 0.45) {
    const p: Vec3 = [FLAG.x - 0.25, y, FLAG.z];
    pole.push({ position: p, scatter: scatterOf(p, 30, 20), colour: [0.55, 0.58, 0.7], size: 0.5, shape: 4 });
  }
  pole.push({ position: [FLAG.x - 0.25, FLAG.y + FLAG.height + 1.6, FLAG.z], scatter: [FLAG.x, 60, FLAG.z], colour: [1.4, 1.0, 0.4], size: 1.1, shape: 0 });
  cloud("Flag_Pole", pole, material());

  // The Old Courthouse dome, framed by the legs, and downtown behind it.
  const courthouse: CloudItem[] = [];
  const warm: Vec3 = [0.85, 0.6, 0.36];
  for (let a = 0; a < Math.PI * 2; a += 0.12) for (let e = 0; e <= Math.PI / 2; e += 0.14) {
    const p: Vec3 = [Math.cos(a) * Math.cos(e) * 5, 16 + Math.sin(e) * 6, -48 + Math.sin(a) * Math.cos(e) * 5];
    courthouse.push({ position: p, scatter: scatterOf(p, 40, 20), colour: warm, size: 0.55, shape: 4, normal: [Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)] });
  }
  for (let a = 0; a < Math.PI * 2; a += 0.1) for (let y = 11; y <= 16; y += 0.8) {
    const p: Vec3 = [Math.cos(a) * 5.4, y, -48 + Math.sin(a) * 5.4];
    courthouse.push({ position: p, scatter: scatterOf(p, 40, 20), colour: warm, size: 0.55, shape: 4, normal: [Math.cos(a), 0, Math.sin(a)] });
  }
  for (let x = -12; x <= 12; x += 0.8) for (let y = 0; y <= 11; y += 1.1) {
    const p: Vec3 = [x, y, -41];
    courthouse.push({ position: p, scatter: scatterOf(p, 40, 20), colour: warm.map(c => c * 0.7) as Vec3, size: 0.55, shape: 4, normal: [0, 0, 1] });
  }
  courthouse.push({ position: [0, 23.4, -48], scatter: [0, 50, -48], colour: [1.4, 1.0, 0.5], size: 1, shape: 1 });
  cloud("Old_Courthouse", courthouse, material());

  const downtown: CloudItem[] = [];
  for (let x = -120; x < 120;) {
    const w = 8 + rng() * 10, d = 8 + rng() * 8, h = 8 + rng() * rng() * 48, z = -70 - rng() * 70;
    if (Math.abs(x + w / 2) < 14) { x += w + 2; continue; }
    for (let u = 0; u <= w; u += 1.3) for (let y = 1; y <= h; y += 1.6) {
      const lit = rng() < 0.12, p: Vec3 = [x + u, y, z + d / 2];
      downtown.push({ position: p, scatter: scatterOf(p, 60, 40), colour: lit ? [1.1, 0.68, 0.3] : [0.2, 0.24, 0.52], size: lit ? 0.7 : 0.55, shape: 4, normal: [0, 0, 1] });
    }
    for (let v = 0; v <= d; v += 1.6) for (let y = 1; y <= h; y += 1.6) {
      const p: Vec3 = [x, y, z + d / 2 - v];
      downtown.push({ position: p, scatter: scatterOf(p, 60, 40), colour: [0.14, 0.17, 0.38], size: 0.55, shape: 4, normal: [-1, 0, 0] });
    }
    x += w + 3 + rng() * 4;
  }
  cloud("Downtown", downtown, material());

  // Busch Stadium: a red bowl of seats around a green diamond.
  const stadium: CloudItem[] = [];
  const centre: Vec3 = [-54, 0, -32];
  for (let tier = 0; tier < 5; tier++) for (let a = 0; a < Math.PI * 1.75; a += 0.05) {
    const r = 12 + tier * 1.6, p: Vec3 = [centre[0] + Math.cos(a + 1.2) * r * 1.2, 1 + tier * 1.3, centre[2] + Math.sin(a + 1.2) * r];
    stadium.push({ position: p, scatter: scatterOf(p, 40, 20), colour: [0.95, 0.16, 0.18], size: 0.55, shape: 4 });
  }
  for (let u = -9; u <= 9; u += 1.1) for (let v = -9; v <= 9; v += 1.1) {
    if (Math.abs(u) + Math.abs(v) > 9) continue;
    const p: Vec3 = [centre[0] + u, 0.3, centre[2] + v];
    stadium.push({ position: p, scatter: scatterOf(p, 40, 10), colour: [0.12, 0.42, 0.22], size: 0.55, shape: 0 });
  }
  cloud("Busch_Stadium", stadium, material());

  // Riverfront grid, the Mississippi drifting south, and traffic along the levee.
  const ground: CloudItem[] = [];
  for (let x = -190; x <= 190; x += mobile ? 2.8 : 2.2) for (let z = -170; z <= 12; z += mobile ? 2.8 : 2.2) {
    if (Math.hypot(x, z) < 6 || Math.abs(x) - 32 < 3 && z > -4 && z < 4 && Math.abs(Math.abs(x) - 32) < 3) continue;
    const p: Vec3 = [x + (rng() - 0.5) * 0.4, 0, z + (rng() - 0.5) * 0.4];
    ground.push({ position: p, scatter: scatterOf(p, 40, 10), colour: z > 2 ? [0.26, 0.26, 0.5] : [0.08, 0.09, 0.2], size: 0.5, shape: rng() < 0.06 ? 1 : 0 });
  }
  cloud("Riverfront", ground, material());
  const river: CloudItem[] = [];
  for (let i = 0; i < (mobile ? 2600 : 4600); i++) {
    const p: Vec3 = [-180 + rng() * 360, -0.2, 16 + rng() * 110];
    const sparkle = rng() < 0.025, fade = 1 - (p[2] - 16) / 160;
    river.push({ position: p, scatter: scatterOf(p, 20, 0), colour: (sparkle ? [0.4, 0.5, 0.9] : [0.05, 0.08, 0.2]).map(c => c * fade) as Vec3, size: sparkle ? 0.8 : 0.55, shape: sparkle ? 1 : 0 });
  }
  cloud("Mississippi", river, material({ FOG: "" }));
  field.packets("Levee_Traffic", [
    { curve: [[190, 0.4, 7], [60, 0.4, 7], [-60, 0.4, 7], [-190, 0.4, 7]], count: mobile ? 22 : 38, speed: 0.03, from: [1.6, 1.5, 1.3], to: [1.6, 1.5, 1.3], size: 0.9, tail: 3 },
    { curve: [[-190, 0.4, 9.5], [-60, 0.4, 9.5], [60, 0.4, 9.5], [190, 0.4, 9.5]], count: mobile ? 22 : 38, speed: 0.03, from: [1.6, 0.18, 0.12], to: [1.6, 0.18, 0.12], size: 0.9, tail: 3 },
  ]);

  const cursor = trackPointer(), uniforms = field.uniforms;
  let view: StLouisView = stLouisView(1440, 900), size = { width: 1440, height: 900 }, disposed = false, lastSeconds = 0;
  let current: CityFrame = { arrivalT: 1, visitT: 0, departureT: 0, ambientSeconds: 0, reduced: false };
  const follow = { x: 0, y: 0 }, flagCentre = new THREE.Vector3();
  uniforms.flag.value.set(FLAG.x, FLAG.y, FLAG.length, 1);
  const api: CityScene = {
    id: "st-louis-sky", assetStage: "render", scene, camera, atmosphere,
    get status() { return disposed ? "disposed" : atmosphere.status === "error" ? "error" : atmosphere.status === "ready" ? "ready" : "loading"; },
    update(frame) {
      current = frame;
      const seconds = frame.ambientSeconds, dt = Math.min(0.1, Math.max(0, seconds - lastSeconds));
      lastSeconds = seconds;
      const ease = (tau: number) => 1 - Math.exp(-dt / tau);
      const hovering = cursor.hovering(seconds), pointer = cursor.state;
      follow.x += ((hovering ? pointer.x : 0) - follow.x) * ease(0.9);
      follow.y += ((hovering ? pointer.y : 0) - follow.y) * ease(0.9);
      const excursion = frame.reduced ? 0 : 1 - frame.arrivalT * (1 - frame.departureT);
      const pose = stLouisCamera(view, excursion, frame.reduced ? [0, 0] : [follow.x, follow.y]);
      camera.position.set(...pose.position); camera.lookAt(...pose.target); camera.updateMatrixWorld();
      sky.position.copy(camera.position);
      field.update({ seconds, dt, hovering, pointer, excursion, reduced: frame.reduced, assemble: stLouisAssembly(frame.arrivalT, frame.departureT, frame.reduced) });
      // The flag catches more wind when the cursor passes over it.
      flagCentre.set(FLAG.x + FLAG.length / 2, FLAG.y + FLAG.height / 2, FLAG.z).project(camera);
      const near = hovering ? Math.max(0, 1 - Math.hypot((flagCentre.x - pointer.x) * camera.aspect, flagCentre.y - pointer.y) / 0.45) : 0;
      const wind = frame.reduced ? 0 : 1 + 1.6 * near;
      uniforms.flag.value.w += (wind - uniforms.flag.value.w) * ease(0.5);
      scene.getObjectByName("Aviation_Light")!.visible = frame.reduced || seconds % 1.6 < 0.6;
    },
    resize(width, height) {
      view = stLouisView(width, height);
      size = { width: Math.max(1, width), height: Math.max(1, height) };
      camera.aspect = size.width / size.height; camera.fov = view.fov; camera.updateProjectionMatrix();
      field.resize(size.width, size.height, view.fov);
      api.update(current);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cursor.dispose(); field.dispose();
      disposeScene(scene); atmosphere.dispose();
    },
  };
  api.resize(1440, 900, quality);
  return api;
}
