import { afterEach, beforeEach, expect, it, vi } from "vitest";
import * as THREE from "three";
import { gzipSync } from "node:zlib";
import { createMadrid } from "../cities/create-madrid";
import {
  assembly, CLUSTERS, madridCamera, madridView, nearest, pipelines, sampleEmbeddings, sampleTowers, TOWERS,
} from "../cities/madrid-art";
import { JOURNEY, sampleJourney } from "../journey-timeline";

const rest = { arrivalT: 1, visitT: 0, departureT: 0, ambientSeconds: 0, reduced: false };
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response(new Uint8Array(gzipSync(new Uint8Array(128 * 64 * 64 * 2)))))));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const uniformsOf = (city: ReturnType<typeof createMadrid>) =>
  ((city.scene.getObjectByName("Cuatro_Torres") as THREE.Points).material as THREE.ShaderMaterial).uniforms;
function project(point: THREE.Vector3, width: number, height: number) {
  const view = madridView(width, height), pose = madridCamera(view, 0, [0, 0]);
  const camera = new THREE.PerspectiveCamera(view.fov, width / height, 0.5, 3000);
  camera.position.set(...pose.position); camera.lookAt(...pose.target); camera.updateMatrixWorld();
  const p = point.clone().project(camera);
  return { x: (p.x + 1) / 2, y: (1 - p.y) / 2 };
}

it("gives Madrid its own data scene, so every stop now lands in a city", () => {
  expect(sampleJourney(JOURNEY.anchors.madrid).city?.sceneId).toBe("madrid-latent");
  expect(JOURNEY.phases.some(p => p.kind === "earth-visit")).toBe(false);
});

it("samples four distinct tower silhouettes floor by floor", () => {
  const samples = sampleTowers();
  expect(new Set(samples.map(s => s.tower)).size).toBe(4);
  const local = (index: number) => samples.filter(s => s.tower === index).map(s => ({ x: s.position[0] - TOWERS[index].x, y: s.position[1] / TOWERS[index].height }));
  const cepsa = local(0);
  expect(cepsa.some(p => p.y > 0.8 && p.y < 0.93 && Math.abs(p.x) < 3)).toBe(false);
  expect(cepsa.some(p => p.y > 0.96 && Math.abs(p.x) < 3)).toBe(true);
  const cristal = local(2), top = (side: number) => Math.max(...cristal.filter(p => Math.sign(p.x) === side && Math.abs(p.x) > 3).map(p => p.y));
  expect(top(1)).toBeGreaterThan(top(-1));
  const pwc = local(1), density = (lo: number, hi: number) => pwc.filter(p => p.y >= lo && p.y < hi).length;
  expect(density(0.94, 1.01)).toBeLessThan(density(0.5, 0.57) * 0.8);
  samples.forEach(s => expect(Math.hypot(...s.normal)).toBeCloseTo(1));
  expect(samples.length).toBeGreaterThan(8000); expect(samples.length).toBeLessThan(30000);
});

it("clusters embeddings around their centres and feeds them through pipelines", () => {
  const embeddings = sampleEmbeddings(700);
  const close = embeddings.filter(e => Math.hypot(...e.position.map((c, i) => c - CLUSTERS[e.cluster].centre[i])) < CLUSTERS[e.cluster].spread * 3);
  expect(close.length / embeddings.length).toBeGreaterThan(0.7);
  const curves = pipelines();
  expect(curves.some(c => c[0][1] === 0 && TOWERS.some(t => t.x === c[3][0]))).toBe(true);
  expect(curves.filter(c => CLUSTERS.some(k => k.centre === c[3]))).toHaveLength(3);
});

it("finds the k nearest projected points within a radius, spaced apart when asked", () => {
  const points = new Float32Array([0, 0, 3, 0, 4, 0, 10, 0, 50, 0, 1, 1]);
  expect(nearest(points, [0, 0], 3, 20).map(n => n.index)).toEqual([0, 5, 1]);
  expect(nearest(points, [0, 0], 10, 20).map(n => n.index)).toEqual([0, 5, 1, 2, 3]);
  expect(nearest(points, [0, 0], 10, 20, 2.5).map(n => n.index)).toEqual([0, 1, 3]);
  expect(nearest(points, [100, 100], 3, 20)).toEqual([]);
});

it("assembles the skyline while landing and holds it with reduced motion", () => {
  expect(assembly(0, 0, false)).toBe(0);
  expect(assembly(1, 0, false)).toBe(1);
  expect(assembly(1, 0.5, false)).toBe(0.5);
  expect(assembly(0.1, 0.9, true)).toBe(1);
});

