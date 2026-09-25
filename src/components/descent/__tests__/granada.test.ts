import { afterEach, beforeEach, expect, it, vi } from "vitest";
import * as THREE from "three";
import { gzipSync } from "node:zlib";
import { createGranada } from "../cities/create-granada";
import { CODE_ROWS, codeRows, DAY_SECONDS, DESK, LOOP_SECONDS, SKY, studentPose, studyCell, studyDaylight } from "../cities/granada-art";
import { JOURNEY, sampleJourney } from "../journey-timeline";

const rest = { arrivalT: 1, visitT: 0, departureT: 0, ambientSeconds: 0, reduced: false };
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response(new Uint8Array(gzipSync(new Uint8Array(128 * 64 * 64 * 2)))))));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const parts = (city: ReturnType<typeof createGranada>) => ({
  world: city.scene.userData.world as THREE.Scene,
  eye: city.scene.userData.eye as THREE.PerspectiveCamera,
  display: city.scene.getObjectByName("Dot_Matrix") as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>,
});
function mockRenderer(float = true) {
  let target: THREE.WebGLRenderTarget | null = null;
  return {
    extensions: { has: () => float },
    getRenderTarget: () => target,
    setRenderTarget: vi.fn((t: THREE.WebGLRenderTarget | null) => { target = t; }),
    render: vi.fn(), clear: vi.fn(),
    getClearColor: (c: THREE.Color) => c.set(0), getClearAlpha: () => 0, setClearColor: vi.fn(),
  };
}
const distance = (a: number[], b: number[]) => Math.hypot(...a.map((v, i) => v - b[i]));

it("builds a procedural study without images and waits only for the shared cloud volume", async () => {
  expect(sampleJourney(JOURNEY.anchors.granada).city?.sceneId).toBe("granada-sky");
  const images = vi.spyOn(THREE.TextureLoader.prototype, "load");
  const city = createGranada("mobile"), { world, display } = parts(city);
  expect(city.status).toBe("loading");
  expect(city.scene.children).toEqual([display]);
  for (const name of ["Room", "Window", "Desk", "Monitor", "Code", "Keyboard", "Student", "Head", "Chair", "Props", "Sky", "Sun", "Moon", "Rooftops"])
    expect(world.getObjectByName(name), name).toBeDefined();
  await city.atmosphere.ready;
  expect(city.status).toBe("ready");
  expect(images).not.toHaveBeenCalled();
  city.dispose(); expect(city.status).toBe("disposed");
});

it("runs a looping day behind the window: sunrise, noon, sunset and a night with the moon", () => {
  for (const t of [0, 7.5, 21, 33, 48, 59.9]) {
    const a = studyDaylight(t), b = studyDaylight(t + DAY_SECONDS * 3);
    expect(b.daylight).toBeCloseTo(a.daylight, 8);
    b.sun.forEach((v, i) => expect(v).toBeCloseTo(a.sun[i], 6));
  }
  // The visitor lands just after sunrise: low, warm light.
  const arrival = studyDaylight(0);
  expect(arrival.warmth).toBeGreaterThan(0.3); expect(arrival.sun[1]).toBeLessThan(SKY.horizon + SKY.height * 0.6);
  const samples = Array.from({ length: 600 }, (_, i) => studyDaylight(i / 10));
  const noon = samples.reduce((best, s) => s.elevation > best.elevation ? s : best);
  expect(noon.daylight).toBe(1); expect(noon.warmth).toBeLessThan(0.05);
  const night = samples.filter(s => s.elevation < -0.1);
  expect(night.length).toBeGreaterThan(60);
  night.forEach(s => { expect(s.daylight).toBe(0); expect(s.sun[1]).toBeLessThan(SKY.horizon); });
  expect(Math.max(...night.map(s => s.moonlight))).toBe(1);
  samples.filter(s => s.daylight > 0.5).forEach(s => expect(s.moonlight).toBe(0));
  // The sun travels one way across the window during the day.
  const day = samples.slice(0, samples.findIndex(s => s.elevation < 0));
  day.slice(1).forEach((s, i) => expect(s.sun[0]).toBeGreaterThanOrEqual(day[i].sun[0] - 1e-9));
  // Reduced motion holds a still golden hour.
  expect(studyDaylight(3, true)).toEqual(studyDaylight(90, true));
  expect(studyDaylight(3, true).warmth).toBeGreaterThan(0.2);
});

