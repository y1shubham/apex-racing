import { describe, expect, it } from "vitest";
import { PAINT_COST } from "../src/config/cars";
import { EVENTS } from "../src/config/championship";
import {
  applyRaceResult,
  isUnlocked,
  nextEvent,
  totalPoints,
} from "../src/core/championship";
import { buyCar, buyPaint, selectCar, selectPaint } from "../src/core/garage";
import { defaultSave, parseSave } from "../src/core/save";

const outcome = (position: number, driftScore = 0) => ({
  position,
  totalTime: 100 + position,
  bestLap: 50,
  driftScore,
});

describe("save validation", () => {
  it.each([null, "", "not json", "[]", "42", '{"credits":"lots"}'])(
    "recovers from malformed data %j",
    (raw) => {
      const save = parseSave(raw);
      expect(save.ownedCars).toEqual(["apex-s1"]);
      expect(save.credits).toBe(0);
    },
  );

  it("drops unknown or invalid fields but keeps valid ones", () => {
    const save = parseSave(
      JSON.stringify({
        version: 99,
        credits: -50,
        ownedCars: ["vortex-gt", "hacked-car", 7],
        selectedCarId: "phantom-r",
        paints: { "apex-s1": { selected: "gold", owned: ["crimson", "gold"] } },
        events: {
          "coastal-opener": { bestPosition: 2, bestTime: 120, points: 7 },
          bogus: {},
        },
        bestLaps: { "sunset-coast": 55, x: "fast" },
        settings: { music: 5, sfx: "loud" },
      }),
    );
    expect(save.credits).toBe(0);
    expect(save.ownedCars).toEqual(["apex-s1", "vortex-gt"]);
    expect(save.selectedCarId).toBe("apex-s1");
    expect(save.paints["apex-s1"]).toEqual({
      selected: "sunset-orange",
      owned: ["sunset-orange", "crimson"],
    });
    expect(Object.keys(save.events)).toEqual(["coastal-opener"]);
    expect(save.bestLaps).toEqual({ "sunset-coast": 55 });
    expect(save.settings).toEqual({ music: 1, sfx: 0.8 });
  });

  it("round-trips a valid save", () => {
    const save = defaultSave();
    save.credits = 1234;
    expect(parseSave(JSON.stringify(save))).toEqual(save);
  });
});

describe("championship", () => {
  const event = EVENTS[0]!;

  it("awards points and credits once per race id", () => {
    const first = applyRaceResult(
      defaultSave(),
      "race-1",
      event,
      outcome(1, 2500),
    );
    expect(first.reward.points).toBe(10);
    expect(first.reward.credits).toBe(1000 + 250);
    expect(first.save.credits).toBe(1250);
    const again = applyRaceResult(
      first.save,
      "race-1",
      event,
      outcome(1, 2500),
    );
    expect(again.reward.alreadyClaimed).toBe(true);
    expect(again.save.credits).toBe(1250);
  });

  it("keeps the best result per event for points", () => {
    let save = applyRaceResult(defaultSave(), "a", event, outcome(2)).save;
    save = applyRaceResult(save, "b", event, outcome(5)).save;
    expect(totalPoints(save)).toBe(7);
    const better = applyRaceResult(save, "c", event, outcome(1));
    expect(better.reward.pointsGained).toBe(3);
    expect(totalPoints(better.save)).toBe(10);
  });

  it("unlocks events in order and tracks the next event", () => {
    const save = defaultSave();
    expect(isUnlocked(save, 0)).toBe(true);
    expect(isUnlocked(save, 1)).toBe(false);
    const done = applyRaceResult(save, "a", event, outcome(6)).save;
    expect(isUnlocked(done, 1)).toBe(true);
    expect(nextEvent(done)?.id).toBe(EVENTS[1]!.id);
  });

  it("winning an achievement event unlocks its car for free", () => {
    const summit = EVENTS.find((e) => e.id === "summit-sprint")!;
    expect(
      applyRaceResult(defaultSave(), "a", summit, outcome(2)).save.ownedCars,
    ).not.toContain("vortex-gt");
    const won = applyRaceResult(defaultSave(), "b", summit, outcome(1));
    expect(won.reward.unlockedCars).toEqual(["vortex-gt"]);
    expect(won.save.ownedCars).toContain("vortex-gt");
  });
});

describe("garage", () => {
  it("buys a car only with enough credits", () => {
    const broke = buyCar(defaultSave(), "vortex-gt");
    expect(broke.ok).toBe(false);
    const rich = { ...defaultSave(), credits: 2000 };
    const bought = buyCar(rich, "vortex-gt");
    expect(bought.ok && bought.save.credits).toBe(500);
    expect(bought.ok && bought.save.selectedCarId).toBe("vortex-gt");
    expect(selectCar(defaultSave(), "phantom-r").ok).toBe(false);
  });

  it("buys and selects paints", () => {
    const save = { ...defaultSave(), credits: PAINT_COST };
    expect(selectPaint(save, "apex-s1", "crimson").ok).toBe(false);
    const bought = buyPaint(save, "apex-s1", "crimson");
    expect(bought.ok && bought.save.credits).toBe(0);
    expect(bought.ok && bought.save.paints["apex-s1"]!.selected).toBe(
      "crimson",
    );
  });
});
