import { describe, expect, it } from "vitest";
import { cloudPassage, cloudFlightEase, cloudPassageEye } from "../transitions/cloud-passage";
import { createFlight, flightPosition } from "../scroll-journey";
import { EARTH_STOP, JOURNEY, sampleJourney, stopProgress } from "../journey-timeline";

describe("Cloud passage", () => {
  it("changes worlds only under complete cover, not by crossfading the scenes", () => {
    expect(cloudPassage(0)).toMatchObject({ cover: 0, scene: "earth" });
    expect(cloudPassage(1)).toMatchObject({ cover: 0, scene: "city" });
    let previous = cloudPassage(0);
    for (let i = 1; i <= 1000; i++) {
      const current = cloudPassage(i / 1000);
      if (current.scene !== previous.scene) {
        expect(previous.cover).toBe(1);
        expect(current.cover).toBe(1);
      }
      previous = current;
    }
  });

  it("uses identical cloud coordinates for arrival and departure, in either direction", () => {
    const arrival = JOURNEY.phases.find(p => p.kind === "arrival")!;
    const departure = JOURNEY.phases.find(p => p.kind === "departure")!;
    for (const t of [0.1, 0.25, 0.45, 0.65, 0.9]) {
      const down = sampleJourney(arrival.startH + t * arrival.weightH).passage!;
      const up = sampleJourney(departure.startH + (1 - t) * departure.weightH).passage!;
      expect(down.depth).toBeCloseTo(up.depth, 10);
      expect(down.cover).toBeCloseTo(up.cover, 10);
      expect(down.scene).toBe(up.scene);
    }
  });

  it("removes the cloud tunnel entirely for reduced motion", () => {
    for (const t of [0, 0.3, 0.5, 0.8, 1]) expect(cloudPassage(t, true).cover).toBe(0);
  });
});

describe("Fast approach, progressive braking", () => {
  it("accelerates promptly, stays monotone and comes to rest with zero terminal velocity and acceleration", () => {
    expect(cloudFlightEase(0)).toBe(0);
    expect(cloudFlightEase(1)).toBe(1);
    expect(cloudFlightEase(100 / 4800)).toBeGreaterThan(0.035);
    expect(cloudFlightEase(0.5)).toBeGreaterThan(0.85);
    let previous = 0;
    for (let i = 0; i <= 1000; i++) {
      const value = cloudFlightEase(i / 1000);
      expect(value).toBeGreaterThanOrEqual(previous);
      expect(value).toBeLessThanOrEqual(1);
      previous = value;
    }
    const h = 0.0001;
    expect(cloudFlightEase(h) / h).toBeLessThan(0.02);
    expect(cloudFlightEase(1e-7) / 1e-14).toBeLessThan(0.001);
    expect((1 - cloudFlightEase(1 - h)) / h).toBeLessThan(1e-6);
    expect((1 - 2 * cloudFlightEase(1 - h) + cloudFlightEase(1 - 2 * h)) / h ** 2).toBeLessThan(0.001);
    const increments = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map(t => cloudFlightEase(t + 0.1) - cloudFlightEase(t));
    increments.slice(1).forEach((d, i) => expect(d).toBeLessThan(increments[i]));
  });

  it("keeps travel durations while applying the cloud profile only to urban passages", () => {
    expect(createFlight(0, EARTH_STOP, 0)).toMatchObject({ duration: 5600, profile: "orbit" });
    expect(createFlight(EARTH_STOP, stopProgress(0), 0)).toMatchObject({ duration: 4800, profile: "cloud" });
    expect(createFlight(stopProgress(2), stopProgress(3), 0)).toMatchObject({ duration: 4800, profile: "cloud" });
    expect(createFlight(stopProgress(3), stopProgress(4), 0)).toMatchObject({ duration: 4800, profile: "orbit" });
    for (const [from, to] of [[EARTH_STOP, stopProgress(0)], [stopProgress(0), EARTH_STOP]]) {
      const flight = createFlight(from, to, 0);
      for (const hz of [30, 60, 120]) {
        expect(flightPosition(flight, Math.round(hz * 4.8) / hz * 1000)).toBeCloseTo(to, 10);
      }
    }
  });
});


it("emerges at orbital height without a second camera acceleration when the clouds clear", () => {
  const departure = JOURNEY.phases.find(p => p.kind === "departure")!;
  const transfer = JOURNEY.phases.find(p => p.kind === "transfer")!;
  expect(sampleJourney(departure.endH - 1e-8).earth.altitude).toBeCloseTo(1, 6);
  for (const t of [0, 0.01, 0.1, 0.3]) {
    expect(sampleJourney(transfer.startH + transfer.weightH * t).earth.altitude).toBe(1);
  }
});


it("moves the eye inside the cloud volume before emerging below it", () => {
  expect(cloudPassageEye(0)[2]).toBeGreaterThan(0.5);
  expect(cloudPassageEye(0.44).every(value => Math.abs(value) < 0.5)).toBe(true);
  expect(cloudPassageEye(1)[1]).toBeLessThan(-0.5);
  const forward = [0, 0.25, 0.44, 0.8, 1].map(cloudPassageEye);
  expect([1, 0.8, 0.44, 0.25, 0].map(cloudPassageEye).reverse()).toEqual(forward);
});
