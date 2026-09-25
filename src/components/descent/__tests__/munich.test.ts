import { afterEach, beforeEach, expect, it, vi } from "vitest";
import * as THREE from "three";
import { gzipSync } from "node:zlib";
import { createMunich } from "../cities/create-munich";
import {
  aimPoint, DIGIT_ROWS, DIGITS, digitInk, HAT_LOGO, helicopterGoal, JET_PERIOD, jetPair, munichCamera, munichCell, munichView, PAD, stepHelicopter,
} from "../cities/munich-art";
import { JOURNEY, sampleJourney } from "../journey-timeline";

type Vec3 = [number, number, number];
const rest = { arrivalT: 1, visitT: 0, departureT: 0, ambientSeconds: 0, reduced: false };
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response(new Uint8Array(gzipSync(new Uint8Array(128 * 64 * 64 * 2)))))));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const parts = (city: ReturnType<typeof createMunich>) => ({
  world: city.scene.userData.world as THREE.Scene,
  eye: city.scene.userData.eye as THREE.PerspectiveCamera,
  display: city.scene.getObjectByName("Dot_Matrix") as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>,
});
const heliOf = (city: ReturnType<typeof createMunich>) => parts(city).world.getObjectByName("H145")!;
function project(point: THREE.Vector3, width: number, height: number) {
  const view = munichView(width, height), pose = munichCamera(view, 0, [0, 0]);
  const camera = new THREE.PerspectiveCamera(view.fov, width / height, 0.5, 14000);
  camera.position.set(...pose.position); camera.lookAt(...pose.target); camera.updateMatrixWorld();
  const p = point.clone().project(camera);
  return { x: (p.x + 1) / 2, y: (1 - p.y) / 2 };
}

it("gives Munich its own mission scene and leaves only Madrid on the Earth", () => {
  expect(sampleJourney(JOURNEY.anchors.munich).city?.sceneId).toBe("munich-mission");
  expect(sampleJourney(JOURNEY.anchors.madrid).city).toBeNull();
});

it("prints ten digits ordered by ink from a 5×7 font", () => {
  expect([...DIGITS].sort()).toEqual(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);
  expect(DIGITS[0]).toBe("1");
  DIGITS.slice(1).forEach((d, i) => expect(digitInk(d)).toBeGreaterThanOrEqual(digitInk(DIGITS[i])));
  expect(DIGIT_ROWS).toHaveLength(70);
  DIGIT_ROWS.forEach(row => { expect(row).toBeGreaterThanOrEqual(0); expect(row).toBeLessThan(32); });
  expect(munichCell(1440, 0)).toBe(6); expect(munichCell(1440, 1)).toBeGreaterThan(40);
});

it("steers the H145 inside a box above the pad, banking into turns without overshooting", () => {
  for (const aim of [[-500, -80, 900], [500, 400, -900], [0, 40, 10]] as Vec3[]) {
    const goal = helicopterGoal(aim, 0, false);
    expect(goal[1]).toBeGreaterThanOrEqual(PAD[1] + 4); expect(goal[1]).toBeLessThanOrEqual(PAD[1] + 24);
    expect(Math.abs(goal[0] - PAD[0])).toBeLessThan(40);
  }
  const view = munichView(1440, 900), home = new THREE.Vector3(...helicopterGoal(null, 0, true));
  const toward = home.clone().sub(new THREE.Vector3(...view.position)).normalize().toArray() as Vec3;
  aimPoint(view.position, toward)!.forEach((v, i) => expect(v).toBeCloseTo(home.getComponent(i), 6));
  expect(aimPoint(view.position, toward.map(v => -v) as Vec3)).toBeNull();
  expect(helicopterGoal([9, 9, 9], 50, true)).toEqual(helicopterGoal(null, 0, true));
  let state = { position: [0, 40, 0] as Vec3, velocity: [0, 0, 0] as Vec3 };
  const goal: Vec3 = [12, 42, 4];
  let first = stepHelicopter(state, goal, 1 / 60), maxX = 0;
  expect(first.bank).toBeLessThan(0);
  for (let i = 0; i < 600; i++) { first = stepHelicopter(state, goal, 1 / 60); state = first; maxX = Math.max(maxX, state.position[0]); }
  expect(state.position[0]).toBeCloseTo(12, 1);
  expect(maxX).toBeLessThan(12.3);
  expect(Math.abs(first.bank)).toBeLessThan(0.01);
});

