import { clamp01 } from "./easing";

/** Seconds. 95% of a step settles in about 1.26 s, independent of frame rate. */
export const MOTION_TAU = 0.42;
const MAX_DELTA_SECONDS = 0.25;

/** Quintic smootherstep. Velocity and acceleration are zero at 0 and 1. */
export function smootherstep(t: number) {
  const x = clamp01(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

export function flightEase(t: number) {
  const x = clamp01(t);
  const onset = 0.75 * x * (1 - Math.exp(-x / 0.018));
  return smootherstep(x) + onset * (1 - smootherRange(0.08, 0.5, x));
}

export function orbitalAltitude(t: number) {
  return Math.sin(clamp01(t / 0.34) * Math.PI / 2)
    * Math.sin(clamp01((1 - t) / 0.34) * Math.PI / 2);
}

export function smootherRange(from: number, to: number, value: number) {
  return smootherstep((value - from) / (to - from));
}

/**
 * Frame-rate independent exponential damping.
 * alpha = 1 - exp(-delta / tau)
 */
export function damp(current: number, target: number, deltaSeconds: number, tau = MOTION_TAU) {
  if (tau <= 0) return target;
  const delta = Math.min(Math.max(deltaSeconds, 0), MAX_DELTA_SECONDS);
  const alpha = 1 - Math.exp(-delta / tau);
  return current + (target - current) * alpha;
}

const EARTH_RADIUS = 3.3;
const EARTH_FOV = 42;

/** Camera distance for a centered sphere filling `kHeight` of the viewport height. */
export function earthCameraDistance(kHeight: number, radius = EARTH_RADIUS, fovDegrees = EARTH_FOV) {
  const tanHalf = Math.tan((fovDegrees * Math.PI) / 360);
  return radius * Math.sqrt(1 + 1 / (kHeight * tanHalf) ** 2);
}

export type EarthFraming = {
  visitDistance: number;
  transitDistance: number;
  offsetX: number;
  offsetY: number;
};

/**
 * Visit and transit sizes from MOTION-AND-ARCHITECTURE §2.
 * Mobile targets are fractions of width, converted to height before the distance formula.
 */
export function earthFraming(width: number, height: number): EarthFraming {
  const safeHeight = Math.max(height, 1);
  const aspect = width / safeHeight;
  if (width < 700) {
    return {
      visitDistance: earthCameraDistance(1.0 * aspect),
      transitDistance: earthCameraDistance(0.9 * aspect),
      offsetX: 0,
      offsetY: safeHeight * 0.24,
    };
  }
  if (width < 1024) {
    return {
      visitDistance: earthCameraDistance(1.15),
      transitDistance: earthCameraDistance(0.95),
      offsetX: -width * 0.08,
      offsetY: 0,
    };
  }
  return {
    visitDistance: earthCameraDistance(1.35),
    transitDistance: earthCameraDistance(1.0),
    offsetX: -width * 0.12,
    offsetY: 0,
  };
}
