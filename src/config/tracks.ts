export type SceneryKind =
  | "palm"
  | "coast-lamp"
  | "coast-rock"
  | "city-lamp"
  | "barrier"
  | "power-pole"
  | "fir-a"
  | "fir-b"
  | "fir-c"
  | "alpine-rock"
  | "alpine-boulder";

export const SCENERY_HIT_WIDTH: Record<SceneryKind, number> = {
  palm: 0.12,
  "coast-lamp": 0.05,
  "coast-rock": 0.3,
  "city-lamp": 0.08,
  barrier: 0.3,
  "power-pole": 0.06,
  "fir-a": 0.1,
  "fir-b": 0.1,
  "fir-c": 0.1,
  "alpine-rock": 0.25,
  "alpine-boulder": 0.3,
};

export interface TrackSection {
  length: number;
  curve?: number;
  hill?: number;
}

export interface TrackTheme {
  skyTop: number;
  skyBottom: number;
  grass: [number, number];
  rumble: [number, number];
  road: [number, number];
  lane: number;
  scenery: SceneryKind[];
}

export interface TrackDefinition {
  id: string;
  name: string;
  theme: TrackTheme;
  sections: TrackSection[];
  sceneryEvery: number;
}

export const TRACKS: TrackDefinition[] = [
  {
    id: "sunset-coast",
    name: "Sunset Coast",
    theme: {
      skyTop: 0x6d8fb8,
      skyBottom: 0xf2b27a,
      grass: [0xb8a27a, 0xae9870],
      rumble: [0xf2f2f2, 0xc8302a],
      road: [0x5a5a60, 0x55555b],
      lane: 0xf2f2f2,
      scenery: ["palm", "palm", "coast-lamp", "coast-rock"],
    },
    sceneryEvery: 12,
    sections: [
      { length: 120 },
      { length: 300, curve: 2 },
      { length: 400 },
      { length: 220, curve: -3, hill: 20 },
      { length: 350 },
      { length: 260, curve: 3, hill: -20 },
      { length: 400, hill: 25 },
      { length: 200, curve: -2 },
      { length: 300 },
      { length: 240, curve: 2, hill: -25 },
    ],
  },
  {
    id: "neon-circuit",
    name: "Neon Circuit",
    theme: {
      skyTop: 0x05060d,
      skyBottom: 0x1a1830,
      grass: [0x2a2a30, 0x25252b],
      rumble: [0xf2f2f2, 0xc8302a],
      road: [0x3a3a40, 0x36363c],
      lane: 0xf2d24a,
      scenery: ["city-lamp", "barrier", "power-pole", "city-lamp"],
    },
    sceneryEvery: 8,
    sections: [
      { length: 80 },
      { length: 120, curve: 5 },
      { length: 60 },
      { length: 120, curve: -6 },
      { length: 100, curve: 4 },
      { length: 80 },
      { length: 140, curve: -5 },
      { length: 160, curve: 6 },
      { length: 120 },
      { length: 100, curve: -4 },
      { length: 120, curve: -6 },
      { length: 80, curve: 5 },
      { length: 200 },
      { length: 140, curve: 5 },
      { length: 100, curve: -5 },
    ],
  },
  {
    id: "alpine-rush",
    name: "Alpine Rush",
    theme: {
      skyTop: 0x4a7ab0,
      skyBottom: 0xbcd3e6,
      grass: [0x5f7d3a, 0x587534],
      rumble: [0xf2f2f2, 0xc8302a],
      road: [0x55555b, 0x505056],
      lane: 0xf2f2f2,
      scenery: ["fir-a", "fir-b", "fir-c", "alpine-rock", "alpine-boulder"],
    },
    sceneryEvery: 6,
    sections: [
      { length: 100 },
      { length: 200, hill: 40 },
      { length: 150, curve: 4, hill: 20 },
      { length: 120, curve: -5, hill: -40 },
      { length: 200, hill: 60 },
      { length: 160, curve: 6 },
      { length: 180, curve: -3, hill: -60 },
      { length: 100 },
      { length: 160, curve: -6, hill: 40 },
      { length: 200, curve: 3, hill: -30 },
      { length: 150, hill: 30 },
      { length: 140, curve: 5, hill: -40 },
    ],
  },
];
