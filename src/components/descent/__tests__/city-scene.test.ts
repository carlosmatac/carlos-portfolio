import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { gzipSync } from "node:zlib";
import { createStLouis } from "../cities/create-st-louis";
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

describe("Blender artwork scene", () => {
  it("loads the approved arch and a genuinely volumetric cloud field, not the discarded city geometry", async () => {
    const city = createStLouis();
    expect(city.assetStage).toBe("render");
    expect(city.status).toBe("loading");
    expect(requests.map(r => r.url)).toEqual([
      "/images/cities/st-louis/arch-render.webp",
    ]);
    expect(city.scene.getObjectByName("Landmark_Arch")).toBeDefined();
    expect(city.scene.getObjectByName("Clouds_Foreground")).toBeDefined();
    expect(city.scene.getObjectByName("Landmark_Stadium")).toBeUndefined();
    expect(city.scene.getObjectByName("Water_River")).toBeUndefined();
    requests[0].load(); expect(city.status).toBe("loading");
    await city.atmosphere.ready; expect(city.status).toBe("ready");
    expect(city.atmosphere.texture).toBeInstanceOf(THREE.Data3DTexture);
    const bank = city.scene.getObjectByName("Clouds_Foreground") as THREE.Mesh;
    expect(bank.geometry).toBeInstanceOf(THREE.BoxGeometry);
    expect(bank.scale.z).toBeGreaterThan(1);
    requests.forEach(r => expect(r.texture.colorSpace).toBe(THREE.SRGBColorSpace));
    city.dispose();
  });

  it("uses smaller mobile assets and a portrait composition rather than cropping the desktop view", () => {
    const city = createStLouis("mobile");
    expect(requests.every(r => r.url.endsWith("-mobile.webp"))).toBe(true);
    const arch = city.scene.getObjectByName("Landmark_Arch")!;
    city.resize(1440, 900, "desktop"); city.update(resting);
    const desktop = arch.scale.clone();
    city.resize(390, 844, "mobile");
    expect(arch.scale.y).toBeLessThan(desktop.y);
    expect(arch.position.x).toBe(0);
    expect(arch.position.y).toBeGreaterThan(0);
    expect(city.camera.aspect).toBeCloseTo(390 / 844);
    expect(requests).toHaveLength(1);
    city.dispose();
  });

  it("is reversible and keeps a front-facing image without artificial camera orbit", () => {
    const city = createStLouis();
    city.resize(1440, 900, "desktop"); city.update(resting);
    const rest = city.camera.position.clone();
    city.update({ ...resting, arrivalT: 0.5 });
    const mid = city.camera.matrixWorld.clone();
    city.update({ ...resting, departureT: 0.9 });
    city.update({ ...resting, arrivalT: 0.5 });
    expect(city.camera.matrixWorld.equals(mid)).toBe(true);
    expect(city.camera.position.x).toBe(0);
    expect(city.camera.position.y).toBeGreaterThan(0);
    expect(city.camera.getWorldDirection(new THREE.Vector3()).toArray()).toEqual([-0, -0, -1]);
    city.update({ ...resting, arrivalT: 0, departureT: 1, reduced: true });
    expect(city.camera.position.equals(rest)).toBe(true);
    const cloud = city.scene.getObjectByName("Clouds_Foreground")!;
    const cloudPosition = cloud.position.clone();
    city.update({ ...resting, ambientSeconds: 100, reduced: true });
    expect(cloud.position.equals(cloudPosition)).toBe(true);
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

  it("releases all shared resources and ignores image completions after disposal", async () => {
    const city = createStLouis(), resources = new Set<THREE.BufferGeometry | THREE.Material>();
    city.scene.traverse(object => {
      if (object instanceof THREE.Mesh) {
        resources.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) resources.add(material);
      }
    });
    await city.atmosphere.ready;
    const volumeDispose = vi.spyOn(city.atmosphere.texture!, "dispose");
    const detailDispose = vi.spyOn(city.atmosphere.detail!, "dispose");
    const spies = [...resources].map(resource => vi.spyOn(resource, "dispose"));
    const textures = requests.map(r => vi.spyOn(r.texture, "dispose"));
    city.dispose();
    spies.forEach(spy => expect(spy).toHaveBeenCalledOnce());
    textures.forEach(spy => expect(spy).toHaveBeenCalledOnce());
    expect(volumeDispose).toHaveBeenCalledOnce();
    expect(detailDispose).toHaveBeenCalledOnce();
    requests.forEach(r => r.load());
    expect(city.status).toBe("disposed");
    expect(city.scene.children).toHaveLength(0);
  });

  it("reports an asset error instead of displaying a partially loaded scene", () => {
    const city = createStLouis();
    requests[0].fail();
    expect(city.status).toBe("error");
    city.dispose();
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


it("warms city textures and shaders before descent, and composites above the unchanged Earth output", async () => {
  const renderer = { render: vi.fn(), setRenderTarget: vi.fn(), getRenderTarget: () => null,
    compile: vi.fn(), initTexture: vi.fn(), autoClear: true, extensions: { has: () => true } };
  const transition = createTransition(renderer as unknown as THREE.WebGLRenderer);
  const city = createStLouis(); requests[0].load(); await city.atmosphere.ready;
  city.update(resting);
  transition.prepare(city.scene, city.camera);
  expect(renderer.initTexture).toHaveBeenCalledTimes(3);
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
