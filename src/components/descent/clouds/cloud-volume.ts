import * as THREE from "three";
import type { CityQuality } from "../cities/types";

export const CLOUD_ASSETS = {
  desktop: { url: "/textures/clouds/cumulus-desktop.bin.gz", size: [256, 96, 96] as const },
  mobile: { url: "/textures/clouds/cumulus-mobile.bin.gz", size: [128, 64, 64] as const },
};

export function createCloudVolume(quality: CityQuality) {
  const asset = CLOUD_ASSETS[quality], controller = new AbortController();
  let status: "loading" | "ready" | "error" | "disposed" = "loading";
  let texture: THREE.Data3DTexture | null = null, detail: THREE.Data3DTexture | null = null;
  const ready = fetch(asset.url, { signal: controller.signal }).then(async response => {
    if (!response.ok) throw new Error("Cloud volume unavailable");
    const [width, height, depth] = asset.size, expected = width * height * depth * 2;
    let length = 0;
    const limit = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, stream) {
        length += chunk.byteLength;
        if (length > expected) throw new Error("Oversized cloud volume");
        stream.enqueue(chunk);
      },
    });
    const decoded = response.body!.pipeThrough(new DecompressionStream("gzip")).pipeThrough(limit);
    const bytes = new Uint8Array(await new Response(decoded).arrayBuffer());
    if (status === "disposed") return;
    if (bytes.length !== expected) throw new Error("Invalid cloud volume");
    texture = new THREE.Data3DTexture(bytes, width, height, depth);
    texture.name = "Cumulus_Density_And_Light";
    texture.format = THREE.RGFormat;
    texture.minFilter = texture.magFilter = THREE.LinearFilter;
    texture.unpackAlignment = 1;
    texture.needsUpdate = true;
    const noise = new Uint8Array(32 * 32 * 32 * 2);
    let seed = 1987;
    for (let i = 0; i < noise.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      noise[i] = seed >>> 24;
    }
    detail = new THREE.Data3DTexture(noise, 32, 32, 32);
    detail.name = "Cloud_Detail_Noise";
    detail.format = THREE.RGFormat;
    detail.minFilter = detail.magFilter = THREE.LinearFilter;
    detail.wrapS = detail.wrapT = detail.wrapR = THREE.RepeatWrapping;
    detail.unpackAlignment = 1;
    detail.needsUpdate = true;
    status = "ready";
  }).catch(() => { if (status !== "disposed") status = "error"; });
  return {
    ready,
    get status() { return status; },
    get texture() { return texture; },
    get detail() { return detail; },
    dispose() {
      if (status === "disposed") return;
      status = "disposed";
      controller.abort(); texture?.dispose(); detail?.dispose(); texture = null; detail = null;
    },
  };
}
export type CloudVolume = ReturnType<typeof createCloudVolume>;
