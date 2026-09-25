import * as THREE from "three";
import type { CityQuality } from "../cities/types";
import type { CloudVolume } from "./cloud-volume";
import { cloudRaymarch } from "./cloud-shader";

export function createCloudBank(volume: CloudVolume, quality: CityQuality) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    defines: { CLOUD_STEPS: quality === "mobile" ? 20 : 32 },
    side: THREE.BackSide, transparent: true, depthWrite: false, depthTest: false,
    uniforms: { cloudVolume: { value: volume.texture }, cloudDetail: { value: volume.detail }, cloudTime: { value: 0 }, strength: { value: 1 }, tint: { value: new THREE.Vector3(1,1,1) } },
    vertexShader: `
      out vec3 vOrigin; out vec3 vDirection;
      void main(){
        vOrigin=(inverse(modelMatrix)*vec4(cameraPosition,1.0)).xyz;
        vDirection=position-vOrigin;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }`,
    fragmentShader: `
      in vec3 vOrigin; in vec3 vDirection; out vec4 outColor;
      #define gl_FragColor outColor
      uniform float strength; uniform vec3 tint;
      ${cloudRaymarch}
      void main(){
        vec4 cloud=marchCloud(vOrigin,normalize(vDirection),strength);
        if(cloud.a<0.001) discard;
        gl_FragColor=vec4(cloud.rgb/max(cloud.a,0.001)*tint,cloud.a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return {
    mesh,
    update(seconds: number, reduced: boolean) {
      material.uniforms.cloudVolume.value = volume.texture;
      material.uniforms.cloudDetail.value = volume.detail;
      material.uniforms.cloudTime.value = reduced ? 0 : seconds * 0.045;
    },
    resize(quality: CityQuality) {
      const steps = quality === "mobile" ? 20 : 32;
      if (material.defines.CLOUD_STEPS !== steps) { material.defines.CLOUD_STEPS = steps; material.needsUpdate = true; }
    },
    dispose() { geometry.dispose(); material.dispose(); },
  };
}
