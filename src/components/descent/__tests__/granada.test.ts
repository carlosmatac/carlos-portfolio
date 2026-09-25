import { afterEach, beforeEach, expect, it, vi } from "vitest";
import * as THREE from "three";
import { gzipSync } from "node:zlib";
import { createGranada } from "../cities/create-granada";
import { ALHAMBRA, granadaCamera, granadaView, marchTerrain, ridgeZ, terrainHeight } from "../cities/granada-art";
import { JOURNEY, sampleJourney, stopProgress } from "../journey-timeline";

const rest = { arrivalT: 1, visitT: 0, departureT: 0, ambientSeconds: 0, reduced: false };
let volume: (response: Response) => Promise<Response>;
beforeEach(() => {
  volume = response => Promise.resolve(response);
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() => volume(new Response(new Uint8Array(gzipSync(new Uint8Array(128 * 64 * 64 * 2)))))));
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
const lanternOf = (city: ReturnType<typeof createGranada>) =>
  ((city.scene.getObjectByName("Ground") as THREE.Mesh).material as THREE.ShaderMaterial).uniforms;

it("enables Granada without enabling the remaining Earth-only cities", () => {
  expect(sampleJourney(JOURNEY.anchors.granada).city?.sceneId).toBe("granada-sky");
  expect(sampleJourney(JOURNEY.anchors.madrid).city).toBeNull();
});

it("models the Alhambra on the Sabika above the Darro, with Sierra Nevada rising behind", () => {
  const crest = terrainHeight(0, ridgeZ(0)), darro = terrainHeight(0, 16), albaicin = terrainHeight(-20, 55);
  expect(crest).toBeGreaterThan(darro + 5);
  expect(albaicin).toBeGreaterThan(darro);
  expect(Math.max(...[-60, 0, 40, 90].map(x => terrainHeight(x, -330)))).toBeGreaterThan(crest + 40);
  expect(terrainHeight(12.3, -7.1)).toBe(terrainHeight(12.3, -7.1));
  const tallest = ALHAMBRA.reduce((a, b) => (b.h > a.h ? b : a));
  expect(tallest.name).toBe("Torre_de_Comares");
  expect(ALHAMBRA.reduce((a, b) => (b.x < a.x ? b : a)).name).toBe("Torre_de_la_Vela");
});

it("frames the Alhambra right of the desktop story and above the mobile story", () => {
  for (const [width, height] of [[1440, 900], [1920, 1080], [1280, 720]]) {
    const vela = project(block("Torre_de_la_Vela"), width, height), comares = project(block("Torre_de_Comares"), width, height);
    expect(vela.x).toBeGreaterThan(0.33);
    expect(comares.x).toBeGreaterThan(0.5); expect(comares.x).toBeLessThan(0.8);
    expect(comares.y).toBeGreaterThan(0.3); expect(comares.y).toBeLessThan(0.7);
  }
  for (const [width, height] of [[390, 844], [320, 568], [430, 932]]) {
    const vela = project(block("Torre_de_la_Vela"), width, height), comares = project(block("Torre_de_Comares"), width, height);
    for (const p of [vela, comares]) { expect(p.x).toBeGreaterThan(0.02); expect(p.x).toBeLessThan(0.98); }
    expect(comares.y).toBeGreaterThan(0.18); expect(comares.y).toBeLessThan(0.42);
  }
});

it("builds real geometry without loading any image and waits only for the shared cloud volume", async () => {
  const images = vi.spyOn(THREE.TextureLoader.prototype, "load");
  const city = createGranada("mobile");
  expect(city.status).toBe("loading");
  for (const name of ["Landmark_Alhambra", "Ground", "Sierra", "Cypress", "Trees", "Albaicin_Houses", "Night_Lights", "Stars"]) {
    expect(city.scene.getObjectByName(name), name).toBeDefined();
  }
  expect((city.scene.getObjectByName("Cypress") as THREE.InstancedMesh).count).toBeGreaterThan(100);
  await city.atmosphere.ready;
  expect(city.status).toBe("ready");
  expect(images).not.toHaveBeenCalled();
  city.dispose(); expect(city.status).toBe("disposed");
});

it("reports a missing cloud volume so the HTML fallback remains available", async () => {
  volume = () => Promise.resolve(new Response(null, { status: 404 }));
  const city = createGranada("mobile");
  await city.atmosphere.ready;
  expect(city.status).toBe("error"); city.dispose();
});