it("flies a deterministic Eurofighter pair with a wingman in echelon", () => {
  const a = jetPair(3.3, false), b = jetPair(3.3 + JET_PERIOD * 4, false);
  expect(b.lead[0]).toBeCloseTo(a.lead[0], 6);
  expect(a.wing[0]).toBeGreaterThan(a.lead[0]);
  expect(jetPair(1, false).lead[0]).toBeGreaterThan(jetPair(5, false).lead[0]);
  expect(jetPair(99, true)).toEqual(jetPair(3, true));
});

it("draws the HAT.tec logotype with the blue A as an open triangle", () => {
  const [a, b, c] = HAT_LOGO.blue.outer, inside = ([x, y]: [number, number]) => {
    const s = (p: [number, number], q: [number, number]) => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]);
    return s(a, b) >= 0 && s(b, c) >= 0 && s(c, a) >= 0;
  };
  HAT_LOGO.blue.inner.forEach(p => expect(inside(p)).toBe(true));
  expect(Math.max(...HAT_LOGO.grey.flat().map(p => p[0]))).toBeCloseTo(HAT_LOGO.width);
});

it("frames the helicopter and the HAT sign right of the desktop story and above the mobile story", () => {
  const sign = new THREE.Vector3(PAD[0] - 14, PAD[1] + 3, PAD[2] + 17), heli = new THREE.Vector3(...helicopterGoal(null, 0, true));
  for (const [w, h] of [[1440, 900], [1920, 1080], [1280, 720]]) {
    for (const p of [project(sign, w, h), project(heli, w, h)]) { expect(p.x).toBeGreaterThan(0.36); expect(p.x).toBeLessThan(0.95); expect(p.y).toBeLessThan(0.85); }
  }
  for (const [w, h] of [[390, 844], [430, 932]]) {
    for (const p of [project(sign, w, h), project(heli, w, h)]) { expect(p.x).toBeGreaterThan(0.05); expect(p.x).toBeLessThan(0.95); expect(p.y).toBeLessThan(0.52); }
  }
});

it("builds the mission world procedurally and waits only for the shared cloud volume", async () => {
  const images = vi.spyOn(THREE.TextureLoader.prototype, "load");
  const city = createMunich("mobile"), { world, display } = parts(city);
  expect(city.status).toBe("loading");
  expect(city.scene.children).toEqual([display]);
  for (const name of ["H145", "Rotor", "HAT_Logo", "Alps", "Landmark_Frauenkirche", "Landmark_Olympiaturm", "Landmark_BMW", "Eurofighter_1", "Eurofighter_2"]) {
    expect(world.getObjectByName(name), name).toBeDefined();
  }
  await city.atmosphere.ready;
  expect(city.status).toBe("ready");
  expect(images).not.toHaveBeenCalled();
  city.dispose(); expect(city.status).toBe("disposed");
});

it("renders the world off-screen before the digit display and restores the caller's target", () => {
  const city = createMunich("desktop"), { world, display } = parts(city);
  let target: THREE.WebGLRenderTarget | null = new THREE.WebGLRenderTarget(4, 4);
  const outer = target;
  const renderer = {
    extensions: { has: () => true }, getRenderTarget: () => target, setRenderTarget: (t: THREE.WebGLRenderTarget | null) => { target = t; },
    render: vi.fn(), clear: vi.fn(), getClearColor: (c: THREE.Color) => c, getClearAlpha: () => 0, setClearColor: vi.fn(),
  };
  city.update(rest);
  display.onBeforeRender(renderer as unknown as THREE.WebGLRenderer, city.scene, city.camera, display.geometry, display.material, new THREE.Group());
  expect(renderer.render.mock.calls[0][0]).toBe(world);
  expect(target).toBe(outer);
  expect(display.material.uniforms.ready.value).toBe(1);
  expect(display.material.fragmentShader).toContain("ROWS[70]");
  city.dispose(); outer.dispose();
});

