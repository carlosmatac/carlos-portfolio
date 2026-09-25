import * as THREE from "three";
import { logoLayout, sampleLogo } from "./intro-logo-art";

/**
 * The mark as a cloud of fine symbols with real depth. It tilts towards the cursor, parts around it and is
 * crossed by a slow band of light; when the journey starts every point bursts outwards and past the camera.
 */
const VERTEX = /* glsl */ `
  attribute vec3 aDir; attribute float aPhase; attribute float aShape; attribute float aSize;
  uniform float time; uniform float burst; uniform float pointer; uniform vec2 mouse; uniform float aspect;
  uniform float scale; uniform float pixelRatio; uniform float unit; uniform float sweep;
  varying vec3 vColor; varying float vShape;
  void main() {
    vec3 p = position;
    p.z += sin(time * 0.9 + aPhase * 12.0) * 0.006;
    float b = pow(burst, 2.2);
    p += aDir * b * (0.6 + aPhase * 2.4);
    p.z += b * (1.0 + aPhase * 3.5);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vec2 ndc = gl_Position.xy / gl_Position.w, fromMouse = (ndc - mouse) * vec2(aspect, 1.0);
    float dist = length(fromMouse);
    float push = pointer * 0.07 * pow(max(0.0, 1.0 - dist / 0.24), 2.0) * (1.0 - burst);
    gl_Position.xy += (dist > 1e-4 ? fromMouse / dist : vec2(0.0)) / vec2(aspect, 1.0) * push * gl_Position.w;
    float near = pointer * (1.0 - smoothstep(0.0, 0.28, dist));
    float band = exp(-pow((position.x * 0.6 + position.y - sweep) * 6.0, 2.0));
    vColor = color * (1.0 + 0.7 * near + 1.3 * band + 2.8 * b);
    vShape = aShape;
    gl_PointSize = clamp(aSize * unit * scale / -mv.z, 1.0 * pixelRatio, 16.0 * pixelRatio);
  }`;
