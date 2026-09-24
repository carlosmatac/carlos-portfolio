import { describe, expect, it } from "vitest";
import { earthAt, stopProgress } from "../earth-journey";
import { adjacentStop, createFlight, flightPosition, WheelGesture, createSeek, seekFrame } from "../scroll-journey";

const [st, gr, br, , madrid] = [0, 1, 2, 3, 4].map(stopProgress);

describe("A gesture visits one stop", () => {
  it("a very strong wheel impulse cannot skip Granada from St. Louis", () => {
    const gesture = new WheelGesture();
    const direction = gesture.push(12000, 0, false);
    expect(adjacentStop(st, direction)).toBeCloseTo(gr);
    for (let time = 16; time < 6000; time += 16) {
      expect(gesture.push(240, time, time < 4800)).toBe(0);
    }
    expect(gesture.push(50, 6500, false)).toBe(1);
  });

  it("does not queue new gestures during a flight", () => {
    const gesture = new WheelGesture();
    expect(gesture.push(100, 0, false)).toBe(1);
    expect(gesture.push(100, 900, true)).toBe(0);
    expect(gesture.push(100, 1800, true)).toBe(0);
    expect(gesture.push(5, 1900, false)).toBe(0);
    expect(gesture.push(-100, 5000, false)).toBe(-1);
    expect(adjacentStop(gr, -1)).toBeCloseTo(st);
  });

  it("accumulates small trackpad deltas, ignores jitter and allows both endpoints", () => {
    const gesture = new WheelGesture();
    expect(gesture.push(5, 0, false)).toBe(0);
    expect(gesture.push(5, 16, false)).toBe(0);
    expect(gesture.push(8, 32, false)).toBe(1);
    expect(adjacentStop(0, -1)).toBe(0);
    expect(adjacentStop(madrid, 1)).toBeCloseTo(madrid);
    expect(adjacentStop((gr + br) / 2, -1)).toBeCloseTo(gr);
  });
});

describe("Timed, reversible flights", () => {
  it("takes 4.8 seconds between cities and lands exactly at the next stop", () => {
    const flight = createFlight(gr, br, 1000);
    expect(flightPosition(flight, 1000)).toBe(gr);
    expect(flightPosition(flight, 3400)).toBeCloseTo((flight.segments[0].from + br) / 2);
    expect(flightPosition(flight, 5800)).toBe(br);
    expect(flightPosition(flight, 20000)).toBe(br);
    expect(flightPosition(flight, 1100)).toBeGreaterThan(gr + 0.001);
  });

  it("has identical trajectories at different frame rates and in reverse", () => {
    const forward = createFlight(gr, br, 0);
    const reverse = createFlight(br, gr, 0);
    for (const elapsed of [100, 500, 1000, 2400, 3500]) {
      expect(flightPosition(forward, elapsed) + flightPosition(reverse, elapsed)).toBeCloseTo(forward.segments[0].from + br);
    }
    for (const hz of [30, 60, 120]) {
      let value = 0;
      for (let frame = 0; frame <= hz * 4.8; frame++) value = flightPosition(forward, frame * 1000 / hz);
      expect(value).toBeCloseTo(br);
    }
  });
});

describe("Prompt response without momentum chaining", () => {
  it("recognizes a deliberate trackpad gesture within two small samples", () => {
    const gesture = new WheelGesture();
    expect(gesture.push(6, 0, false)).toBe(0);
    expect(gesture.push(6, 16, false)).toBe(1);
  });

  it("accepts a renewed impulse after landing without waiting for the quiet timeout", () => {
    const gesture = new WheelGesture();
    expect(gesture.push(100, 0, true)).toBe(0);
    expect(gesture.push(8, 16, false)).toBe(0);
    expect(gesture.push(4, 32, false)).toBe(0);
    expect(gesture.push(48, 48, false)).toBe(1);
    expect(gesture.push(35, 64, false)).toBe(0);
  });

  it("consumes decaying tails across landing, including uneven sample intervals", () => {
    const gesture = new WheelGesture();
    expect(gesture.push(120, 0, true)).toBe(0);
    for (const [time, delta] of [[50, 80], [100, 40], [230, 20], [390, 9], [420, 4], [540, 2]]) {
      expect(gesture.push(delta, time, false)).toBe(0);
    }
    expect(gesture.push(-24, 556, false)).toBe(-1);
  });

  it("discards renewed and reversed impulses while flying, never queues them", () => {
    const gesture = new WheelGesture();
    for (const [time, delta] of [[0, 100], [16, 4], [32, 80], [48, -80]]) {
      expect(gesture.push(delta, time, true)).toBe(0);
    }
    expect(gesture.push(-60, 64, false)).toBe(0);
    expect(gesture.push(-100, 400, false)).toBe(-1);
  });

  it("moves the actual Earth camera within 100 ms in either direction", () => {
    for (const [from, to] of [[gr, br], [br, gr]]) {
      const flight = createFlight(from, to, 0);
      expect(flight.duration).toBe(4800);
      expect(earthAt(flightPosition(flight, 100)).altitude).toBeGreaterThan(0.025);
      expect(flightPosition(flight, 4800)).toBe(to);
    }
  });
});

it("seeks directly under cover, never samples an intermediate destination", () => {
  const seek = createSeek(st, madrid, 1000);
  expect(seekFrame(seek, 1000)).toEqual({ position: st, opacity: 0, done: false });
  expect(seekFrame(seek, 1180)).toEqual({ position: madrid, opacity: 1, done: false });
  expect(seekFrame(seek, 1460)).toEqual({ position: madrid, opacity: 0, done: true });
  for (let ms = 0; ms < 600; ms += 16) expect([st, madrid]).toContain(seekFrame(seek, 1000 + ms).position);
});
