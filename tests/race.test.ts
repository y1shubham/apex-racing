import { describe, expect, it } from "vitest";
import { AI_DRIVERS, DIFFICULTIES, type Difficulty } from "../src/config/ai";
import { CARS } from "../src/config/cars";
import { FIXED_STEP } from "../src/config/game";
import { TRACKS } from "../src/config/tracks";
import { cornerSpeedRatio, driveAI, newAIMemory } from "../src/core/ai";
import { Race, type RacerEntry } from "../src/core/race";
import { buildTrack } from "../src/core/track";

const car = CARS[0]!;
const entries = (n: number): RacerEntry[] =>
  AI_DRIVERS.slice(0, n).map((d, i) => ({
    id: d.name,
    name: d.name,
    isPlayer: i === n - 1,
    paintId: d.paintId,
  }));

function simulate(trackIndex: number, difficulty: Difficulty, seed = 1) {
  const track = buildTrack(TRACKS[trackIndex]!);
  const race = new Race(track, car, entries(6));
  const mems = new Map(race.racers.map((r) => [r.id, newAIMemory()]));
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let offroadSteps = 0;
  let steps = 0;
  while (race.status !== "finished" && race.time < 400) {
    race.step(FIXED_STEP, (r) => {
      const style = AI_DRIVERS.find((d) => d.name === r.id)!;
      const others = race.racers.filter((o) => o !== r).map((o) => o.state);
      return driveAI(
        mems.get(r.id)!,
        r.state,
        others,
        car,
        track,
        DIFFICULTIES[difficulty],
        style,
        FIXED_STEP,
        rand,
      );
    });
    if (race.status === "racing") {
      steps++;
      offroadSteps += race.racers.filter((r) => Math.abs(r.state.x) > 1).length;
    }
  }
  return { race, offroadShare: offroadSteps / (steps * 6) };
}

describe("race", () => {
  it("counts down, then races", () => {
    const race = new Race(buildTrack(TRACKS[0]!), car, entries(2));
    race.step(1, () => ({ throttle: true, brake: false, steer: 0 }));
    expect(race.status).toBe("countdown");
    expect(race.player.state.speed).toBe(0);
    race.step(2.5, () => ({ throttle: true, brake: false, steer: 0 }));
    expect(race.status).toBe("racing");
  });

  it("starts everyone behind the line on lap 1 and ranks by distance", () => {
    const race = new Race(buildTrack(TRACKS[0]!), car, entries(6));
    expect(race.racers.every((r) => r.distance < 0 && race.lap(r) === 1)).toBe(
      true,
    );
    expect(race.position(race.racers[0]!)).toBe(1);
    expect(race.position(race.player)).toBe(6);
  });

  it("pause freezes the race and resume restores it", () => {
    const race = new Race(buildTrack(TRACKS[0]!), car, entries(2));
    race.status = "racing";
    race.pause();
    race.step(1, () => ({ throttle: true, brake: false, steer: 0 }));
    expect(race.time).toBe(0);
    race.resume();
    expect(race.status).toBe("racing");
  });

  it("a fast rear-end hit slows the rear car and spins it", () => {
    const race = new Race(buildTrack(TRACKS[0]!), car, entries(2));
    race.status = "racing";
    const [a, b] = race.racers as [
      (typeof race.racers)[0],
      (typeof race.racers)[0],
    ];
    a.state = { z: 5000, x: 0, speed: 2000 };
    b.state = { z: 4500, x: 0.05, speed: 9000 };
    const events = race.step(FIXED_STEP, () => ({
      throttle: false,
      brake: false,
      steer: 0,
    }));
    expect(events).toHaveLength(1);
    expect(events[0]!.spin).toBe(true);
    expect(b.spin).toBeGreaterThan(0);
    expect(b.state.speed).toBeLessThan(a.state.speed);
  });
});

describe("ai", () => {
  it("brakes harder for tighter corners", () => {
    expect(cornerSpeedRatio(0, car)).toBe(1);
    expect(cornerSpeedRatio(6, car)).toBeLessThan(cornerSpeedRatio(2, car));
  });

  it.each([0, 1, 2])(
    "all cars finish track %i on every difficulty, mostly on the road",
    (t) => {
      for (const d of ["easy", "normal", "hard"] as const) {
        const { race, offroadShare } = simulate(t, d);
        expect(race.status).toBe("finished");
        expect(offroadShare).toBeLessThan(0.1);
      }
    },
  );

  it("hard AI is faster than easy AI", () => {
    const avg = (d: Difficulty) => {
      const { race } = simulate(1, d);
      return race.player.finishTime!;
    };
    expect(avg("hard")).toBeLessThan(avg("easy"));
  });
});
