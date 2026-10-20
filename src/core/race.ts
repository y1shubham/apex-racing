import type { CarDefinition } from "../config/cars";
import { COLLISION, DRIFT, NITRO, RACE, SEGMENT_LENGTH } from "../config/game";
import { SCENERY_HIT_WIDTH } from "../config/tracks";
import { stepVehicle, type DriveInput, type VehicleState } from "./physics";
import { segmentAt, type Track } from "./track";

export type RaceStatus =
  "ready" | "countdown" | "racing" | "paused" | "finished";

export interface Racer {
  id: string;
  name: string;
  isPlayer: boolean;
  paintId: string;
  state: VehicleState;
  distance: number;
  lapStart: number;
  lapTimes: number[];
  finishTime: number | null;
  wobble: number;
  steer: number;
  nitro: number;
  boosting: boolean;
  driftTime: number;
  driftControl: number;
  driftPending: number;
  driftNitroPending: number;
  driftScore: number;
  lastDrift: { points: number; at: number } | null;
}

export interface RacerEntry {
  id: string;
  name: string;
  isPlayer: boolean;
  paintId: string;
}

export interface CollisionEvent {
  racers: Racer[];
  hard: boolean;
}
const mod = (v: number, m: number) => ((v % m) + m) % m;

export class Race {
  status: RaceStatus = "countdown";
  countdown = RACE.countdownSeconds;
  time = 0;
  racers: Racer[];
  private resumeTo: RaceStatus = "racing";

  constructor(
    readonly track: Track,
    readonly car: CarDefinition,
    entries: RacerEntry[],
    readonly laps = RACE.laps,
  ) {
    this.racers = entries.map((e, i) => {
      const distance = -(Math.floor(i / 2) + 1) * RACE.gridRowGap;
      return {
        ...e,
        state: {
          z: mod(distance, track.length),
          x: i % 2 ? RACE.gridLaneX : -RACE.gridLaneX,
          speed: 0,
          xv: 0,
          drift: 0,
        },
        distance,
        lapStart: 0,
        lapTimes: [],
        finishTime: null,
        wobble: 0,
        steer: 0,
        nitro: 0,
        boosting: false,
        driftTime: 0,
        driftControl: 0,
        driftPending: 0,
        driftNitroPending: 0,
        driftScore: 0,
        lastDrift: null,
      };
    });
  }

  get player() {
    return this.racers.find((r) => r.isPlayer)!;
  }

  lap(r: Racer) {
    return Math.min(
      this.laps,
      Math.max(1, Math.floor(r.distance / this.track.length) + 1),
    );
  }

  standings() {
    return [...this.racers].sort((a, b) => {
      if (a.finishTime !== null || b.finishTime !== null)
        return (a.finishTime ?? Infinity) - (b.finishTime ?? Infinity);
      return b.distance - a.distance;
    });
  }

  position(r: Racer) {
    return this.standings().indexOf(r) + 1;
  }

  bestLap(r: Racer) {
    return r.lapTimes.length ? Math.min(...r.lapTimes) : null;
  }

  pause() {
    if (this.status === "racing" || this.status === "countdown") {
      this.resumeTo = this.status;
      this.status = "paused";
    }
  }

  resume() {
    if (this.status === "paused") this.status = this.resumeTo;
  }

  step(dt: number, inputFor: (r: Racer) => DriveInput): CollisionEvent[] {
    if (this.status === "countdown") {
      this.countdown -= dt;
      if (this.countdown <= 0) this.status = "racing";
      return [];
    }
    if (this.status !== "racing") return [];
    this.time += dt;
    const L = this.track.length;

    for (const r of this.racers) {
      const input = { ...inputFor(r) };
      if (r.wobble > 0) {
        const t = COLLISION.wobbleSeconds - r.wobble;
        const sway = Math.sin(t * COLLISION.wobbleFrequency);
        const fade = r.wobble / COLLISION.wobbleSeconds;
        input.steer *= COLLISION.wobbleControl;
        r.state.xv = sway * COLLISION.wobbleSway * fade;
        r.wobble -= dt;
        r.state.speed *= 1 - COLLISION.wobbleDrag * dt;
        r.steer = sway;
      } else r.steer = input.steer;
      r.boosting = input.nitro && r.nitro > 0 && r.state.speed > 0;
      input.nitro = r.boosting;
      if (r.boosting) r.nitro = Math.max(0, r.nitro - NITRO.burnRate * dt);
      const curve = segmentAt(this.track, r.state.z).curve;
      r.state = stepVehicle(r.state, input, this.car, curve, L, dt);
      this.updateDrift(r, curve, dt);
      const lapsBefore = Math.floor(r.distance / L);
      r.distance += r.state.speed * dt;
      const lapsAfter = Math.floor(r.distance / L);
      if (lapsAfter > lapsBefore && lapsAfter >= 1 && r.finishTime === null) {
        r.lapTimes.push(this.time - r.lapStart);
        r.lapStart = this.time;
        if (lapsAfter >= this.laps) r.finishTime = this.time;
      }
    }

    const events = [...this.resolveCollisions(), ...this.resolveProps()];
    if (this.player.finishTime !== null) this.status = "finished";
    return events;
  }

