import type { CarDefinition } from "../config/cars";
import { DRIFT as D, NITRO as N, PHYSICS as P } from "../config/game";

export interface VehicleState {
  z: number;
  x: number;
  speed: number;
  xv: number;
  drift: number;
}

export interface DriveInput {
  throttle: boolean;
  brake: boolean;
  steer: number;
  handbrake: boolean;
  nitro: boolean;
}

export const IDLE_INPUT: DriveInput = {
  throttle: false,
  brake: false,
  steer: 0,
  handbrake: false,
  nitro: false,
};

export function steerRate(ratio: number, car: CarDefinition, offroad: boolean) {
  return (
    Math.min(1, ratio * P.lowSpeedSteerRamp) *
    (1 - P.highSpeedSteerLoss * ratio) *
    car.handling *
    (offroad ? P.offroadSteer : 1) *
    P.steerRate
  );
}

export function driftRate(curve: number, ratio: number, car: CarDefinition) {
  return (curve * ratio * ratio * P.centrifugal) / car.grip;
}

export function stepVehicle(
  s: VehicleState,
  input: DriveInput,
  car: CarDefinition,
  curve: number,
  trackLength: number,
  dt: number,
): VehicleState {
  const ratio = Math.min(1, Math.abs(s.speed) / car.maxSpeed);
  const offroad = Math.abs(s.x) > 1;

  let drift = s.drift;
  if (!input.handbrake || ratio < D.minSpeedRatio) drift = 0;
  else if (!drift && Math.abs(input.steer) > D.entrySteer)
    drift = Math.sign(input.steer);

  const turn = drift
    ? drift * D.baseTurn + input.steer * D.steerAuthority
    : input.steer;
  let x = s.x + (turn * steerRate(ratio, car, offroad) + s.xv) * dt;
  x -= driftRate(curve, ratio, car) * (drift ? D.centrifugalScale : 1) * dt;
  x = Math.max(-P.maxOffset, Math.min(P.maxOffset, x));

  const top = car.maxSpeed * (input.nitro ? N.speedMultiplier : 1);
  const accel = car.acceleration * (input.nitro ? N.accelMultiplier : 1);
  let speed = s.speed;
  if (input.throttle && !input.brake) {
    if (speed < 0) speed += car.braking * dt;
    else if (speed < top)
      speed = Math.min(
        top,
        speed + accel * (1 - P.accelTaper * (speed / top)) * dt,
      );
  } else if (input.brake && !input.throttle) {
    speed -=
      speed > 0 ? car.braking * dt : car.acceleration * P.reverseAccel * dt;
  } else if (input.handbrake && !drift && speed > 0) {
    speed = Math.max(0, speed - car.braking * D.handbrakeBrake * dt);
  } else {
    speed -= Math.sign(speed) * Math.min(Math.abs(speed), P.friction * dt);
  }
  if (drift) speed -= D.speedLoss * dt;
  if (offroad && speed > car.maxSpeed * P.offroadSpeedLimit)
    speed -= P.offroadDecel * dt;
  if (speed > top) speed = Math.max(top, speed - N.overspeedDecay * dt);
  speed = Math.max(-car.maxSpeed * P.maxReverseRatio, speed);

  const z = (((s.z + speed * dt) % trackLength) + trackLength) % trackLength;
  const xv = s.xv * Math.max(0, 1 - P.lateralDecay * dt);
  return { z, x, speed, xv, drift };
}
