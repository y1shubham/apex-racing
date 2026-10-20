import { CARS, PAINTS } from "../config/cars";
import { EVENTS } from "../config/championship";

export const SAVE_VERSION = 1;
export const SAVE_KEY = "apex-rush-save";
const CLAIMED_LIMIT = 50;

export interface EventRecord {
  bestPosition: number;
  bestTime: number;
  points: number;
}

export interface CarPaints {
  selected: string;
  owned: string[];
}

export interface Settings {
  music: number;
  sfx: number;
}

export interface SaveData {
  version: number;
  credits: number;
  selectedCarId: string;
  ownedCars: string[];
  paints: Record<string, CarPaints>;
  events: Record<string, EventRecord>;
  bestLaps: Record<string, number>;
  claimedRaces: string[];
  settings: Settings;
}

const starter = CARS[0]!;

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    credits: 0,
    selectedCarId: starter.id,
    ownedCars: [starter.id],
    paints: Object.fromEntries(
      CARS.map((c) => [
        c.id,
        { selected: c.defaultPaint, owned: [c.defaultPaint] },
      ]),
    ),
    events: {},
    bestLaps: {},
    claimedRaces: [],
    settings: { music: 0.6, sfx: 0.8 },
  };
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v)
    ? Math.min(max, Math.max(min, v))
    : fallback;
const strings = (v: unknown) =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];

export function parseSave(raw: string | null): SaveData {
  const save = defaultSave();
  let data: unknown;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    return save;
  }
  if (!isObj(data)) return save;

  const carIds = new Set(CARS.map((c) => c.id));
  const paintIds = new Set(PAINTS.map((p) => p.id));
  save.credits = Math.floor(num(data.credits, 0, 1e9, 0));
  save.ownedCars = [
    ...new Set([
      starter.id,
      ...strings(data.ownedCars).filter((id) => carIds.has(id)),
    ]),
  ];
  if (
    typeof data.selectedCarId === "string" &&
    save.ownedCars.includes(data.selectedCarId)
  )
    save.selectedCarId = data.selectedCarId;

  if (isObj(data.paints)) {
    for (const car of CARS) {
      const p = data.paints[car.id];
      if (!isObj(p)) continue;
      const owned = [
        ...new Set([
          car.defaultPaint,
          ...strings(p.owned).filter((id) => paintIds.has(id)),
        ]),
      ];
      const selected =
        typeof p.selected === "string" && owned.includes(p.selected)
          ? p.selected
          : car.defaultPaint;
      save.paints[car.id] = { selected, owned };
    }
  }

  if (isObj(data.events)) {
    for (const e of EVENTS) {
      const r = data.events[e.id];
      if (!isObj(r)) continue;
      const bestPosition = num(r.bestPosition, 1, 99, NaN);
      const bestTime = num(r.bestTime, 0, 1e6, NaN);
      if (Number.isNaN(bestPosition) || Number.isNaN(bestTime)) continue;
      save.events[e.id] = {
        bestPosition,
        bestTime,
        points: num(r.points, 0, 100, 0),
      };
    }
  }

  if (isObj(data.bestLaps)) {
    for (const [k, v] of Object.entries(data.bestLaps)) {
      const t = num(v, 0, 1e6, NaN);
      if (!Number.isNaN(t) && t > 0) save.bestLaps[k] = t;
    }
  }

  save.claimedRaces = strings(data.claimedRaces).slice(-CLAIMED_LIMIT);
  if (isObj(data.settings)) {
    save.settings.music = num(data.settings.music, 0, 1, save.settings.music);
    save.settings.sfx = num(data.settings.sfx, 0, 1, save.settings.sfx);
  }
  return save;
}

export function rememberClaim(save: SaveData, raceId: string) {
  save.claimedRaces = [...save.claimedRaces, raceId].slice(-CLAIMED_LIMIT);
}

export function loadSave(
  storage: Storage | undefined = globalThis.localStorage,
): SaveData {
  try {
    return parseSave(storage?.getItem(SAVE_KEY) ?? null);
  } catch {
    return defaultSave();
  }
}

export function writeSave(
  save: SaveData,
  storage: Storage | undefined = globalThis.localStorage,
) {
  try {
    storage?.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

export function hasProgress(save: SaveData) {
  return Object.keys(save.events).length > 0 || save.credits > 0;
}
