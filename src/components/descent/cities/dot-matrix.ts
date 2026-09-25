import * as THREE from "three";

const FULLSCREEN_VERTEX = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

/** Cursor trail: a decaying velocity/density field advected with a small cross blur. */
const TRAIL_FRAGMENT = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D previous; uniform vec2 texel; uniform vec2 from; uniform vec2 to;
  uniform float aspect; uniform float decay; uniform float drawing; uniform float packed;
  vec3 decode(vec4 c) { return packed > 0.5 ? vec3(c.xy * 2.0 - 1.0, c.z) : c.xyz; }
  void main() {
    vec3 field = decode(texture2D(previous, vUv)) * 0.4
      + (decode(texture2D(previous, vUv + vec2(texel.x, 0.0))) + decode(texture2D(previous, vUv - vec2(texel.x, 0.0)))
      + decode(texture2D(previous, vUv + vec2(0.0, texel.y))) + decode(texture2D(previous, vUv - vec2(0.0, texel.y)))) * 0.15;
    field *= decay;
    vec2 scale = vec2(aspect, 1.0), a = from * scale, b = to * scale, p = vUv * scale, ab = b - a;
    float len = length(ab);
    float h = len > 0.0 ? clamp(dot(p - a, ab) / (len * len), 0.0, 1.0) : 0.0;
    float s = 1.0 - smoothstep(0.0, 0.09, length(p - a - ab * h));
    float deposit = clamp(len * 14.0, 0.0, 1.0) * s * s * drawing;
    field.xy = clamp(field.xy + (len > 0.0 ? ab / len : vec2(0.0)) * deposit, -1.0, 1.0);
    field.z = clamp(max(field.z, deposit), 0.0, 1.0);
    gl_FragColor = packed > 0.5 ? vec4(field.xy * 0.5 + 0.5, field.z, 1.0) : vec4(field, 1.0);
  }`;

/** Declarations every dot-matrix display fragment shares. */
export const DOT_MATRIX_GLSL = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D source; uniform sampler2D trail;
  uniform vec2 resolution; uniform float micro; uniform vec2 mouse; uniform float lens; uniform float lensRadius;
  uniform float time; uniform float packed; uniform float ready; uniform float story;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
  vec3 trailAt(vec2 uv) { vec4 t = texture2D(trail, uv); return packed > 0.5 ? vec3(t.xy * 2.0 - 1.0, t.z) : t.xyz; }
  /** Dims the story column: the left third on desktop, the lower half in portrait. */
  float storyLight() {
    float quiet = story > 1.5 ? smoothstep(0.44, 0.6, vUv.y) : smoothstep(0.06, 0.44, vUv.x);
    return mix(1.0, quiet * 0.9 + 0.1, step(0.5, story));
  }`;

export type DotMatrixFrame = {
  seconds: number; dt: number; excursion: number; reduced: boolean;
  hovering: boolean; pointer: { x: number; y: number };
  /** Width of a coarse cell in CSS pixels; each cell is `cellMicro` device micro-pixels wide. */
  cellCss: number;
};

/**
 * A fullscreen display that re-draws an off-screen 3D world as a glyph matrix, plus a cursor trail field.
 * The world and trail are rendered from the display quad's onBeforeRender, the same pattern as three's Reflector,
 * so the shared compositor only ever sees one scene and one camera.
 */
