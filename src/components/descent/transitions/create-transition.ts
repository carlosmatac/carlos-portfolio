import * as THREE from "three";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import type { CloudVolume } from "../clouds/cloud-volume";
import { cloudRaymarch } from "../clouds/cloud-shader";
import { cloudPassageEye, type CloudPassage } from "./cloud-passage";

export function createTransition(renderer: THREE.WebGLRenderer) {
  const type = renderer.extensions.has("EXT_color_buffer_float") ? THREE.HalfFloatType : THREE.UnsignedByteType;
  const target = new THREE.WebGLRenderTarget(1, 1, { type });
  target.texture.colorSpace = THREE.LinearSRGBColorSpace;
  const material = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, defines: { CLOUD_STEPS: 32 },
    uniforms: {
      background: { value: target.texture }, cloudVolume: { value: null as THREE.Data3DTexture | null },
      cloudDetail: { value: null as THREE.Data3DTexture | null }, cloudTime: { value: 0 }, depth: { value: 0 }, cover: { value: 0 }, aspect: { value: 1 }, eye: { value: new THREE.Vector3() }, overlayOnly: { value: false }, cloudsActive: { value: false },
    },
    depthTest: false, depthWrite: false,
    vertexShader: `out vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
      in vec2 vUv; out vec4 outColor;
      #define gl_FragColor outColor
      uniform sampler2D background;
      uniform float depth; uniform float cover; uniform float aspect;
      uniform bool overlayOnly; uniform bool cloudsActive; uniform vec3 eye;
      ${cloudRaymarch}
      void main(){
        if(!cloudsActive) {
          gl_FragColor=texture(background,vUv);
        } else {
        vec2 p=(vUv-0.5)*2.0*0.384;
        vec3 direction=normalize(vec3(p.x*aspect*0.3,p.y*1.06,-1.0));
        vec4 cloud=marchCloud(eye,direction,1.25);
        float envelope=smoothstep(0.0,0.18,depth)*(1.0-smoothstep(0.58,0.98,depth));
        float opacity=max(cover,cloud.a*envelope);
        float light=texture(cloudVolume,vec3(vUv.x*0.32+0.34,0.75-depth*0.5,vUv.y*0.3+0.35)).g;
        vec3 medium=vec3(0.035,0.047,0.068)+vec3(0.05,0.06,0.08)*light;
        vec3 color=mix(medium,cloud.rgb/max(cloud.a,0.001),smoothstep(0.0,0.6,cloud.a));
        gl_FragColor=overlayOnly ? vec4(color,opacity) : vec4(mix(texture(background,vUv).rgb,color,opacity),1.0);
        }
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const overlay = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, defines: { ...material.defines }, uniforms: material.uniforms,
    vertexShader: material.vertexShader, fragmentShader: material.fragmentShader,
    depthTest: false, depthWrite: false, transparent: true,
  });
  const quad = new FullScreenQuad(material);
  const preparation = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), [material, overlay]);
  return {
    prepare(scene: THREE.Scene, camera: THREE.Camera) {
      const textures = new Set<THREE.Texture>();
      scene.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          const uniforms = material instanceof THREE.ShaderMaterial ? Object.values(material.uniforms).map(u => u.value) : [];
          for (const value of [...Object.values(material), ...uniforms]) if (value instanceof THREE.Texture) textures.add(value);
        }
      });
      textures.forEach(texture => renderer.initTexture(texture));
      const previous = renderer.getRenderTarget();
      renderer.setRenderTarget(target);
      renderer.compile(scene, camera);
      renderer.setRenderTarget(null);
      renderer.compile(preparation, camera);
      renderer.setRenderTarget(previous);
    },
    resize(width: number, height: number, pixelRatio: number) {
      target.setSize(Math.max(1, Math.round(width * pixelRatio)), Math.max(1, Math.round(height * pixelRatio)));
      material.uniforms.aspect.value = width / Math.max(1, height);
      const steps = width < 700 ? 20 : 32;
      for (const shader of [material, overlay]) {
        if (shader.defines.CLOUD_STEPS !== steps) { shader.defines.CLOUD_STEPS = steps; shader.needsUpdate = true; }
      }
    },
    render(earth: THREE.Scene, earthCamera: THREE.Camera, city: THREE.Scene | null, cityCamera: THREE.Camera | null,
      passage: CloudPassage | null, volume: CloudVolume | null = null, seconds = 0, reduced = false) {
      const urban = city && cityCamera && passage?.scene === "city";
      const scene = urban ? city : earth, camera = urban ? cityCamera : earthCamera;
      const clouds = !reduced && volume?.texture && passage && passage.depth > 0 && passage.depth < 1;
      renderer.setRenderTarget(urban ? target : null);
      renderer.render(scene, camera);
      material.uniforms.cloudVolume.value = volume?.texture ?? null;
      material.uniforms.cloudDetail.value = volume?.detail ?? null;
      if (!urban && !clouds) return;
      renderer.setRenderTarget(null);
      material.uniforms.cloudTime.value = reduced ? 0 : seconds * 0.045;
      material.uniforms.depth.value = passage?.depth ?? 0;
      material.uniforms.eye.value.fromArray(cloudPassageEye(passage?.depth ?? 0));
      material.uniforms.cover.value = passage?.cover ?? 0;
      material.uniforms.overlayOnly.value = !urban;
      material.uniforms.cloudsActive.value = Boolean(clouds);
      quad.material = urban ? material : overlay;
      const autoClear = renderer.autoClear;
      if (!urban) renderer.autoClear = false;
      try { quad.render(renderer); } finally { renderer.autoClear = autoClear; }
    },
    dispose() { target.dispose(); material.dispose(); overlay.dispose(); quad.dispose(); preparation.geometry.dispose(); },
  };
}