it("samples the same camera on reverse travel and holds still with reduced motion", () => {
  const city = createGranada("mobile"); city.resize(390, 844, "mobile");
  city.update({ ...rest, arrivalT: 0.6, ambientSeconds: 3 });
  const camera = city.camera.matrixWorld.clone();
  city.update({ ...rest, departureT: 0.5, ambientSeconds: 10 });
  city.update({ ...rest, arrivalT: 0.6, ambientSeconds: 3 });
  expect(city.camera.matrixWorld.equals(camera)).toBe(true);
  city.update({ ...rest, arrivalT: 0.2, ambientSeconds: 3 });
  expect(city.camera.position.y).toBeGreaterThan(camera.elements[13]);
  city.update({ ...rest, reduced: true, ambientSeconds: 5 });
  const still = city.camera.matrixWorld.clone(), uniforms = lanternOf(city);
  city.update({ ...rest, reduced: true, ambientSeconds: 50 });
  expect(city.camera.matrixWorld.equals(still)).toBe(true);
  expect(uniforms.time.value).toBe(0);
  city.dispose();
});

it("picks the terrain surface under a ray and ignores rays into the sky", () => {
  const view = granadaView(1440, 900);
  const origin = view.position, to = new THREE.Vector3(...view.target).sub(new THREE.Vector3(...origin)).normalize();
  const hit = marchTerrain(origin, to.toArray() as [number, number, number])!;
  expect(Math.abs(hit[1] - terrainHeight(hit[0], hit[2]))).toBeLessThan(0.05);
  expect(marchTerrain(origin, [0, 1, 0])).toBeNull();
});

it("lets a mouse carry the lantern onto the Alhambra, ignores touch, and patrols otherwise", () => {
  const width = window.innerWidth, height = window.innerHeight;
  const city = createGranada("desktop"); city.resize(width, height, "desktop");
  const uniforms = lanternOf(city), now = () => performance.now() / 1000;
  city.update({ ...rest, ambientSeconds: now() });
  const patrol = uniforms.lantern.value.clone();
  expect(patrol.distanceTo(new THREE.Vector3(patrol.x, terrainHeight(patrol.x, patrol.z), patrol.z))).toBeLessThan(4);
  const target = project(block("Torre_de_Comares"), width, height);
  window.dispatchEvent(new PointerEvent("pointermove", { clientX: target.x * width, clientY: target.y * height, pointerType: "touch" }));
  city.update({ ...rest, ambientSeconds: now() + 0.05 });
  expect(uniforms.lantern.value.distanceTo(block("Torre_de_Comares"))).toBeGreaterThan(8);
  window.dispatchEvent(new PointerEvent("pointermove", { clientX: target.x * width, clientY: target.y * height, pointerType: "mouse" }));
  for (let i = 1; i <= 30; i++) city.update({ ...rest, ambientSeconds: now() + 0.1 + i * 0.05 });
  expect(uniforms.lantern.value.distanceTo(block("Torre_de_Comares"))).toBeLessThan(6);
  expect(uniforms.lanternPower.value).toBeGreaterThan(0.9);
  city.dispose();
});

it("releases every owned GPU resource and its window listeners exactly once", async () => {
  const city = createGranada("mobile"), resources = new Set<THREE.Material | THREE.BufferGeometry>();
  city.scene.traverse(object => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
      resources.add(object.geometry);
      (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => resources.add(m));
    }
  });
  await city.atmosphere.ready;
  const removed = vi.spyOn(window, "removeEventListener");
  const dispose = [...resources, city.atmosphere.texture!, city.atmosphere.detail!].map(r => vi.spyOn(r, "dispose"));
  city.dispose(); city.dispose();
  dispose.forEach(spy => expect(spy).toHaveBeenCalledOnce());
  expect(removed).toHaveBeenCalledWith("pointermove", expect.any(Function));
  expect(city.status).toBe("disposed"); expect(city.scene.children).toHaveLength(0);
});

it("resolves normalized city anchors to stable visits despite floating-point round trips", () => {
  for (let i = 0; i < 5; i++) {
    const frame = sampleJourney(stopProgress(i) * JOURNEY.totalH);
    expect(frame.phase.kind).toBe(i < 4 ? "visit" : "earth-visit");
    expect(frame.t).toBeCloseTo(0, 10);
  }
});
