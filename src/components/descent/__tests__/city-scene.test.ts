import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { createStLouis } from "../cities/create-st-louis";
import { ARCH, archCentre, archSide, FLAG, sampleArch, sampleFlag, stLouisCamera, stLouisView } from "../cities/st-louis-art";
import { pixelPassage } from "../transitions/pixel-passage";
import { createTransition } from "../transitions/create-transition";
import { JOURNEY, sampleJourney, stopProgress } from "../journey-timeline";
import { createFlight, flightPosition } from "../scroll-journey";

const resting = { arrivalT: 1, visitT: 0, departureT: 0, ambientSeconds: 0, reduced: false };

type ImageRequest = { url: string; texture: THREE.Texture; load: () => void; fail: () => void };
let requests: ImageRequest[] = [];
beforeEach(() => {
  requests = [];
  vi.stubGlobal("fetch", vi.fn());
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

  it("builds the riverfront from points, ready at once without downloading anything", () => {
    const city = createStLouis("mobile");
    expect(city.status).toBe("ready");
    for (const name of ["Gateway_Arch", "Arch_Reflection", "US_Flag", "Flag_Pole", "Old_Courthouse", "Downtown", "Busch_Stadium", "Mississippi", "Riverfront", "Levee_Traffic"]) {
      expect(city.scene.getObjectByName(name), name).toBeDefined();
    }
    expect(requests).toHaveLength(0);
    expect(fetch).not.toHaveBeenCalled();
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

  it("releases every geometry, material and listener exactly once", () => {
    const city = createStLouis(), resources = new Set<{ dispose: () => void }>();
    city.scene.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
        resources.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) resources.add(material);
      }
    });
    const removed = vi.spyOn(window, "removeEventListener");
    const spies = [...resources].map(resource => vi.spyOn(resource, "dispose"));
    city.dispose(); city.dispose();
    spies.forEach(spy => expect(spy).toHaveBeenCalledOnce());
    expect(removed).toHaveBeenCalledWith("pointerdown", expect.any(Function));
    expect(city.scene.children).toHaveLength(0);
  });
});

describe("Pixel mosaic compositor", () => {
  const mockRenderer = (floatingPoint = true) => ({
    render: vi.fn(), setRenderTarget: vi.fn(), getRenderTarget: () => null, compile: vi.fn(), initTexture: vi.fn(),
    extensions: { has: () => floatingPoint },
  });
  const composite = (renderer: ReturnType<typeof mockRenderer>) => {
    const last = renderer.render.mock.calls.at(-1)![0] as THREE.Mesh;
    return (last.material as THREE.ShaderMaterial).uniforms;
  };

  it.each([true, false])("renders resting scenes straight to the screen (floating point targets: %s)", floatingPoint => {
    const renderer = mockRenderer(floatingPoint), transition = createTransition(renderer as unknown as THREE.WebGLRenderer);
    const earth = new THREE.Scene(), city = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
    transition.resize(390, 844, 1, 22);
    transition.render(earth, camera, city, camera, pixelPassage(0));
    expect(renderer.render.mock.calls).toEqual([[earth, camera]]);
    expect(renderer.setRenderTarget.mock.calls).toEqual([[null]]);
    renderer.render.mockClear(); renderer.setRenderTarget.mockClear();
    transition.render(earth, camera, city, camera, pixelPassage(1));
    expect(renderer.render.mock.calls).toEqual([[city, camera]]);
    renderer.render.mockClear();
    transition.render(earth, camera, null, null, null);
    expect(renderer.render.mock.calls).toEqual([[earth, camera]]);
    transition.dispose();
  });

  it("renders only the scenes some tile shows into linear targets, then composites the mosaic", () => {
    const renderer = mockRenderer(), transition = createTransition(renderer as unknown as THREE.WebGLRenderer);
    const earth = new THREE.Scene(), city = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
    transition.resize(1440, 900, 1.5, 34);
    const rendered = (depth: number, pattern = 0) => {
      renderer.render.mockClear(); renderer.setRenderTarget.mockClear();
      transition.render(earth, camera, city, camera, pixelPassage(depth), pattern);
      return renderer.render.mock.calls.slice(0, -1).map(call => call[0]);
    };
    expect(rendered(0.15)).toEqual([earth]);
    expect(rendered(0.48)).toEqual([earth, city]);
    expect(composite(renderer).flip.value).toBeGreaterThan(0.3);
    expect(composite(renderer).tile.value).toBeCloseTo(34 * 1.5, 0);
    expect(composite(renderer).gap.value).toBeGreaterThan(0.1);
    expect(rendered(0.9, 3)).toEqual([city]);
    expect(composite(renderer).pattern.value).toBe(3);
    expect(composite(renderer).tile.value).toBeLessThan(34 * 1.5 * 0.5);
    const targets = renderer.setRenderTarget.mock.calls.map(call => call[0]).filter(Boolean) as THREE.WebGLRenderTarget[];
    targets.forEach(target => {
      expect(target.texture.colorSpace).toBe(THREE.LinearSRGBColorSpace);
      expect(target.texture.type).toBe(THREE.HalfFloatType);
      expect([target.width, target.height]).toEqual([2160, 1350]);
    });
    expect(renderer.setRenderTarget.mock.calls.at(-1)).toEqual([null]);
    // Without a city the tiles still play over the Earth, so leaving never shows an empty frame.
    expect(rendered(0.5)).toEqual([earth, city]);
    renderer.render.mockClear();
    transition.render(earth, camera, null, null, pixelPassage(0.5));
    expect(renderer.render.mock.calls.slice(0, -1).map(call => call[0])).toEqual([earth]);
    expect(composite(renderer).flip.value).toBe(0);
    const disposals = targets.slice(0, 2).map(target => vi.spyOn(target, "dispose"));
    transition.dispose();
    disposals.forEach(dispose => expect(dispose).toHaveBeenCalled());
  });

  it("warms a city's shaders before the passage reaches it", () => {
    const renderer = mockRenderer(), transition = createTransition(renderer as unknown as THREE.WebGLRenderer);
    const city = createStLouis();
    city.update(resting);
    transition.prepare(city.scene, city.camera);
    expect(renderer.compile).toHaveBeenCalledTimes(2);
    expect(renderer.setRenderTarget.mock.calls.at(-1)).toEqual([null]);
    transition.dispose(); city.dispose();
  });
});
