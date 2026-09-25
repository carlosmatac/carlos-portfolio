import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { gzipSync } from "node:zlib";
import { createStLouis } from "../cities/create-st-louis";
import { ARCH, archCentre, archSide, FLAG, sampleArch, sampleFlag, stLouisCamera, stLouisView } from "../cities/st-louis-art";
import { createCloudVolume, CLOUD_ASSETS } from "../clouds/cloud-volume";
import { cloudPassage, cloudPassageEye } from "../transitions/cloud-passage";
import { createTransition } from "../transitions/create-transition";
import { JOURNEY, sampleJourney, stopProgress } from "../journey-timeline";
import { createFlight, flightPosition } from "../scroll-journey";

const resting = { arrivalT: 1, visitT: 0, departureT: 0, ambientSeconds: 0, reduced: false };

type ImageRequest = { url: string; texture: THREE.Texture; load: () => void; fail: () => void };
let requests: ImageRequest[] = [];
beforeEach(() => {
  requests = [];
  vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
    const size = url.includes("mobile") ? CLOUD_ASSETS.mobile.size : CLOUD_ASSETS.desktop.size;
    return Promise.resolve(new Response(new Uint8Array(gzipSync(new Uint8Array(size[0] * size[1] * size[2] * 2)))));
  }));
  vi.spyOn(THREE.TextureLoader.prototype, "load").mockImplementation((url, onLoad, _progress, onError) => {
    const texture = new THREE.Texture<HTMLImageElement>();
    requests.push({ url, texture, load: () => onLoad?.(texture), fail: () => onError?.(new Error("missing artwork")) });
    return texture;
  });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Point-cloud St. Louis", () => {
  const project = (point: THREE.Vector3, width: number, height: number) => {
    const view = stLouisView(width, height), pose = stLouisCamera(view, 0, [0, 0]);
    const camera = new THREE.PerspectiveCamera(view.fov, width / height, 0.5, 3000);
    camera.position.set(...pose.position); camera.lookAt(...pose.target); camera.updateMatrixWorld();
    const p = point.clone().project(camera);
    return { x: (p.x + 1) / 2, y: (1 - p.y) / 2 };
  };

  it("samples a catenary arch with a tapering triangular section, as tall as it is wide", () => {
    expect(archCentre(-1)).toEqual([-ARCH.span / 2, 0]);
    expect(archCentre(1)[1]).toBeCloseTo(0, 6);
    expect(archCentre(0)).toEqual([0, ARCH.height]);
    expect(archSide(0)).toBeCloseTo(5.5); expect(archSide(1)).toBeCloseTo(1.7);
    const points = sampleArch();
    expect(points.length).toBeGreaterThan(5000); expect(points.length).toBeLessThan(20000);
    const base = points.filter(p => p.height < 0.05), crown = points.filter(p => p.height > 0.98);
    expect(Math.max(...base.map(p => Math.abs(p.position[2])))).toBeGreaterThan(Math.max(...crown.map(p => Math.abs(p.position[2]))) * 2);
    points.forEach(p => expect(Math.hypot(...p.normal)).toBeCloseTo(1));
  });

  it("lays out the Stars and Stripes: thirteen stripes, red at top and bottom, fifty stars in a blue canton", () => {
    const flag = sampleFlag(), stars = flag.filter(p => p.part === "star");
    expect(stars).toHaveLength(50);
    const at = (u: number, v: number) => flag.reduce((best, p) => Math.hypot(p.position[0] - FLAG.x - u, p.position[1] - FLAG.y - v) < Math.hypot(best.position[0] - FLAG.x - u, best.position[1] - FLAG.y - v) ? p : best);
    expect(at(FLAG.length * 0.8, FLAG.height - 0.1).part).toBe("red");
    expect(at(FLAG.length * 0.8, 0.1).part).toBe("red");
    expect(at(FLAG.length * 0.8, FLAG.height * (1 - 1.5 / 13)).part).toBe("white");
    expect(at(FLAG.length * 0.1, FLAG.height * 0.95).part).toBe("blue");
    stars.forEach(s => { expect(s.position[0] - FLAG.x).toBeLessThan(FLAG.length * 0.4); expect(s.position[1] - FLAG.y).toBeGreaterThan(FLAG.height * 6 / 13); });
  });

  it("frames the arch right of the desktop story and above the mobile story", () => {
    for (const [w, h] of [[1440, 900], [1920, 1080], [1280, 720]]) {
      const crown = project(new THREE.Vector3(0, ARCH.height, 0), w, h), left = project(new THREE.Vector3(-ARCH.span / 2, 0, 0), w, h), right = project(new THREE.Vector3(ARCH.span / 2, 0, 0), w, h);
      expect(left.x).toBeGreaterThan(0.33); expect(right.x).toBeLessThan(0.95); expect(crown.y).toBeGreaterThan(0.12); expect(left.y).toBeLessThan(0.9);
    }
    for (const [w, h] of [[390, 844], [430, 932]]) {
      const crown = project(new THREE.Vector3(0, ARCH.height, 0), w, h), foot = project(new THREE.Vector3(ARCH.span / 2, 0, 0), w, h);
      expect(crown.y).toBeGreaterThan(0.05); expect(foot.y).toBeLessThan(0.52); expect(foot.x).toBeLessThan(1);
    }
  });

  it("builds the riverfront from points without loading any image", async () => {
    const city = createStLouis("mobile");
    expect(city.status).toBe("loading");
    for (const name of ["Gateway_Arch", "Arch_Reflection", "US_Flag", "Flag_Pole", "Old_Courthouse", "Downtown", "Busch_Stadium", "Mississippi", "Riverfront", "Levee_Traffic"]) {
      expect(city.scene.getObjectByName(name), name).toBeDefined();
    }
    await city.atmosphere.ready;
    expect(city.status).toBe("ready");
    expect(requests).toHaveLength(0);
    city.dispose(); expect(city.status).toBe("disposed");
  });

  it("parts points around the cursor, catches more wind in the flag and ripples on click", () => {
    const width = window.innerWidth, height = window.innerHeight;
    const city = createStLouis("desktop");
    city.resize(width, height, "desktop");
    const uniforms = ((city.scene.getObjectByName("US_Flag") as THREE.Points).material as THREE.ShaderMaterial).uniforms, now = () => performance.now() / 1000;
    for (let i = 0; i < 10; i++) city.update({ ...resting, ambientSeconds: now() + i * 0.05 });
    const calm = uniforms.flag.value.w;
    const centre = new THREE.Vector3(FLAG.x + FLAG.length / 2, FLAG.y + FLAG.height / 2, FLAG.z).project(city.camera);
    window.dispatchEvent(new PointerEvent("pointermove", { clientX: (centre.x + 1) / 2 * width, clientY: (1 - centre.y) / 2 * height, pointerType: "mouse" }));
    for (let i = 0; i < 40; i++) city.update({ ...resting, ambientSeconds: now() + 1 + i * 0.05 });
    expect(uniforms.flag.value.w).toBeGreaterThan(calm + 0.8);
    expect(uniforms.pointer.value).toBeGreaterThan(0.9);
    window.dispatchEvent(new PointerEvent("pointerdown", { clientX: 10, clientY: 10, pointerType: "mouse" }));
    expect(uniforms.ripple.value.z).toBe(0);
    city.update({ ...resting, reduced: true, ambientSeconds: now() + 4 });
    expect(uniforms.time.value).toBe(0); expect(uniforms.assemble.value).toBe(1);
    city.dispose();
  });

  it("is reversible and assembles the skyline while landing", () => {
    const city = createStLouis(), uniforms = ((city.scene.getObjectByName("Gateway_Arch") as THREE.Points).material as THREE.ShaderMaterial).uniforms;
    city.resize(1440, 900, "desktop");
    city.update({ ...resting, arrivalT: 0.5 });
    const mid = city.camera.matrixWorld.clone();
    expect(uniforms.assemble.value).toBeCloseTo(0.5);
    city.update({ ...resting, departureT: 0.9 });
    city.update({ ...resting, arrivalT: 0.5 });
    expect(city.camera.matrixWorld.equals(mid)).toBe(true);
    city.update(resting);
    expect(city.camera.position.y).toBeLessThan(mid.elements[13]);
    city.dispose();
  });

  it("moves the urban camera within 100 ms both on departure and reverse arrival", () => {
    const city = createStLouis();
    city.resize(1440, 900, "desktop");
    for (const destination of [0, stopProgress(1)]) {
      city.update(resting);
      const start = city.camera.position.clone();
      const flight = createFlight(stopProgress(0), destination, 0);
      const frame = sampleJourney(flightPosition(flight, 100) * JOURNEY.totalH);
      expect(frame.city).not.toBeNull();
      city.update({ ...resting, ...frame.city! });
      expect(city.camera.position.distanceTo(start)).toBeGreaterThan(0.5);
    }
    city.dispose();
  });

  it("releases every geometry, material and listener exactly once", async () => {
    const city = createStLouis(), resources = new Set<{ dispose: () => void }>();
    city.scene.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
        resources.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) resources.add(material);
      }
    });
    await city.atmosphere.ready;
    const volumeDispose = vi.spyOn(city.atmosphere.texture!, "dispose");
    const removed = vi.spyOn(window, "removeEventListener");
    const spies = [...resources].map(resource => vi.spyOn(resource, "dispose"));
    city.dispose(); city.dispose();
    spies.forEach(spy => expect(spy).toHaveBeenCalledOnce());
    expect(volumeDispose).toHaveBeenCalledOnce();
    expect(removed).toHaveBeenCalledWith("pointerdown", expect.any(Function));
    expect(city.scene.children).toHaveLength(0);
  });
});