export function createDotMatrix<U extends Record<string, THREE.IUniform> = Record<never, THREE.IUniform>>(options: {
  name: string; world: THREE.Scene; eye: THREE.PerspectiveCamera; fragmentShader: string;
  uniforms?: U; cellMicro?: number;
}) {
  const { world, eye, cellMicro = 6 } = options;
  const scene = new THREE.Scene();
  scene.name = options.name;
  scene.userData.world = world; scene.userData.eye = eye;
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 10);
  const uniforms = {
    source: { value: null as THREE.Texture | null }, trail: { value: null as THREE.Texture | null },
    resolution: { value: new THREE.Vector2(1, 1) }, micro: { value: 1 }, mouse: { value: new THREE.Vector2(-1e4, -1e4) },
    lens: { value: 0 }, lensRadius: { value: 120 }, time: { value: 0 }, packed: { value: 0 }, ready: { value: 0 }, story: { value: 1 },
    ...(options.uniforms as U),
  };
  const quad = new THREE.PlaneGeometry(2, 2);
  const display = new THREE.Mesh(quad, new THREE.ShaderMaterial({
    uniforms, depthTest: false, depthWrite: false, vertexShader: FULLSCREEN_VERTEX, fragmentShader: options.fragmentShader,
  }));
  display.name = "Dot_Matrix"; display.frustumCulled = false;
  scene.add(display);
  const trailUniforms = {
    previous: { value: null as THREE.Texture | null }, texel: { value: new THREE.Vector2(1, 1) }, from: { value: new THREE.Vector2() }, to: { value: new THREE.Vector2() },
    aspect: { value: 1 }, decay: { value: 0.9 }, drawing: { value: 0 }, packed: { value: 0 },
  };
  const trailMaterial = new THREE.ShaderMaterial({ uniforms: trailUniforms, vertexShader: FULLSCREEN_VERTEX, fragmentShader: TRAIL_FRAGMENT, depthTest: false, depthWrite: false });
  const trailScene = new THREE.Scene(), trailQuad = new THREE.Mesh(quad, trailMaterial);
  trailQuad.frustumCulled = false;
  trailScene.add(trailQuad);

  let targets: { source: THREE.WebGLRenderTarget; trail: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget] } | null = null;
  let size = { width: 1440, height: 900, ratio: 1 }, trailPending = false;
  display.onBeforeRender = renderer => {
    const float = renderer.extensions.has("EXT_color_buffer_float");
    const sw = Math.max(1, Math.round(size.width * size.ratio / 2)), sh = Math.max(1, Math.round(size.height * size.ratio / 2));
    const tw = Math.max(1, Math.ceil(size.width / 8)), th = Math.max(1, Math.ceil(size.height / 8));
    if (!targets) {
      const type = float ? THREE.HalfFloatType : THREE.UnsignedByteType;
      const trail = () => new THREE.WebGLRenderTarget(tw, th, { type, depthBuffer: false });
      targets = { source: new THREE.WebGLRenderTarget(sw, sh, { type }), trail: [trail(), trail()] };
      targets.source.texture.colorSpace = THREE.LinearSRGBColorSpace;
      uniforms.packed.value = trailUniforms.packed.value = Number(!float);
      const previous = renderer.getRenderTarget(), clear = renderer.getClearColor(new THREE.Color()), alpha = renderer.getClearAlpha();
      renderer.setClearColor(float ? 0x000000 : 0x808000, 1);
      for (const t of targets.trail) { renderer.setRenderTarget(t); renderer.clear(); }
      renderer.setClearColor(clear, alpha); renderer.setRenderTarget(previous);
    }
    targets.source.setSize(sw, sh);
    targets.trail.forEach(t => t.setSize(tw, th));
    const previous = renderer.getRenderTarget();
    renderer.setRenderTarget(targets.source);
    renderer.render(world, eye);
    if (trailPending) {
      trailUniforms.previous.value = targets.trail[0].texture;
      trailUniforms.texel.value.set(1 / tw, 1 / th);
      renderer.setRenderTarget(targets.trail[1]);
      renderer.render(trailScene, camera);
      targets.trail.reverse();
      trailPending = false;
    }
    renderer.setRenderTarget(previous);
    uniforms.source.value = targets.source.texture;
    uniforms.trail.value = targets.trail[0].texture;
    uniforms.ready.value = 1;
  };

  const lastUv = new THREE.Vector2(-1, -1), uv = new THREE.Vector2();
  return {
    scene, camera, display, uniforms, eye,
    update(frame: DotMatrixFrame) {
      const ease = (tau: number) => 1 - Math.exp(-frame.dt / tau);
      uniforms.micro.value = Math.max(1, Math.round(size.ratio * frame.cellCss / cellMicro));
      uniforms.time.value = frame.reduced ? 0 : frame.seconds;
      uniforms.lens.value += (Number(frame.hovering) * (1 - frame.excursion) - uniforms.lens.value) * ease(0.25);
      uniforms.mouse.value.set((frame.pointer.x * 0.5 + 0.5) * size.width * size.ratio, (frame.pointer.y * 0.5 + 0.5) * size.height * size.ratio);
      uv.set(frame.pointer.x * 0.5 + 0.5, frame.pointer.y * 0.5 + 0.5);
      trailUniforms.from.value.copy(lastUv.x < 0 ? uv : lastUv);
      trailUniforms.to.value.copy(uv);
      trailUniforms.drawing.value = Number(frame.hovering && !frame.reduced);
      trailUniforms.decay.value = Math.exp(-frame.dt / 0.45);
      lastUv.copy(uv);
      trailPending = true;
    },
    resize(width: number, height: number, fov: number) {
      size = { width: Math.max(1, width), height: Math.max(1, height), ratio: Math.min(window.devicePixelRatio || 1, 1.5) };
      eye.aspect = camera.aspect = size.width / size.height;
      eye.fov = fov;
      eye.updateProjectionMatrix(); camera.updateProjectionMatrix();
      uniforms.resolution.value.set(Math.round(size.width * size.ratio), Math.round(size.height * size.ratio));
      uniforms.lensRadius.value = (width < 700 ? 80 : 130) * size.ratio;
      uniforms.story.value = width >= 700 && width / Math.max(1, height) >= 0.9 ? 1 : 2;
      trailUniforms.aspect.value = eye.aspect;
    },
    dispose() {
      quad.dispose(); display.material.dispose(); trailMaterial.dispose();
      if (targets) { targets.source.dispose(); targets.trail.forEach(t => t.dispose()); targets = null; }
      scene.clear(); trailScene.clear();
    },
  };
}
export type DotMatrix = ReturnType<typeof createDotMatrix>;
