import * as THREE from "three";
import { createCloudVolume } from "../clouds/cloud-volume";
import {
  CODE_COLOURS, CODE_ROWS, codeRows, DESK, SKY, studentPose, studyCamera, studyCell, studyDaylight, studyView,
  type StudyView, type Vec3,
} from "./granada-art";
import { createDotMatrix, DOT_MATRIX_GLSL } from "./dot-matrix";
import { trackPointer } from "./pointer";
import type { CityFrame, CityQuality, CityScene } from "./types";

/**
 * Halftone display: the room is sampled in square blocks and drawn as 45° hatching whose lines thicken with the light.
 * Neutral surfaces take the indigo-to-silver ramp; saturated light (the sun, the lamp, the code) keeps its hue.
 */
const DISPLAY_FRAGMENT = /* glsl */ `
  ${DOT_MATRIX_GLSL}
  void main() {
    vec2 frag = gl_FragCoord.xy;
    float coarse = micro * 4.0;
    float near = lens * (1.0 - smoothstep(lensRadius * 0.6, lensRadius, length((floor(frag / coarse) + 0.5) * coarse - mouse)));
    float unit = near > 0.5 ? max(1.0, floor(micro * 0.5)) : micro;
    float size = unit * 4.0;
    vec2 index = floor(frag / size);
    vec2 centre = (index + 0.5) * size / resolution;
    vec3 field = trailAt(centre);
    vec2 offset = field.xy * field.z * 0.05;
    vec3 colour = vec3(
      texture2D(source, centre - offset * 1.3).r,
      texture2D(source, centre - offset).g,
      texture2D(source, centre - offset * 0.7).b) * ready;
    float peak = max(colour.r, max(colour.g, colour.b));
    float light = 1.0 - exp(-mix(luma(colour), peak, 0.5) * 2.6);
    light = clamp(light * storyLight() + field.z * (hash(index + floor(time * 12.0)) - 0.4) * 0.4, 0.0, 1.0);
    vec2 m = floor(frag / unit);
    float lane = mod(m.x + m.y, 4.0);
    float level = floor(light * 4.0 + 0.4);
    float saturation = 1.0 - min(colour.r, min(colour.g, colour.b)) / max(peak, 1e-4);
    vec3 tone = mix(vec3(0.22, 0.22, 0.44), vec3(0.86, 0.86, 1.0), light);
    vec3 hue = colour / max(peak, 1e-4);
    vec3 ink = mix(tone, hue * mix(0.4, 1.15, light), smoothstep(0.3, 0.75, saturation));
    vec3 ground = vec3(0.006, 0.006, 0.014) + vec3(0.02, 0.02, 0.04) * step(lane, 0.0) * step(0.03, light);
    gl_FragColor = vec4(lane < level ? ink : ground, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

const SKY_VERTEX = `varying vec3 vWorld; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const SKY_FRAGMENT = /* glsl */ `
  varying vec3 vWorld;
  uniform vec3 sun; uniform float daylight; uniform float warmth; uniform float night;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    float h = clamp((vWorld.y - ${SKY.horizon.toFixed(2)}) / 3.2, 0.0, 1.0);
    vec3 nightSky = mix(vec3(0.018, 0.014, 0.04), vec3(0.003, 0.004, 0.012), h);
    vec3 daySky = mix(vec3(0.22, 0.22, 0.34), vec3(0.075, 0.09, 0.22), h);
    vec3 c = mix(nightSky, daySky, daylight);
    float glow = exp(-distance(vWorld.xy, sun.xy) * 1.4);
    c = mix(c, vec3(0.75, 0.36, 0.18), warmth * (1.0 - h) * 0.8);
    c += vec3(1.0, 0.6, 0.3) * glow * (0.2 + warmth * 0.6) * daylight;
    vec2 cell = floor(vWorld.xy * 9.0);
    c += vec3(0.8, 0.82, 1.0) * step(0.994, hash(cell)) * night * h;
    gl_FragColor = vec4(c, 1.0);
  }`;

const UP = new THREE.Vector3(0, 1, 0);