describe("Single-renderer transition", () => {
  it.each([true, false])("renders pure endpoints and releases targets with floating point support: %s", async floatingPoint => {
    const renderer = { render: vi.fn(), setRenderTarget: vi.fn(), extensions: { has: () => floatingPoint } };
    const transition = createTransition(renderer as unknown as THREE.WebGLRenderer);
    const earth = new THREE.Scene(), city = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
    const volume = createCloudVolume("desktop"); await volume.ready;
    transition.resize(390, 844, 1);
    transition.render(earth, camera, city, camera, cloudPassage(0), volume);
    expect(renderer.render.mock.calls).toEqual([[earth, camera]]);
    renderer.render.mockClear();
    transition.render(earth, camera, city, camera, cloudPassage(1), volume);
    expect(renderer.render).toHaveBeenCalledTimes(2);
    expect(renderer.render.mock.calls[0]).toEqual([city, camera]);
    renderer.render.mockClear(); renderer.setRenderTarget.mockClear();
    transition.render(earth, camera, city, camera, cloudPassage(0.5), volume);
    expect(renderer.render).toHaveBeenCalledTimes(2);
    expect(renderer.render.mock.calls[0]).toEqual([city, camera]);
    const targets = renderer.setRenderTarget.mock.calls.slice(0, 1).map(args => args[0] as THREE.WebGLRenderTarget);
    targets.forEach(target => {
      expect(target.texture.colorSpace).toBe(THREE.LinearSRGBColorSpace);
      expect(target.texture.type).toBe(floatingPoint ? THREE.HalfFloatType : THREE.UnsignedByteType);
      expect([target.width, target.height]).toEqual([390, 844]);
    });
    expect(renderer.setRenderTarget.mock.calls.at(-1)).toEqual([null]);
    transition.resize(1440, 900, 1.5);
    targets.forEach(target => expect([target.width, target.height]).toEqual([2160, 1350]));
    renderer.render.mockClear();
    transition.render(earth, camera, null, null, cloudPassage(0.7));
    expect(renderer.render.mock.calls).toEqual([[earth, camera]]);
    const disposals = targets.map(target => vi.spyOn(target, "dispose"));
    transition.dispose(); volume.dispose();
    disposals.forEach(dispose => expect(dispose).toHaveBeenCalledOnce());
  });
});


