import * as THREE from "three";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";

export function createTransition(renderer: THREE.WebGLRenderer) {
  const type = renderer.extensions.has("EXT_color_buffer_float") ? THREE.HalfFloatType : THREE.UnsignedByteType;
  const earthTarget = new THREE.WebGLRenderTarget(1, 1, { type });
  const cityTarget = earthTarget.clone();
  earthTarget.texture.colorSpace = cityTarget.texture.colorSpace = THREE.LinearSRGBColorSpace;
  const material = new THREE.ShaderMaterial({
    uniforms: { earth: { value: earthTarget.texture }, city: { value: cityTarget.texture }, blend: { value: 0 } },
    depthTest: false, depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
      uniform sampler2D earth; uniform sampler2D city; uniform float blend; varying vec2 vUv;
      void main(){
        gl_FragColor=mix(texture2D(earth,vUv),texture2D(city,vUv),blend);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const quad = new FullScreenQuad(material);
  return {
    resize(width: number, height: number, pixelRatio: number) {
      const w = Math.max(1, Math.round(width * pixelRatio)), h = Math.max(1, Math.round(height * pixelRatio));
      earthTarget.setSize(w, h); cityTarget.setSize(w, h);
    },
    render(earth: THREE.Scene, earthCamera: THREE.Camera, city: THREE.Scene | null, cityCamera: THREE.Camera | null, blend: number) {
      if (!city || !cityCamera || blend <= 0) {
        renderer.setRenderTarget(null);
        renderer.render(earth, earthCamera);
      } else if (blend >= 1) {
        renderer.setRenderTarget(null);
        renderer.render(city, cityCamera);
      } else {
        renderer.setRenderTarget(earthTarget);
        renderer.render(earth, earthCamera);
        renderer.setRenderTarget(cityTarget);
        renderer.render(city, cityCamera);
        renderer.setRenderTarget(null);
        material.uniforms.blend.value = blend;
        quad.render(renderer);
      }
    },
    dispose() {
      earthTarget.dispose(); cityTarget.dispose(); material.dispose(); quad.dispose();
    },
  };
}
