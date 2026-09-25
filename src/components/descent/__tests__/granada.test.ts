import { afterEach, beforeEach, expect, it, vi } from "vitest";
import * as THREE from "three";
import { gzipSync } from "node:zlib";
import { createGranada } from "../cities/create-granada";
import {
  ALHAMBRA, gliderCells, gliderDirection, granadaCamera, granadaCell, granadaView, lifeStep, moonPosition, MOON, ridgeZ, terrainHeight,
} from "../cities/granada-art";
import { JOURNEY, sampleJourney, stopProgress } from "../journey-timeline";

const rest = { arrivalT: 1, visitT: 0, departureT: 0, ambientSeconds: 0, reduced: false };
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response(new Uint8Array(gzipSync(new Uint8Array(128 * 64 * 64 * 2)))))));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function block(name: string) {
  const b = ALHAMBRA.find(item => item.name === name)!;
  const z = ridgeZ(b.x) + b.dz;
  return new THREE.Vector3(b.x, terrainHeight(b.x, z) + b.h / 2, z);
}
function project(point: THREE.Vector3, width: number, height: number) {
  const view = granadaView(width, height), pose = granadaCamera(view, 0, [0, 0]);
  const camera = new THREE.PerspectiveCamera(view.fov, width / height, 0.5, 1600);
  camera.position.set(...pose.position); camera.lookAt(...pose.target); camera.updateMatrixWorld();
  const p = point.clone().project(camera);
  return { x: (p.x + 1) / 2, y: (1 - p.y) / 2 };
}
const parts = (city: ReturnType<typeof createGranada>) => ({
  world: city.scene.userData.world as THREE.Scene,
  eye: city.scene.userData.eye as THREE.PerspectiveCamera,
  display: city.scene.getObjectByName("Dot_Matrix") as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>,
  life: city.scene.userData.life as { uniforms: Record<string, THREE.IUniform>; grid: { cols: number; rows: number } },
});
function mockRenderer() {
  let target: THREE.WebGLRenderTarget | null = null;
  return {
    extensions: { has: () => true }, getRenderTarget: () => target, setRenderTarget: vi.fn((t: THREE.WebGLRenderTarget | null) => { target = t; }),
    render: vi.fn(), clear: vi.fn(), getClearColor: (c: THREE.Color) => c, getClearAlpha: () => 0, setClearColor: vi.fn(),
  };
}

it("gives Granada its own urban scene", () => {
  expect(sampleJourney(JOURNEY.anchors.granada).city?.sceneId).toBe("granada-sky");
});

it("models the Alhambra on the Sabika above the Darro, with Sierra Nevada rising behind", () => {
  const crest = terrainHeight(0, ridgeZ(0)), darro = terrainHeight(0, 16), albaicin = terrainHeight(-20, 55);
  expect(crest).toBeGreaterThan(darro + 5);
  expect(albaicin).toBeGreaterThan(darro);
  expect(Math.max(...[-60, 0, 40, 90].map(x => terrainHeight(x, -330)))).toBeGreaterThan(crest + 40);
  expect(ALHAMBRA.reduce((a, b) => (b.h > a.h ? b : a)).name).toBe("Torre_de_Comares");
  expect(ALHAMBRA.reduce((a, b) => (b.x < a.x ? b : a)).name).toBe("Torre_de_la_Vela");
});

