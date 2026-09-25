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
import { trackPointer } from "./cities/pointer";

const BASE_FOV = 42, START_Z = 10;

const cityFactories = { "st-louis-sky": createStLouis, "granada-sky": createGranada, "brno-pixel": createBrno, "munich-mission": createMunich, "madrid-latent": createMadrid } satisfies Record<CitySceneId, (quality: CityQuality) => CityScene>;

export interface DescentScene {
  render: (frame: JourneyFrame, seconds: number, reduced: boolean) => void;
  resize: () => void;
  dispose: () => void;
}

/** The logo, the warp tunnel and the Earth occupy one continuous 3D space. */
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
  const camera = new THREE.PerspectiveCamera(BASE_FOV, 1, 0.04, 650);
  const cameraTarget = new THREE.Vector3(), up = new THREE.Vector3();
  let width = 1, height = 1, lastSeconds = 0;

  scene.add(new THREE.HemisphereLight(0xb2c0e4, 0x101119, 1.05));
  const logo = createIntroLogo(scene, window.innerWidth < 700);
  const cursor = trackPointer();

  // Deterministic stars along the fall with real perspective; their trails stretch with speed.
  const tunnel = new THREE.Group();
  scene.add(tunnel);
  const count = window.innerWidth < 700 ? 1600 : 3200;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const linePositions = new Float32Array(count * 6);
  const lineColors = new Float32Array(count * 6);
  const ends = new Float32Array(count * 2);
  let seed = 8128;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < count; i++) {
    const z = -2 - Math.pow(random(), 0.7) * 360;
    const angle = random() * Math.PI * 2;
    const radius = 1.6 + Math.pow(random(), 0.8) * 64;
    const x = Math.cos(angle) * radius;
    const y = z * 0.354 + Math.sin(angle) * radius;
    const intensity = 0.4 + random() * 0.6, hue = random();
    const tint = hue < 0.16 ? [0.75, 0.55, 1] : hue < 0.26 ? [1, 0.78, 0.5] : [0.78, 0.86, 1];
    const point = [x, y, z];
    const color = tint.map(c => c * intensity);
    positions.set(point, i * 3); colors.set(color, i * 3);
    linePositions.set(point, i * 6); linePositions.set(point, i * 6 + 3);
    lineColors.set(color, i * 6); lineColors.set(color.map(c => c * 0.05), i * 6 + 3);
    ends[i * 2 + 1] = 1;
  }
  const pointGeometry = new THREE.BufferGeometry();
  pointGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  pointGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const pointsMaterial = new THREE.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, opacity: 0, sizeAttenuation: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const stars = new THREE.Points(pointGeometry, pointsMaterial);
  tunnel.add(stars);
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
  lineGeometry.setAttribute("color", new THREE.BufferAttribute(lineColors, 3));
  lineGeometry.setAttribute("aEnd", new THREE.BufferAttribute(ends, 1));
  const trailUniforms = { uLength: { value: 0 }, uOpacity: { value: 0 } };
  const trailMaterial = new THREE.ShaderMaterial({
    uniforms: trailUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aEnd;attribute vec3 color;varying vec3 vColor;uniform float uLength;
      void main(){vColor=color;vec3 p=position;p.z-=aEnd*uLength;p.y-=aEnd*uLength*0.354;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
    fragmentShader: `varying vec3 vColor;uniform float uOpacity;void main(){gl_FragColor=vec4(vColor*1.7,uOpacity);}`,
  });
  const trails = new THREE.LineSegments(lineGeometry, trailMaterial);
  trails.frustumCulled = false;
  tunnel.add(trails);

  const earth = createEarth(scene, renderer.capabilities.getMaxAnisotropy(), renderer.capabilities.maxTextureSize);

  const transition = createTransition(renderer);
  let city: CityScene | null = null;
  let cityPrepared = false;
  function resizeCity() {
    city?.resize(width, height, width < 700 ? "mobile" : "desktop");
  }

  const api: DescentScene = {
    resize() {
      width = host.clientWidth; height = host.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.fov = BASE_FOV;
      camera.updateProjectionMatrix();
      logo.resize(width, height, camera, START_Z);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 700 ? 1.5 : 2));
      renderer.setSize(width, height);
      transition.resize(width, height, Math.min(renderer.getPixelRatio(), 1.5));
      resizeCity();
    },
    render(frame, seconds, reduced) {
      const dt = Math.min(0.1, Math.max(0, seconds - lastSeconds));
      lastSeconds = seconds;
      camera.clearViewOffset();
      // Push into the logo, then fall along the tunnel; the lens widens and rolls slightly at full warp.
      const warp = reduced ? 0 : frame.speed * frame.stars;
      camera.fov = BASE_FOV + 20 * warp;
      camera.updateProjectionMatrix();
      camera.position.set(0, THREE.MathUtils.lerp(0, 0.57, frame.zoom) - frame.distance * 85, THREE.MathUtils.lerp(START_Z, 0.9, frame.zoom) - frame.distance * 240);
      const pitch = Math.sin(frame.fall * Math.PI) * 0.24, roll = reduced ? 0 : Math.sin(frame.fall * Math.PI) * 0.16 * Math.sin(frame.fall * Math.PI * 1.5);
      cameraTarget.copy(camera.position).add(new THREE.Vector3(0, -pitch, -1));
      camera.up.copy(up.set(Math.sin(roll), Math.cos(roll), 0));
      camera.lookAt(cameraTarget);
      camera.updateMatrixWorld();
      const hovering = cursor.hovering(seconds);
      logo.update({ seconds, dt, burst: frame.burst, opacity: frame.logo, flash: frame.flash, warp, hovering, pointer: cursor.state, reduced }, camera);
      pointsMaterial.opacity = 0.14 * frame.identity * (1 - frame.stars) + frame.stars * (0.35 + frame.speed * 0.65);
      trailUniforms.uLength.value = frame.speed * 26;
      trailUniforms.uOpacity.value = frame.stars * frame.speed * 0.9;
      tunnel.visible = !reduced && (frame.stars > 0.001 || frame.identity > 0.001);
      earth.update(frame.earth, seconds, reduced);
      const framing = earthFraming(width, height);
      if (frame.timeline.introT >= 1) {
        const overviewDistance = earthCameraDistance(Math.min(0.74, 0.86 * width / height));
        const near = THREE.MathUtils.lerp(framing.visitDistance, overviewDistance, frame.earth.overview);
        const approach = THREE.MathUtils.lerp(18, near, frame.earth.landing);
        const orbit = THREE.MathUtils.lerp(approach, framing.transitDistance, frame.earth.altitude);
        const dive = !reduced && frame.timeline.passage ? smootherRange(0, 0.4, frame.timeline.passage.depth) : 0;
        const distance = THREE.MathUtils.lerp(orbit, 3.7, dive);
        camera.position.copy(earth.root.position).add(new THREE.Vector3(0, 0, distance));
        camera.up.set(0, 1, 0);
        camera.lookAt(earth.root.position);
      }
      const placed = frame.earth.landing * (1 - frame.earth.overview);
      camera.setViewOffset(width, height, framing.offsetX * placed, framing.offsetY * placed + (width >= 700 ? height * 0.015 * frame.earth.overview : 0), width, height);
      camera.updateMatrixWorld();
      const cityFrame = frame.timeline.city;
      const phase = frame.timeline.phase;
      const preload = ["earth-reveal", "earth-observe"].includes(phase.kind) ? phase.sceneId
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
      earth.dispose(); cursor.dispose();
      renderer.dispose(); canvas.remove();
    },
  };
  function contextLost(event: Event) { event.preventDefault(); onContextLost(); }
  canvas.addEventListener("webglcontextlost", contextLost);
  api.resize();
  return api;
}
