import * as THREE from "three";
import type { JourneyFrame } from "./journey";
import { createEarth } from "./create-earth";
import { earthCameraDistance, earthFraming, smootherRange } from "./motion";
import { createBrno } from "./cities/create-brno";
import { createGranada } from "./cities/create-granada";
import { createMadrid } from "./cities/create-madrid";
import { createMunich } from "./cities/create-munich";
import { createStLouis } from "./cities/create-st-louis";
import type { CitySceneId } from "./journey-config";
import type { CityScene, CityQuality } from "./cities/types";
import { createTransition } from "./transitions/create-transition";
import { createIntroLogo } from "./intro-logo";
import { logoLayout } from "./intro-logo-art";
import { createIntroWorms } from "./intro-worms";
import { trackPointer } from "./cities/pointer";

const FOV = 42, EARTH_RADIUS = 3.3;
/** The Earth waits this far behind the logo, so the intro camera already frames it at the overview size. */
const EARTH_DEPTH = 6;
/** A mouse resting this long hands the logo over to the swell. */
const LOGO_IDLE_SECONDS = 2.5;

const cityFactories = { "st-louis-sky": createStLouis, "granada-sky": createGranada, "brno-pixel": createBrno, "munich-mission": createMunich, "madrid-latent": createMadrid } satisfies Record<CitySceneId, (quality: CityQuality) => CityScene>;

export interface DescentScene {
  render: (frame: JourneyFrame, seconds: number, reduced: boolean) => void;
  resize: () => void;
  dispose: () => void;
}

/**
 * The logo, the streamers and the Earth share one still camera: the entrance is a metamorphosis, not a flight.
 * Afterwards the camera moves around the Earth and the cities as before.
 */
