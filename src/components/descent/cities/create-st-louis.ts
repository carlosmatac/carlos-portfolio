import * as THREE from "three";
import type { CityFrame, CityQuality, CityScene } from "./types";
import { ST_LOUIS_ART, stLouisComposition } from "./st-louis-art";

const CAMERA_Z = 100;
const FOV = 42;

export function createStLouis(quality: CityQuality = "desktop"): CityScene {
  const scene = new THREE.Scene();
  scene.name = "StLouis_Arch_Above_Clouds";
  scene.userData.assetStage = "render";
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 400);
  const root = new THREE.Group();
  root.name = "CityRoot";
  scene.add(root);
  const geometry = new THREE.PlaneGeometry(1, 1);
  let disposed = false, failed = false, loaded = 0;
  const loader = new THREE.TextureLoader();
  const textures: THREE.Texture[] = [];
  function load(path: string) {
    const texture = loader.load(path, image => {
      if (disposed) { image.dispose(); return; }
      loaded++;
    }, undefined, () => { if (!disposed) failed = true; });
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.push(texture);
    return texture;
  }
  const archTexture = load(ST_LOUIS_ART[quality].arch);
  const cloudTexture = load(ST_LOUIS_ART[quality].clouds);
  const backdrop = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { focus: { value: new THREE.Vector2(0.7, 0.65) }, aspect: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy*2.0,0.999,1.0);}`,
    fragmentShader: `
      varying vec2 vUv; uniform vec2 focus; uniform float aspect;
      void main(){
        vec2 p=(vUv-focus)*vec2(aspect,1.0);
        float haze=exp(-dot(p,p)*3.4);
        float horizon=exp(-pow((vUv.y-0.3)*6.0,2.0));
        vec3 color=mix(vec3(0.001,0.0015,0.003),vec3(0.012,0.023,0.045),haze);
        color+=vec3(0.01,0.005,0.006)*horizon*haze;
        gl_FragColor=vec4(color,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(geometry, backdrop);
  sky.name = "Sky_Backdrop";
  sky.frustumCulled = false;
  sky.renderOrder = -100;
  root.add(sky);
  function plate(name: string, map: THREE.Texture, color: number, opacity: number, depth: number, order: number) {
    const material = new THREE.MeshBasicMaterial({ map, color, opacity, transparent: true, depthWrite: false, alphaTest: 0.002 });
    const object = new THREE.Mesh(geometry, material);
    object.name = name;
    object.position.z = depth;
    object.renderOrder = order;
    root.add(object);
    return object;
  }
  const archMaterial = new THREE.ShaderMaterial({
    uniforms: { map: { value: archTexture } }, transparent: true, depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
      varying vec2 vUv; uniform sampler2D map;
      void main(){
        gl_FragColor=texture2D(map,vUv);
        gl_FragColor.a*=smoothstep(0.2,0.37,vUv.y);
        if(gl_FragColor.a<0.002) discard;
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const arch = new THREE.Mesh(geometry, archMaterial);
  arch.name = "Landmark_Arch";
  arch.renderOrder = 1;
  root.add(arch);
  const clouds = [
    plate("Clouds_Background", cloudTexture, 0x748bb7, 0.5, -14, 0),
    plate("Clouds_Foreground", cloudTexture, 0xa8b7d5, 1, 18, 2),
    plate("Clouds_Near_Veil", cloudTexture, 0x637089, 0.78, 30, 3),
  ];
  let width = 1, height = 1;
  let composition = stLouisComposition(width, height);
  let current: CityFrame = { arrivalT: 1, visitT: 0, departureT: 0, ambientSeconds: 0, reduced: false };
  function viewHeight(depth: number) {
    return 2 * (CAMERA_Z - depth) * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  }
  const api: CityScene = {
    id: "st-louis-sky", assetStage: "render", scene, camera,
    get status() { return disposed ? "disposed" : failed ? "error" : loaded === 2 ? "ready" : "loading"; },
    update(frame) {
      current = frame;
      const arrival = frame.reduced ? 0 : 1 - frame.arrivalT, departure = frame.reduced ? 0 : frame.departureT;
      camera.position.set(0, 0, CAMERA_Z + arrival * 20 + departure * 24);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
      clouds.forEach((cloud, index) => {
        const layout = composition.clouds[index];
        const drift = frame.reduced ? 0 : (Math.sin(frame.ambientSeconds * 0.045 + index * 1.7) - Math.sin(index * 1.7)) * 0.006;
        const h = viewHeight(cloud.position.z);
        cloud.position.x = (layout.x - 0.5 + drift) * h * camera.aspect;
      });
    },
    resize(w, h) {
      width = Math.max(1, w); height = Math.max(1, h);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      composition = stLouisComposition(width, height);
      const view = viewHeight(0), layout = composition.arch;
      arch.scale.set(view * layout.height * ST_LOUIS_ART.archAspect, view * layout.height, 1);
      arch.position.set((layout.x - 0.5) * view * camera.aspect, (0.5 - layout.y) * view, 0);
      clouds.forEach((cloud, index) => {
        const layer = composition.clouds[index], layerView = viewHeight(cloud.position.z);
        const layerWidth = layerView * camera.aspect * layer.width;
        cloud.scale.set(layerWidth * (index === 2 ? -1 : 1), layerWidth / 2, 1);
        cloud.position.y = (0.5 - layer.y) * layerView;
      });
      backdrop.uniforms.focus.value.set(layout.x, 1 - layout.y + 0.1);
      backdrop.uniforms.aspect.value = camera.aspect;
      api.update(current);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      geometry.dispose(); backdrop.dispose();
      arch.material.dispose(); clouds.forEach(cloud => cloud.material.dispose());
      textures.forEach(texture => texture.dispose());
      scene.clear();
    },
  };
  api.resize(1440, 900, quality);
  return api;
}