it("runs Conway's rules: gliders travel one diagonal cell every four generations, blocks stay, blinkers blink", () => {
  const key = ([x, y]: [number, number]) => `${x},${y}`;
  for (let direction = 0; direction < 4; direction++) {
    const start = gliderCells(10, 10, direction);
    expect(start).toHaveLength(5);
    let alive = new Set(start.map(key));
    for (let i = 0; i < 4; i++) alive = lifeStep(alive, 40, 40);
    const moved = [...alive].map(k => k.split(",").map(Number));
    const dx = Math.min(...moved.map(p => p[0])) - Math.min(...start.map(p => p[0]));
    const dy = Math.min(...moved.map(p => p[1])) - Math.min(...start.map(p => p[1]));
    expect(alive.size).toBe(5);
    expect(dx).toBe(direction & 1 ? -1 : 1); expect(dy).toBe(direction & 2 ? 1 : -1);
  }
  expect(gliderDirection(1, -1)).toBe(0); expect(gliderDirection(-1, -1)).toBe(1);
  expect(gliderDirection(1, 1)).toBe(2); expect(gliderDirection(-1, 1)).toBe(3);
  const blockCells = new Set(["1,1", "2,1", "1,2", "2,2"]);
  expect(lifeStep(blockCells, 10, 10)).toEqual(blockCells);
  const blinker = new Set(["4,5", "5,5", "6,5"]);
  expect(lifeStep(lifeStep(blinker, 10, 10), 10, 10)).toEqual(blinker);
  expect(lifeStep(blinker, 10, 10)).toEqual(new Set(["5,4", "5,5", "5,6"]));
});

it("frames the Alhambra right of the desktop story, above the mobile story, with the pomegranate moon above it", () => {
  for (const [width, height] of [[1440, 900], [1920, 1080], [1280, 720]]) {
    const vela = project(block("Torre_de_la_Vela"), width, height), comares = project(block("Torre_de_Comares"), width, height);
    const moon = project(new THREE.Vector3(...moonPosition(width, height)), width, height);
    expect(vela.x).toBeGreaterThan(0.33);
    expect(comares.x).toBeGreaterThan(0.5); expect(comares.x).toBeLessThan(0.8);
    expect(moon.x).toBeGreaterThan(0.5); expect(moon.x).toBeLessThan(0.95); expect(moon.y).toBeGreaterThan(0.08); expect(moon.y).toBeLessThan(comares.y);
  }
  for (const [width, height] of [[390, 844], [430, 932]]) {
    const comares = project(block("Torre_de_Comares"), width, height);
    const moon = project(new THREE.Vector3(...moonPosition(width, height)), width, height);
    const crown = project(new THREE.Vector3(...moonPosition(width, height)).add(new THREE.Vector3(0, MOON.radius * 1.6, 0)), width, height);
    expect(comares.y).toBeGreaterThan(0.18); expect(comares.y).toBeLessThan(0.45);
    expect(moon.x).toBeGreaterThan(0.1); expect(moon.x).toBeLessThan(0.9); expect(crown.y).toBeGreaterThan(0.01); expect(moon.y).toBeLessThan(comares.y);
  }
  expect(granadaCell(1440, 0)).toBe(6); expect(granadaCell(390, 0)).toBe(5); expect(granadaCell(1440, 1)).toBeGreaterThan(30);
});

it("builds the Alhambra, Sierra, Albaicín and moon procedurally, waiting only for the shared cloud volume", async () => {
  const images = vi.spyOn(THREE.TextureLoader.prototype, "load");
  const city = createGranada("mobile"), { world, display } = parts(city);
  expect(city.status).toBe("loading");
  expect(city.scene.children).toEqual([display]);
  for (const name of ["Landmark_Alhambra", "Pomegranate_Moon", "Sierra", "Ground", "Cypress", "Albaicin_Houses"]) expect(world.getObjectByName(name), name).toBeDefined();
  expect(display.material.fragmentShader).toContain("float star(");
  await city.atmosphere.ready;
  expect(city.status).toBe("ready");
  expect(images).not.toHaveBeenCalled();
  city.dispose(); expect(city.status).toBe("disposed");
});