  private updateDrift(r: Racer, curve: number, dt: number) {
    if (r.state.drift && Math.abs(r.state.x) > 1) {
      this.failDrift(r);
      return;
    }
    if (r.state.drift) {
      r.driftTime += dt;
      const withCurve =
        Math.abs(curve) > DRIFT.curveThreshold &&
        Math.sign(curve) === r.state.drift;
      const control = withCurve ? 1 : DRIFT.offLineControl;
      r.driftControl = control;
      const bonus = Math.min(
        DRIFT.maxDurationBonus,
        0.5 + r.driftTime / DRIFT.durationRamp,
      );
      const rate =
        Math.min(1, r.state.speed / this.car.maxSpeed) * control * bonus * dt;
      r.driftPending += DRIFT.scoreRate * rate;
      r.driftNitroPending += DRIFT.nitroRate * rate;
    } else if (r.driftTime > 0) {
      if (r.driftTime >= DRIFT.minDuration) {
        const points = Math.round(r.driftPending);
        r.driftScore += points;
        r.nitro = Math.min(
          this.car.nitroCapacity,
          r.nitro + r.driftNitroPending,
        );
        r.lastDrift = { points, at: this.time };
      }
      this.clearDrift(r);
    }
  }

  private clearDrift(r: Racer) {
    r.driftTime = 0;
    r.driftPending = 0;
    r.driftNitroPending = 0;
  }

  private failDrift(r: Racer) {
    r.state.drift = 0;
    this.clearDrift(r);
  }

  private resolveCollisions(): CollisionEvent[] {
    const events: CollisionEvent[] = [];
    const L = this.track.length;
    const { carLength, carWidth } = COLLISION;
    for (let i = 0; i < this.racers.length; i++) {
      for (let j = i + 1; j < this.racers.length; j++) {
        const a = this.racers[i]!;
        const b = this.racers[j]!;
        const dz = mod(a.state.z - b.state.z + L / 2, L) - L / 2;
        const dx = a.state.x - b.state.x;
        const overlapZ = carLength - Math.abs(dz);
        const overlapX = carWidth - Math.abs(dx);
        if (overlapZ <= 0 || overlapX <= 0) continue;

        const [front, rear] = dz >= 0 ? [a, b] : [b, a];
        const closing = rear.state.speed - front.state.speed;
        let hard = false;
        if (Math.abs(dx) < carWidth * COLLISION.rearEndAlignment) {
          if (closing > 0) {
            const mean = (rear.state.speed + front.state.speed) / 2;
            const bounce = (COLLISION.restitution * closing) / 2;
            rear.state.speed = mean - bounce;
            front.state.speed = mean + bounce;
            hard = closing > COLLISION.hardHitThreshold * this.car.maxSpeed;
            if (hard) rear.wobble = COLLISION.wobbleSeconds;
          }
          rear.state.z = mod(rear.state.z - overlapZ, L);
          rear.distance -= overlapZ;
        } else {
          const side = dx >= 0 ? 1 : -1;
          a.state.x += (side * overlapX) / 2;
          b.state.x -= (side * overlapX) / 2;
          a.state.xv = side * COLLISION.sideKnock;
          b.state.xv = -side * COLLISION.sideKnock;
          a.state.speed *= 1 - COLLISION.sideScrub;
          b.state.speed *= 1 - COLLISION.sideScrub;
        }
        if (a.state.drift) this.failDrift(a);
        if (b.state.drift) this.failDrift(b);
        events.push({ racers: [a, b], hard });
      }
    }
    return events;
  }

  private resolveProps(): CollisionEvent[] {
    const events: CollisionEvent[] = [];
    const L = this.track.length;
    for (const r of this.racers) {
      if (r.state.speed <= 0 || Math.abs(r.state.x) < 1) continue;
      for (let d = 0; d < COLLISION.carLength; d += SEGMENT_LENGTH) {
        const seg = segmentAt(this.track, r.state.z + d);
        const hit = seg.scenery.find(
          (s) =>
            Math.abs(r.state.x - s.offset) <
            (SCENERY_HIT_WIDTH[s.kind] + COLLISION.carWidth) / 2,
        );
        if (!hit) continue;
        const back =
          mod(r.state.z + COLLISION.carLength - seg.index * SEGMENT_LENGTH, L) +
          1;
        r.state.z = mod(r.state.z - back, L);
        r.distance -= back;
        r.state.speed *= COLLISION.propSpeedKeep;
        r.state.xv = -Math.sign(hit.offset) * COLLISION.propBounce;
        this.failDrift(r);
        events.push({ racers: [r], hard: true });
        break;
      }
    }
    return events;
  }
}