it("frames the four crowns right of the desktop story and above the mobile story", () => {
  for (const [w, h] of [[1440, 900], [1920, 1080], [1280, 720]]) {
    for (const t of TOWERS) {
      const crown = project(new THREE.Vector3(t.x, t.height, t.z), w, h), base = project(new THREE.Vector3(t.x, 8, t.z), w, h);
      expect(crown.x).toBeGreaterThan(0.34); expect(crown.x).toBeLessThan(0.95);
      expect(crown.y).toBeGreaterThan(0.2); expect(base.y).toBeLessThan(1);
    }
  }
  for (const [w, h] of [[390, 844], [430, 932]]) {
    for (const t of TOWERS) {
      const crown = project(new THREE.Vector3(t.x, t.height, t.z), w, h);
      expect(crown.x).toBeGreaterThan(0.05); expect(crown.x).toBeLessThan(0.95); expect(crown.y).toBeLessThan(0.45);
    }
  }
});

it("builds the data skyline without images and waits only for the shared cloud volume", async () => {
  const images = vi.spyOn(THREE.TextureLoader.prototype, "load");
  const city = createMadrid("mobile");
  expect(city.status).toBe("loading");
  for (const name of ["Cuatro_Torres", "Data_Lake", "Fog", "Embeddings", "Pipelines", "Pipeline_Guides", "Neighbour_Links", "Beacons"]) {
    expect(city.scene.getObjectByName(name), name).toBeDefined();
  }
  await city.atmosphere.ready;
  expect(city.status).toBe("ready");
  expect(images).not.toHaveBeenCalled();
  city.dispose(); expect(city.status).toBe("disposed");
});

it("turns the cursor into a vector query: nearest embeddings light up and link, touch falls back to an automatic query", () => {
  const width = window.innerWidth, height = window.innerHeight;
  const city = createMadrid("desktop"), u = uniformsOf(city);
  city.resize(width, height, "desktop");
  const now = () => performance.now() / 1000;
  const highlight = ((city.scene.getObjectByName("Embeddings") as THREE.Points).geometry.attributes.aHighlight as THREE.BufferAttribute);
  window.dispatchEvent(new PointerEvent("pointermove", { clientX: 10, clientY: 10, pointerType: "touch" }));
  city.update({ ...rest, ambientSeconds: now() });
  expect(u.pointer.value).toBe(0);
  const target = project(new THREE.Vector3(...CLUSTERS[1].centre), width, height);
  window.dispatchEvent(new PointerEvent("pointermove", { clientX: target.x * width, clientY: target.y * height, pointerType: "mouse" }));
  for (let i = 1; i <= 10; i++) city.update({ ...rest, ambientSeconds: now() + i * 0.05 });
  expect(city.neighbours.length).toBeGreaterThan(3);
  expect(city.neighbours.length).toBeLessThanOrEqual(12);
  city.neighbours.forEach(n => expect(highlight.getX(n.index)).toBeGreaterThan(0));
  expect((city.scene.getObjectByName("Neighbour_Links") as THREE.LineSegments).geometry.drawRange.count).toBeGreaterThan(0);
  expect(u.pointer.value).toBeGreaterThan(0.5);
  window.dispatchEvent(new PointerEvent("pointerdown", { clientX: width / 2, clientY: height / 2, pointerType: "mouse" }));
  expect(u.ripple.value.z).toBe(0);
  city.update({ ...rest, ambientSeconds: now() + 0.6 });
  expect(u.ripple.value.z).toBeGreaterThan(0);
  city.dispose();
});

it("samples the same camera on reverse travel, assembles while landing and freezes with reduced motion", () => {
  const city = createMadrid("desktop"), u = uniformsOf(city);
  city.update({ ...rest, arrivalT: 0.6, ambientSeconds: 3 });
  const pose = city.camera.matrixWorld.clone();
  expect(u.assemble.value).toBeCloseTo(0.6);
  city.update({ ...rest, departureT: 0.4, ambientSeconds: 9 });
  city.update({ ...rest, arrivalT: 0.6, ambientSeconds: 3 });
  expect(city.camera.matrixWorld.equals(pose)).toBe(true);
  city.update({ ...rest, arrivalT: 0.2, reduced: true, ambientSeconds: 30 });
  expect(u.assemble.value).toBe(1); expect(u.time.value).toBe(0);
  city.dispose();
});

it("releases every geometry, material and listener exactly once", async () => {
  const city = createMadrid("mobile");
  await city.atmosphere.ready;
  const resources = new Set<{ dispose: () => void }>();
  city.scene.traverse(object => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments) {
      resources.add(object.geometry);
      (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => resources.add(m));
    }
  });
  const removed = vi.spyOn(window, "removeEventListener");
  const spies = [...resources].map(r => vi.spyOn(r, "dispose"));
  city.dispose(); city.dispose();
  spies.forEach(spy => expect(spy).toHaveBeenCalledOnce());
  expect(removed).toHaveBeenCalledWith("pointermove", expect.any(Function));
  expect(removed).toHaveBeenCalledWith("pointerdown", expect.any(Function));
  expect(city.scene.children).toHaveLength(0);
});