it("renders the world, the trail and a Life generation off-screen, then restores the caller's target", () => {
  const city = createGranada("desktop"), { world, display, life } = parts(city), renderer = mockRenderer();
  const outer = new THREE.WebGLRenderTarget(4, 4);
  renderer.setRenderTarget(outer);
  city.update(rest);
  display.onBeforeRender(renderer as unknown as THREE.WebGLRenderer, city.scene, city.camera, display.geometry, display.material, new THREE.Group());
  expect(renderer.render.mock.calls[0][0]).toBe(world);
  expect(renderer.render).toHaveBeenCalledTimes(3);
  expect(renderer.getRenderTarget()).toBe(outer);
  expect(display.material.uniforms.life.value).toBeInstanceOf(THREE.Texture);
  expect(life.grid.cols).toBeGreaterThan(50);
  display.onBeforeRender(renderer as unknown as THREE.WebGLRenderer, city.scene, city.camera, display.geometry, display.material, new THREE.Group());
  expect(renderer.render).toHaveBeenCalledTimes(4);
  city.dispose(); outer.dispose();
});

it("launches gliders along the cursor's heading, sends them when idle, and clears the board while landing or with reduced motion", () => {
  const width = window.innerWidth, height = window.innerHeight;
  const city = createGranada("desktop"), { life, display } = parts(city), u = life.uniforms, renderer = mockRenderer();
  const draw = () => display.onBeforeRender(renderer as unknown as THREE.WebGLRenderer, city.scene, city.camera, display.geometry, display.material, new THREE.Group());
  city.resize(width, height, "desktop");
  const now = () => performance.now() / 1000;
  city.update({ ...rest, ambientSeconds: now() });
  draw();
  expect(u.reset.value).toBe(0);
  for (let i = 1; i <= 8; i++) city.update({ ...rest, ambientSeconds: now() + i * 0.05 });
  expect(u.glider.value.w).toBe(1);
  draw();
  expect(u.glider.value.w).toBe(0);
  window.dispatchEvent(new PointerEvent("pointermove", { clientX: width * 0.4, clientY: height * 0.5, pointerType: "mouse" }));
  for (let i = 1; i <= 3; i++) city.update({ ...rest, ambientSeconds: now() + 1 + i * 0.12 });
  draw();
  window.dispatchEvent(new PointerEvent("pointermove", { clientX: width * 0.7, clientY: height * 0.3, pointerType: "mouse" }));
  city.update({ ...rest, ambientSeconds: now() + 1.5 });
  expect(u.glider.value.w).toBe(1);
  expect(u.glider.value.z).toBe(gliderDirection(1, 1));
  expect(u.glider.value.x).toBeCloseTo(Math.floor(0.7 * life.grid.cols) - 1, 0);
  city.update({ ...rest, arrivalT: 0.5, ambientSeconds: now() + 2 });
  expect(u.reset.value).toBe(1);
  city.update({ ...rest, ambientSeconds: now() + 3 });
  city.update({ ...rest, reduced: true, ambientSeconds: now() + 3.2 });
  expect(u.reset.value).toBe(1);
  city.dispose();
});

it("samples the same camera on reverse travel and resolves chunky tiles as it lands", () => {
  const city = createGranada("desktop"), { eye, display } = parts(city);
  city.update({ ...rest, arrivalT: 0.6, ambientSeconds: 3 });
  const pose = eye.matrixWorld.clone(), coarse = display.material.uniforms.micro.value;
  city.update({ ...rest, departureT: 0.4, ambientSeconds: 9 });
  city.update({ ...rest, arrivalT: 0.6, ambientSeconds: 3 });
  expect(eye.matrixWorld.equals(pose)).toBe(true);
  city.update({ ...rest, ambientSeconds: 3 });
  expect(display.material.uniforms.micro.value).toBeLessThan(coarse);
  city.dispose();
});

it("releases every geometry, material, render target and listener exactly once", async () => {
  const city = createGranada("mobile"), { world, display } = parts(city), renderer = mockRenderer();
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
  expect(targets).toHaveBeenCalledTimes(5);
  expect(removed).toHaveBeenCalledWith("pointermove", expect.any(Function));
});

it("resolves normalized city anchors to stable visits despite floating-point round trips", () => {
  for (let i = 0; i < 5; i++) {
    const frame = sampleJourney(stopProgress(i) * JOURNEY.totalH);
    expect(frame.phase.kind).toBe("visit");
    expect(frame.t).toBeCloseTo(0, 10);
  }
});
