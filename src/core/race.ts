import type { CarDefinition } from "../config/cars";
import { COLLISION, RACE } from "../config/game";
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
  spin: number;
  steer: number;
}

export interface RacerEntry {
  id: string;
  name: string;
  isPlayer: boolean;
  paintId: string;
}

export interface CollisionEvent {
  a: Racer;
  b: Racer;
  spin: boolean;
}

const IDLE: DriveInput = { throttle: false, brake: false, steer: 0 };
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
        },
        distance,
        lapStart: 0,
        lapTimes: [],
        finishTime: null,
        spin: 0,
        steer: 0,
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
      const input = r.spin > 0 ? IDLE : inputFor(r);
      r.steer = input.steer;
      const curve = segmentAt(this.track, r.state.z).curve;
      r.state = stepVehicle(r.state, input, this.car, curve, L, dt);
      if (r.spin > 0) {
        r.spin -= dt;
        r.state.speed *= 1 - COLLISION.spinDrag * dt;
      }
      const lapsBefore = Math.floor(r.distance / L);
      r.distance += r.state.speed * dt;
      const lapsAfter = Math.floor(r.distance / L);
      if (lapsAfter > lapsBefore && lapsAfter >= 1 && r.finishTime === null) {
        r.lapTimes.push(this.time - r.lapStart);
        r.lapStart = this.time;
        if (lapsAfter >= this.laps) r.finishTime = this.time;
      }
    }

    const events = this.resolveCollisions();
    if (this.player.finishTime !== null) this.status = "finished";
    return events;
  }

  private resolveCollisions(): CollisionEvent[] {
    const events: CollisionEvent[] = [];
    const L = this.track.length;
    for (let i = 0; i < this.racers.length; i++) {
      for (let j = i + 1; j < this.racers.length; j++) {
        const a = this.racers[i]!;
        const b = this.racers[j]!;
        const dz = mod(a.state.z - b.state.z + L / 2, L) - L / 2;
        const dx = a.state.x - b.state.x;
        if (
          Math.abs(dz) >= COLLISION.carLength ||
          Math.abs(dx) >= COLLISION.carWidth
        )
          continue;

        const [front, rear] = dz >= 0 ? [a, b] : [b, a];
        const rel = rear.state.speed - front.state.speed;
        const spin = rel > COLLISION.spinThreshold * this.car.maxSpeed;
        if (rel > 0) {
          front.state.speed += rel * COLLISION.frontPush;
          rear.state.speed = front.state.speed * COLLISION.rearSpeedKeep;
        }
        const back = COLLISION.carLength - Math.abs(dz);
        rear.state.z = mod(rear.state.z - back, L);
        rear.distance -= back;
        const push = (COLLISION.carWidth - Math.abs(dx)) / 2;
        const side = dx >= 0 ? 1 : -1;
        a.state.x += side * push;
        b.state.x -= side * push;
        if (spin) rear.spin = COLLISION.spinSeconds;
        events.push({ a, b, spin });
      }
    }
    return events;
  }
}
