export const SEGMENT_LENGTH = 200;
export const RUMBLE_LENGTH = 3;
export const ROAD_WIDTH = 2000;
export const LANES = 3;
export const CAMERA_HEIGHT = 1000;
export const CAMERA_DEPTH = 1 / Math.tan((50 * Math.PI) / 180);
export const DRAW_DISTANCE = 300;
export const PLAYER_Z = CAMERA_HEIGHT * CAMERA_DEPTH;
export const SPRITE_SCALE = 0.25 / 80;
export const CAR_WORLD_WIDTH = 80;

export const FIXED_STEP = 1 / 60;
export const SPEED_TO_KMH = 0.025;

export const PHYSICS = {
  steerRate: 2.2,
  lowSpeedSteerRamp: 3,
  highSpeedSteerLoss: 0.35,
  centrifugal: 0.55,
  accelTaper: 0.4,
  friction: 2500,
  reverseAccel: 0.5,
  maxReverseRatio: 0.2,
  offroadSpeedLimit: 0.3,
  offroadDecel: 9000,
  offroadSteer: 0.6,
  maxOffset: 2.5,
};
