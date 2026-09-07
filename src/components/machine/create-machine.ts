import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { advanceMarble, crosses, marblePosition, MAX_MARBLES, type MachineRoute, type Point3 } from "@/lib/machine-physics";

export type MachineAction = "launch" | "route" | "explode" | "retail-analytics-platform" | "energy-market-integrator" | "flysmart-spain" | "embedded-stopwatch";
export interface MachineAPI {
  launch: () => boolean;
  setRoute: (route: MachineRoute) => void;
  setGravity: (gravity: boolean) => void;
  setExploded: (exploded: boolean) => void;
  setScrub: (progress: number | null) => void;
  setPaused: (paused: boolean) => void;
  rotate: (direction: number) => void;
  resetView: () => void;
  dispose: () => void;
}

export function createMachine(host: HTMLElement, callbacks: {
  onAction: (action: MachineAction) => void;
  onConsequence: (route: MachineRoute) => void;
  onError: () => void;
}): MachineAPI {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.setClearColor(0xf2f1eb, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Máquina de canicas en 3D. Arrastra para girar; todos sus mecanismos tienen controles debajo de la escena.");
  host.append(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-7, 7, 4.5, -4.5, 0.1, 100);
  const home = new THREE.Vector3(7.5, 7.2, 15);
  camera.position.copy(home);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 1.65, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.minPolarAngle = Math.PI / 5;
  controls.maxPolarAngle = Math.PI / 2.2;
  controls.minAzimuthAngle = -Math.PI / 2.6;
  controls.maxAzimuthAngle = Math.PI / 2.6;
  controls.update();
  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentMap = pmrem.fromScene(environment, 0.035);
  scene.environment = environmentMap.texture;
  environment.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xfffcf1, 0x9bada5, 2.3));
  const sunlight = new THREE.DirectionalLight(0xfff9e9, 4.2);
  sunlight.position.set(-4, 9, 6);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(2048, 2048);
  sunlight.shadow.camera.left = -9;
  sunlight.shadow.camera.right = 9;
  sunlight.shadow.camera.top = 7;
  sunlight.shadow.camera.bottom = -7;
  sunlight.shadow.normalBias = 0.025;
  sunlight.shadow.bias = -0.0001;
  sunlight.shadow.radius = 3;
  scene.add(sunlight);
  const fill = new THREE.DirectionalLight(0xd2e5ff, 1.5);
  fill.position.set(5, 4, -5);
  scene.add(fill);

  const material = (color: number, metalness = 0, roughness = 0.35) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
  const orange = material(0xf15a2b, 0.25, 0.25);
  const green = material(0x254e43, 0.35, 0.3);
  const mint = material(0xb6cabc, 0.15, 0.4);
  const steel = material(0xb8c6c5, 0.85, 0.22);
  const cream = material(0xe5e1d4, 0.05, 0.55);
  const black = material(0x26322d, 0.3, 0.45);
  const brass = material(0xc8a359, 0.75, 0.2);
  const ceramic = material(0xfaf8f0, 0, 0.24);
  const root = new THREE.Group();
  scene.add(root);
  const parts: { group: THREE.Group; direction: THREE.Vector3 }[] = [];
  function part(direction: Point3, action?: MachineAction) {
    const group = new THREE.Group();
    if (action) group.userData.action = action;
    root.add(group);
    parts.push({ group, direction: new THREE.Vector3(...direction) });
    return group;
  }
  function mesh(geometry: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, position: Point3 = [0, 0, 0]) {
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(...position);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function box(parent: THREE.Object3D, dimensions: Point3, position: Point3, mat = cream, radius = 0.07) {
    return mesh(new RoundedBoxGeometry(...dimensions, 2, radius), mat, parent, position);
  }
  function cylinder(parent: THREE.Object3D, r: number, h: number, position: Point3, mat = steel) {
    return mesh(new THREE.CylinderGeometry(r, r, h, 24), mat, parent, position);
  }
  function bar(parent: THREE.Object3D, from: Point3, to: Point3, r = 0.045, mat = steel) {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    const object = cylinder(parent, r, a.distanceTo(b), [0, 0, 0], mat);
    object.position.copy(a.add(b).multiplyScalar(0.5));
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...to).sub(new THREE.Vector3(...from)).normalize());
    return object;
  }
  function sphere(parent: THREE.Object3D, r: number, position: Point3, mat = orange) {
    return mesh(new THREE.SphereGeometry(r, 24, 16), mat, parent, position);
  }
  function label(parent: THREE.Object3D, text: string, position: Point3, width = 0.8) {
    const buffer = document.createElement("canvas");
    buffer.width = 512; buffer.height = 128;
    const ctx = buffer.getContext("2d")!;
    ctx.fillStyle = "#eeebe1"; ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = "#3b4c42"; ctx.font = "500 44px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, 256, 65);
    const texture = new THREE.CanvasTexture(buffer);
    texture.colorSpace = THREE.SRGBColorSpace;
    const plaque = mesh(new THREE.PlaneGeometry(width, width / 4), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6 }), parent, position);
    return plaque;
  }

  // The plinth and its small hardware make the object feel manufactured.
  box(root, [11.4, 0.28, 4.55], [0, -0.05, 0], cream, 0.12);
  box(root, [10.9, 0.12, 4.12], [0, -0.24, 0], green, 0.05);
  const ground = mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ color: 0x424b37, opacity: 0.13 }), scene, [0, -0.41, 0]);
  ground.rotation.x = -Math.PI / 2;
  ground.castShadow = false;
  for (const x of [-5.25, 5.25]) for (const z of [-1.82, 1.82]) {
    cylinder(root, 0.2, 0.12, [x, -0.29, z], black);
    const screw = cylinder(root, 0.055, 0.028, [x, 0.105, z]);
    screw.userData.action = "explode";
    box(root, [0.055, 0.008, 0.012], [x, 0.123, z], black, 0.002);
  }
  label(root, "CM / 001", [-4.55, -0.03, 2.284], 1.1);
  label(root, "OBJETOS & CONSECUENCIAS", [3.5, -0.03, 2.284], 2.5);

  // Funnel, reservoir and a tactile launch lever.
  const input = part([-1.1, 0.45, 0], "launch");
  box(input, [0.64, 3.3, 0.52], [-4.5, 1.77, -0.83], green, 0.08);
  box(input, [1.1, 0.16, 1.05], [-4.5, 0.2, -0.5], mint);
  const funnelShape = [new THREE.Vector2(0.15, 0), new THREE.Vector2(0.15, 0.16), new THREE.Vector2(0.6, 0.75), new THREE.Vector2(0.63, 0.79)];
  const funnelMaterial = orange.clone(); funnelMaterial.side = THREE.DoubleSide;
  mesh(new THREE.LatheGeometry(funnelShape, 48), funnelMaterial, input, [-4.5, 3.53, -0.35]);
  const rim = mesh(new THREE.TorusGeometry(0.63, 0.04, 10, 64), steel, input, [-4.5, 4.32, -0.35]);
  rim.rotation.x = Math.PI / 2;
  cylinder(input, 0.15, 0.25, [-4.5, 3.48, -0.35], steel);
  for (let i = 0; i < 3; i++) sphere(input, 0.14, [-4.73 + i * 0.21, 4.23 + (i % 2) * 0.13, -0.35], [ceramic, orange, green][i]);
  const lever = new THREE.Group(); input.add(lever); lever.position.set(-4.5, 1.5, -0.35);
  bar(lever, [0, 0, 0], [0, 0.6, 0.8], 0.07);
  sphere(lever, 0.2, [0, 0.6, 0.8]);
  label(input, "01 / ENTRADA", [-4.5, 2.7, -0.555], 0.6);
  for (let i = 0; i < 3; i++) {
    box(input, [0.6, 0.1, 0.65], [-4.65 + i * 0.71, 0.17, 1.0], ceramic, 0.045);
    sphere(input, 0.14, [-4.65 + i * 0.71, 0.36, 1.0], [orange, green, brass][i]);
  }

  const rails = part([0, 0.95, 0], "retail-analytics-platform");
  function track(start: number, end: number, route: MachineRoute, railMat: THREE.MeshStandardMaterial) {
    for (const side of [-1, 1]) {
      const points = Array.from({ length: 260 }, (_, i) => {
        const p = marblePosition(start + (end - start) * i / 259, route);
        return new THREE.Vector3(p[0], p[1] - 0.105, p[2] + side * 0.11);
      });
      const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
      mesh(new THREE.TubeGeometry(curve, 320, 0.047, 8, false), railMat, rails);
    }
    for (let i = 0; i <= 28; i++) {
      const [x, y, z] = marblePosition(start + (end - start) * i / 28, route);
      bar(rails, [x, y - 0.12, z - 0.15], [x, y - 0.12, z + 0.15], 0.022, green);
    }
  }
  track(0, 0.69, "bell", orange);
  track(0.69, 1, "bell", steel);
  track(0.69, 1, "flight", green);
  const supports = part([0, -0.1, 0.7]);
  for (const t of [0.02, 0.18, 0.32, 0.48, 0.65, 0.83, 0.96]) {
    const [x, y, z] = marblePosition(t);
    bar(supports, [x, 0.17, z], [x, y - 0.13, z], 0.04);
    cylinder(supports, 0.16, 0.065, [x, 0.17, z], green);
    sphere(supports, 0.065, [x, y - 0.14, z], steel);
  }
  // A large flywheel catches each marble passing the junction.
  const motor = part([0.3, 0.4, 1.1], "energy-market-integrator");
  box(motor, [1.4, 0.3, 0.75], [2.4, 0.29, 1.0], green);
  bar(motor, [2.4, 0.35, 0.9], [2.4, 1.17, 0.9], 0.085);
  const wheel = new THREE.Group(); motor.add(wheel); wheel.position.set(2.4, 1.15, 1.15);
  mesh(new THREE.TorusGeometry(0.68, 0.063, 10, 64), orange, wheel);
  for (let i = 0; i < 8; i++) {
    const spoke = box(wheel, [0.1, 0.59, 0.08], [0, 0, 0], orange, 0.025);
    const a = i * Math.PI / 4;
    spoke.position.set(Math.sin(a) * 0.34, Math.cos(a) * 0.34, 0);
    spoke.rotation.z = -a;
  }
  const axle = cylinder(wheel, 0.14, 0.3, [0, 0, 0]); axle.rotation.x = Math.PI / 2;
  sphere(wheel, 0.08, [0, 0, 0.18], brass);
  label(motor, "03 / ENERGÍA", [2.4, 0.3, 1.389], 1.05);

  // Bell and paper-plane launcher are the two possible consequences.
  const output = part([1.05, 0.3, 0.6], "embedded-stopwatch");
  cylinder(output, 0.53, 0.12, [4.65, 0.22, 1.2], green);
  const bell = new THREE.Group(); output.add(bell); bell.position.set(4.65, 0.5, 1.2);
  mesh(new THREE.LatheGeometry([new THREE.Vector2(0.48, -0.15), new THREE.Vector2(0.42, -0.07), new THREE.Vector2(0.34, 0.25), new THREE.Vector2(0.13, 0.37), new THREE.Vector2(0, 0.38)], 48), brass, bell);
  sphere(bell, 0.09, [0, 0.44, 0], black);
  const lampMaterial = new THREE.MeshStandardMaterial({ color: 0xffca74, emissive: 0xff8a36, emissiveIntensity: 0, roughness: 0.3 });
  sphere(output, 0.16, [5.1, 1.75, 0.75], lampMaterial);
  bar(output, [5.1, 0.17, 0.75], [5.1, 1.56, 0.75], 0.04, green);
  cylinder(output, 0.19, 0.13, [5.1, 0.19, 0.75], green);
  label(output, "DING.", [4.65, 0.26, 1.735], 0.65);
  const flight = part([0.8, 0.4, -1.1], "flysmart-spain");
  box(flight, [1.45, 0.2, 0.7], [4.45, 0.26, -1.42], orange);
  bar(flight, [3.95, 0.35, -1.42], [4.9, 0.8, -1.42], 0.055, steel);
  const plane = new THREE.Group(); flight.add(plane);
  const paperGeometry = new THREE.BufferGeometry();
  paperGeometry.setAttribute("position", new THREE.Float32BufferAttribute([
    -0.7, 0, 0, 0.55, 0.08, 0, 0.35, 0, 0.55,
    -0.7, 0, 0, 0.35, 0, -0.55, 0.55, 0.08, 0,
    -0.7, 0, 0, 0.55, -0.16, 0, 0.55, 0.08, 0,
  ], 3));
  paperGeometry.computeVertexNormals();
  const paperMaterial = ceramic.clone(); paperMaterial.side = THREE.DoubleSide;
  mesh(paperGeometry, paperMaterial, plane);
  plane.position.set(4.45, 0.95, -1.42);
  label(flight, "04 / VUELO", [4.45, 0.28, -1.055], 1.05);
  const junction = part([0, 0.25, 1.0], "route");
  cylinder(junction, 0.37, 0.16, [0.3, 0.22, 1.6], green);
  const switchLever = bar(junction, [0.3, 0.3, 1.6], [0.3, 0.72, 1.6], 0.045);
  const switchKnob = sphere(junction, 0.12, [0.3, 0.78, 1.6]);
  label(junction, "A / B", [0.3, 0.23, 1.98], 0.6);
  const bolt = part([0, 0.4, 1.0], "explode");
  const boltHead = cylinder(bolt, 0.12, 0.09, [-0.9, 0.22, 1.65], brass);
  box(bolt, [0.15, 0.015, 0.025], [-0.9, 0.27, 1.65], black, 0.002);

  interface Marble { mesh: THREE.Mesh; progress: number; route: MachineRoute; seed: number }
  const marbles: Marble[] = [];
  const ballGeometry = new THREE.SphereGeometry(0.125, 20, 14);
  const ballMaterials = [ceramic, orange, steel, green, brass];
  const ghost = mesh(ballGeometry, orange, root);
  ghost.visible = false;
  let route: MachineRoute = "bell", gravity = true, exploded = false, paused = false;
  let scrub: number | null = null, explodeAmount = 0, wheelSpeed = 0, bellHit = 0, leverHit = 0, planeTime = -1;
  let serial = 0, awakeUntil = 0, disposed = false, visible = true, last = performance.now(), frame = 0;
  const wake = () => { awakeUntil = performance.now() + 500; };
  const floatTarget = new THREE.Vector3();
  function positionMarble(marble: Marble, now: number, instant = false) {
    const p = marblePosition(marble.progress, marble.route);
    if (!gravity) {
      floatTarget.set(p[0] + Math.sin(now / 1100 + marble.seed) * 0.3, p[1] + 1.1 + Math.sin(now / 800 + marble.seed) * 0.2, p[2] + Math.cos(now / 1000 + marble.seed) * 0.4);
    } else floatTarget.set(...p);
    marble.mesh.position.lerp(floatTarget, instant || reduced.matches ? 1 : 0.14);
    marble.mesh.rotation.z -= 0.035;
  }
  function animate(now: number) {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (!visible || document.hidden) return;
    const controlsChanged = controls.update();
    const moving = !paused && !reduced.matches && (marbles.some(m => m.progress < 1) || !gravity || planeTime >= 0 || wheelSpeed > 0.01 || bellHit > 0.01 || leverHit > 0.01);
    const assemblyMoving = Math.abs(explodeAmount - Number(exploded)) > 0.001;
    if (!controlsChanged && !moving && !assemblyMoving && now > awakeUntil) return;
    const canAdvance = !paused && !exploded && scrub === null && !reduced.matches;
    for (const marble of marbles) {
      if (canAdvance && gravity) {
        const previous = marble.progress;
        marble.progress = advanceMarble(previous, dt);
        if (crosses(previous, marble.progress, 0.87)) wheelSpeed = 7;
        if (crosses(previous, marble.progress, 0.985)) {
          if (marble.route === "bell") bellHit = 1;
          else planeTime = 0;
          callbacks.onConsequence(marble.route);
        }
      }
      if (!paused) positionMarble(marble, now);
      marble.mesh.visible = !exploded && scrub === null && (marble.progress < 1 || !gravity);
    }
    if (!paused && !reduced.matches) {
      wheel.rotation.z -= wheelSpeed * dt;
      wheelSpeed *= Math.exp(-dt * 1.8);
      bellHit *= Math.exp(-dt * 3);
      leverHit *= Math.exp(-dt * 4);
    }
    bell.rotation.z = Math.sin(now / 30) * bellHit * 0.13;
    lampMaterial.emissiveIntensity = bellHit * 3;
    lever.rotation.x = -leverHit * 0.7;
    boltHead.rotation.y = explodeAmount * Math.PI * 3;
    switchKnob.position.x = 0.3 + (route === "flight" ? 0.15 : -0.15);
    switchLever.rotation.z = route === "flight" ? -0.25 : 0.25;
    if (planeTime >= 0 && !paused && !reduced.matches) {
      planeTime += dt;
      const t = Math.min(planeTime / 3.4, 1);
      plane.position.set(4.45 - t * 9.6, 0.95 + Math.sin(t * Math.PI) * 3.9, -1.42 + Math.sin(t * Math.PI * 2) * 0.8);
      plane.rotation.set(0, Math.sin(t * Math.PI) * 0.2, -Math.cos(t * Math.PI) * 0.25);
      plane.scale.setScalar(1 - Math.max(0, t - 0.85) / 0.15);
      if (t >= 1) { planeTime = -1; plane.position.set(4.45, 0.95, -1.42); plane.rotation.set(0, 0, 0); plane.scale.setScalar(1); }
    }
    explodeAmount = reduced.matches ? Number(exploded) : THREE.MathUtils.lerp(explodeAmount, Number(exploded), 1 - Math.exp(-dt * 5));
    parts.forEach(({ group, direction }) => group.position.copy(direction).multiplyScalar(explodeAmount));
    renderer.render(scene, camera);
  }
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height);
    const aspect = width / height;
    const vertical = Math.max(2.9, 6.5 / aspect);
    camera.left = -vertical * aspect; camera.right = vertical * aspect;
    camera.top = vertical; camera.bottom = -vertical;
    camera.updateProjectionMatrix();
    wake();
  }
  const observer = new ResizeObserver(resize); observer.observe(host);
  const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; wake(); });
  intersection.observe(host);
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  let downX = 0, downY = 0;
  function pointerDown(event: PointerEvent) { downX = event.clientX; downY = event.clientY; wake(); }
  function pointerUp(event: PointerEvent) {
    if (Math.hypot(event.clientX - downX, event.clientY - downY) > 6) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(root.children, true);
    if (!hits.length) return;
    let object: THREE.Object3D | null = hits[0].object;
    while (object) {
      if (object.userData.action) { callbacks.onAction(object.userData.action); break; }
      object = object.parent;
    }
    wake();
  }
  function contextLost(event: Event) { event.preventDefault(); callbacks.onError(); }
  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointerup", pointerUp);
  canvas.addEventListener("webglcontextlost", contextLost);
  controls.addEventListener("change", wake);
  reduced.addEventListener("change", wake);
  resize();
  renderer.render(scene, camera);
  frame = requestAnimationFrame(animate);

  return {
    launch() {
      if (exploded || scrub !== null || paused) return false;
      // Completed marbles are recycled, and simultaneous marbles are bounded.
      const finished = marbles.findIndex(m => m.progress >= 1);
      if (finished >= 0) { root.remove(marbles[finished].mesh); marbles.splice(finished, 1); }
      if (marbles.length >= MAX_MARBLES) return false;
      const marbleMesh = mesh(ballGeometry, ballMaterials[serial % ballMaterials.length], root);
      const marble: Marble = { mesh: marbleMesh, progress: reduced.matches ? 0.985 : 0, route, seed: serial++ };
      marbles.push(marble); positionMarble(marble, performance.now(), true);
      leverHit = 1;
      if (reduced.matches) { callbacks.onConsequence(route); wheel.rotation.z -= Math.PI / 3; }
      wake(); return true;
    },
    setRoute(value) { route = value; wake(); },
    setGravity(value) { gravity = value; wake(); },
    setExploded(value) { exploded = value; wake(); },
    setPaused(value) { paused = value; wake(); },
    setScrub(value) {
      scrub = value; ghost.visible = value !== null;
      if (value !== null) { ghost.position.set(...marblePosition(value, route)); wheel.rotation.z = -value * Math.PI * 6; }
      wake();
    },
    rotate(direction) {
      const offset = camera.position.clone().sub(controls.target);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), direction * Math.PI / 9);
      camera.position.copy(controls.target).add(offset); controls.update(); wake();
    },
    resetView() { camera.position.copy(home); controls.target.set(0, 1.65, 0); controls.update(); wake(); },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect(); controls.dispose();
      canvas.removeEventListener("pointerdown", pointerDown); canvas.removeEventListener("pointerup", pointerUp); canvas.removeEventListener("webglcontextlost", contextLost);
      reduced.removeEventListener("change", wake);
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry);
          for (const mat of Array.isArray(object.material) ? object.material : [object.material]) {
            materials.add(mat);
            if (mat instanceof THREE.MeshStandardMaterial && mat.map) textures.add(mat.map);
          }
        }
      });
      geometries.add(ballGeometry); ballMaterials.forEach(mat => materials.add(mat));
      geometries.forEach(g => g.dispose()); textures.forEach(t => t.dispose()); materials.forEach(m => m.dispose());
      environmentMap.dispose(); renderer.dispose(); canvas.remove();
    },
  };
}
