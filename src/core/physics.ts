import type { CarDefinition } from "../config/cars";
import { PHYSICS as P } from "../config/game";

export interface VehicleState {
  z: number;
  x: number;
  speed: number;
}

export interface DriveInput {
  throttle: boolean;
  brake: boolean;
  steer: number;
}

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

  let x = s.x + input.steer * steerRate(ratio, car, offroad) * dt;
  x -= driftRate(curve, ratio, car) * dt;
  x = Math.max(-P.maxOffset, Math.min(P.maxOffset, x));

  let speed = s.speed;
  if (input.throttle && !input.brake) {
    speed +=
      speed < 0
        ? car.braking * dt
        : car.acceleration * (1 - P.accelTaper * ratio) * dt;
  } else if (input.brake && !input.throttle) {
    speed -=
      speed > 0 ? car.braking * dt : car.acceleration * P.reverseAccel * dt;
  } else {
    speed -= Math.sign(speed) * Math.min(Math.abs(speed), P.friction * dt);
  }
  if (offroad && speed > car.maxSpeed * P.offroadSpeedLimit)
    speed -= P.offroadDecel * dt;
  speed = Math.max(
    -car.maxSpeed * P.maxReverseRatio,
    Math.min(car.maxSpeed, speed),
  );

  const z = (((s.z + speed * dt) % trackLength) + trackLength) % trackLength;
  return { z, x, speed };
}