it("lets a mouse fly the helicopter and lock the sight on it, while touch keeps the hover pattern", () => {
  const width = window.innerWidth, height = window.innerHeight;
  const city = createMunich("desktop"), { display } = parts(city), heli = heliOf(city), u = display.material.uniforms;
  city.resize(width, height, "desktop");
  const now = () => performance.now() / 1000;
  window.dispatchEvent(new PointerEvent("pointermove", { clientX: width * 0.95, clientY: height * 0.5, pointerType: "touch" }));
  for (let i = 0; i < 10; i++) city.update({ ...rest, ambientSeconds: now() + i * 0.05 });
  expect(u.lens.value).toBe(0);
  window.dispatchEvent(new PointerEvent("pointermove", { clientX: width * 0.95, clientY: height * 0.5, pointerType: "mouse" }));
  for (let i = 0; i < 60; i++) city.update({ ...rest, ambientSeconds: now() + 0.5 + i * 0.05 });
  expect(heli.position.x).toBeGreaterThan(helicopterGoal(null, 0, true)[0] + 5);
  expect(u.lens.value).toBeGreaterThan(0.9);
  const screen = new THREE.Vector3(...helicopterGoal(null, 0, true)).project(parts(city).eye);
  window.dispatchEvent(new PointerEvent("pointermove", { clientX: (screen.x + 1) / 2 * width, clientY: (1 - screen.y) / 2 * height, pointerType: "mouse" }));
  for (let i = 0; i < 80; i++) city.update({ ...rest, ambientSeconds: now() + 3.6 + i * 0.05 });
  expect(u.lock.value).toBeGreaterThan(0.5);
  city.dispose();
});

it("samples the same camera on reverse travel and holds the helicopter still with reduced motion", () => {
  const city = createMunich("desktop"), { eye, world } = parts(city), rotor = world.getObjectByName("Rotor")!;
  city.update({ ...rest, arrivalT: 0.6, ambientSeconds: 3 });
  const pose = eye.matrixWorld.clone();
  city.update({ ...rest, departureT: 0.4, ambientSeconds: 9 });
  city.update({ ...rest, arrivalT: 0.6, ambientSeconds: 3 });
  expect(eye.matrixWorld.equals(pose)).toBe(true);
  city.update({ ...rest, reduced: true, ambientSeconds: 20 });
  const spin = rotor.rotation.y, position = heliOf(city).position.clone();
  city.update({ ...rest, reduced: true, ambientSeconds: 25 });
  expect(rotor.rotation.y).toBe(spin);
  expect(heliOf(city).position.equals(position)).toBe(true);
  expect(position.toArray()).toEqual(helicopterGoal(null, 0, true));
  city.dispose();
});

it("releases every geometry, material, render target and listener exactly once", async () => {
  const city = createMunich("mobile"), { world, display } = parts(city);
  const renderer = {
    extensions: { has: () => false }, getRenderTarget: () => null, setRenderTarget: vi.fn(),
    render: vi.fn(), clear: vi.fn(), getClearColor: (c: THREE.Color) => c, getClearAlpha: () => 0, setClearColor: vi.fn(),
  };
  city.update(rest);
  display.onBeforeRender(renderer as unknown as THREE.WebGLRenderer, city.scene, city.camera, display.geometry, display.material, new THREE.Group());
  await city.atmosphere.ready;
  const resources = new Set<{ dispose: () => void }>();
  for (const root of [world, city.scene]) root.traverse(object => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments) {
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
});
