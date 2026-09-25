import * as THREE from "three";

type Vec3 = [number, number, number];
export type CloudItem = { position: Vec3; scatter: Vec3; colour: Vec3; size: number; shape: number; normal?: Vec3 };
export type PacketLane = { curve: [Vec3, Vec3, Vec3, Vec3]; count: number; speed: number; from: Vec3; to: Vec3; size: number; tail: number };

const SHARED_GLSL = /* glsl */ `
  uniform float time; uniform float assemble; uniform vec2 mouse; uniform float pointer; uniform float scale;
  uniform float pixelRatio; uniform float aspect; uniform vec3 ripple; uniform float story; uniform vec2 resolution;
  uniform vec4 flag;`;
const QUIET_GLSL = /* glsl */ `
  float quietStory() {
    vec2 p = gl_FragCoord.xy / resolution;
    float quiet = story > 1.5 ? smoothstep(0.44, 0.6, p.y) : smoothstep(0.06, 0.44, p.x);
    return mix(1.0, quiet * 0.85 + 0.15, step(0.5, story));
  }`;

/**
 * Points drawn as small symbols. They settle bottom-up while landing, part around the cursor and brighten
 * under a click ripple. Defines add motion: FOG drifts, SKY breathes, FLAG waves (stronger when `flag.w` rises)
 * and REFLECTION wobbles like an image on moving water.
 */
const POINT_VERTEX = /* glsl */ `
  attribute vec3 scatter; attribute vec3 aNormal; attribute float aSize; attribute float aShape; attribute float aPhase; attribute float aHighlight;
  varying vec3 vColor; varying float vShape;
  ${SHARED_GLSL}
  void main() {
    vec3 p = position;
    #ifdef FOG
      p.x = mod(p.x + time * (0.8 + aPhase * 1.5) + 180.0, 360.0) - 180.0;
      p.y += sin(time * 0.3 + aPhase * 20.0) * 0.8;
    #endif
    #ifdef SKY
      p += 0.7 * vec3(sin(time * 0.21 + aPhase * 30.0), cos(time * 0.17 + aPhase * 20.0), sin(time * 0.13 + aPhase * 11.0));
    #endif
    #ifdef FLAG
      float u = clamp((position.x - flag.x) / flag.z, 0.0, 1.0);
      p.z += sin(u * 7.0 - time * 2.6 + (position.y - flag.y) * 0.12) * (0.25 + 1.8 * u) * flag.w;
      p.y += sin(u * 5.0 - time * 2.1) * 0.35 * u * flag.w;
    #endif
    #ifdef REFLECTION
      p.x += sin(position.y * 0.9 + time * 1.7 + aPhase * 6.0) * (0.2 - position.y * 0.02);
    #endif
    float settle = clamp(assemble * 2.0 - max(position.y, 0.0) / 110.0 - aPhase * 0.2, 0.0, 1.0);
    settle = settle * settle * (3.0 - 2.0 * settle);
    p = mix(scatter, p, settle);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vec2 ndc = gl_Position.xy / gl_Position.w, fromMouse = (ndc - mouse) * vec2(aspect, 1.0);
    float dist = length(fromMouse);
    #ifndef SKY
      float push = pointer * 0.08 * pow(max(0.0, 1.0 - dist / 0.26), 2.0);
      gl_Position.xy += (dist > 1e-4 ? fromMouse / dist : vec2(0.0)) / vec2(aspect, 1.0) * push * gl_Position.w;
    #endif
    float wave = ripple.z < 2.5 ? exp(-pow((length((ndc - ripple.xy) * vec2(aspect, 1.0)) - ripple.z * 1.1) * 8.0, 2.0)) * (1.0 - ripple.z / 2.5) : 0.0;
    float near = pointer * (1.0 - smoothstep(0.0, 0.3, dist));
    float facing = dot(aNormal, aNormal) > 0.5 ? mix(0.22, 1.0, smoothstep(-0.2, 0.3, dot(aNormal, normalize(cameraPosition - p)))) : 1.0;
    vColor = color * facing * (0.35 + 0.65 * settle) * (1.0 + 0.5 * near + 2.2 * aHighlight + 1.6 * wave);
    vShape = aShape;
    gl_PointSize = clamp(aSize * scale / -mv.z, 1.0 * pixelRatio, 9.0 * pixelRatio) * (1.0 + 0.9 * aHighlight + 0.6 * wave);
  }`;