it("warms city shaders before descent, and composites above the unchanged Earth output", async () => {
  const renderer = { render: vi.fn(), setRenderTarget: vi.fn(), getRenderTarget: () => null,
    compile: vi.fn(), initTexture: vi.fn(), autoClear: true, extensions: { has: () => true } };
  const transition = createTransition(renderer as unknown as THREE.WebGLRenderer);
  const city = createStLouis(); await city.atmosphere.ready;
  city.update(resting);
  transition.prepare(city.scene, city.camera);
  expect(renderer.initTexture).not.toHaveBeenCalled();
  expect(renderer.compile).toHaveBeenCalledTimes(2);
  expect(renderer.setRenderTarget.mock.calls.at(-1)).toEqual([null]);
  renderer.setRenderTarget.mockClear(); renderer.render.mockClear();
  const earth = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  const clearing: boolean[] = [];
  renderer.render.mockImplementation(() => { clearing.push(renderer.autoClear); });
  transition.render(earth, camera, city.scene, city.camera, cloudPassage(0.2), city.atmosphere);
  expect(clearing).toEqual([true, false]);
  expect(renderer.autoClear).toBe(true);
  expect(renderer.setRenderTarget.mock.calls[0]).toEqual([null]);
  expect(renderer.render.mock.calls[0]).toEqual([earth, camera]);
  expect(renderer.render).toHaveBeenCalledTimes(2);
  const overlay = (renderer.render.mock.calls[1][0] as THREE.Mesh).material as THREE.ShaderMaterial;
  expect(overlay.uniforms.eye.value.toArray()).toEqual(cloudPassageEye(0.2));
  expect(overlay.fragmentShader).toContain("marchCloud(eye,");
  transition.render(earth, camera, null, null, null);
  expect(overlay.uniforms.cloudVolume.value).toBeNull();
  expect(overlay.uniforms.cloudDetail.value).toBeNull();
  transition.dispose(); city.dispose();
});
