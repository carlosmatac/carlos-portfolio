import { describe, expect, it } from "vitest";
import { journeyAt } from "../journey";
import { earthAt, INTRO_END, stopProgress, STOP_INTERVAL } from "../earth-journey";
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

  it("lands at every city in order and leaves its chapter readable", () => {
    places.forEach((_,index)=>{
      const frame=earthAt(stopProgress(index)+0.005);
      expect(frame.active).toBe(index);
      expect(frame.altitude).toBe(0);
      expect(frame.text).toBe(1);
    });
    expect(earthAt(1).active).toBe(places.length-1);
    expect(earthAt(1).text).toBe(1);
  });

  it("leaves the surface before transferring and lands continuously", () => {
    for(let index=0;index<places.length-1;index++){
      const start=stopProgress(index);
      const transfer=earthAt(start+STOP_INTERVAL*0.6);
      expect(transfer.altitude).toBe(1);
      expect(transfer.text).toBe(0);
      expect(transfer.turn).toBeGreaterThan(0);
      expect(transfer.turn).toBeLessThan(1);
      const before=earthAt(stopProgress(index+1)-0.000001);
      const after=earthAt(stopProgress(index+1)+0.000001);
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
