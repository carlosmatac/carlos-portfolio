import { describe, expect, it } from "vitest";
import { places } from "@/content/places";
import { journeyConfig } from "../journey-config";
import { compileJourney, JOURNEY, sampleJourney, travelSegments } from "../journey-timeline";

describe("Compiled journey", () => {
  it("derives ordered anchors, contiguous phases and length from a single configuration", () => {
    expect(JOURNEY.totalH).toBeCloseTo(26.6);
    expect(Object.keys(JOURNEY.anchors)).toEqual(["earth", ...places.map(place => place.id)]);
    JOURNEY.phases.forEach((phase, i) => {
      expect(phase.endH - phase.startH).toBeCloseTo(phase.weightH);
      if (i) expect(phase.startH).toBe(JOURNEY.phases[i - 1].endH);
    });
    places.forEach((place, index) => {
      const sample = sampleJourney(JOURNEY.anchors[place.id]);
      expect(sample.earth.active).toBe(index);
      expect(sample.earth.text).toBe(1);
      expect(sample.phase.kind).toBe(index < 3 ? "visit" : "earth-visit");
      expect(sample.blend).toBe(index < 3 ? 1 : 0);
    });
  });

  it("enables St. Louis, Granada and Brno and omits urban phases when the capability is absent", () => {
    const urban = JOURNEY.phases.filter(p => ["arrival", "departure", "visit"].includes(p.kind));
    expect(urban).toHaveLength(9);
    expect(urban.every(p => ["st-louis", "granada", "brno"].includes(p.cityId))).toBe(true);
    const earthOnly = compileJourney({ ...journeyConfig, stops: journeyConfig.stops.map(s => ({ ...s, sceneId: null })) });
    expect(earthOnly.totalH).toBeCloseTo(17.6);
    expect(earthOnly.phases.some(p => p.kind === "arrival")).toBe(false);
    expect(earthOnly.anchors.madrid).toBeLessThan(JOURNEY.anchors.madrid);
  });

  it("rejects invalid weights and repeated destinations", () => {
    expect(() => compileJourney({ ...journeyConfig, arrivalH: 0 })).toThrow();
    expect(() => compileJourney({ ...journeyConfig, stops: [] })).toThrow();
    expect(() => compileJourney({ ...journeyConfig, stops: [journeyConfig.stops[0], journeyConfig.stops[0]] })).toThrow();
  });
});

describe("Stateless sampling", () => {
  it("has continuous camera, blend and text at all boundaries", () => {
    for (const phase of JOURNEY.phases.slice(1)) {
      const before = sampleJourney(phase.startH - 1e-8), after = sampleJourney(phase.startH + 1e-8);
      for (const key of ["altitude", "landing", "visible", "text", "navigation"] as const) {
        expect(before.earth[key]).toBeCloseTo(after.earth[key], 5);
      }
      expect(before.blend).toBeCloseTo(after.blend, 5);
    }
  });

  it("is identical on reverse playback and arbitrary seeks without inherited state", () => {
    const positions = JOURNEY.phases.flatMap(p => [p.startH, (p.startH + p.endH) / 2, p.endH]);
    const forward = positions.map(p => sampleJourney(p));
    positions.reverse().forEach((p, i) => expect(sampleJourney(p)).toEqual(forward[forward.length - i - 1]));
    const mid = JOURNEY.phases.find(p => p.kind === "arrival")!;
    const a = sampleJourney(mid.startH + mid.weightH * 0.5);
    expect(a.blend).toBeGreaterThan(0);
    expect(a.blend).toBeLessThan(1);
    expect(a.city).toMatchObject({ visitT: 0, departureT: 0 });
    expect(a.city?.arrivalT).toBeCloseTo(0.5);
  });

  it("clamps endpoints and leaves Madrid stable", () => {
    expect(sampleJourney(-10)).toEqual(sampleJourney(0));
    expect(sampleJourney(100)).toEqual(sampleJourney(JOURNEY.totalH));
    expect(sampleJourney(JOURNEY.totalH).earth).toMatchObject({ active: 4, text: 1, altitude: 0 });
  });

  it("uses static views and pure endpoints with reduced motion", () => {
    for (const phase of JOURNEY.phases) {
      const frame = sampleJourney((phase.startH + phase.endH) / 2, JOURNEY, true);
      expect([0, 1]).toContain(frame.blend);
      expect(frame.earth.altitude).toBe(0);
      expect(frame.earth.turn).toBe(0);
    }
  });

  it("does not spend guided flight time in stationary reading phases", () => {
    const from = JOURNEY.anchors.munich / JOURNEY.totalH;
    const to = JOURNEY.anchors.madrid / JOURNEY.totalH;
    const segments = travelSegments(from, to);
    const transfer = JOURNEY.phases.find(p => p.kind === "transfer" && p.cityId === "munich")!;
    expect(segments).toEqual([{ from: transfer.startH / JOURNEY.totalH, to }]);
    expect(travelSegments(to, from)).toEqual([{ from: to, to: transfer.startH / JOURNEY.totalH }]);
    const brno = JOURNEY.phases.find(p => p.kind === "departure" && p.cityId === "brno")!;
    expect(travelSegments(JOURNEY.anchors.brno / JOURNEY.totalH, from)[0].from).toBeCloseTo(brno.startH / JOURNEY.totalH);
  });
});


it("provides a stable Earth observation phase outside the guided travel segments", () => {
  const earth = JOURNEY.anchors.earth / JOURNEY.totalH;
  const city = JOURNEY.anchors[places[0].id] / JOURNEY.totalH;
  for (const reduced of [false, true]) {
    const frame = sampleJourney(JOURNEY.anchors.earth, JOURNEY, reduced);
    expect(frame.phase.kind).toBe("earth-observe");
    expect(frame.city).toBeNull();
    expect(frame.blend).toBe(0);
    expect(frame.earth.text).toBe(0);
    expect(frame.earth.overview).toBe(1);
  }
  expect(travelSegments(earth, city)[0].from).toBeGreaterThan(earth);
});
