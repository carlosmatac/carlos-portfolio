import * as THREE from "three";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import type { PixelPassage } from "./pixel-passage";

/**
 * Composites the Earth and a city through an LED mosaic. Each tile samples one colour; a front of tiles flips
 * over (scaling through its horizontal axis and flaring as it turns) from the Earth to the city. The front's
 * shape is the city's pattern. Outside a passage, the active scene renders straight to the screen.
 */
const FRAGMENT = /* glsl */ `
  in vec2 vUv; out vec4 outColor;
  #define gl_FragColor outColor
  uniform sampler2D earth; uniform sampler2D city;
  uniform vec2 resolution; uniform float tile; uniform float flip; uniform float gap; uniform int pattern; uniform float aspect;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  /** When each tile turns, from 0 (first) to 1 (last). */
  float threshold(vec2 id, vec2 uv) {
    vec2 c = (uv - 0.5) * vec2(aspect, 1.0);
    float jitter = hash(id), t;
    if (pattern == 0) t = length(c) / length(vec2(aspect, 1.0) * 0.5);
    else if (pattern == 1) t = clamp(1.0 - uv.y + 0.07 * sin(uv.x * 11.0) - 0.07, 0.0, 1.0);
    else if (pattern == 2) {
      float rows = floor(resolution.y / tile), row = floor(uv.y * rows);
      t = (rows - 1.0 - row) / max(rows - 1.0, 1.0) * 0.82 + (mod(row, 2.0) < 0.5 ? uv.x : 1.0 - uv.x) * 0.18;
    }
    else if (pattern == 3) {
      float r = length(c) / length(vec2(aspect, 1.0) * 0.5), a = atan(c.y, c.x) / 6.2831853 + 0.5;
      t = clamp(r * 0.62 + fract(a + r * 1.4) * 0.38, 0.0, 1.0);
    }
    else t = noise(uv * vec2(aspect, 1.0) * 3.2) * 0.75 + noise(uv * 11.0) * 0.25;
    return clamp(t * 0.86 + jitter * 0.14, 0.0, 1.0);
  }
  void main() {
    vec2 pixel = vUv * resolution;
    vec2 id = floor(pixel / tile), centre = (id + 0.5) * tile, uvc = centre / resolution;
    vec2 local = (pixel - centre) / (tile * 0.5);
    float width = 0.22;
    float turn = clamp((flip * (1.0 + width) - threshold(id, uvc)) / width, 0.0, 1.0);
    float flare = sin(3.14159265 * turn);
    // The tile scales through its horizontal axis: Earth on the front, city on the back.
    float face = max(abs(cos(3.14159265 * turn)), 0.001);
    float body = 1.0 - gap * (1.0 - flare);
    vec2 q = abs(local) / vec2(body, body * face);
    // Rounded square: the corners soften only once there is grout between the tiles.
    float radius = 0.35 * clamp(gap / 0.2, 0.0, 1.0);
    vec2 d = q - (1.0 - radius);
    float edge = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - radius;
    float inside = 1.0 - smoothstep(-0.06, 0.0, edge);
    // Large tiles show one colour; as they shrink the picture comes back at full detail.
    float coarse = smoothstep(1.5, 5.0, tile);
    bool back = turn >= 0.5;
    vec3 flat_ = back ? texture(city, uvc).rgb : texture(earth, uvc).rgb;
    vec3 fine = back ? texture(city, vUv).rgb : texture(earth, vUv).rgb;
    vec3 colour = mix(fine, flat_, coarse);
    // Turning tiles catch the light; a cool rim at the moment they stand edge-on.
    colour = colour * (1.0 + 1.4 * flare) + vec3(0.32, 0.36, 0.55) * flare * flare * 0.55;
    vec3 grout = mix(fine, flat_, 0.6) * 0.12;
    outColor = vec4(mix(grout, colour, mix(1.0, inside, coarse)), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

export function createTransition(renderer: THREE.WebGLRenderer) {
  const type = renderer.extensions.has("EXT_color_buffer_float") ? THREE.HalfFloatType : THREE.UnsignedByteType;
  const targets = [0, 1].map(() => {
    const target = new THREE.WebGLRenderTarget(1, 1, { type });
    target.texture.colorSpace = THREE.LinearSRGBColorSpace;
    return target;
  });
  const [earthTarget, cityTarget] = targets;
  const material = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, depthTest: false, depthWrite: false,
    uniforms: {
      earth: { value: earthTarget.texture }, city: { value: cityTarget.texture }, resolution: { value: new THREE.Vector2(1, 1) },
      tile: { value: 1 }, flip: { value: 0 }, gap: { value: 0 }, pattern: { value: 0 }, aspect: { value: 1 },
    },
    vertexShader: `out vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: FRAGMENT,
  });
  const quad = new FullScreenQuad(material);
  const preparation = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  let css = { width: 1, height: 1, ratio: 1 }, largest = 34;

  function draw(scene: THREE.Scene, camera: THREE.Camera, target: THREE.WebGLRenderTarget | null) {
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
  }
  return {
    /** Uploads a city's textures and compiles its shaders before the passage needs them. */
    prepare(scene: THREE.Scene, camera: THREE.Camera) {
      const textures = new Set<THREE.Texture>();
      scene.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        for (const used of Array.isArray(object.material) ? object.material : [object.material]) {
          const uniforms = used instanceof THREE.ShaderMaterial ? Object.values(used.uniforms).map(u => u.value) : [];
          for (const value of [...Object.values(used), ...uniforms]) if (value instanceof THREE.Texture) textures.add(value);
        }
      });
      textures.forEach(texture => renderer.initTexture(texture));
      const previous = renderer.getRenderTarget();
      renderer.setRenderTarget(cityTarget);
      renderer.compile(scene, camera);
      renderer.setRenderTarget(null);
      renderer.compile(preparation, camera);
      renderer.setRenderTarget(previous);
    },
    resize(width: number, height: number, pixelRatio: number, tileCss: number) {
      css = { width, height, ratio: pixelRatio };
      largest = tileCss;
      targets.forEach(target => target.setSize(Math.max(1, Math.round(width * pixelRatio)), Math.max(1, Math.round(height * pixelRatio))));
      material.uniforms.resolution.value.set(Math.max(1, Math.round(width * pixelRatio)), Math.max(1, Math.round(height * pixelRatio)));
      material.uniforms.aspect.value = width / Math.max(1, height);
    },
    render(earth: THREE.Scene, earthCamera: THREE.Camera, city: THREE.Scene | null, cityCamera: THREE.Camera | null,
      passage: PixelPassage | null, pattern = 0) {
      const urban = city && cityCamera ? { scene: city, camera: cityCamera } : null;
      const passing = passage && passage.depth > 0 && passage.depth < 1 && (passage.mosaic > 0.001 || (passage.flip > 0 && passage.flip < 1));
      if (!passing) {
        // At rest: the scene itself, at full resolution and with no extra pass.
        if (urban && passage?.scene === "city") draw(urban.scene, urban.camera, null);
        else draw(earth, earthCamera, null);
        return;
      }
      // Only the scenes some tile is showing are rendered.
      const showEarth = passage.flip < 1 || !urban, showCity = urban && passage.flip > 0;
      if (showEarth) draw(earth, earthCamera, earthTarget);
      if (showCity) draw(urban.scene, urban.camera, cityTarget);
      material.uniforms.city.value = showCity ? cityTarget.texture : earthTarget.texture;
      material.uniforms.earth.value = showEarth ? earthTarget.texture : cityTarget.texture;
      const tileCss = 1 + (largest - 1) * passage.mosaic;
      material.uniforms.tile.value = tileCss * css.ratio;
      material.uniforms.flip.value = urban ? passage.flip : 0;
      material.uniforms.gap.value = 0.2 * Math.min(1, Math.max(0, (tileCss - 5) / 12));
      material.uniforms.pattern.value = pattern;
      renderer.setRenderTarget(null);
      quad.render(renderer);
    },
    dispose() { targets.forEach(target => target.dispose()); material.dispose(); quad.dispose(); preparation.geometry.dispose(); },
  };
}
