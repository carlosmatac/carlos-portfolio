import { describe, expect, it } from "vitest";
import { damp, earthCameraDistance, earthFraming, MOTION_TAU, smootherstep, flightEase } from "../motion";

function settle(frames: number, dt: number, tau = MOTION_TAU) {
  let value = 0;
  for (let i = 0; i < frames; i++) value = damp(value, 1, dt, tau);
  return value;
}

describe("Scroll clock", () => {
  it("reaches the same place at 30, 60 and 120 Hz", () => {
    const elapsed = 1.26;
    const at30 = settle(Math.round(elapsed * 30), 1 / 30);
    const at60 = settle(Math.round(elapsed * 60), 1 / 60);
    const at120 = settle(Math.round(elapsed * 120), 1 / 120);
    expect(at60).toBeCloseTo(1 - Math.exp(-elapsed / MOTION_TAU), 2);
    expect(at30).toBeCloseTo(at60, 2);
    expect(at120).toBeCloseTo(at60, 2);
  });

  it("does not jump across an anomalous pause", () => {
    const stepped = damp(0, 1, 5);
    const capped = damp(0, 1, 0.25);
    expect(stepped).toBeCloseTo(capped, 5);
    expect(stepped).toBeLessThan(0.6);
  });
});

describe("Flight easing", () => {
  it("has zero velocity and acceleration at both ends", () => {
    const samples = [0, 0.001, 0.999, 1].map(smootherstep);
    expect(samples[0]).toBe(0);
    expect(samples[3]).toBe(1);
    expect(samples[1]).toBeLessThan(1e-8);
    expect(1 - samples[2]).toBeLessThan(1e-8);
    expect(smootherstep(0.5)).toBeCloseTo(0.5, 5);
  });
});

describe("Earth framing", () => {
  it("matches the desktop distance range for a 3.3 radius and 42 degree fov", () => {
    expect(earthCameraDistance(1.35)).toBeCloseTo(7.2, 1);
    expect(earthCameraDistance(0.9)).toBeCloseTo(10.1, 1);
    expect(earthCameraDistance(1.35)).toBeGreaterThan(3.3);
  });

  it("keeps transit smaller than the visit and converts mobile width into height", () => {
    const desktop = earthFraming(1440, 900);
    const mobile = earthFraming(390, 844);
    expect(desktop.visitDistance).toBeLessThan(desktop.transitDistance);
    expect(desktop.visitDistance).toBeCloseTo(earthCameraDistance(1.35), 5);
    expect(desktop.transitDistance).toBeCloseTo(earthCameraDistance(1), 5);
    expect(mobile.visitDistance).toBeCloseTo(earthCameraDistance(390 / 844), 5);
    expect(mobile.transitDistance).toBeGreaterThan(mobile.visitDistance);
    expect(mobile.offsetX).toBe(0);
    expect(mobile.offsetY).toBeGreaterThan(0);
  });
});

it("starts promptly, stays monotone and preserves the entire quintic braking half", () => {
  expect(flightEase(100 / 4800)).toBeGreaterThan(0.01);
  expect(flightEase(0.000001) / 0.000001).toBeLessThan(0.0001);
  let previous = 0;
  for (let i = 0; i <= 1000; i++) {
    const t = i / 1000, value = flightEase(t);
    expect(value).toBeGreaterThanOrEqual(previous);
    expect(value).toBeLessThanOrEqual(1);
    if (t >= 0.5) expect(value).toBe(smootherstep(t));
    previous = value;
  }
});