it("loops the student through typing, looking out of the window, a stretch and back to the keys", () => {
  const keyboard = [-0.3, 0.8, -1.93];
  for (const t of [0.5, 3, 6.2, 16.5]) {
    const p = studentPose(t);
    expect(p.typing).toBe(1);
    p.hands.forEach(h => expect(distance(h, keyboard)).toBeLessThan(0.15));
    expect(p.pitch).toBeLessThan(0);
  }
  const look = studentPose(10.5, -2);
  expect(look.look).toBe(1); expect(look.pitch).toBeGreaterThan(0.2); expect(look.yaw).toBeGreaterThan(0);
  look.hands.forEach(h => expect(h[1]).toBeLessThan(DESK.top + 0.1));
  const stretch = studentPose(12.9);
  expect(stretch.stretch).toBe(1);
  stretch.hands.forEach(h => expect(h[1]).toBeGreaterThan(stretch.head[1]));
  for (const t of [1.3, 9.7, 12.9]) {
    const a = studentPose(t), b = studentPose(t + LOOP_SECONDS * 2);
    // Key taps are deliberately aperiodic; the pose itself repeats.
    a.hands.flat().forEach((v, i) => expect(Math.abs(b.hands.flat()[i] - v)).toBeLessThan(0.025));
  }
  // Every limb keeps a plausible length through the loop.
  for (let t = 0; t < LOOP_SECONDS; t += 0.25) {
    const p = studentPose(t);
    [0, 1].forEach(i => {
      expect(distance(p.shoulders[i], p.elbows[i])).toBeGreaterThan(0.15); expect(distance(p.shoulders[i], p.elbows[i])).toBeLessThan(0.4);
      expect(distance(p.elbows[i], p.hands[i])).toBeGreaterThan(0.15); expect(distance(p.elbows[i], p.hands[i])).toBeLessThan(0.42);
    });
  }
  expect(studentPose(4, 0, true)).toEqual(studentPose(11, 0, true));
});

it("types the last line of code and scrolls finished lines up the screen", () => {
  const before = codeRows(20.3), later = codeRows(20.8), next = codeRows(21.3);
  expect(before).toHaveLength(CODE_ROWS);
  expect(later[CODE_ROWS - 1].width).toBeGreaterThanOrEqual(before[CODE_ROWS - 1].width);
  for (let row = 0; row < CODE_ROWS - 2; row++) expect({ ...next[row], row: 0 }).toEqual({ ...before[row + 1], row: 0 });
  before.forEach(line => { expect(line.width).toBeGreaterThanOrEqual(0); expect(line.width).toBeLessThanOrEqual(0.8); });
});

it("frames the student, the screen and the window beside desktop text and above mobile text", () => {
  const city = createGranada("desktop"), { eye } = parts(city);
  const points: [number, number, number][] = [[-0.3, 1.25, -1.45], [-0.3, 1.13, -2.3], [-0.3, 0.8, -1.93], [-1.5, 1.0, -2.6], [1.3, 2.5, -2.6], [-1.5, 2.5, -2.6], [DESK.right, DESK.top, DESK.front]];
  for (const [w, h] of [[1440, 900], [1920, 1080], [1280, 720], [390, 844], [375, 667], [430, 932], [768, 1024]]) {
    city.resize(w, h, "desktop"); city.update(rest);
    const portrait = w < 700 || w / h < 0.9;
    for (const point of points.slice(0, portrait ? 3 : points.length)) {
      const p = new THREE.Vector3(...point).project(eye), x = (p.x + 1) / 2, y = (1 - p.y) / 2;
      expect(x, `${w}×${h} ${point}`).toBeGreaterThan(portrait ? 0.05 : 0.36);
      expect(x, `${w}×${h} ${point}`).toBeLessThan(1);
      expect(y, `${w}×${h} ${point}`).toBeGreaterThan(0.02);
      expect(y, `${w}×${h} ${point}`).toBeLessThan(portrait ? 0.5 : 0.98);
    }
  }
  city.dispose();
});

it("draws the study and the cursor trail off-screen before the display, restoring the caller's target", () => {
  const city = createGranada("desktop"), { world, display } = parts(city), renderer = mockRenderer();
  const outer = new THREE.WebGLRenderTarget(4, 4);
  renderer.setRenderTarget(outer);
  city.update(rest);
  display.onBeforeRender(renderer as unknown as THREE.WebGLRenderer, city.scene, city.camera, display.geometry, display.material, new THREE.Group());
  expect(renderer.render.mock.calls[0][0]).toBe(world);
  expect(renderer.getRenderTarget()).toBe(outer);
  expect(display.material.uniforms.ready.value).toBe(1);
  city.dispose(); outer.dispose();
});

