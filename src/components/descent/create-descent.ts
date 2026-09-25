import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { JourneyFrame } from "./journey";
import { createEarth } from "./create-earth";
import { earthCameraDistance, earthFraming, smootherRange } from "./motion";
import { createGranada } from "./cities/create-granada";
import { createStLouis } from "./cities/create-st-louis";
import type { CitySceneId } from "./journey-config";
import type { CityScene, CityQuality } from "./cities/types";
import { createTransition } from "./transitions/create-transition";

const cityFactories = { "st-louis-sky": createStLouis, "granada-sky": createGranada } satisfies Record<CitySceneId, (quality: CityQuality) => CityScene>;

export interface DescentScene {
  render: (frame: JourneyFrame, seconds: number, reduced: boolean) => void;
  resize: () => void;
  dispose: () => void;
}

/** The monitor, tunnel and final object occupy one continuous 3D space. */
export function createDescent(host: HTMLElement, identity: HTMLElement, onContextLost: () => void): DescentScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.5 : 2));
  renderer.setClearColor(0x030407, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.04, 650);
  const cameraTarget = new THREE.Vector3();
  let width = 1, height = 1, startZ = 10.3;

  scene.add(new THREE.HemisphereLight(0xb2c0e4, 0x101119, 1.05));
  const key = new THREE.DirectionalLight(0xd7ddec, 3.4);
  key.position.set(-4, 7, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x435888, 1.4);
  rim.position.set(5, 1, -3);
  scene.add(rim);
  const monitor = new THREE.Group();
  scene.add(monitor);
  const graphite = new THREE.MeshStandardMaterial({ color: 0x262930, roughness: 0.35, metalness: 0.35 });
  const aluminum = new THREE.MeshStandardMaterial({ color: 0x353941, roughness: 0.42, metalness: 0.38 });
  const black = new THREE.MeshStandardMaterial({ color: 0x050609, roughness: 0.35, metalness: 0.12 });
  function box(parent: THREE.Object3D, size: [number, number, number], position: [number, number, number], material: THREE.Material, radius = 0.05) {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, 3, radius), material);
    mesh.position.set(...position);
    parent.add(mesh);
    return mesh;
  }
  // A real beveled housing, recessed display and graphite stand; no image assets.
  box(monitor, [9.48, 5.48, 0.19], [0, 0.55, -0.075], graphite, 0.095);
  box(monitor, [9.34, 5.34, 0.035], [0, 0.57, 0.035], black, 0.055);
  const screenUniforms = { uTime: { value: 0 }, uOpacity: { value: 1 }, uReduced: { value: 0 } };
  const screenMaterial = new THREE.ShaderMaterial({
    uniforms: screenUniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime; uniform float uOpacity; uniform float uReduced;
      void main(){
        vec2 uv=vUv-vec2(0.5,0.44);
        float pulse=mix(0.57+0.20*sin(uTime*0.36),0.65,uReduced);
        float halo=exp(-length(uv*vec2(1.55,2.3))*4.8);
        float low=exp(-length((vUv-vec2(0.5,0.10))*vec2(2.4,5.0))*5.5);
        vec3 color=vec3(0.012,0.014,0.023)+vec3(0.040,0.075,0.25)*halo*pulse;
        color+=vec3(0.009,0.013,0.035)*low;
        float vignette=1.0-smoothstep(0.22,0.72,length(vUv-0.5));
        color*=0.64+0.36*vignette;
        gl_FragColor=vec4(color,uOpacity);
      }`,
  });
  const display = new THREE.Mesh(new THREE.PlaneGeometry(9.13, 5.13), screenMaterial);
  display.position.set(0, 0.57, 0.06);
  monitor.add(display);
  // The inner black backing fades with the display so the camera can enter it.
  const backing = monitor.children[1] as THREE.Mesh;
  backing.material = black.clone();
  (backing.material as THREE.MeshStandardMaterial).transparent = true;
  const stem = box(monitor, [1.5, 1.66, 0.20], [0, -2.9, -0.38], aluminum, 0.07);
  stem.rotation.x = -0.10;
  box(monitor, [2.68, 0.10, 1.62], [0, -3.68, 0.05], aluminum, 0.055);
  box(monitor, [2.35, 0.035, 1.32], [0, -3.75, 0.04], black, 0.025);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 6), new THREE.MeshBasicMaterial({ color: 0x9aa8c5 }));
  led.position.set(4.28, -2.06, 0.037);
  monitor.add(led);

  // Deterministic stars with real perspective and depth; trails follow the fall.
  const tunnel = new THREE.Group();
  scene.add(tunnel);
  const count = window.innerWidth < 700 ? 900 : 1700;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const linePositions = new Float32Array(count * 6);
  const lineColors = new Float32Array(count * 6);
  const ends = new Float32Array(count * 2);
  let seed = 8128;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < count; i++) {
    const z = -4 - random() * 340;
    const angle = random() * Math.PI * 2;
    const radius = 2.5 + Math.pow(random(), 0.75) * 68;
    const x = Math.cos(angle) * radius;
    const y = z * 0.354 + Math.sin(angle) * radius;
    const intensity = 0.38 + random() * 0.62;
    const point = [x, y, z];
    const color = [intensity * 0.77, intensity * 0.85, intensity];
    positions.set(point, i * 3); colors.set(color, i * 3);
    linePositions.set(point, i * 6); linePositions.set(point, i * 6 + 3);
    lineColors.set(color, i * 6); lineColors.set(color.map(c => c * 0.08), i * 6 + 3);
    ends[i * 2 + 1] = 1;
  }
  const pointGeometry = new THREE.BufferGeometry();
  pointGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  pointGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const pointsMaterial = new THREE.PointsMaterial({ size: 0.065, vertexColors: true, transparent: true, opacity: 0, sizeAttenuation: true, depthWrite: false, blending: THREE.AdditiveBlending });
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
    fragmentShader: `varying vec3 vColor;uniform float uOpacity;void main(){gl_FragColor=vec4(vColor,uOpacity);}`,
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

  const projected = new THREE.Vector3();
  const displayTopLeft = new THREE.Vector3(-4.565, 3.135, 0.06);
  const displayBottomRight = new THREE.Vector3(4.565, -1.995, 0.06);
  let previousBounds = "";
  const api: DescentScene = {
    resize() {
      width = host.clientWidth; height = host.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      startZ = Math.max(10.3, 9.48 / (2 * Math.tan(THREE.MathUtils.degToRad(21)) * camera.aspect * 0.88));
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 700 ? 1.5 : 2));
      renderer.setSize(width, height);
      transition.resize(width, height, Math.min(renderer.getPixelRatio(), 1.5));
      resizeCity();
    },
    render(frame, seconds, reduced) {
      camera.clearViewOffset();
      const zoomZ = THREE.MathUtils.lerp(startZ, 0.9, frame.zoom);
      camera.position.set(0, THREE.MathUtils.lerp(-0.12, 0.57, frame.zoom) - frame.distance * 85, zoomZ - frame.distance * 240);
      const pitch = Math.sin(frame.fall * Math.PI) * 0.24;
      cameraTarget.copy(camera.position).add(new THREE.Vector3(0, -pitch, -1));
      camera.lookAt(cameraTarget);
      camera.updateMatrixWorld();
      monitor.visible = frame.screen > 0.001;
      screenUniforms.uTime.value = seconds;
      screenUniforms.uReduced.value = Number(reduced);
      screenUniforms.uOpacity.value = frame.screen;
      (backing.material as THREE.MeshStandardMaterial).opacity = frame.screen;
      // Fade the physical housing only once its edges have passed the viewport.
      graphite.transparent = true; graphite.opacity = frame.screen;
      aluminum.transparent = true; aluminum.opacity = frame.screen;
      if (frame.identity > 0.001) {
        projected.copy(displayTopLeft).project(camera);
        const left = (projected.x * 0.5 + 0.5) * width;
        const top = (-projected.y * 0.5 + 0.5) * height;
        projected.copy(displayBottomRight).project(camera);
        const right = (projected.x * 0.5 + 0.5) * width;
        const bottom = (-projected.y * 0.5 + 0.5) * height;
        const bounds = `${left.toFixed(2)},${top.toFixed(2)},${(right-left).toFixed(2)},${(bottom-top).toFixed(2)}`;
        if (bounds !== previousBounds) {
          identity.style.left = `${left}px`; identity.style.top = `${top}px`;
          identity.style.width = `${right-left}px`; identity.style.height = `${bottom-top}px`;
          identity.style.setProperty("--display-scale", `${(right - left) / Math.min(width * 0.68, 960)}`);
          previousBounds = bounds;
        }
      }
      pointsMaterial.opacity = frame.stars * (0.30 + frame.speed * 0.6);
      trailUniforms.uLength.value = frame.speed * 11;
      trailUniforms.uOpacity.value = frame.stars * frame.speed * 0.8;
      tunnel.visible = !reduced && frame.stars > 0.001;
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
      earth.dispose();
      black.dispose();
      renderer.dispose(); canvas.remove();
    },
  };
  function contextLost(event: Event) { event.preventDefault(); onContextLost(); }
  canvas.addEventListener("webglcontextlost", contextLost);
  api.resize();
  return api;
}
