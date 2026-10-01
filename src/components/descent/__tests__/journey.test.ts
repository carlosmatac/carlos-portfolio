import { describe, expect, it } from "vitest";
import { introClock, journeyAt } from "../journey";
import { flightEase } from "../motion";
import { createFlight, flightPosition } from "../scroll-journey";
import { earthAt, stopProgress } from "../earth-journey";
import { JOURNEY } from "../journey-timeline";
import { places } from "@/content/places";
import { locationVector } from "../create-earth";

describe("Scroll journey", () => {
  it("starts on the logo and settles on the Earth with the intro layers gone", () => {
    const earthStop = JOURNEY.anchors.earth / JOURNEY.totalH;
    expect(journeyAt(0)).toMatchObject({ identity: 1, logo: 1, gather: 0, worms: 1, field: 1 });
    expect(journeyAt(0).earth.visible).toBe(0);
    expect(journeyAt(earthStop)).toMatchObject({ identity: 0, logo: 0, gather: 1, worms: 0, field: 0 });
    expect(journeyAt(earthStop).earth.visible).toBe(1);
  });

  it("paces the choreography on the flight's clock, the inverse of its easing", () => {
    for (const x of [0, 0.01, 0.1, 0.35, 0.6, 0.9, 1]) expect(introClock(flightEase(x))).toBeCloseTo(x, 5);
  });

  it("changes every intro layer smoothly during the real first flight, without a jump", () => {
    const earthStop = JOURNEY.anchors.earth / JOURNEY.totalH;
    const flight = createFlight(0, earthStop, 0);
    let previous = journeyAt(0);
    for (let ms = 1000 / 60; ms <= flight.duration; ms += 1000 / 60) {
      const frame = journeyAt(flightPosition(flight, ms));
      for (const key of ["identity", "logo", "burst", "gather", "worms", "field"] as const) {
        expect(Math.abs(frame[key] - previous[key]), `${key} at ${ms.toFixed(0)} ms`).toBeLessThan(0.05);
      }
      expect(Math.abs(frame.earth.visible - previous.earth.visible)).toBeLessThan(0.05);
      previous = frame;
    }
    expect(previous.earth.visible).toBe(1);
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
      expect([frame.burst,frame.gather,frame.worms,frame.earth.altitude]).toEqual([0,0,0,0]);
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
