import type { DifficultyProfile, DriverStyle } from "../config/ai";
import type { CarDefinition } from "../config/cars";
import { COLLISION, SEGMENT_LENGTH } from "../config/game";
import {
  driftRate,
  steerRate,
  type DriveInput,
  type VehicleState,
} from "./physics";
import { segmentAt, type Track } from "./track";

export interface AIMemory {
  timer: number;
  targetX: number;
  targetSpeed: number;
  mistake: number;
  mistakeWide: number;
}

export const newAIMemory = (): AIMemory => ({
  timer: 0,
  targetX: 0,
  targetSpeed: 0,
  mistake: 0,
  mistakeWide: 0,
});

export function cornerSpeedRatio(curve: number, car: CarDefinition) {
  for (let r = 1; r > 0.2; r -= 0.02) {
    if (driftRate(Math.abs(curve), r, car) <= 0.75 * steerRate(r, car, false))
      return r;
  }
  return 0.2;
}

function curveAhead(track: Track, z: number, distance: number) {
  let worst = 0;
  for (let d = 0; d < distance; d += SEGMENT_LENGTH) {
    const c = segmentAt(track, z + d).curve;
    if (Math.abs(c) > Math.abs(worst)) worst = c;
  }
  return worst;
}

const wrapDelta = (d: number, length: number) =>
  ((((d + length / 2) % length) + length) % length) - length / 2;

export function driveAI(
  mem: AIMemory,
  me: VehicleState,
  others: VehicleState[],
  car: CarDefinition,
  track: Track,
  profile: DifficultyProfile,
  style: DriverStyle,
  dt: number,
  rand: () => number,
): DriveInput {
  mem.timer -= dt;
  mem.mistake = Math.max(0, mem.mistake - dt);
  const ratio = Math.min(1, Math.abs(me.speed) / car.maxSpeed);

  if (mem.timer <= 0) {
    mem.timer = profile.reaction;
    const curve = curveAhead(
      track,
      me.z,
      me.speed * (0.6 + profile.reaction) + 1500,
    );
    let target =
      car.maxSpeed *
      Math.min(
        1,
        cornerSpeedRatio(curve, car) * profile.cornerMargin * style.braking,
      );
    let x =
      Math.max(-1, Math.min(1, curve / 6)) * 0.55 * style.line +
      style.lane * (1 - Math.min(1, Math.abs(curve) / 3));

    if (mem.mistake <= 0 && rand() < profile.mistakeRate * profile.reaction) {
      mem.mistake = 0.6 + rand() * 0.6;
      mem.mistakeWide = rand() < 0.5 ? -Math.sign(curve || 1) * 0.6 : 0;
    }
    if (mem.mistake > 0) {
      target *= mem.mistakeWide ? 1 : 1.12;
      x += mem.mistakeWide;
    }

    const ahead = others
      .map((o) => ({ o, dz: wrapDelta(o.z - me.z, track.length) }))
      .filter(({ o, dz }) => dz > 0 && dz < 2500 && Math.abs(o.x - me.x) < 0.4)
      .sort((a, b) => a.dz - b.dz)[0];
    if (ahead) {
      const blocked = (side: number) =>
        others.some((o) => {
          const dz = wrapDelta(o.z - me.z, track.length);
          return (
            o !== ahead.o &&
            Math.abs(dz) < COLLISION.carLength * 2 &&
            Math.sign(o.x - ahead.o.x) === side
          );
        });
      const side = ahead.o.x > 0 ? -1 : 1;
      const wantsPass =
        me.speed > ahead.o.speed * 0.98 &&
        rand() < profile.overtake * style.aggression + 0.2;
      if (wantsPass && !blocked(side)) {
        x = Math.max(-0.75, Math.min(0.75, ahead.o.x + side * 0.5));
      } else if (wantsPass && !blocked(-side)) {
        x = Math.max(-0.75, Math.min(0.75, ahead.o.x - side * 0.5));
      } else if (ahead.dz < COLLISION.carLength * 1.5) {
        target = Math.min(target, ahead.o.speed);
      }
    }

    if (Math.abs(me.x) > 1) {
      x = Math.sign(me.x) * 0.5;
      target *= 0.6;
    }
    mem.targetX = x;
    mem.targetSpeed = target;
  }

  const curve = segmentAt(track, me.z).curve;
  const rate = steerRate(ratio, car, Math.abs(me.x) > 1);
  const feedForward = rate > 0 ? driftRate(curve, ratio, car) / rate : 0;
  const steer = Math.max(
    -1,
    Math.min(1, (mem.targetX - me.x) * 3 + feedForward),
  );
  return {
    throttle: me.speed < mem.targetSpeed * 0.98,
    brake: me.speed > mem.targetSpeed * 1.04,
    steer,
    handbrake: false,
    nitro: false,
  };
}
