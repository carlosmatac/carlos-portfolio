import * as THREE from "three";
import { createCloudVolume } from "../clouds/cloud-volume";
import {
  assembly, CLUSTERS, madridCamera, madridView, nearest, pipelines, random, sampleEmbeddings, sampleTowers, TOWERS,
  type MadridView,
} from "./madrid-art";
import { createPointField, disposeScene, type CloudItem } from "./point-cloud";
import { trackPointer } from "./pointer";
import type { CityFrame, CityQuality, CityScene } from "./types";

type Vec3 = [number, number, number];
export type MadridScene = CityScene & { readonly neighbours: { index: number; distance: number }[] };

export function createMadrid(quality: CityQuality = "desktop"): MadridScene {
  const mobile = quality === "mobile";
  const atmosphere = createCloudVolume(quality);
  const rng = random(28);
  const scene = new THREE.Scene();
  scene.name = "Madrid_Data_Skyline";
  scene.userData.technique = "Cuatro Torres as sampled point clouds with ETL pipelines and an embedding space queried by the cursor.";
  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 3000);
  const field = createPointField(scene, rng), { cloud, scatterOf } = field, pointMaterial = field.material;

  const sky = new THREE.Mesh(new THREE.SphereGeometry(2400, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 vDir; void main(){
      float y = max(vDir.y, 0.0);
      vec3 c = mix(vec3(0.07, 0.035, 0.08), vec3(0.02, 0.018, 0.05), smoothstep(0.0, 0.12, y));
      c = mix(c, vec3(0.003, 0.004, 0.012), smoothstep(0.1, 0.55, y));
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  }));
  sky.name = "Sky"; sky.renderOrder = -1;
  scene.add(sky);

  // The Cuatro Torres: floor rings read like rows of a table; lit rows are amber, crowns carry plus signs.
  const towers = sampleTowers().map(s => {
    const crown = s.position[1] > TOWERS[s.tower].height * 0.93;
    return {
      position: s.position, normal: s.normal, scatter: scatterOf(s.position, 70, 50),
      colour: (s.lit ? [1.2, 0.72, 0.3] : crown ? [0.8, 0.7, 1.15] : [0.3, 0.35, 0.72]) as Vec3,
      size: s.lit ? 0.75 : 0.6, shape: crown ? 1 : 4,
    };
  });
  cloud("Cuatro_Torres", towers, pointMaterial());

  // Ground: a dim data lake grid, brighter along the Castellana, with drifting fog between the bases.
  const ground: CloudItem[] = [];
  const step = mobile ? 2.8 : 2.2;
  for (let x = -170; x <= 170; x += step) for (let z = -170; z <= 90; z += step) {
    if (TOWERS.some(t => Math.hypot(x - t.x, z - t.z) < 8)) continue;
    const avenue = Math.abs(z - 16) < 3;
    const p: Vec3 = [x + (rng() - 0.5) * 0.4, 0, z + (rng() - 0.5) * 0.4];
    ground.push({ position: p, scatter: scatterOf(p, 40, 10), colour: avenue ? [0.3, 0.3, 0.55] : [0.09, 0.1, 0.22], size: 0.5, shape: rng() < 0.08 ? 1 : 0 });
  }
  cloud("Data_Lake", ground, pointMaterial());
  const fog = Array.from({ length: mobile ? 1400 : 2600 }, () => {
    const p: Vec3 = [-180 + rng() * 360, rng() * rng() * 12, -120 + rng() * 170];
    return { position: p, scatter: scatterOf(p, 30, 5), colour: [0.2, 0.16, 0.3] as Vec3, size: 0.9, shape: 0 };
  });
  cloud("Fog", fog, pointMaterial({ FOG: "" }));

  // Embedding space: clustered points above the skyline that the cursor queries.
  const embeddingSamples = sampleEmbeddings(mobile ? 1100 : 1900);
  const embeddings = cloud("Embeddings", embeddingSamples.map(e => ({
    position: e.position, scatter: scatterOf(e.position, 50, 30), colour: CLUSTERS[e.cluster].colour.map(c => c * 0.55) as Vec3,
    size: 1.15, shape: e.cluster % 2 ? 3 : 1,
  })), pointMaterial({ SKY: "" }));
  const highlight = embeddings.geometry.attributes.aHighlight as THREE.BufferAttribute;

  // Aviation lights on the four crowns.
  const beacons = cloud("Beacons", TOWERS.map(t => {
    const p: Vec3 = [t.x, t.height + 1.5, t.z];
    return { position: p, scatter: p, colour: [3, 0.25, 0.15] as Vec3, size: 1.4, shape: 0 };
  }), pointMaterial());

  // Pipelines: faint guides plus moving packets; the Castellana carries two lanes of traffic.
  const curves = pipelines();
  const lanes: [Vec3, Vec3, Vec3, Vec3][] = [
    [[180, 0.4, 14.5], [60, 0.4, 14.5], [-60, 0.4, 14.5], [-180, 0.4, 14.5]],
    [[-180, 0.4, 17.5], [-60, 0.4, 17.5], [60, 0.4, 17.5], [180, 0.4, 17.5]],
  ];
  const guides: number[] = [];
  curves.forEach(([a, b, c, d]) => {
    const at = (t: number) => { const u = 1 - t; return [0, 1, 2].map(i => u * u * u * a[i] + 3 * u * u * t * b[i] + 3 * u * t * t * c[i] + t * t * t * d[i]); };
    for (let i = 0; i < 40; i++) guides.push(...at(i / 40), ...at((i + 1) / 40));
  });
  const guideGeometry = new THREE.BufferGeometry();
  guideGeometry.setAttribute("position", new THREE.Float32BufferAttribute(guides, 3));
  const guideLines = new THREE.LineSegments(guideGeometry, new THREE.LineBasicMaterial({ color: new THREE.Color(0.1, 0.09, 0.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  guideLines.name = "Pipeline_Guides";
  scene.add(guideLines);
  field.packets("Pipelines", [
    ...curves.map((curve, i) => ({ curve, count: i < 4 ? 10 : 6, speed: i < 4 ? 0.06 : 0.1, from: [0.3, 0.95, 1.2] as Vec3, to: [0.9, 0.5, 1.4] as Vec3, size: 1.1, tail: 4 })),
    { curve: lanes[0], count: mobile ? 26 : 44, speed: 0.035, from: [1.6, 1.5, 1.3], to: [1.6, 1.5, 1.3], size: 0.9, tail: 3 },
    { curve: lanes[1], count: mobile ? 26 : 44, speed: 0.035, from: [1.6, 0.18, 0.12], to: [1.6, 0.18, 0.12], size: 0.9, tail: 3 },
  ]);

  // Nearest-neighbour links drawn from the closest embedding to the next ones: a vector search made visible.
  const K = 12;
  const linkGeometry = new THREE.BufferGeometry();
  linkGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(K * 4 * 3), 3));
  const links = new THREE.LineSegments(linkGeometry, new THREE.LineBasicMaterial({ color: new THREE.Color(0.9, 0.65, 0.42), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  links.name = "Neighbour_Links"; links.frustumCulled = false;
  scene.add(links);

  const cursor = trackPointer(), uniforms = field.uniforms;

  let view: MadridView = madridView(1440, 900), size = { width: 1440, height: 900 }, disposed = false, lastSeconds = 0;
  let current: CityFrame = { arrivalT: 1, visitT: 0, departureT: 0, ambientSeconds: 0, reduced: false };
  const follow = { x: 0, y: 0 }, projected = new Float32Array(embeddingSamples.length * 2), glow = new Float32Array(embeddingSamples.length);
  const worldPoint = new THREE.Vector3(), lit = new Set<number>();
  let neighbours: { index: number; distance: number }[] = [];
  const api: MadridScene = {
    id: "madrid-latent", assetStage: "render", scene, camera, atmosphere,
    get status() { return disposed ? "disposed" : atmosphere.status === "error" ? "error" : atmosphere.status === "ready" ? "ready" : "loading"; },
    get neighbours() { return neighbours; },
    update(frame) {
      current = frame;
      const seconds = frame.ambientSeconds, dt = Math.min(0.1, Math.max(0, seconds - lastSeconds));
      lastSeconds = seconds;
      const ease = (tau: number) => 1 - Math.exp(-dt / tau);
      const hovering = cursor.hovering(seconds), pointer = cursor.state;
      follow.x += ((hovering ? pointer.x : 0) - follow.x) * ease(0.9);
      follow.y += ((hovering ? pointer.y : 0) - follow.y) * ease(0.9);
      const excursion = frame.reduced ? 0 : 1 - frame.arrivalT * (1 - frame.departureT);
      const pose = madridCamera(view, excursion, frame.reduced ? [0, 0] : [follow.x, follow.y]);
      camera.position.set(...pose.position); camera.lookAt(...pose.target); camera.updateMatrixWorld();
      sky.position.copy(camera.position);

      field.update({ seconds, dt, hovering, pointer, excursion, reduced: frame.reduced, assemble: assembly(frame.arrivalT, frame.departureT, frame.reduced) });
      beacons.visible = frame.reduced || seconds % 1.5 < 0.5;

      // Touch and idle visitors see a slow automatic query drifting through the clusters.
      const query: [number, number] = hovering ? [pointer.x, pointer.y] : [0.35 + 0.35 * Math.sin(seconds * 0.11), 0.55 + 0.2 * Math.sin(seconds * 0.17)];
      embeddings.updateMatrixWorld();
      for (let i = 0; i < embeddingSamples.length; i++) {
        worldPoint.set(...embeddingSamples[i].position).project(camera);
        projected[i * 2] = worldPoint.z < 1 ? (worldPoint.x * 0.5 + 0.5) * size.width : -1e5;
        projected[i * 2 + 1] = (0.5 - worldPoint.y * 0.5) * size.height;
      }
      const active = uniforms.assemble.value > 0.9;
      neighbours = active ? nearest(projected, [(query[0] * 0.5 + 0.5) * size.width, (0.5 - query[1] * 0.5) * size.height], K, size.width < 700 ? 120 : 190, size.width < 700 ? 16 : 26) : [];
      const decay = frame.reduced ? 0 : Math.exp(-dt / 0.35);
      lit.forEach(i => { glow[i] *= decay; if (glow[i] < 0.01) { glow[i] = 0; lit.delete(i); } });
      neighbours.forEach((n, rank) => { glow[n.index] = Math.max(glow[n.index], 1 - rank / (K + 2)); lit.add(n.index); });
      lit.forEach(i => highlight.setX(i, glow[i]));
      for (let i = 0; i < highlight.count; i++) if (!lit.has(i) && highlight.getX(i) !== 0) highlight.setX(i, 0);
      highlight.needsUpdate = true;

      const segments = linkGeometry.attributes.position as THREE.BufferAttribute;
      let v = 0;
      if (neighbours.length) {
        // The query vector sits under the cursor at the depth of its best match; links fan out to the top-k.
        const depth = worldPoint.set(...embeddingSamples[neighbours[0].index].position).project(camera).z;
        const origin = worldPoint.set(query[0], query[1], depth).unproject(camera).clone();
        neighbours.forEach((n, i) => {
          segments.setXYZ(v++, origin.x, origin.y, origin.z); segments.setXYZ(v++, ...embeddingSamples[n.index].position);
          if (i) { segments.setXYZ(v++, ...embeddingSamples[neighbours[i - 1].index].position); segments.setXYZ(v++, ...embeddingSamples[n.index].position); }
        });
      }
      linkGeometry.setDrawRange(0, v);
      segments.needsUpdate = true;
    },
    resize(width, height) {
      view = madridView(width, height);
      size = { width: Math.max(1, width), height: Math.max(1, height) };
      camera.aspect = size.width / size.height; camera.fov = view.fov; camera.updateProjectionMatrix();
      field.resize(size.width, size.height, view.fov);
      api.update(current);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cursor.dispose(); field.dispose();
      disposeScene(scene); atmosphere.dispose();
    },
  };
  api.resize(1440, 900, quality);
  return api;
}
