import { describe, expect, it } from "vitest";
import { journeyAt } from "../journey";
import { earthAt, INTRO_END, stopProgress } from "../earth-journey";
import { JOURNEY } from "../journey-timeline";
import { places } from "@/content/places";
import { locationVector } from "../create-earth";

describe("Scroll journey", () => {
  it("enters the screen before falling and reaches Earth after braking", () => {
    expect(journeyAt(0).identity).toBe(1);
    expect(journeyAt(0).earth.visible).toBe(0);
    expect(journeyAt(0.30 * INTRO_END).distance).toBe(0);
    expect(journeyAt(0.32 * INTRO_END).zoom).toBe(1);
    expect(journeyAt(INTRO_END).speed).toBe(0);
    expect(journeyAt(INTRO_END).earth.visible).toBe(1);
  });

  it("covers progressively less distance for equal scroll increments and stops", () => {
    const positions = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map(p => journeyAt(p * INTRO_END).distance);
    const steps = positions.slice(1).map((position, index) => position - positions[index]);
    steps.forEach((step, index) => {
      expect(step).toBeGreaterThanOrEqual(0);
      if (index) expect(step).toBeLessThan(steps[index - 1]);
    });
    expect(steps.at(-1)).toBe(0);
  });

  it("approaches the Earth in one motion that brakes only once, at the Earth stop", () => {
    const earthStop = JOURNEY.anchors.earth / JOURNEY.totalH;
    const samples = Array.from({ length: 201 }, (_, i) => journeyAt(earthStop * i / 200).approach);
    const steps = samples.slice(1).map((value, i) => value - samples[i]);
    const moving = steps.findIndex(step => step > 0);
    const peak = steps.indexOf(Math.max(...steps));
    steps.slice(moving).forEach((step, i) => {
      expect(step).toBeGreaterThan(0);
      if (moving + i > peak) expect(step).toBeLessThanOrEqual(steps[moving + i - 1] + 1e-12);
    });
    expect(samples.at(-1)).toBeCloseTo(1, 10);
    expect(journeyAt(earthStop + 0.01).approach).toBe(1);
    expect(journeyAt(earthStop, true).approach).toBe(0);
  });

  it("lands at every city in order and leaves its chapter readable", () => {
    places.forEach((_,index)=>{
      const frame=earthAt(stopProgress(index));
      expect(frame.active).toBe(index);
      expect(frame.altitude).toBeCloseTo(0, 10);
      expect(frame.text).toBe(1);
    });
    expect(earthAt(1).active).toBe(places.length-1);
    expect(earthAt(1).text).toBe(1);
  });

  it("leaves the surface before transferring and lands continuously", () => {
    for(let index=0;index<places.length-1;index++){
      const phase = JOURNEY.phases.find(p => p.kind === "transfer" && p.cityIndex === index)!;
      const transfer=earthAt((phase.startH + phase.weightH * 0.6) / JOURNEY.totalH);
      expect(transfer.altitude).toBe(1);
      expect(transfer.text).toBe(0);
      expect(transfer.turn).toBeGreaterThan(0);
      expect(transfer.turn).toBeLessThan(1);
      const before=earthAt(stopProgress(index+1)-0.00000001);
      const after=earthAt(stopProgress(index+1)+0.00000001);
      expect(before.active).toBe(after.active);
      expect(Math.abs(before.altitude-after.altitude)).toBeLessThan(0.00001);
      expect(Math.abs(before.text-after.text)).toBeLessThan(0.00001);
    }
  });

  it("keeps every chapter reachable without flight for reduced motion", () => {
    places.forEach((_,index)=>{
      const frame=journeyAt(stopProgress(index)+0.01,true);
      expect([frame.zoom,frame.distance,frame.speed,frame.stars,frame.earth.altitude]).toEqual([0,0,0,0,0]);
      expect(frame.earth.active).toBe(index);
      expect(frame.earth.text).toBe(1);
    });
  });

  it("uses the map's equirectangular convention for geographical markers", () => {
    expect(locationVector(0,0).toArray()).toEqual([1,0,-0]);
    expect(locationVector(90,0).y).toBeCloseTo(1);
    expect(locationVector(0,-90).z).toBeCloseTo(1);
    places.forEach(place=>expect(locationVector(place.latitude,place.longitude).length()).toBeCloseTo(1));
  });
});
