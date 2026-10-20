export interface CarDefinition {
  id: string;
  name: string;
  acceleration: number;
  maxSpeed: number;
  handling: number;
  braking: number;
  grip: number;
  nitroCapacity: number;
  unlockCost: number;
  defaultPaint: string;
}

export const CARS: CarDefinition[] = [
  {
    id: "apex-s1",
    name: "Apex S1",
    acceleration: 2600,
    maxSpeed: 11000,
    handling: 1,
    braking: 9000,
    grip: 1,
    nitroCapacity: 100,
    unlockCost: 0,
    defaultPaint: "sunset-orange",
  },
  {
    id: "vortex-gt",
    name: "Vortex GT",
    acceleration: 3400,
    maxSpeed: 11800,
    handling: 0.9,
    braking: 9500,
    grip: 0.9,
    nitroCapacity: 120,
    unlockCost: 1500,
    defaultPaint: "electric-cyan",
  },
  {
    id: "phantom-r",
    name: "Phantom R",
    acceleration: 2900,
    maxSpeed: 13000,
    handling: 0.8,
    braking: 10000,
    grip: 0.8,
    nitroCapacity: 140,
    unlockCost: 4000,
    defaultPaint: "neon-magenta",
  },
];

export interface Paint {
  id: string;
  name: string;
  color: number;
}

export const PAINTS: Paint[] = [
  { id: "sunset-orange", name: "Sunset Orange", color: 0xff7a1a },
  { id: "electric-cyan", name: "Electric Cyan", color: 0x19e3ff },
  { id: "neon-magenta", name: "Neon Magenta", color: 0xff2bd6 },
  { id: "toxic-lime", name: "Toxic Lime", color: 0x9dff2b },
  { id: "chrome-white", name: "Chrome White", color: 0xdfe6ee },
  { id: "crimson", name: "Crimson", color: 0xd8182f },
];