const FRAGMENT = /* glsl */ `
  uniform float opacity;
  varying vec3 vColor; varying float vShape;
  void main() {
    vec2 q = gl_PointCoord * 2.0 - 1.0;
    float box = max(abs(q.x), abs(q.y));
    float ink = vShape < 0.5 ? step(length(q), 0.62) : vShape < 1.5 ? step(min(abs(q.x), abs(q.y)), 0.2) * step(box, 0.9) : step(box, 0.7);
    if (ink < 0.5) discard;
    gl_FragColor = vec4(vColor * opacity, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

export function createIntroLogo(scene: THREE.Scene, mobile: boolean) {
  let seed = 4217;
  const rng = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const { samples } = sampleLogo(mobile ? 0.5 : 0.42, 5, 3.2, rng);
  const positions: number[] = [], colours: number[] = [], dirs: number[] = [], phases: number[] = [], shapes: number[] = [], sizes: number[] = [];
  for (const s of samples) {
    positions.push(...s.position);
    const accent = rng() < 0.035, front = s.position[2] > 0.02;
    const base = accent ? [1.2, 0.95, 0.62] : s.part === 0 ? [0.55, 0.62, 1.05] : [0.78, 0.82, 1.1];
    const light = s.edge ? (front ? 1.2 : 0.45) : 0.62;
    colours.push(...base.map(c => c * light));
    const a = rng() * Math.PI * 2, e = Math.acos(2 * rng() - 1), outward = new THREE.Vector3(s.position[0], s.position[1], 0).normalize();
    const dir = new THREE.Vector3(Math.sin(e) * Math.cos(a), Math.sin(e) * Math.sin(a), Math.cos(e)).multiplyScalar(0.6).add(outward).normalize();
    dirs.push(dir.x, dir.y, dir.z);
    phases.push(rng());
    shapes.push(s.edge ? 3 : rng() < 0.06 ? 1 : 0);
    sizes.push(s.edge ? 0.0085 : 0.0105);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colours, 3));
  geometry.setAttribute("aDir", new THREE.Float32BufferAttribute(dirs, 3));
  geometry.setAttribute("aPhase", new THREE.Float32BufferAttribute(phases, 1));
  geometry.setAttribute("aShape", new THREE.Float32BufferAttribute(shapes, 1));
  geometry.setAttribute("aSize", new THREE.Float32BufferAttribute(sizes, 1));
  const uniforms = {
    time: { value: 0 }, burst: { value: 0 }, pointer: { value: 0 }, mouse: { value: new THREE.Vector2(9, 9) }, aspect: { value: 1 },
    scale: { value: 1 }, pixelRatio: { value: 1 }, unit: { value: 1 }, sweep: { value: -3 }, opacity: { value: 1 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexShader: VERTEX, fragmentShader: FRAGMENT,
  });
  const points = new THREE.Points(geometry, material);
  points.name = "Intro_Logo"; points.frustumCulled = false;
  const group = new THREE.Group();
  group.add(points);
  scene.add(group);

  // The bloom that opens the warp.
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    uniforms: { strength: { value: 0 } }, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform float strength; void main(){
      float r = length(vUv - 0.5) * 2.0;
      vec3 c = vec3(0.4, 0.5, 1.0) * exp(-r * 4.2) * 0.8 + vec3(0.95, 0.97, 1.0) * exp(-r * 16.0) * 0.9;
      gl_FragColor = vec4(c * strength, 1.0); }`,
  }));
  flash.name = "Warp_Flash"; flash.frustumCulled = false; flash.renderOrder = 10;
  scene.add(flash);

  const follow = { x: 0, y: 0 }, fall = new THREE.Vector3(0, -0.354, -1).normalize();
  return {
    group, points,
    resize(width: number, height: number, camera: THREE.PerspectiveCamera, distance: number) {
      const ratio = Math.min(window.devicePixelRatio || 1, 2), view = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance;
      const layout = logoLayout(width, height), size = layout.size / height * view;
      group.scale.setScalar(size);
      group.position.set(0, (0.5 - layout.centreY / height) * view, 0);
      uniforms.unit.value = size;
      uniforms.scale.value = height * ratio / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
      uniforms.pixelRatio.value = ratio;
      uniforms.aspect.value = width / Math.max(1, height);
    },
    update(frame: { seconds: number; dt: number; burst: number; opacity: number; flash: number; warp: number; hovering: boolean; pointer: { x: number; y: number }; reduced: boolean }, camera: THREE.PerspectiveCamera) {
      const ease = 1 - Math.exp(-frame.dt / 0.7), idle = frame.reduced ? 0 : 1;
      follow.x += ((frame.hovering ? frame.pointer.x : 0) - follow.x) * ease;
      follow.y += ((frame.hovering ? frame.pointer.y : 0) - follow.y) * ease;
      group.rotation.set(-follow.y * 0.32 + Math.sin(frame.seconds * 0.23) * 0.04 * idle, follow.x * 0.5 + Math.sin(frame.seconds * 0.17) * 0.08 * idle, 0);
      group.visible = frame.opacity > 0.001;
      uniforms.time.value = frame.reduced ? 0 : frame.seconds;
      uniforms.burst.value = frame.burst;
      uniforms.opacity.value = frame.opacity;
      uniforms.pointer.value += (Number(frame.hovering && !frame.reduced) * (1 - frame.burst) - uniforms.pointer.value) * (1 - Math.exp(-frame.dt / 0.3));
      uniforms.mouse.value.set(frame.hovering ? frame.pointer.x : 9, frame.hovering ? frame.pointer.y : 9);
      uniforms.sweep.value = frame.reduced ? -3 : (frame.seconds % 7) / 7 * 5 - 2.5;
      const glow = frame.flash * 0.55 + frame.warp * 0.16;
      flash.visible = glow > 0.001;
      if (flash.visible) {
        // Sits on the tunnel's vanishing point, where the fall is heading.
        flash.position.copy(camera.position).addScaledVector(fall, 4);
        flash.quaternion.copy(camera.quaternion);
        flash.scale.setScalar(9 * (0.7 + frame.flash));
        (flash.material as THREE.ShaderMaterial).uniforms.strength.value = glow;
      }
    },
  };
}
