import { clamp01 } from "../easing";
import { smootherRange } from "../motion";

export function cloudPassage(position: number, reduced = false) {
  const depth = clamp01(position);
  return {
    depth,
    scene: depth < 0.44 ? "earth" as const : "city" as const,
    cover: reduced ? 0 : smootherRange(0.08, 0.3, depth) * (1 - smootherRange(0.57, 0.97, depth)),
  };
}
export type CloudPassage = ReturnType<typeof cloudPassage>;

export function cloudFlightEase(t: number) {
  const x = clamp01(t);
  return (1 - (1 - x) ** 3) * (1 - Math.exp(-((x / 0.022) ** 2)));
}


export function cloudPassageEye(position: number) {
  const depth = clamp01(position);
  return [0, 0.75 - depth * 1.5, 1.3 - 1.15 * smootherRange(0, 0.42, depth)] as const;
}
