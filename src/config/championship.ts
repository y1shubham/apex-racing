import type { Difficulty } from "./ai";

export interface EventDefinition {
  id: string;
  name: string;
  trackId: string;
  reversed: boolean;
  difficulty: Difficulty;
  laps: number;
  aiCarId: string;
}

export const EVENTS: EventDefinition[] = [
  {
    id: "coastal-opener",
    name: "Coastal Opener",
    trackId: "sunset-coast",
    reversed: false,
    difficulty: "easy",
    laps: 2,
    aiCarId: "apex-s1",
  },
  {
    id: "neon-nights",
    name: "Neon Nights",
    trackId: "neon-circuit",
    reversed: false,
    difficulty: "easy",
    laps: 2,
    aiCarId: "apex-s1",
  },
  {
    id: "summit-sprint",
    name: "Summit Sprint",
    trackId: "alpine-rush",
    reversed: false,
    difficulty: "normal",
    laps: 2,
    aiCarId: "vortex-gt",
  },
  {
    id: "coast-reverse",
    name: "Coast Reverse",
    trackId: "sunset-coast",
    reversed: true,
    difficulty: "normal",
    laps: 2,
    aiCarId: "vortex-gt",
  },
  {
    id: "grid-lock",
    name: "Grid Lock",
    trackId: "neon-circuit",
    reversed: false,
    difficulty: "hard",
    laps: 3,
    aiCarId: "phantom-r",
  },
  {
    id: "alpine-final",
    name: "Alpine Final",
    trackId: "alpine-rush",
    reversed: false,
    difficulty: "hard",
    laps: 3,
    aiCarId: "phantom-r",
  },
];

export const POINTS_BY_POSITION = [10, 7, 5, 3, 2, 1];
export const CREDITS_BY_POSITION = [1000, 700, 500, 300, 200, 100];
export const DRIFT_CREDIT_DIVISOR = 10;
