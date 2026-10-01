import { describe, expect, it } from "vitest";
import { places } from "@/content/places";
import { journeyConfig } from "../journey-config";
import { EARTH_STOP, JOURNEY, sampleJourney, stopProgress } from "../journey-timeline";
import { createFlight, flightPosition } from "../scroll-journey";
import { passageDive, passageFlightEase, PASSAGE_PATTERNS, pixelPassage } from "../transitions/pixel-passage";

describe("Pixel passage", () => {
  it("leaves both ends untouched and hides the change of scene inside coarse tiles", () => {
    expect(pixelPassage(0)).toMatchObject({ mosaic: 0, flip: 0, scene: "earth", cover: 0 });
    expect(pixelPassage(1)).toMatchObject({ mosaic: 0, flip: 1, scene: "city", cover: 0 });
    for (let i = 0; i <= 1000; i++) {
      const passage = pixelPassage(i / 1000);
      if (passage.flip > 0 && passage.flip < 1) expect(passage.mosaic, `depth ${i / 1000}`).toBeGreaterThan(0.75);
    }
  });

  it("is continuous and plays backwards on the way out", () => {
    let previous = pixelPassage(0);
    for (let i = 1; i <= 1000; i++) {
      const passage = pixelPassage(i / 1000);
      expect(Math.abs(passage.mosaic - previous.mosaic)).toBeLessThan(0.01);
      expect(Math.abs(passage.flip - previous.flip)).toBeLessThan(0.01);
      previous = passage;
    }
    const arrival = JOURNEY.phases.find(p => p.kind === "arrival" && p.cityIndex === 1)!;
    const departure = JOURNEY.phases.find(p => p.kind === "departure" && p.cityIndex === 1)!;
    const down = sampleJourney(arrival.endH - 1e-6).passage!, up = sampleJourney(departure.startH + 1e-6).passage!;
    expect(down.depth).toBeCloseTo(1, 1); expect(up.depth).toBeCloseTo(1, 1);
    expect(sampleJourney(arrival.endH).passage).toMatchObject({ depth: 1, mosaic: 0, flip: 1 });
  });

  it("switches at once, without tiles, for reduced motion", () => {
    for (const depth of [0.2, 0.49, 0.51, 0.8]) {
      const passage = pixelPassage(depth, true);
      expect(passage.mosaic).toBe(0);
      expect(passage.flip).toBe(depth >= 0.5 ? 1 : 0);
    }
  });

  it("gives every city its own front of flipping tiles", () => {
    const scenes = journeyConfig.stops.map(stop => stop.sceneId!).filter(Boolean);
    expect(scenes).toHaveLength(places.length);
    expect(new Set(scenes.map(id => PASSAGE_PATTERNS[id].id)).size).toBe(scenes.length);
  });

  it("dives towards the city promptly and arrives without a jolt", () => {
    expect(passageDive(0)).toBe(0);
    expect(passageDive(0.02)).toBeGreaterThan(0.05);
    expect(passageDive(0.5)).toBe(1);
    expect(passageDive(0.8)).toBe(1);
    expect(passageDive(0.5) - passageDive(0.499)).toBeLessThan(1e-5);
  });
});

describe("Passage flights", () => {
  it("has one velocity hump and brakes continuously to rest", () => {
    const n = 2000, velocity = Array.from({ length: n }, (_, i) => (passageFlightEase((i + 1) / n) - passageFlightEase(i / n)) * n);
    const peak = velocity.indexOf(Math.max(...velocity));
    velocity.forEach((v, i) => {
      if (i && i <= peak) expect(v).toBeGreaterThanOrEqual(velocity[i - 1] - 1e-9);
      if (i > peak) expect(v).toBeLessThanOrEqual(velocity[i - 1] + 1e-9);
    });
    expect(peak / n).toBeGreaterThan(0.2); expect(peak / n).toBeLessThan(0.4);
    expect(velocity.at(-1)).toBeLessThan(1e-3);
  });

  it("keeps the travel durations and uses the passage profile for every city", () => {
    expect(createFlight(0, EARTH_STOP, 0)).toMatchObject({ duration: 5600, profile: "orbit" });
    expect(createFlight(EARTH_STOP, stopProgress(0), 0)).toMatchObject({ duration: 4800, profile: "passage" });
    for (let i = 0; i < places.length - 1; i++) expect(createFlight(stopProgress(i), stopProgress(i + 1), 0)).toMatchObject({ duration: 4800, profile: "passage" });
  });

  it("paces the tiles evenly in time, even for a city's departure at the start of a long flight", () => {
    const flight = createFlight(stopProgress(1), stopProgress(2), 0);
    const depthAt = (ms: number) => sampleJourney(flightPosition(flight, ms) * JOURNEY.totalH).passage?.depth;
    // The tiles start to gather at once, and Granada takes a whole second to dissolve.
    expect(1 - depthAt(100)!).toBeGreaterThan(0.05);
    expect(depthAt(500)).toBeGreaterThan(0.25);
    let leftAt = 0;
    for (let ms = 0; ms < flight.duration; ms += 10) if (depthAt(ms) === undefined) { leftAt = ms; break; }
    expect(leftAt).toBeGreaterThan(900);
    let previous = 1;
    for (let ms = 0; ms <= leftAt; ms += 1000 / 60) {
      const depth = depthAt(ms) ?? 0;
      expect(previous - depth).toBeLessThan(0.05);
      previous = depth;
    }
  });

  it("lands each arrival smoothly at 60 fps, with no frame where the tiles jump", () => {
    const flight = createFlight(EARTH_STOP, stopProgress(0), 0);
    let previous = pixelPassage(0);
    for (let ms = 1000 / 60; ms <= flight.duration; ms += 1000 / 60) {
      const passage = sampleJourney(flightPosition(flight, ms) * JOURNEY.totalH).passage ?? pixelPassage(1);
      expect(Math.abs(passage.mosaic - previous.mosaic)).toBeLessThan(0.03);
      expect(Math.abs(passage.flip - previous.flip)).toBeLessThan(0.03);
      previous = passage;
    }
    expect(previous).toMatchObject({ mosaic: 0, flip: 1 });
  });
});

it("emerges at orbital height without a second camera acceleration when the tiles clear", () => {
  const departure = JOURNEY.phases.find(p => p.kind === "departure")!;
  const transfer = JOURNEY.phases.find(p => p.kind === "transfer")!;
  expect(sampleJourney(departure.endH - 1e-8).earth.altitude).toBeCloseTo(1, 6);
  for (const t of [0, 0.01, 0.1, 0.3]) expect(sampleJourney(transfer.startH + transfer.weightH * t).earth.altitude).toBe(1);
});
