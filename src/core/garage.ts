import { CARS, PAINT_COST, type CarDefinition } from "../config/cars";
import type { SaveData } from "./save";

export type GarageResult =
  { ok: true; save: SaveData } | { ok: false; reason: string };

const findCar = (id: string) => CARS.find((c) => c.id === id);

export function buyCar(save: SaveData, carId: string): GarageResult {
  const car = findCar(carId);
  if (!car) return { ok: false, reason: "Unknown car" };
  if (save.ownedCars.includes(carId))
    return { ok: false, reason: "Already owned" };
  if (save.credits < car.unlockCost)
    return { ok: false, reason: "Not enough credits" };
  const next = structuredClone(save);
  next.credits -= car.unlockCost;
  next.ownedCars.push(carId);
  next.selectedCarId = carId;
  return { ok: true, save: next };
}

export function selectCar(save: SaveData, carId: string): GarageResult {
  if (!save.ownedCars.includes(carId))
    return { ok: false, reason: "Car is locked" };
  return { ok: true, save: { ...save, selectedCarId: carId } };
}

export function buyPaint(
  save: SaveData,
  carId: string,
  paintId: string,
): GarageResult {
  const owned = save.paints[carId]?.owned ?? [];
  if (!save.ownedCars.includes(carId))
    return { ok: false, reason: "Car is locked" };
  if (owned.includes(paintId)) return { ok: false, reason: "Already owned" };
  if (save.credits < PAINT_COST)
    return { ok: false, reason: "Not enough credits" };
  const next = structuredClone(save);
  next.credits -= PAINT_COST;
  next.paints[carId] = { selected: paintId, owned: [...owned, paintId] };
  return { ok: true, save: next };
}

export function selectPaint(
  save: SaveData,
  carId: string,
  paintId: string,
): GarageResult {
  const paints = save.paints[carId];
  if (!paints?.owned.includes(paintId))
    return { ok: false, reason: "Paint is locked" };
  const next = structuredClone(save);
  next.paints[carId] = { ...paints, selected: paintId };
  return { ok: true, save: next };
}

export function carStats(car: CarDefinition) {
  const max = (pick: (c: CarDefinition) => number) =>
    Math.max(...CARS.map(pick));
  return {
    speed: car.maxSpeed / max((c) => c.maxSpeed),
    acceleration: car.acceleration / max((c) => c.acceleration),
    handling: (car.handling * car.grip) / max((c) => c.handling * c.grip),
    nitro: car.nitroCapacity / max((c) => c.nitroCapacity),
  };
}
