import { RUMBLE_LENGTH, SEGMENT_LENGTH } from "../config/game";
import type {
  SceneryKind,
  TrackDefinition,
  TrackSection,
} from "../config/tracks";

export interface ScenerySprite {
  kind: SceneryKind;
  offset: number;
}

export interface Segment {
  index: number;
  curve: number;
  y1: number;
  y2: number;
  light: boolean;
  scenery: ScenerySprite[];
}

export interface Track {
  definition: TrackDefinition;
  segments: Segment[];
  length: number;
}

const easeIn = (a: number, b: number, p: number) => a + (b - a) * p * p;
const easeOut = (a: number, b: number, p: number) =>
  a + (b - a) * (1 - (1 - p) ** 2);
const easeInOut = (a: number, b: number, p: number) =>
  a + (b - a) * (0.5 - Math.cos(p * Math.PI) / 2);

export function buildTrack(
  definition: TrackDefinition,
  reversed = false,
): Track {
  const segments: Segment[] = [];
  let y = 0;

  const addSection = ({ length, curve = 0, hill = 0 }: TrackSection) => {
    const startY = y;
    const endY = startY + hill * SEGMENT_LENGTH;
    const ramp = Math.max(1, Math.floor(length / 4));
    for (let n = 0; n < length; n++) {
      const c =
        n < ramp
          ? easeIn(0, curve, n / ramp)
          : n >= length - ramp
            ? easeOut(curve, 0, (n - (length - ramp)) / ramp)
            : curve;
      const index = segments.length;
      const nextY = easeInOut(startY, endY, (n + 1) / length);
      segments.push({
        index,
        curve: c,
        y1: y,
        y2: nextY,
        light: Math.floor(index / RUMBLE_LENGTH) % 2 === 0,
        scenery: [],
      });
      y = nextY;
    }
  };

  const sections = reversed
    ? [...definition.sections]
        .reverse()
        .map((s) => ({ ...s, curve: -(s.curve ?? 0), hill: -(s.hill ?? 0) }))
    : definition.sections;
  sections.forEach(addSection);
  addSection({ length: 200, hill: -y / SEGMENT_LENGTH });
  segments[segments.length - 1]!.y2 = 0;

  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const kinds = definition.theme.scenery;
  for (let i = 20; i < segments.length; i += definition.sceneryEvery) {
    for (const side of [-1, 1]) {
      segments[i]!.scenery.push({
        kind: kinds[Math.floor(rand() * kinds.length)]!,
        offset: side * (1.6 + rand() * 2),
      });
    }
  }

  return { definition, segments, length: segments.length * SEGMENT_LENGTH };
}

export function segmentAt(track: Track, z: number): Segment {
  const n = track.segments.length;
  return track.segments[((Math.floor(z / SEGMENT_LENGTH) % n) + n) % n]!;
}