/** Symbols: 0 dot, 1 plus, 2 square outline, 3 diamond, 4 small filled square. */
const POINT_FRAGMENT = /* glsl */ `
  varying vec3 vColor; varying float vShape;
  ${SHARED_GLSL}
  ${QUIET_GLSL}
  void main() {
    vec2 q = gl_PointCoord * 2.0 - 1.0;
    float box = max(abs(q.x), abs(q.y)), ink;
    int shape = int(vShape + 0.5);
    if (shape == 0) ink = step(length(q), 0.6);
    else if (shape == 1) ink = step(min(abs(q.x), abs(q.y)), 0.2) * step(box, 0.9);
    else if (shape == 2) ink = step(box, 0.85) * step(0.45, box);
    else if (shape == 3) ink = step(abs(q.x) + abs(q.y), 0.9);
    else ink = step(box, 0.62);
    if (ink < 0.5) discard;
    gl_FragColor = vec4(vColor * quietStory(), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

/** Packets moving along cubic Bézier lanes, each with a short fading tail. */
const PACKET_VERTEX = /* glsl */ `
  attribute vec3 p0; attribute vec3 p1; attribute vec3 p2; attribute vec3 p3; attribute vec3 colourA; attribute vec3 colourB;
  attribute float aOffset; attribute float aSpeed; attribute float aTail; attribute float aSize;
  varying vec3 vColor; varying float vShape;
  ${SHARED_GLSL}
  void main() {
    float t = fract(aOffset + time * aSpeed - aTail * 0.018), u = 1.0 - t;
    vec3 p = u * u * u * p0 + 3.0 * u * u * t * p1 + 3.0 * u * t * t * p2 + t * t * t * p3;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float fade = smoothstep(0.0, 0.06, t) * (1.0 - smoothstep(0.94, 1.0, t)) * (1.0 - aTail) * smoothstep(0.75, 1.0, assemble);
    vColor = mix(colourA, colourB, t) * fade;
    vShape = aTail > 0.0 ? 0.0 : 4.0;
    gl_PointSize = clamp(aSize * scale / -mv.z, 1.0 * pixelRatio, 7.0 * pixelRatio) * (1.0 - 0.5 * aTail);
  }`;

/**
 * Shared machinery for the point-cloud cities (St. Louis, Madrid): one uniform block, symbol materials,
 * cloud and packet builders, click ripples and per-frame cursor easing. The city owns the scene and disposes it.
 */
export function createPointField(scene: THREE.Scene, rng: () => number) {
  const uniforms = {
    time: { value: 0 }, assemble: { value: 1 }, mouse: { value: new THREE.Vector2(9, 9) }, pointer: { value: 0 },
    scale: { value: 1 }, pixelRatio: { value: 1 }, aspect: { value: 1 }, ripple: { value: new THREE.Vector3(0, 0, 9) },
    story: { value: 1 }, resolution: { value: new THREE.Vector2(1, 1) }, flag: { value: new THREE.Vector4(0, 0, 1, 1) },
  };
  const onDown = (event: PointerEvent) => {
    uniforms.ripple.value.set(event.clientX / Math.max(1, window.innerWidth) * 2 - 1, 1 - event.clientY / Math.max(1, window.innerHeight) * 2, 0);
  };
  window.addEventListener("pointerdown", onDown, { passive: true });

  const material = (defines: Record<string, string> = {}) => new THREE.ShaderMaterial({
    uniforms, defines, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: POINT_VERTEX, fragmentShader: POINT_FRAGMENT,
  });
  function cloud(name: string, items: CloudItem[], shader: THREE.ShaderMaterial) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(items.flatMap(p => p.position), 3));
    geometry.setAttribute("scatter", new THREE.Float32BufferAttribute(items.flatMap(p => p.scatter), 3));
    geometry.setAttribute("aNormal", new THREE.Float32BufferAttribute(items.flatMap(p => p.normal ?? [0, 0, 0]), 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(items.flatMap(p => p.colour), 3));
    geometry.setAttribute("aSize", new THREE.Float32BufferAttribute(items.map(p => p.size), 1));
    geometry.setAttribute("aShape", new THREE.Float32BufferAttribute(items.map(p => p.shape), 1));
    geometry.setAttribute("aPhase", new THREE.Float32BufferAttribute(items.map(() => rng()), 1));
    geometry.setAttribute("aHighlight", new THREE.Float32BufferAttribute(new Float32Array(items.length), 1));
    const points = new THREE.Points(geometry, shader);
    points.name = name; points.frustumCulled = false;
    scene.add(points);
    return points;
  }
  const scatterOf = (p: Vec3, spread: number, lift: number): Vec3 => {
    const a = rng() * Math.PI * 2, b = Math.acos(2 * rng() - 1), r = spread * (0.4 + rng());
    return [p[0] + Math.sin(b) * Math.cos(a) * r, p[1] + lift + Math.cos(b) * r, p[2] + Math.sin(b) * Math.sin(a) * r];
  };
  function packets(name: string, lanes: PacketLane[]) {
    const data: Record<string, number[]> = { p0: [], p1: [], p2: [], p3: [], colourA: [], colourB: [], aOffset: [], aSpeed: [], aTail: [], aSize: [], position: [] };
    for (const lane of lanes) for (let i = 0; i < lane.count; i++) {
      const offset = rng(), rate = lane.speed * (0.85 + rng() * 0.3);
      for (let k = 0; k <= lane.tail; k++) {
        lane.curve.forEach((p, j) => data[`p${j}`].push(...p));
        data.colourA.push(...lane.from); data.colourB.push(...lane.to);
        data.aOffset.push(offset); data.aSpeed.push(rate); data.aTail.push(k / (lane.tail + 1)); data.aSize.push(lane.size);
        data.position.push(0, 0, 0);
      }
    }
    const geometry = new THREE.BufferGeometry();
    for (const [key, values] of Object.entries(data)) geometry.setAttribute(key, new THREE.Float32BufferAttribute(values, key.startsWith("a") ? 1 : 3));
    const points = new THREE.Points(geometry, new THREE.ShaderMaterial({
      uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexShader: PACKET_VERTEX, fragmentShader: POINT_FRAGMENT,
    }));
    points.name = name; points.frustumCulled = false;
    scene.add(points);
    return points;
  }

  return {
    uniforms, material, cloud, scatterOf, packets,
    update(frame: { seconds: number; dt: number; hovering: boolean; pointer: { x: number; y: number }; excursion: number; reduced: boolean; assemble: number }) {
      uniforms.time.value = frame.reduced ? 0 : frame.seconds;
      uniforms.assemble.value = frame.assemble;
      uniforms.pointer.value += (Number(frame.hovering) * (1 - frame.excursion) - uniforms.pointer.value) * (1 - Math.exp(-frame.dt / 0.3));
      uniforms.ripple.value.z = frame.reduced ? 9 : uniforms.ripple.value.z + frame.dt;
      uniforms.mouse.value.set(frame.hovering ? frame.pointer.x : 9, frame.hovering ? frame.pointer.y : 9);
    },
    resize(width: number, height: number, fov: number) {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      uniforms.pixelRatio.value = ratio;
      uniforms.scale.value = height * ratio / (2 * Math.tan(THREE.MathUtils.degToRad(fov / 2)));
      uniforms.aspect.value = width / Math.max(1, height);
      uniforms.resolution.value.set(Math.round(width * ratio), Math.round(height * ratio));
      uniforms.story.value = width >= 700 && width / Math.max(1, height) >= 0.9 ? 1 : 2;
    },
    dispose() { window.removeEventListener("pointerdown", onDown); },
  };
}

/** Releases every geometry and material under a scene. */
export function disposeScene(scene: THREE.Scene) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
  scene.traverse(object => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments) {
      geometries.add(object.geometry);
      (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => materials.add(m));
    }
  });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
  scene.clear();
}
