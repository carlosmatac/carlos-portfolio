import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { gzipSync } from "node:zlib";
import { CLOUD_ASSETS, createCloudVolume } from "../clouds/cloud-volume";
import { createCloudBank } from "../clouds/create-cloud-bank";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function response(quality: "desktop" | "mobile") {
  const [w,h,d] = CLOUD_ASSETS[quality].size;
  return new Response(new Uint8Array(gzipSync(new Uint8Array(w*h*d*2))));
}

describe("Volumetric clouds", () => {
  it.each(["mobile", "desktop"] as const)("loads compressed linear RG density/light voxels for %s and disposes once", async quality => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(quality)));
    const volume = createCloudVolume(quality);
    expect(volume.status).toBe("loading");
    await volume.ready;
    expect(volume.status).toBe("ready");
    const texture = volume.texture!;
    expect(texture.colorSpace).toBe(THREE.NoColorSpace);
    expect(texture.format).toBe(THREE.RGFormat);
    expect(texture.generateMipmaps).toBe(false);
    expect([texture.image.width, texture.image.height, texture.image.depth]).toEqual(CLOUD_ASSETS[quality].size);
    const dispose = vi.spyOn(texture, "dispose");
    const detailDispose = vi.spyOn(volume.detail!, "dispose");
    volume.dispose(); volume.dispose();
    expect(dispose).toHaveBeenCalledOnce();
    expect(detailDispose).toHaveBeenCalledOnce();
    expect(volume.status).toBe("disposed");
    expect(volume.texture).toBeNull();
  });

  it("aborts pending downloads and ignores their late completion", async () => {
    let resolve!: (value: ReturnType<typeof response>) => void;
    const fetchMock = vi.fn().mockReturnValue(new Promise(r => { resolve = r; }));
    vi.stubGlobal("fetch", fetchMock);
    const volume = createCloudVolume("mobile");
    volume.dispose();
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
    resolve(response("mobile")); await volume.ready;
    expect(volume.status).toBe("disposed");
    expect(volume.texture).toBeNull();
  });

  it.each(["http", "truncated", "oversized", "corrupt", "network"])("reports %s failure without an unhandled rejection", async failure => {
    vi.stubGlobal("fetch", failure === "network" ? vi.fn().mockRejectedValue(new Error("offline"))
      : vi.fn().mockResolvedValue(new Response(failure === "corrupt" ? new Uint8Array(4)
        : new Uint8Array(gzipSync(new Uint8Array(failure === "oversized" ? 128*64*64*2+1 : 4))), { status: failure === "http" ? 404 : 200 })));
    const volume = createCloudVolume("mobile"); await volume.ready;
    expect(volume.status).toBe("error");
    expect(volume.texture).toBeNull();
    volume.dispose();
  });

  it("animates the volume slowly, freezes reduced motion and adapts sampling on resize", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response("mobile")));
    const volume = createCloudVolume("mobile"); await volume.ready;
    const bank = createCloudBank(volume, "mobile");
    bank.update(10, false);
    const material = bank.mesh.material;
    expect(material.uniforms.cloudVolume.value).toBe(volume.texture);
    expect(material.uniforms.cloudTime.value).toBeGreaterThan(0);
    bank.update(100, true);
    expect(material.uniforms.cloudTime.value).toBe(0);
    bank.resize("desktop"); expect(material.defines.CLOUD_STEPS).toBe(32);
    bank.resize("mobile"); expect(material.defines.CLOUD_STEPS).toBe(20);
    bank.dispose(); volume.dispose();
  });
});
