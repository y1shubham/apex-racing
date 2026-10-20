import { describe, expect, it } from "vitest";
import { CARS } from "../src/config/cars";
import { SEGMENT_LENGTH } from "../src/config/game";
import { TRACKS } from "../src/config/tracks";
import { stepVehicle, type DriveInput } from "../src/core/physics";
import { buildTrack, segmentAt } from "../src/core/track";

const car = CARS[0]!;
const L = 100000;
const idle: DriveInput = { throttle: false, brake: false, steer: 0 };
const run = (
  input: DriveInput,
  seconds: number,
  start = { z: 0, x: 0, speed: 0 },
  curve = 0,
) => {
  let s = start;
  for (let t = 0; t < seconds * 60; t++)
    s = stepVehicle(s, input, car, curve, L, 1 / 60);
  return s;
};

describe("track", () => {
  it.each(TRACKS)(
    "$id loops back to ground level with continuous elevation",
    (def) => {
      const t = buildTrack(def);
      expect(t.segments[0]!.y1).toBe(0);
      expect(t.segments.at(-1)!.y2).toBe(0);
      t.segments
        .slice(1)
        .forEach((s, i) => expect(s.y1).toBeCloseTo(t.segments[i]!.y2));
      expect(t.length).toBe(t.segments.length * SEGMENT_LENGTH);
      expect(t.segments.some((s) => s.scenery.length)).toBe(true);
    },
  );

  it("segmentAt wraps in both directions", () => {
    const t = buildTrack(TRACKS[0]!);
    expect(segmentAt(t, t.length + 1).index).toBe(0);
    expect(segmentAt(t, -1).index).toBe(t.segments.length - 1);
  });
});

describe("physics", () => {
  it("accelerates but never exceeds max speed", () => {
    const s = run({ ...idle, throttle: true }, 30);
    expect(s.speed).toBeGreaterThan(car.maxSpeed * 0.95);
    expect(s.speed).toBeLessThanOrEqual(car.maxSpeed);
  });

  it("coasts to a stop and brakes into a capped reverse", () => {
    expect(run(idle, 10, { z: 0, x: 0, speed: 5000 }).speed).toBe(0);
    expect(run({ ...idle, brake: true }, 10).speed).toBeCloseTo(
      -car.maxSpeed * 0.2,
    );
  });

  it("cannot steer at standstill and steers at speed", () => {
    expect(run({ ...idle, steer: 1 }, 1).x).toBe(0);
    expect(
      run({ ...idle, steer: 1 }, 0.2, { z: 0, x: 0, speed: 8000 }).x,
    ).toBeGreaterThan(0);
  });

  it("curves push the car outward and off-road slows it", () => {
    expect(
      run(idle, 0.5, { z: 0, x: 0, speed: car.maxSpeed }, 4).x,
    ).toBeLessThan(0);
    const on = run({ ...idle, throttle: true }, 1, {
      z: 0,
      x: 0,
      speed: car.maxSpeed,
    });
    const off = run({ ...idle, throttle: true }, 1, {
      z: 0,
      x: 2,
      speed: car.maxSpeed,
    });
    expect(off.speed).toBeLessThan(on.speed * 0.8);
  });

  it("wraps position around the track", () => {
    const s = stepVehicle(
      { z: L - 10, x: 0, speed: 1200 },
      idle,
      car,
      0,
      L,
      1 / 60,
    );
    expect(s.z).toBeGreaterThanOrEqual(0);
    expect(s.z).toBeLessThan(L);
  });
});