export function createDescent(host: HTMLElement, onContextLost: () => void): DescentScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.5 : 2));
  renderer.setClearColor(0x030407, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.04, 650);
  let width = 1, height = 1, lastSeconds = 0, overviewDistance = earthCameraDistance(0.74);

  scene.add(new THREE.HemisphereLight(0xb2c0e4, 0x101119, 1.05));
  const logo = createIntroLogo(scene, window.innerWidth < 700);
  const cursor = trackPointer();
  const worms = createIntroWorms(host);

  const earth = createEarth(scene, renderer.capabilities.getMaxAnisotropy(), renderer.capabilities.maxTextureSize, texture => renderer.initTexture(texture));
  earth.root.position.set(0, 0, -EARTH_DEPTH);
  // Compile the planet's shaders now, while nothing moves, instead of on its first visible frame.
  earth.root.visible = true;
  renderer.compile(scene, camera);
  earth.root.visible = false;

  const transition = createTransition(renderer);
  let city: CityScene | null = null;
  let cityPrepared = false;
  function resizeCity() {
    city?.resize(width, height, width < 700 ? "mobile" : "desktop");
  }

  const projected = new THREE.Vector3();
  const api: DescentScene = {
    resize() {
      width = host.clientWidth; height = host.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      overviewDistance = earthCameraDistance(Math.min(0.74, 0.86 * width / height));
      logo.resize(width, height, camera, overviewDistance - EARTH_DEPTH);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 700 ? 1.5 : 2));
      renderer.setSize(width, height);
      transition.resize(width, height, Math.min(renderer.getPixelRatio(), 1.5));
      worms.resize(width, height);
      resizeCity();
    },
    render(frame, seconds, reduced) {
      const dt = Math.min(0.1, Math.max(0, seconds - lastSeconds));
      lastSeconds = seconds;
      camera.clearViewOffset();
      const framing = earthFraming(width, height);
      const phase = frame.timeline.phase;
      // During the entrance and the reveal the camera holds the overview; nothing travels, so nothing can jolt.
      const entering = frame.timeline.introT < 1 || phase.kind === "earth-reveal";
      let distance = overviewDistance;
      if (!entering) {
        const near = THREE.MathUtils.lerp(framing.visitDistance, overviewDistance, frame.earth.overview);
        const approach = THREE.MathUtils.lerp(overviewDistance, near, frame.earth.landing);
        const orbit = THREE.MathUtils.lerp(approach, framing.transitDistance, frame.earth.altitude);
        const dive = !reduced && frame.timeline.passage ? smootherRange(0, 0.4, frame.timeline.passage.depth) : 0;
        distance = THREE.MathUtils.lerp(orbit, 3.7, dive);
      }
      camera.position.copy(earth.root.position).add(projected.set(0, 0, distance));
      camera.up.set(0, 1, 0);
      camera.lookAt(earth.root.position);
      const placed = entering ? 0 : frame.earth.landing * (1 - frame.earth.overview);
      camera.setViewOffset(width, height, framing.offsetX * placed, framing.offsetY * placed + (width >= 700 ? height * 0.015 * frame.earth.overview : 0), width, height);
      camera.updateMatrixWorld();

      const hovering = cursor.hovering(seconds);
      // Touch screens never report a cursor, so the swell runs there all the time.
      const idle = !cursor.hovering(seconds, LOGO_IDLE_SECONDS);
      logo.update({ seconds, dt, burst: frame.burst, opacity: frame.logo, hovering, idle, pointer: cursor.state, reduced });
      earth.update(frame.earth, seconds, reduced);
      if (frame.worms > 0.002) {
        projected.copy(earth.root.position).project(camera);
        const angular = Math.asin(Math.min(1, EARTH_RADIUS / distance));
        const layout = logoLayout(width, height);
        worms.update({
          seconds, dt, opacity: frame.worms, gather: frame.gather, planet: frame.earth.visible,
          logo: { x: width / 2, y: layout.centreY, r: layout.size * 0.52, length: layout.size * 0.62 },
          globe: { x: (projected.x + 1) / 2 * width, y: (1 - projected.y) / 2 * height, r: Math.tan(angular) / Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * height / 2 },
        });
      } else worms.update({ seconds, dt, opacity: 0, gather: 1, planet: 1, logo: { x: 0, y: 0, r: 0, length: 0 }, globe: { x: 0, y: 0, r: 0 } });

      const cityFrame = frame.timeline.city;
      // Cities load once the visitor rests on the Earth, never during the entrance.
      const preload = phase.kind === "earth-observe" ? phase.sceneId
        : phase.kind === "transfer" ? frame.timeline.t < 0.3 ? phase.sceneId : frame.timeline.t > 0.7 ? phase.nextSceneId : null : null;
      const sceneId = cityFrame?.sceneId ?? preload;
      if (city && city.id !== sceneId) {
        city.dispose(); city = null; cityPrepared = false;
      }
      if (sceneId && !city) {
        city = cityFactories[sceneId](width < 700 ? "mobile" : "desktop");
        resizeCity();
      }
      city?.update({ ...(cityFrame ?? { arrivalT: 1, visitT: 0, departureT: 0 }), ambientSeconds: seconds, reduced });
      if (city?.status === "ready" && !cityPrepared) {
        transition.prepare(city.scene, city.camera);
        cityPrepared = true;
      }
      if (host.parentElement) host.parentElement.dataset.cityAsset = city?.status ?? "inactive";
      const ready = city?.status === "ready" ? city : null;
      transition.render(scene, camera, ready?.scene ?? null, ready?.camera ?? null,
        frame.timeline.passage, ready?.atmosphere ?? null, seconds, reduced);
    },
    dispose() {
      canvas.removeEventListener("webglcontextlost", contextLost);
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
          geometries.add(object.geometry);
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
        }
      });
      geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
      city?.dispose(); transition.dispose();
      earth.dispose(); cursor.dispose(); worms.dispose();
      renderer.dispose(); canvas.remove();
    },
  };
  function contextLost(event: Event) { event.preventDefault(); onContextLost(); }
  canvas.addEventListener("webglcontextlost", contextLost);
  api.resize();
  return api;
}