it("resolves coarse hatching on arrival and samples the same camera on reverse travel", () => {
  expect(studyCell(1440, 0)).toBe(6); expect(studyCell(390, 0)).toBe(5);
  expect(studyCell(1440, 1)).toBeGreaterThan(30);
  const city = createGranada("desktop"), { eye, display } = parts(city);
  city.update({ ...rest, arrivalT: 0.6, ambientSeconds: 3 });
  const pose = eye.matrixWorld.clone(), coarse = display.material.uniforms.micro.value;
  city.update({ ...rest, departureT: 0.4, ambientSeconds: 9 });
  city.update({ ...rest, arrivalT: 0.6, ambientSeconds: 9.05 });
  expect(eye.matrixWorld.equals(pose)).toBe(true);
  city.update({ ...rest, ambientSeconds: 9.1 });
  expect(display.material.uniforms.micro.value).toBeLessThan(coarse);
  city.dispose();
});

it("freezes the day, the student, the code and the camera with reduced motion", () => {
  const city = createGranada("desktop"), { world, eye, display } = parts(city);
  const code = world.getObjectByName("Code") as THREE.InstancedMesh, sun = world.getObjectByName("Sun")!, head = world.getObjectByName("Head")!;
  city.update({ ...rest, reduced: true, ambientSeconds: 1 });
  const still = { eye: eye.matrixWorld.clone(), sun: sun.position.clone(), head: head.position.clone(), code: Array.from(code.instanceMatrix.array) };
  for (let t = 1.05; t < 4; t += 0.05) city.update({ ...rest, reduced: true, ambientSeconds: t });
  expect(eye.matrixWorld.equals(still.eye)).toBe(true);
  expect(sun.position.equals(still.sun)).toBe(true);
  expect(head.position.equals(still.head)).toBe(true);
  expect(Array.from(code.instanceMatrix.array)).toEqual(still.code);
  expect(display.material.uniforms.time.value).toBe(0);
  // In motion, the same span of time moves the sun and types code.
  for (let t = 4.05; t < 8; t += 0.05) city.update({ ...rest, ambientSeconds: t });
  expect(sun.position.equals(still.sun)).toBe(false);
  expect(Array.from(code.instanceMatrix.array)).not.toEqual(still.code);
  city.dispose();
});

it("lets a mouse open the fine-grained lens, ignoring touch", () => {
  const city = createGranada("desktop"), { display } = parts(city), u = display.material.uniforms;
  city.resize(window.innerWidth, window.innerHeight, "desktop");
  const now = () => performance.now() / 1000;
  window.dispatchEvent(new PointerEvent("pointermove", { clientX: 300, clientY: 200, pointerType: "touch" }));
  city.update({ ...rest, ambientSeconds: now() });
  expect(u.lens.value).toBe(0);
  window.dispatchEvent(new PointerEvent("pointermove", { clientX: 300, clientY: 200, pointerType: "mouse" }));
  for (let i = 1; i <= 20; i++) city.update({ ...rest, ambientSeconds: now() + i * 0.05 });
  expect(u.lens.value).toBeGreaterThan(0.9);
  city.dispose();
});

it("releases every geometry, material, render target and listener exactly once", async () => {
  const city = createGranada("mobile"), { world, display } = parts(city), renderer = mockRenderer();
  city.update(rest);
  display.onBeforeRender(renderer as unknown as THREE.WebGLRenderer, city.scene, city.camera, display.geometry, display.material, new THREE.Group());
  await city.atmosphere.ready;
  const resources = new Set<{ dispose: () => void }>();
  for (const root of [world, city.scene]) root.traverse(object => {
    if (object instanceof THREE.Mesh) {
      resources.add(object.geometry);
      (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => resources.add(m));
    }
  });
  const removed = vi.spyOn(window, "removeEventListener");
  const spies = [...resources].map(r => vi.spyOn(r, "dispose"));
  const targets = vi.spyOn(THREE.WebGLRenderTarget.prototype, "dispose");
  city.dispose(); city.dispose();
  spies.forEach(spy => expect(spy).toHaveBeenCalledOnce());
  expect(targets).toHaveBeenCalledTimes(3);
  expect(removed).toHaveBeenCalledWith("pointermove", expect.any(Function));
  expect(city.scene.children).toHaveLength(0);
});
