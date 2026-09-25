import * as THREE from "three";
import { places } from "@/content/places";
import type { EarthFrame } from "./earth-journey";

const RADIUS = 3.3;
const radians = THREE.MathUtils.degToRad;
export function locationVector(latitude: number, longitude: number) {
  const lat = radians(latitude), lon = radians(longitude);
  return new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon));
}
function orientation(latitude: number, longitude: number) {
  return new THREE.Quaternion().setFromEuler(new THREE.Euler(radians(latitude), radians(-90 - longitude), 0, "XYZ"));
}

/** Local, attributed maps with a procedural day/night terminator and atmosphere. */
export function createEarth(scene: THREE.Scene, anisotropy: number, maxTextureSize = 8192) {
  const root = new THREE.Group();
  root.position.set(0, 0.57 - 85, 0.9 - 240 - 18);
  scene.add(root);
  const globe = new THREE.Group();
  root.add(globe);
  let disposed = false;
  const loader = new THREE.TextureLoader();
  const textures: THREE.Texture[] = [];
  const highDetail = window.innerWidth >= 900 && maxTextureSize >= 8192;
  const mediumDetail = maxTextureSize >= 4096;
  function map(name: string, color = true) {
    const texture = loader.load(`/textures/earth/${name}`, loaded => {
      if (disposed) loaded.dispose();
    }, undefined, () => {
      if (disposed || name.endsWith(".jpg")) return;
      // Keep an image on devices/network paths that cannot load the detailed maps.
      const fallback = name.startsWith("day") ? "day.jpg" : "clouds.jpg";
      loader.load(`/textures/earth/${fallback}`, loaded => {
        if (!disposed) {
          texture.image = loaded.image;
          texture.needsUpdate = true;
        }
        loaded.dispose();
      });
    });
    texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.anisotropy = Math.min(8, anisotropy);
    textures.push(texture);
    return texture;
  }
  const vertex = `varying vec2 vUv; varying vec3 vNormal; varying vec3 vPosition;
    void main(){vUv=uv;vNormal=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.0);vPosition=p.xyz;gl_Position=projectionMatrix*p;}`;
  const surface = new THREE.ShaderMaterial({
    uniforms: { uDay: {value:map(highDetail ? "day-8k.webp" : mediumDetail ? "day-4k.webp" : "day.jpg")}, uNight: {value:map("night.jpg")} },
    vertexShader: vertex,
    fragmentShader: `
      uniform sampler2D uDay; uniform sampler2D uNight;
      varying vec2 vUv; varying vec3 vNormal; varying vec3 vPosition;
      void main(){
        vec3 normal=normalize(vNormal), view=normalize(-vPosition);
        vec3 sun=normalize(vec3(-0.85,0.45,0.9));
        float light=dot(normal,sun);
        float day=smoothstep(-0.16,0.20,light);
        vec3 land=texture2D(uDay,vUv).rgb;
        vec3 night=texture2D(uNight,vUv).rgb;
        // Cool, restrained colour leaves coastlines and cloud detail readable.
        float luminance=dot(land,vec3(0.2126,0.7152,0.0722));
        land=mix(vec3(luminance)*vec3(0.72,0.88,1.06),land,0.36);
        vec3 color=land*(0.055+max(light,0.0)*1.05);
        color+=night*(1.0-day)*1.8;
        float rim=pow(1.0-max(dot(normal,view),0.0),3.6);
        color+=vec3(0.08,0.21,0.34)*rim*(0.2+day*0.45);
        gl_FragColor=vec4(color,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(RADIUS, 160, 96), surface));
  const cloudsMaterial = new THREE.ShaderMaterial({
    uniforms: {uClouds:{value:map(highDetail ? "clouds-4k.webp" : "clouds.jpg", false)}}, vertexShader: vertex,
    transparent: true, depthWrite: false,
    fragmentShader:`uniform sampler2D uClouds;varying vec2 vUv;varying vec3 vNormal;
      void main(){float clouds=texture2D(uClouds,vUv).r;float light=max(dot(normalize(vNormal),normalize(vec3(-0.85,0.45,0.9))),0.0);
      gl_FragColor=vec4(vec3(0.5,0.64,0.8)*(0.12+light),smoothstep(0.10,0.9,clouds)*0.64);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  });
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(RADIUS + 0.025, 80, 48), cloudsMaterial);
  globe.add(clouds);
  const atmosphereMaterial = new THREE.ShaderMaterial({
    vertexShader: vertex, side: THREE.BackSide, transparent: true, depthWrite:false, blending:THREE.AdditiveBlending,
    fragmentShader:`varying vec3 vNormal;varying vec3 vPosition;
      void main(){float rim=pow(1.0-abs(dot(normalize(vNormal),normalize(-vPosition))),3.5);
      gl_FragColor=vec4(vec3(0.15,0.32,0.5)*rim,rim*0.35);}`,
  });
  root.add(new THREE.Mesh(new THREE.SphereGeometry(RADIUS + 0.095, 96, 64), atmosphereMaterial));

  const markers = places.map(place => {
    const group = new THREE.Group();
    const direction = locationVector(place.latitude, place.longitude);
    group.position.copy(direction).multiplyScalar(RADIUS + 0.065);
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), direction);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.024,12,8),new THREE.MeshBasicMaterial({color:0xf2dcad}));
    group.add(dot);
    const ringMaterial = new THREE.MeshBasicMaterial({color:0xf2dcad, transparent:true,opacity:0.5,side:THREE.DoubleSide,depthWrite:false});
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.052,0.058,48),ringMaterial);
    group.add(ring);globe.add(group);
    return {group,ring,ringMaterial};
  });
  const arcs = places.slice(0,-1).map((place,index) => {
    const a=locationVector(place.latitude,place.longitude);
    const b=locationVector(places[index+1].latitude,places[index+1].longitude);
    const angle=a.angleTo(b);
    const points=Array.from({length:65},(_,i)=>{
      const t=i/64;
      return a.clone().multiplyScalar(Math.sin((1-t)*angle)/Math.sin(angle))
        .addScaledVector(b,Math.sin(t*angle)/Math.sin(angle))
        .multiplyScalar(RADIUS+0.045+Math.sin(t*Math.PI)*Math.min(0.6,angle*0.5));
    });
    const material = new THREE.LineBasicMaterial({color:0xc8c0a2,transparent:true,opacity:0.3});
    const arc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),material);
    globe.add(arc);
    return arc;
  });
  const rotations = places.map(p=>orientation(p.latitude,p.longitude));
  const initial = orientation(15,-35);
  const destination = new THREE.Quaternion();
  const drift = new THREE.Quaternion();
  return {
    root,
    update(frame: EarthFrame, seconds: number, reduced: boolean) {
      root.visible=frame.visible>0.001;
      root.scale.setScalar(Math.max(0.001, frame.visible));
      destination.copy(rotations[frame.from]).slerp(rotations[frame.to],frame.turn);
      globe.quaternion.copy(initial).slerp(destination,frame.landing);
      if(!reduced){
        // Small axial drift keeps the globe alive without moving a stop off centre.
        drift.setFromAxisAngle(new THREE.Vector3(0,1,0),Math.sin(seconds*0.12)*0.014);
        globe.quaternion.premultiply(drift);
        clouds.rotation.y=seconds*0.002;
      } else clouds.rotation.y=0;
      markers.forEach(({group,ring,ringMaterial},index)=>{
        group.visible=(index===frame.active || (frame.altitude>0.1 && index===frame.to)) && frame.landing>0.7;
        const pulse=reduced?0.5:(Math.sin(seconds*1.5)+1)/2;
        ring.scale.setScalar(1+pulse*0.6);
        ringMaterial.opacity=0.55-pulse*0.23;
      });
      arcs.forEach((arc,index)=>{arc.visible=index===frame.from && frame.altitude>0.05;});
    },
    dispose(){ disposed=true; textures.forEach(texture=>texture.dispose()); },
  };
}
