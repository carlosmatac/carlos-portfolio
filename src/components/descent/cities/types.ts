import type { PerspectiveCamera, Scene } from "three";
import type { CloudVolume } from "../clouds/cloud-volume";
import type { CitySceneId } from "../journey-config";

export type CityFrame = {
  arrivalT: number;
  visitT: number;
  departureT: number;
  ambientSeconds: number;
  reduced: boolean;
};
export type CityQuality = "desktop" | "mobile";
export type CityScene = {
  id: CitySceneId;
  assetStage: "blockout" | "render" | "final";
  readonly status: "loading" | "ready" | "error" | "disposed";
  scene: Scene;
  camera: PerspectiveCamera;
  atmosphere: CloudVolume;
  update(frame: CityFrame): void;
  resize(width: number, height: number, quality: CityQuality): void;
  dispose(): void;
};