export function createGranada(quality: CityQuality = "desktop"): CityScene {
  const atmosphere = createCloudVolume(quality);
  const materials: THREE.Material[] = [], geometries: THREE.BufferGeometry[] = [];
  const own = <T extends THREE.BufferGeometry>(g: T) => { geometries.push(g); return g; };
  const mat = <T extends THREE.Material>(m: T) => { materials.push(m); return m; };
  const standard = (color: THREE.ColorRepresentation, roughness = 0.85) => mat(new THREE.MeshStandardMaterial({ color, roughness }));

  // The study is rendered off-screen and only ever seen through the halftone display.
  const world = new THREE.Scene();
  world.name = "Granada_Study";
  world.background = new THREE.Color(0x020206);
  const eye = new THREE.PerspectiveCamera(36, 1, 0.05, 60);
  const unitBox = own(new THREE.BoxGeometry(1, 1, 1)), unitCylinder = own(new THREE.CylinderGeometry(1, 1, 1, 12)), unitSphere = own(new THREE.SphereGeometry(1, 20, 14));
  const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, position: Vec3, scale: Vec3 = [1, 1, 1], name?: string) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position); mesh.scale.set(...scale);
    if (name) mesh.name = name;
    parent.add(mesh);
    return mesh;
  };
  const box = (parent: THREE.Object3D, material: THREE.Material, min: Vec3, max: Vec3, name?: string) =>
    add(parent, unitBox, material, [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2], [max[0] - min[0], max[1] - min[1], max[2] - min[2]], name);

  // Outside: a sky that runs from dawn to night, the sun and moon on one arc, and a low line of whitewashed rooftops.
  const skyUniforms = { sun: { value: new THREE.Vector3() }, daylight: { value: 1 }, warmth: { value: 0 }, night: { value: 0 } };
  const sky = add(world, own(new THREE.PlaneGeometry(30, 14)), mat(new THREE.ShaderMaterial({ uniforms: skyUniforms, vertexShader: SKY_VERTEX, fragmentShader: SKY_FRAGMENT, depthWrite: false })), [-1, 3.5, -8], [1, 1, 1], "Sky");
  sky.renderOrder = -1;
  const sunMaterial = mat(new THREE.MeshBasicMaterial({ color: 0xffffff })), moonMaterial = mat(new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const sunDisc = add(world, unitSphere, sunMaterial, [0, 0, SKY.z], [0.26, 0.26, 0.26], "Sun");
  const moonDisc = add(world, unitSphere, moonMaterial, [0, 0, SKY.z], [0.1, 0.1, 0.1], "Moon");
  const rooftops = new THREE.Group(); rooftops.name = "Rooftops";
  const whitewash = standard(0xd9d1c4, 0.95), tiles = standard(0x8c4a36, 0.9), roofGeometry = own(new THREE.CylinderGeometry(0.02, 1, 1, 4, 1).rotateY(Math.PI / 4));
  const litWindows = mat(new THREE.MeshBasicMaterial({ color: 0x000000 }));
  let seed = 7;
  const next = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let x = -5.2; x < 3.4;) {
    const w = 0.5 + next() * 0.7, h = 0.35 + next() * 0.6, z = -5.2 - next() * 0.8;
    box(rooftops, whitewash, [x, 0, z - 0.5], [x + w - 0.04, h, z + 0.5]);
    const roof = add(rooftops, roofGeometry, tiles, [x + w / 2 - 0.02, h + 0.1, z], [w * 0.72, 0.2, 0.72]);
    roof.scale.x = (w - 0.04) * 0.72;
    if (next() < 0.5) box(rooftops, litWindows, [x + w * 0.3, h * 0.45, z + 0.51], [x + w * 0.3 + 0.1, h * 0.45 + 0.13, z + 0.52]);
    if (next() < 0.14) add(rooftops, unitCylinder, standard(0x1d2a22), [x + w * 0.8, h + 0.45, z + 0.3], [0.06, 0.9, 0.06]);
    x += w;
  }
  world.add(rooftops);

  // The room: a wall with a white-framed window, a sill, the floor and the desk against the wall.
  const room = new THREE.Group(); room.name = "Room";
  const wall = standard(0x3a3648), frame = standard(0xd6d0c6, 0.6), wood = standard(0x7a624f, 0.7);
  const W = { left: -1.5, right: 1.3, bottom: 1.0, top: 2.5, z: -2.6 };
  box(room, wall, [-4, 0, W.z - 0.12], [W.left, 3.4, W.z]);
  box(room, wall, [W.right, 0, W.z - 0.12], [4, 3.4, W.z]);
  box(room, wall, [W.left, 0, W.z - 0.12], [W.right, W.bottom, W.z]);
  box(room, wall, [W.left, W.top, W.z - 0.12], [W.right, 3.4, W.z]);
  const windowFrame = new THREE.Group(); windowFrame.name = "Window";
  box(windowFrame, frame, [W.left, W.bottom - 0.02, W.z - 0.08], [W.right, W.bottom + 0.04, W.z + 0.12]);
  box(windowFrame, frame, [W.left, W.top - 0.05, W.z - 0.1], [W.right, W.top, W.z - 0.02]);
  box(windowFrame, frame, [W.left, W.bottom, W.z - 0.1], [W.left + 0.05, W.top, W.z - 0.02]);
  box(windowFrame, frame, [W.right - 0.05, W.bottom, W.z - 0.1], [W.right, W.top, W.z - 0.02]);
  box(windowFrame, frame, [-0.13, W.bottom, W.z - 0.09], [-0.07, W.top, W.z - 0.03]);
  box(windowFrame, frame, [W.left, 1.95, W.z - 0.09], [W.right, 1.99, W.z - 0.03]);
  room.add(windowFrame);
  add(room, own(new THREE.PlaneGeometry(10, 8).rotateX(-Math.PI / 2)), standard(0x1e1b26), [0, 0, 0]);
  const desk = new THREE.Group(); desk.name = "Desk";
  box(desk, wood, [DESK.left, DESK.top - 0.04, DESK.back], [DESK.right, DESK.top, DESK.front]);
  for (const x of [DESK.left + 0.03, DESK.right - 0.07]) box(desk, wood, [x, 0, DESK.back + 0.02], [x + 0.04, DESK.top - 0.04, DESK.front - 0.02]);
  room.add(desk);
  world.add(room);

  // On the desk: a monitor with the code, keyboard and mouse, a lamp, a mug, books and a plant.
  const dark = standard(0x16161d, 0.5);
  const monitor = new THREE.Group(); monitor.name = "Monitor";
  const SCREEN = { x: -0.3, y: 1.13, z: -2.3, w: 0.62, h: 0.37 };
  box(monitor, dark, [SCREEN.x - SCREEN.w / 2 - 0.015, SCREEN.y - SCREEN.h / 2 - 0.015, SCREEN.z - 0.03], [SCREEN.x + SCREEN.w / 2 + 0.015, SCREEN.y + SCREEN.h / 2 + 0.015, SCREEN.z]);
  box(monitor, mat(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.012, 0.016, 0.035) })), [SCREEN.x - SCREEN.w / 2, SCREEN.y - SCREEN.h / 2, SCREEN.z], [SCREEN.x + SCREEN.w / 2, SCREEN.y + SCREEN.h / 2, SCREEN.z + 0.002]);
  box(monitor, dark, [SCREEN.x - 0.025, DESK.top, SCREEN.z - 0.06], [SCREEN.x + 0.025, SCREEN.y - 0.1, SCREEN.z - 0.03]);
  box(monitor, dark, [SCREEN.x - 0.12, DESK.top, SCREEN.z - 0.12], [SCREEN.x + 0.12, DESK.top + 0.012, SCREEN.z + 0.02]);
  const code = new THREE.InstancedMesh(unitBox, mat(new THREE.MeshBasicMaterial({ color: 0xffffff })), CODE_ROWS + 1);
  code.name = "Code"; code.frustumCulled = false;
  monitor.add(code);
  world.add(monitor);
  box(world, dark, [-0.52, DESK.top, -2.0], [-0.08, DESK.top + 0.018, -1.86], "Keyboard");
  add(world, unitSphere, dark, [0.04, DESK.top + 0.01, -1.92], [0.03, 0.015, 0.05]);
  const props = new THREE.Group(); props.name = "Props";
  const lampMetal = standard(0x2e2c36, 0.45);
  const segment = (parent: THREE.Object3D, material: THREE.Material, a: Vec3, b: Vec3, radius: number) => {
    const mesh = add(parent, unitCylinder, material, [0, 0, 0]);
    place(mesh, a, b, radius);
    return mesh;
  };
  add(props, unitCylinder, lampMetal, [0.9, DESK.top + 0.01, -2.28], [0.08, 0.02, 0.08]);
  segment(props, lampMetal, [0.9, DESK.top, -2.28], [0.82, 1.24, -2.38], 0.012);
  segment(props, lampMetal, [0.82, 1.24, -2.38], [0.58, 1.17, -2.08], 0.012);
  const shade = add(props, own(new THREE.ConeGeometry(0.075, 0.12, 16, 1, true)), mat(new THREE.MeshStandardMaterial({ color: 0x2e2c36, roughness: 0.45, side: THREE.DoubleSide })), [0.56, 1.13, -2.05]);
  shade.rotation.set(0.35, 0, -0.25);
  const bulbMaterial = mat(new THREE.MeshBasicMaterial({ color: 0x000000 }));
  add(props, unitSphere, bulbMaterial, [0.555, 1.1, -2.04], [0.03, 0.03, 0.03]);
  const ceramic = standard(0xe2dbcf, 0.4);
  add(props, unitCylinder, ceramic, [0.3, DESK.top + 0.05, -1.93], [0.04, 0.1, 0.04]);
  const handle = add(props, own(new THREE.TorusGeometry(0.025, 0.007, 6, 12)), ceramic, [0.345, DESK.top + 0.055, -1.93]);
  handle.rotation.y = Math.PI / 2;
  [[0x4d5a8c, 0.05], [0xa4553a, 0.04], [0xc9bfae, 0.035]].reduce((y, [color, h], i) => {
    const book = box(props, standard(color), [0.85, y, -2.02], [1.15, y + h, -1.8]);
    book.rotation.y = (i - 1) * 0.08;
    return y + h;
  }, DESK.top);
  add(props, unitCylinder, standard(0x9a5f45), [-1.05, DESK.top + 0.07, -2.3], [0.08, 0.14, 0.08]);
  const leaf = standard(0x4d7a57, 0.7);
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2, tilt = 0.5 + (i % 3) * 0.2;
    const blade = add(props, unitSphere, leaf, [-1.05 + Math.cos(a) * 0.09, DESK.top + 0.26 + (i % 2) * 0.06, -2.3 + Math.sin(a) * 0.09], [0.03, 0.16, 0.06]);
    blade.rotation.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt);
  }
  world.add(props);

  // The student in a hoodie and headphones, seen from behind over the right shoulder.
  const student = new THREE.Group(); student.name = "Student";
  const hoodie = standard(0x7a80b0), skin = standard(0xd4a58e, 0.7), hair = standard(0x2a2220, 0.9), jeans = standard(0x3a3f62);
  const chairMaterial = standard(0x2c2c38, 0.6);
  const chair = new THREE.Group(); chair.name = "Chair";
  box(chair, chairMaterial, [-0.54, 0.43, -1.56], [-0.06, 0.49, -1.12]);
  const back = box(chair, chairMaterial, [-0.5, 0.62, -1.12], [-0.1, 0.84, -1.08]);
  back.rotation.x = -0.12;
  add(chair, unitCylinder, chairMaterial, [-0.3, 0.24, -1.34], [0.025, 0.4, 0.025]);
  for (let i = 0; i < 5; i++) {
    const leg = segment(chair, chairMaterial, [-0.3, 0.05, -1.34], [-0.3 + Math.cos(i * 1.2566) * 0.26, 0.03, -1.34 + Math.sin(i * 1.2566) * 0.26], 0.015);
    leg.name = "Chair_Leg";
  }
  world.add(chair);
  for (const x of [-0.4, -0.2]) {
    segment(student, jeans, [x, 0.52, -1.34], [x - 0.01, 0.53, -1.8], 0.075);
    segment(student, jeans, [x - 0.01, 0.53, -1.8], [x - 0.01, 0.08, -1.84], 0.055);
    add(student, unitSphere, jeans, [x - 0.01, 0.53, -1.8], [0.066, 0.066, 0.066]);
    box(student, dark, [x - 0.06, 0, -1.94], [x + 0.04, 0.07, -1.78]);
  }
  add(student, unitSphere, jeans, [-0.3, 0.55, -1.34], [0.2, 0.09, 0.14]);
  const torso = add(student, own(new THREE.CapsuleGeometry(0.15, 0.32, 6, 16)), hoodie, [0, 0, 0], [1.2, 1, 0.8], "Torso");
  const hood = add(student, unitSphere, hoodie, [0, 0, 0], [0.12, 0.07, 0.07]);
  const neck = segment(student, skin, [0, 0, 0], [0, 1, 0], 0.04);
  const head = new THREE.Group(); head.name = "Head"; head.rotation.order = "YXZ";
  add(head, unitSphere, skin, [0, 0, 0], [0.092, 0.11, 0.1]);
  const hairCap = add(head, own(new THREE.SphereGeometry(0.105, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.58)), hair, [0, 0.012, 0.01]);
  hairCap.rotation.x = 0.45;
  const band = add(head, own(new THREE.TorusGeometry(0.108, 0.012, 6, 20, Math.PI)), dark, [0, 0.005, 0]);
  band.rotation.y = 0.15;
  for (const x of [-0.1, 0.1]) add(head, unitCylinder, dark, [x, -0.01, 0], [0.042, 0.03, 0.042]).rotation.z = Math.PI / 2;
  add(head, unitSphere, skin, [0, -0.012, -0.1], [0.016, 0.024, 0.022]);
  const rim = own(new THREE.TorusGeometry(0.022, 0.004, 6, 16));
  for (const x of [-0.036, 0.036]) {
    add(head, rim, dark, [x, 0.012, -0.098]);
    box(head, dark, [x < 0 ? -0.094 : 0.086, 0.01, -0.098], [x < 0 ? -0.086 : 0.094, 0.016, -0.02]);
  }
  student.add(head);
  const arms = [0, 1].map(() => ({
    shoulder: add(student, unitSphere, hoodie, [0, 0, 0], [0.065, 0.065, 0.065]),
    upper: segment(student, hoodie, [0, 0, 0], [0, 1, 0], 0.052),
    elbow: add(student, unitSphere, hoodie, [0, 0, 0], [0.05, 0.05, 0.05]),
    fore: segment(student, hoodie, [0, 0, 0], [0, 1, 0], 0.045),
    hand: add(student, unitSphere, skin, [0, 0, 0], [0.035, 0.022, 0.05]),
  }));
  world.add(student);

  // Light: the sun through the window, the sky's fill, the monitor's glow and the lamp once it gets dark.
  const hemisphere = new THREE.HemisphereLight(0x8e90c0, 0x18121e, 0.3);
  const sunLight = new THREE.DirectionalLight(0xffffff, 0);
  sunLight.target.position.set(-0.2, 0.8, -1.6);
  const fill = new THREE.PointLight(0xc8ccff, 0, 0, 1.5); fill.position.set(-0.1, 1.75, -2.35);
  const glow = new THREE.PointLight(0x7f9cff, 0.7, 0, 2); glow.position.set(SCREEN.x, SCREEN.y, SCREEN.z + 0.25);
  const lamp = new THREE.SpotLight(0xffb870, 0, 3, 0.9, 0.7, 1.6); lamp.position.set(0.555, 1.1, -2.04); lamp.target.position.set(0.25, DESK.top, -1.85);
  // A soft bounce from the room behind the camera, so the student reads in mid-tones rather than as a cut-out.
  const bounce = new THREE.DirectionalLight(0xb9b4d8, 0.5); bounce.position.set(2.4, 2.6, 2.2); bounce.target.position.set(-0.3, 0.9, -1.5);
  world.add(hemisphere, sunLight, sunLight.target, fill, glow, lamp, lamp.target, bounce, bounce.target);

  const matrix = createDotMatrix({ name: "Granada_Halftone", world, eye, fragmentShader: DISPLAY_FRAGMENT, cellMicro: 4 });
  const { scene, camera } = matrix;
  scene.userData.technique = "Procedural 3D study rendered off-screen and re-drawn as diagonal halftone hatching.";

  const cursor = trackPointer();
  const lineMatrix = new THREE.Matrix4(), lineColour = new THREE.Color(), warm = new THREE.Color(1, 0.62, 0.36), white = new THREE.Color(1, 0.96, 0.9);
  let view: StudyView = studyView(1440, 900), size = { width: 1440, height: 900 }, disposed = false, lastSeconds: number | null = null;
  let clock = 0, typed = CODE_ROWS + 0.4;
  let current: CityFrame = { arrivalT: 1, visitT: 0, departureT: 0, ambientSeconds: 0, reduced: false };
  const follow = { x: 0, y: 0 };
  const api: CityScene = {
    id: "granada-sky", assetStage: "render", scene, camera, atmosphere,
    get status() { return disposed ? "disposed" : atmosphere.status === "error" ? "error" : atmosphere.status === "ready" ? "ready" : "loading"; },
    update(frame) {
      if (disposed) return;
      current = frame;
      const seconds = frame.ambientSeconds, dt = lastSeconds === null ? 0 : Math.min(0.1, Math.max(0, seconds - lastSeconds));
      lastSeconds = seconds;
      if (!frame.reduced) clock += dt;
      const ease = (tau: number) => 1 - Math.exp(-dt / tau);
      const hovering = !frame.reduced && cursor.hovering(seconds), pointer = cursor.state;
      follow.x += ((hovering ? pointer.x : 0) - follow.x) * ease(0.8);
      follow.y += ((hovering ? pointer.y : 0) - follow.y) * ease(0.8);
      const excursion = frame.reduced ? 0 : 1 - frame.arrivalT * (1 - frame.departureT);
      const pose = studyCamera(view, excursion, frame.reduced ? [0, 0] : [follow.x, follow.y]);
      eye.position.set(...pose.position); eye.lookAt(...pose.target); eye.updateMatrixWorld();

      const day = studyDaylight(clock, frame.reduced);
      sunDisc.position.set(...day.sun); moonDisc.position.set(...day.moon);
      sunMaterial.color.copy(warm).lerp(white, 1 - day.warmth).multiplyScalar(1.6);
      moonMaterial.color.setRGB(1.3, 1.3, 1.45).multiplyScalar(day.moonlight);
      moonDisc.visible = day.moonlight > 0;
      skyUniforms.sun.value.set(...day.sun); skyUniforms.daylight.value = day.daylight; skyUniforms.warmth.value = day.warmth; skyUniforms.night.value = day.night;
      sunLight.position.set(...day.sun);
      sunLight.color.copy(warm).lerp(white, 1 - day.warmth);
      sunLight.intensity = day.daylight * 2.4;
      fill.color.set(0xc8ccff).lerp(warm, day.warmth * 0.6);
      fill.intensity = 0.25 + day.daylight * 2.2;
      hemisphere.intensity = 0.3 + day.daylight * 0.4;
      bounce.intensity = 0.7 + day.daylight * 0.5;
      lamp.intensity = day.night * 5;
      bulbMaterial.color.setRGB(2.4, 1.5, 0.8).multiplyScalar(day.night);
      litWindows.color.setRGB(1.1, 0.62, 0.3).multiplyScalar(day.night);

      const body = studentPose(clock, day.sun[0], frame.reduced);
      place(torso, [-0.3, 0.6, -1.34], body.chest, 1);
      torso.scale.set(1.2, 1, 0.8);
      hood.position.set(body.chest[0], body.chest[1] + 0.07, body.chest[2] + 0.09);
      place(neck, [body.chest[0], body.chest[1] + 0.05, body.chest[2]], [body.head[0], body.head[1] - 0.06, body.head[2]], 0.04);
      head.position.set(...body.head); head.rotation.set(body.pitch, body.yaw, 0);
      arms.forEach((arm, i) => {
        arm.shoulder.position.set(...body.shoulders[i]);
        place(arm.upper, body.shoulders[i], body.elbows[i], 0.052);
        arm.elbow.position.set(...body.elbows[i]);
        place(arm.fore, body.elbows[i], body.hands[i], 0.045);
        arm.hand.position.set(...body.hands[i]);
      });

      // Code is typed only while the hands are on the keys; finished lines scroll up the screen.
      if (!frame.reduced) typed += dt * 0.75 * Math.max(0, body.typing * 1.2 - 0.2);
      const rows = codeRows(typed), lineHeight = (SCREEN.h - 0.05) / CODE_ROWS, left = SCREEN.x - SCREEN.w / 2 + 0.03, maxWidth = SCREEN.w - 0.1;
      rows.forEach(({ row, indent, width, colour }) => {
        const w = Math.max(1e-4, width * maxWidth), x = left + indent * 0.03 + w / 2, y = SCREEN.y + SCREEN.h / 2 - 0.03 - row * lineHeight;
        code.setMatrixAt(row, lineMatrix.compose(tmp.set(x, y, SCREEN.z + 0.004), quaternion, tmp2.set(w, lineHeight * 0.42, 0.001)));
        code.setColorAt(row, lineColour.setRGB(...CODE_COLOURS[colour]).multiplyScalar(0.9));
      });
      const last = rows[CODE_ROWS - 1], caret = frame.reduced || Math.floor(clock * 2.2) % 2 === 0 ? 1 : 1e-4;
      code.setMatrixAt(CODE_ROWS, lineMatrix.compose(
        tmp.set(left + last.indent * 0.03 + last.width * maxWidth + 0.008, SCREEN.y + SCREEN.h / 2 - 0.03 - (CODE_ROWS - 1) * lineHeight, SCREEN.z + 0.004),
        quaternion, tmp2.set(0.008 * caret, lineHeight * 0.7 * caret, 0.001)));
      code.setColorAt(CODE_ROWS, lineColour.setRGB(1, 0.95, 0.85));
      code.instanceMatrix.needsUpdate = true;
      if (code.instanceColor) code.instanceColor.needsUpdate = true;

      matrix.update({ seconds, dt, excursion, reduced: frame.reduced, hovering, pointer, cellCss: studyCell(size.width, excursion) });
    },
    resize(width, height) {
      if (disposed) return;
      view = studyView(width, height);
      size = { width: Math.max(1, width), height: Math.max(1, height) };
      matrix.resize(size.width, size.height, view.fov);
      eye.setViewOffset(size.width, size.height, (0.5 - view.centre[0]) * size.width, (0.5 - view.centre[1]) * size.height, size.width, size.height);
      eye.updateProjectionMatrix();
      api.update(current);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cursor.dispose();
      code.dispose();
      new Set(geometries).forEach(g => g.dispose());
      new Set(materials).forEach(m => m.dispose());
      matrix.dispose(); atmosphere.dispose(); world.clear();
    },
  };
  api.resize(1440, 900, quality);
  return api;
}

const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), direction = new THREE.Vector3(), quaternion = new THREE.Quaternion();
/** Stretches a unit cylinder (or orients any mesh) from a to b. */
function place(mesh: THREE.Object3D, a: Vec3, b: Vec3, radius: number) {
  tmp.set(...a); tmp2.set(...b);
  direction.subVectors(tmp2, tmp);
  const length = direction.length() || 1e-4;
  mesh.position.addVectors(tmp, tmp2).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(UP, direction.divideScalar(length));
  mesh.scale.set(radius, length, radius);
}
