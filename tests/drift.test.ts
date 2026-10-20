import { describe, expect, it } from "vitest";
import { CARS } from "../src/config/cars";
import { DRIFT, FIXED_STEP, NITRO } from "../src/config/game";
import { TRACKS } from "../src/config/tracks";
import {
  IDLE_INPUT,
  stepVehicle,
  type DriveInput,
  type VehicleState,
} from "../src/core/physics";
import { Race } from "../src/core/race";
import { buildTrack } from "../src/core/track";

const car = CARS[0]!;
const L = 1_000_000;
const fast: VehicleState = {
  z: 0,
  x: 0,
  speed: car.maxSpeed * 0.8,
  xv: 0,
  drift: 0,
};
const drive = (input: DriveInput, seconds: number, s = fast, curve = 0) => {
  for (let t = 0; t < seconds / FIXED_STEP; t++)
    s = stepVehicle(s, input, car, curve, L, FIXED_STEP);
  return s;
};

describe("drift physics", () => {
  it("handbrake plus steer at speed starts a drift in the steer direction", () => {
    expect(
      drive({ ...IDLE_INPUT, handbrake: true, steer: -1 }, 0.1).drift,
    ).toBe(-1);
    expect(drive({ ...IDLE_INPUT, handbrake: true }, 0.1).drift).toBe(0);
  });

  it("no drift at low speed, handbrake just brakes", () => {
    const slow = { ...fast, speed: car.maxSpeed * 0.2 };
    const s = drive({ ...IDLE_INPUT, handbrake: true, steer: 1 }, 0.3, slow);
    expect(s.drift).toBe(0);
    expect(s.speed).toBeLessThan(slow.speed);
  });

  it("drifting resists a corner better than normal steering", () => {
    const steer = drive(
      { ...IDLE_INPUT, throttle: true, steer: 1 },
      1,
      fast,
      5,
    );
    const slide = drive(
      { ...IDLE_INPUT, throttle: true, steer: 1, handbrake: true },
      1,
      fast,
      5,
    );
    expect(slide.x).toBeGreaterThan(steer.x);
    expect(slide.speed).toBeLessThan(steer.speed);
  });
});

describe("nitro physics", () => {
  it("raises top speed while held and bleeds back to normal after", () => {
    const boosted = drive({ ...IDLE_INPUT, throttle: true, nitro: true }, 8);
    expect(boosted.speed).toBeGreaterThan(car.maxSpeed);
    expect(boosted.speed).toBeLessThanOrEqual(
      car.maxSpeed * NITRO.speedMultiplier,
    );
    const after = drive({ ...IDLE_INPUT, throttle: true }, 0.2, boosted);
    expect(after.speed).toBeLessThan(boosted.speed);
    expect(after.speed).toBeGreaterThan(car.maxSpeed);
  });
});

describe("drift rewards", () => {
  const setup = () => {
    const track = buildTrack(TRACKS[1]!);
    const race = new Race(track, car, [
      { id: "p", name: "You", isPlayer: true, paintId: "crimson" },
    ]);
    race.status = "racing";
    const seg = track.segments.find((s) => s.curve > 4)!;
    const p = race.player;
    p.state = { ...fast, z: seg.index * 200 };
    return { race, p };
  };

  it("a controlled drift through a bend banks score and nitro", () => {
    const { race, p } = setup();
    for (let i = 0; i < 1.5 / FIXED_STEP; i++)
      race.step(FIXED_STEP, () => ({
        ...IDLE_INPUT,
        throttle: true,
        handbrake: true,
        steer: 0.5,
      }));
    expect(p.state.drift).toBe(1);
    expect(p.driftPending).toBeGreaterThan(0);
    race.step(FIXED_STEP, () => ({ ...IDLE_INPUT, throttle: true }));
    expect(p.driftScore).toBeGreaterThan(0);
    expect(p.nitro).toBeGreaterThan(0);
    expect(p.lastDrift?.points).toBe(p.driftScore);
  });

  it("a short flick gives nothing", () => {
    const { race, p } = setup();
    for (let i = 0; i < (DRIFT.minDuration * 0.5) / FIXED_STEP; i++)
      race.step(FIXED_STEP, () => ({
        ...IDLE_INPUT,
        handbrake: true,
        steer: 1,
      }));
    race.step(FIXED_STEP, () => IDLE_INPUT);
    expect(p.driftScore).toBe(0);
    expect(p.nitro).toBe(0);
  });

  it("running off the road mid-drift loses the reward", () => {
    const { race, p } = setup();
    for (let i = 0; i < 1 / FIXED_STEP; i++)
      race.step(FIXED_STEP, () => ({
        ...IDLE_INPUT,
        throttle: true,
        handbrake: true,
        steer: 1,
      }));
    p.state.x = 1.5;
    race.step(FIXED_STEP, () => ({
      ...IDLE_INPUT,
      throttle: true,
      handbrake: true,
      steer: 1,
    }));
    race.step(FIXED_STEP, () => IDLE_INPUT);
    expect(p.driftScore).toBe(0);
    expect(p.nitro).toBe(0);
  });

  it("holding nitro burns the meter", () => {
    const { race, p } = setup();
    p.nitro = 50;
    for (let i = 0; i < 1 / FIXED_STEP; i++)
      race.step(FIXED_STEP, () => ({
        ...IDLE_INPUT,
        throttle: true,
        nitro: true,
      }));
    expect(p.nitro).toBeCloseTo(50 - NITRO.burnRate, 0);
  });
});
