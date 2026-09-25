import { afterEach, beforeEach, expect, it, vi } from "vitest";
import * as THREE from "three";
import { gzipSync } from "node:zlib";
import { createBrno } from "../cities/create-brno";
import { brnoCamera, brnoCell, brnoView, glyphCoverage, GLYPHS, tramState, TRAM_CYCLE, TRAM_STOP_X } from "../cities/brno-art";
import { JOURNEY, sampleJourney } from "../journey-timeline";

const rest = { arrivalT: 1, visitT: 0, departureT: 0, ambientSeconds: 0, reduced: false };
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response(new Uint8Array(gzipSync(new Uint8Array(128 * 64 * 64 * 2)))))));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const parts = (city: ReturnType<typeof createBrno>) => ({
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

it("gives Brno its own urban scene while Madrid stays on the Earth", () => {
  expect(sampleJourney(JOURNEY.anchors.brno).city?.sceneId).toBe("brno-pixel");
  for (const id of ["madrid"]) expect(sampleJourney(JOURNEY.anchors[id]).city).toBeNull();
});

it("runs a deterministic tram timetable: brakes into the stop, dwells, departs, and parks with reduced motion", () => {
  const { approach, dwell, depart, gap } = TRAM_CYCLE, period = approach + dwell + depart + gap;
  expect(tramState(0).x).toBeGreaterThan(60);
  expect(tramState(approach - 1e-6).x).toBeCloseTo(TRAM_STOP_X, 3);
  expect(tramState(approach - 1e-6).speed).toBeCloseTo(0, 3);
  expect(tramState(approach + dwell / 2)).toEqual({ x: TRAM_STOP_X, speed: 0, phase: "dwell" });
  expect(tramState(approach + dwell + 1e-6).x).toBeCloseTo(TRAM_STOP_X, 3);
  expect(tramState(approach + dwell + depart - 1e-6).x).toBeLessThan(-55);
  for (const t of [0.3, 5.1, 13.7]) expect(tramState(t + period * 3).x).toBeCloseTo(tramState(t).x, 6);
  let previous = Infinity;
  for (let t = 0; t < approach + dwell + depart; t += 0.1) { const x = tramState(t).x; expect(x).toBeLessThanOrEqual(previous + 1e-9); previous = x; }
  expect(tramState(123.4, true)).toEqual({ x: TRAM_STOP_X, speed: 0, phase: "dwell" });
});

it("orders eight glyphs from an empty cell to a solid block and starts coarse on arrival", () => {
  expect(GLYPHS).toHaveLength(8);
  const coverage = GLYPHS.map(glyphCoverage);
  expect(coverage[0]).toBe(0); expect(coverage[7]).toBe(1);
  coverage.slice(1).forEach((c, i) => expect(c).toBeGreaterThan(coverage[i]));
  expect(brnoCell(1440, 0)).toBe(6); expect(brnoCell(390, 0)).toBe(5);
  expect(brnoCell(1440, 1)).toBeGreaterThan(40);
  expect(brnoCell(1440, 0.5)).toBeLessThan(brnoCell(1440, 0.8));
});

it("frames the whole tram right of the desktop story and above the mobile story", () => {
  const project = (width: number, height: number, x: number, y: number) => {
    const view = brnoView(width, height), pose = brnoCamera(view, 0, [0, 0]);
    const camera = new THREE.PerspectiveCamera(view.fov, width / height, 0.3, 900);
    camera.position.set(...pose.position); camera.lookAt(...pose.target); camera.updateMatrixWorld();
    const p = new THREE.Vector3(x, y, 0).project(camera);
    return { x: (p.x + 1) / 2, y: (1 - p.y) / 2 };
  };
  for (const [w, h] of [[1440, 900], [1920, 1080], [1280, 720]]) {
    const front = project(w, h, TRAM_STOP_X - 7, 2), back = project(w, h, TRAM_STOP_X + 7, 2), roof = project(w, h, TRAM_STOP_X, 5.6);
    expect(front.x).toBeGreaterThan(0.3); expect(back.x).toBeLessThan(0.98); expect(roof.y).toBeGreaterThan(0.05);
  }
  for (const [w, h] of [[390, 844], [430, 932]]) {
    const front = project(w, h, TRAM_STOP_X - 7, 2), back = project(w, h, TRAM_STOP_X + 7, 2);
    expect(front.x).toBeGreaterThan(-0.05); expect(back.x).toBeLessThan(1.05);
    expect(front.y).toBeGreaterThan(0.2); expect(front.y).toBeLessThan(0.45);
  }
});

it("builds a procedural street without images and waits only for the shared cloud volume", async () => {
  const images = vi.spyOn(THREE.TextureLoader.prototype, "load");
  const city = createBrno("mobile"), { world, display } = parts(city);
  expect(city.status).toBe("loading");
  expect(city.scene.children).toEqual([display]);
  for (const name of ["Tram_Root", "Tram_Body", "Landmark_Petrov", "Facades", "Pantograph_Spark"]) expect(world.getObjectByName(name), name).toBeDefined();
  await city.atmosphere.ready;
  expect(city.status).toBe("ready");
  expect(images).not.toHaveBeenCalled();
  city.dispose(); expect(city.status).toBe("disposed");
});

it("draws the street and the cursor trail off-screen before the display, restoring the caller's target", () => {
  for (const float of [true, false]) {
    const city = createBrno("desktop"), { world, display } = parts(city), renderer = mockRenderer(float);
    const outer = new THREE.WebGLRenderTarget(4, 4);
    renderer.setRenderTarget(outer); renderer.setRenderTarget.mockClear();
    city.update(rest);
    display.onBeforeRender(renderer as unknown as THREE.WebGLRenderer, city.scene, city.camera, display.geometry, display.material, new THREE.Group());
    expect(renderer.render.mock.calls[0][0]).toBe(world);
    expect(renderer.render).toHaveBeenCalledTimes(2);
    expect(renderer.getRenderTarget()).toBe(outer);
    const u = display.material.uniforms;
    expect(u.ready.value).toBe(1); expect(u.packed.value).toBe(Number(!float));
    expect(u.source.value).toBeInstanceOf(THREE.Texture); expect(u.trail.value).toBeInstanceOf(THREE.Texture);
    display.onBeforeRender(renderer as unknown as THREE.WebGLRenderer, city.scene, city.camera, display.geometry, display.material, new THREE.Group());
    expect(renderer.render).toHaveBeenCalledTimes(3);
    city.dispose(); outer.dispose();
  }
});

it("lets a mouse open the fine-grained lens and paint the trail, ignoring touch and reduced motion", () => {
  const city = createBrno("desktop"), { display } = parts(city), u = display.material.uniforms;
  city.resize(window.innerWidth, window.innerHeight, "desktop");
  const now = () => performance.now() / 1000;
  window.dispatchEvent(new PointerEvent("pointermove", { clientX: 300, clientY: 200, pointerType: "touch" }));
  city.update({ ...rest, ambientSeconds: now() });
  expect(u.lens.value).toBe(0);
  window.dispatchEvent(new PointerEvent("pointermove", { clientX: 300, clientY: 200, pointerType: "mouse" }));
  for (let i = 1; i <= 20; i++) city.update({ ...rest, ambientSeconds: now() + i * 0.05 });
  expect(u.lens.value).toBeGreaterThan(0.9);
  expect(u.mouse.value.x).toBeCloseTo(300 * Math.min(window.devicePixelRatio || 1, 1.5), 3);
  city.update({ ...rest, reduced: true, ambientSeconds: now() + 2 });
  expect(u.time.value).toBe(0);
  expect((city.scene.userData.world as THREE.Scene).getObjectByName("Tram_Root")!.position.x).toBe(TRAM_STOP_X);
  city.dispose();
});

it("brings the tram into the stop as the visitor lands, reversibly during the arrival", () => {
  const city = createBrno("desktop"), tram = (city.scene.userData.world as THREE.Scene).getObjectByName("Tram_Root")!;
  city.update({ ...rest, arrivalT: 0.5, ambientSeconds: 40 });
  const approaching = tram.position.x;
  city.update({ ...rest, arrivalT: 0.8, ambientSeconds: 41 });
  expect(tram.position.x).toBeLessThan(approaching);
  city.update({ ...rest, arrivalT: 0.5, ambientSeconds: 90 });
  expect(tram.position.x).toBe(approaching);
  city.update({ ...rest, ambientSeconds: 100 });
  expect(tram.position.x).toBeGreaterThan(TRAM_STOP_X);
  city.update({ ...rest, ambientSeconds: 100 + 2.5 });
  expect(tram.position.x).toBe(TRAM_STOP_X);
  city.dispose();
});

it("samples the same camera on reverse travel and resolves chunky pixels as it lands", () => {
  const city = createBrno("desktop"), { eye, display } = parts(city);
  city.update({ ...rest, arrivalT: 0.6, ambientSeconds: 3 });
  const pose = eye.matrixWorld.clone(), coarse = display.material.uniforms.micro.value;
  city.update({ ...rest, departureT: 0.4, ambientSeconds: 9 });
  city.update({ ...rest, arrivalT: 0.6, ambientSeconds: 3 });
  expect(eye.matrixWorld.equals(pose)).toBe(true);
  city.update({ ...rest, ambientSeconds: 3 });
  expect(display.material.uniforms.micro.value).toBeLessThan(coarse);
  expect(eye.position.y).toBeLessThan(pose.elements[13]);
  city.dispose();
});

it("releases every geometry, material, render target and listener exactly once", async () => {
  const city = createBrno("mobile"), { world, display } = parts(city), renderer = mockRenderer();
  city.update(rest);
  display.onBeforeRender(renderer as unknown as THREE.WebGLRenderer, city.scene, city.camera, display.geometry, display.material, new THREE.Group());
  await city.atmosphere.ready;
  const resources = new Set<{ dispose: () => void }>();
  for (const root of [world, city.scene]) root.traverse(object => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
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
