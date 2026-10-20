export type Difficulty = "easy" | "normal" | "hard";

export interface DifficultyProfile {
  reaction: number;
  cornerMargin: number;
  mistakeRate: number;
  overtake: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyProfile> = {
  easy: {
    reaction: 0.35,
    cornerMargin: 0.82,
    mistakeRate: 0.12,
    overtake: 0.4,
  },
  normal: {
    reaction: 0.2,
    cornerMargin: 0.9,
    mistakeRate: 0.05,
    overtake: 0.7,
  },
  hard: { reaction: 0.08, cornerMargin: 0.97, mistakeRate: 0.015, overtake: 1 },
};

export interface DriverStyle {
  name: string;
  paintId: string;
  line: number;
  braking: number;
  aggression: number;
  lane: number;
}

export const AI_DRIVERS: DriverStyle[] = [
  {
    name: "Kade",
    paintId: "crimson",
    line: 0.9,
    braking: 1.04,
    aggression: 0.9,
    lane: 0,
  },
  {
    name: "Nova",
    paintId: "electric-cyan",
    line: 0.6,
    braking: 0.97,
    aggression: 0.4,
    lane: -0.3,
  },
  {
    name: "Rex",
    paintId: "toxic-lime",
    line: 1,
    braking: 1.02,
    aggression: 0.7,
    lane: 0.2,
  },
  {
    name: "Iris",
    paintId: "chrome-white",
    line: 0.75,
    braking: 1,
    aggression: 0.55,
    lane: 0.3,
  },
  {
    name: "Zed",
    paintId: "neon-magenta",
    line: 0.5,
    braking: 0.95,
    aggression: 1,
    lane: -0.15,
  },
  {
    name: "Juno",
    paintId: "sunset-orange",
    line: 0.8,
    braking: 0.99,
    aggression: 0.6,
    lane: 0,
  },
];
