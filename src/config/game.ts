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
  lateralDecay: 4,
};

export const RACE = {
  laps: 2,
  countdownSeconds: 3,
  gridRowGap: 1200,
  gridLaneX: 0.35,
};

export const COLLISION = {
  carLength: 250,
  carWidth: 0.22,
  restitution: 0.3,
  rearEndAlignment: 0.7,
  sideKnock: 0.9,
  sideScrub: 0.03,
  hardHitThreshold: 0.3,
  wobbleSeconds: 1.1,
  wobbleFrequency: 11,
  wobbleSway: 0.7,
  wobbleControl: 0.3,
  wobbleDrag: 0.8,
  propSpeedKeep: 0.15,
  propBounce: 1.4,
};

export const DRIFT = {
  minSpeedRatio: 0.4,
  entrySteer: 0.3,
  baseTurn: 0.55,
  steerAuthority: 0.6,
  centrifugalScale: 0.45,
  speedLoss: 900,
  handbrakeBrake: 0.6,
  minDuration: 0.6,
  scoreRate: 400,
  nitroRate: 18,
  curveThreshold: 0.5,
  offLineControl: 0.25,
  durationRamp: 2,
  maxDurationBonus: 1.5,
};

export const NITRO = {
  speedMultiplier: 1.2,
  accelMultiplier: 1.8,
  burnRate: 30,
  overspeedDecay: 1500,
};

export const STEERING_INPUT = {
  rise: 5,
  return: 8,
  leanFrameThreshold: 0.3,
};
