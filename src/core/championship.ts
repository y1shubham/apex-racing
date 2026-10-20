import { CARS } from "../config/cars";
import {
  CREDITS_BY_POSITION,
  DRIFT_CREDIT_DIVISOR,
  EVENTS,
  POINTS_BY_POSITION,
  type EventDefinition,
} from "../config/championship";
import { rememberClaim, type SaveData } from "./save";

export interface RaceOutcome {
  position: number;
  totalTime: number;
  bestLap: number | null;
  driftScore: number;
}

export interface Reward {
  position: number;
  points: number;
  pointsGained: number;
  credits: number;
  newBestLap: boolean;
  unlockedCars: string[];
  alreadyClaimed: boolean;
}

const byPosition = (table: number[], position: number) =>
  table[Math.min(position, table.length) - 1] ?? 0;

export const lapKey = (e: EventDefinition) =>
  `${e.trackId}${e.reversed ? "-reverse" : ""}`;

export function isUnlocked(save: SaveData, index: number) {
  return index === 0 || EVENTS[index - 1]!.id in save.events;
}

export function totalPoints(save: SaveData) {
  return EVENTS.reduce((sum, e) => sum + (save.events[e.id]?.points ?? 0), 0);
}

export function nextEvent(save: SaveData) {
  return EVENTS.find((e) => !(e.id in save.events)) ?? null;
}

export function isComplete(save: SaveData) {
  return EVENTS.every((e) => e.id in save.events);
}

export function applyRaceResult(
  save: SaveData,
  raceId: string,
  event: EventDefinition,
  outcome: RaceOutcome,
): { save: SaveData; reward: Reward } {
  const points = byPosition(POINTS_BY_POSITION, outcome.position);
  const credits =
    byPosition(CREDITS_BY_POSITION, outcome.position) +
    Math.floor(outcome.driftScore / DRIFT_CREDIT_DIVISOR);
  const base = { position: outcome.position, points, credits };

  if (save.claimedRaces.includes(raceId))
    return {
      save,
      reward: {
        ...base,
        pointsGained: 0,
        newBestLap: false,
        unlockedCars: [],
        alreadyClaimed: true,
      },
    };

  const next = structuredClone(save);
  rememberClaim(next, raceId);
  next.credits += credits;

  const prev = next.events[event.id];
  const pointsGained = Math.max(0, points - (prev?.points ?? 0));
  next.events[event.id] = {
    bestPosition: Math.min(prev?.bestPosition ?? Infinity, outcome.position),
    bestTime: Math.min(prev?.bestTime ?? Infinity, outcome.totalTime),
    points: Math.max(prev?.points ?? 0, points),
  };

  const key = lapKey(event);
  const newBestLap =
    outcome.bestLap !== null &&
    outcome.bestLap < (next.bestLaps[key] ?? Infinity);
  if (newBestLap) next.bestLaps[key] = outcome.bestLap!;

  const unlockedCars =
    outcome.position === 1
      ? CARS.filter(
          (c) => c.unlockEvent === event.id && !next.ownedCars.includes(c.id),
        ).map((c) => c.id)
      : [];
  next.ownedCars.push(...unlockedCars);

  return {
    save: next,
    reward: {
      ...base,
      pointsGained,
      newBestLap,
      unlockedCars,
      alreadyClaimed: false,
    },
  };
}
