import * as Phaser from "phaser";
import {
  CAMERA_DEPTH,
  CAMERA_HEIGHT,
  DRAW_DISTANCE,
  LANES,
  PLAYER_Z,
  ROAD_WIDTH,
  SEGMENT_LENGTH,
  SPRITE_SCALE,
} from "../config/game";
import { segmentAt, type Segment, type Track } from "../core/track";
import {
  BACKDROP_HEIGHT,
  BACKDROP_HORIZON,
  backdropKey,
  SCENERY_WORLD_HEIGHT,
} from "./textures";

interface Point {
  x: number;
  y: number;
  w: number;
  scale: number;
}

interface Slice {
  segment: Segment;
  p1: Point;
  clip: number;
  inFront: boolean;
}

const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

function project(
  W: number,
  H: number,
  worldY: number,
  worldZ: number,
  camX: number,
  playerY: number,
  camZ: number,
): Point & { camZ: number } {
  const z = worldZ - camZ;
  const scale = CAMERA_DEPTH / z;
  return {
    x: W / 2 - scale * camX * (W / 2),
    y: Math.round(
      H / 2 + scale * (CAMERA_HEIGHT * (H / 2) - (worldY - playerY) * (W / 2)),
    ),
    w: scale * ROAD_WIDTH * (W / 2),
    scale,
    camZ: z,
  };
}

export class RoadRenderer {
  private backdrop: Phaser.GameObjects.TileSprite;
  private backdropScale = 1;
  private sky: Phaser.GameObjects.Graphics;
  private ground: Phaser.GameObjects.Rectangle;
  private road: Phaser.GameObjects.Graphics;
  private pool: Phaser.GameObjects.Image[] = [];
  private slices: Slice[] = [];
  private horizon = 0;
  private size = { w: 0, h: 0 };
  private bgOffset = 0;

  constructor(
    private scene: Phaser.Scene,
    private track: Track,
  ) {
    const theme = track.definition.theme;
    this.sky = scene.add
      .graphics()
      .fillGradientStyle(
        theme.skyTop,
        theme.skyTop,
        theme.skyBottom,
        theme.skyBottom,
      )
      .fillRect(0, 0, 1, 1);
    this.backdrop = scene.add
      .tileSprite(0, 0, 1, 1, backdropKey(track.definition.id))
      .setOrigin(0, 0);
    this.ground = scene.add
      .rectangle(0, 0, 1, 1, theme.grass[1])
      .setOrigin(0, 0);
    this.road = scene.add.graphics();
  }

  private layout(w: number, h: number) {
    this.size = { w, h };
    this.horizon = h / 2;
    this.sky.setScale(w, h);
    this.backdropScale = (h / 2 / BACKDROP_HORIZON) * 1.15;
    this.backdrop
      .setSize(w, BACKDROP_HEIGHT * this.backdropScale)
      .setTileScale(this.backdropScale);
    this.ground.setSize(w, h);
  }

  render(cameraZ: number, cameraX: number, speedRatio: number, dt: number) {
    const { segments, length, definition } = this.track;
    const theme = definition.theme;
    const { width: W, height: H } = this.scene.scale;
    if (W !== this.size.w || H !== this.size.h) this.layout(W, H);
    const g = this.road.clear();

    const base = segmentAt(this.track, cameraZ);
    const basePercent = (cameraZ % SEGMENT_LENGTH) / SEGMENT_LENGTH;
    const playerSeg = segmentAt(this.track, cameraZ + PLAYER_Z);
    const playerPercent =
      ((cameraZ + PLAYER_Z) % SEGMENT_LENGTH) / SEGMENT_LENGTH;
    const playerY = lerp(playerSeg.y1, playerSeg.y2, playerPercent);
    const camX = cameraX * ROAD_WIDTH;

    let maxY = H;
    let roadTop = H;
    let x = 0;
    let dx = -base.curve * basePercent;
    this.slices.length = 0;

    for (let n = 0; n < DRAW_DISTANCE; n++) {
      const segment = segments[(base.index + n) % segments.length]!;
      const camZ = cameraZ - (segment.index < base.index ? length : 0);
      const p1 = project(
        W,
        H,
        segment.y1,
        segment.index * SEGMENT_LENGTH,
        camX - x,
        playerY,
        camZ,
      );
      const p2 = project(
        W,
        H,
        segment.y2,
        (segment.index + 1) * SEGMENT_LENGTH,
        camX - x - dx,
        playerY,
        camZ,
      );
      x += dx;
      dx += segment.curve;
      const inFront = p1.camZ > CAMERA_DEPTH;
      this.slices.push({ segment, p1, clip: maxY, inFront });
      if (!inFront || p2.y >= p1.y || p2.y >= maxY) continue;

      const c = segment.light ? 0 : 1;
      g.fillStyle(theme.grass[c]).fillRect(0, p2.y, W, p1.y - p2.y);
      const r1 = p1.w / Math.max(6, 2 * LANES);
      const r2 = p2.w / Math.max(6, 2 * LANES);
      quad(
        g,
        theme.rumble[c],
        p1.x - p1.w - r1,
        p1.y,
        p1.x - p1.w,
        p2.x - p2.w,
        p2.y,
        p2.x - p2.w - r2,
      );
      quad(
        g,
        theme.rumble[c],
        p1.x + p1.w,
        p1.y,
        p1.x + p1.w + r1,
        p2.x + p2.w + r2,
        p2.y,
        p2.x + p2.w,
      );
      quad(
        g,
        theme.road[c],
        p1.x - p1.w,
        p1.y,
        p1.x + p1.w,
        p2.x + p2.w,
        p2.y,
        p2.x - p2.w,
      );
      if (segment.light) {
        const l1 = p1.w / Math.max(32, 8 * LANES);
        const l2 = p2.w / Math.max(32, 8 * LANES);
        for (let lane = 1; lane < LANES; lane++) {
          const lx1 = p1.x - p1.w + ((2 * p1.w) / LANES) * lane;
          const lx2 = p2.x - p2.w + ((2 * p2.w) / LANES) * lane;
          quad(
            g,
            theme.lane,
            lx1 - l1 / 2,
            p1.y,
            lx1 + l1 / 2,
            lx2 + l2 / 2,
            p2.y,
            lx2 - l2 / 2,
          );
        }
      }
      maxY = p1.y;
      roadTop = p2.y;
    }

    this.horizon = lerp(
      this.horizon,
      Math.max(roadTop, H * 0.3),
      Math.min(1, dt * 8),
    );
    this.bgOffset += playerSeg.curve * speedRatio * dt * 40;
    this.backdrop.setY(
      this.horizon - BACKDROP_HORIZON * this.backdropScale,
    ).tilePositionX = this.bgOffset;
    this.ground.setY(roadTop);

    this.renderScenery(W);
  }

  private renderScenery(W: number) {
    let used = 0;
    for (let n = this.slices.length - 1; n > 0; n--) {
      const { segment, p1, clip, inFront } = this.slices[n]!;
      if (!inFront) continue;
      for (const s of segment.scenery) {
        const frame = this.scene.textures.getFrame(s.kind);
        const destH =
          SCENERY_WORLD_HEIGHT[s.kind] *
          p1.scale *
          (W / 2) *
          SPRITE_SCALE *
          ROAD_WIDTH;
        const destW = (destH * frame.width) / frame.height;
        const visibleH = destH - Math.max(0, p1.y - clip);
        const sx = p1.x + s.offset * p1.w;
        if (destW < 1 || visibleH <= 0 || sx < -destW || sx > W + destW)
          continue;
        const img =
          this.pool[used] ??
          (this.pool[used] = this.scene.add.image(0, 0, s.kind));
        used++;
        img
          .setTexture(s.kind)
          .setOrigin(s.offset < 0 ? 1 : 0, 1)
          .setPosition(sx, p1.y)
          .setDisplaySize(destW, destH)
          .setCrop(0, 0, frame.width, (frame.height * visibleH) / destH)
          .setDepth(10 + used)
          .setVisible(true);
      }
    }
    for (let i = used; i < this.pool.length; i++)
      this.pool[i]!.setVisible(false);
  }
}

function quad(
  g: Phaser.GameObjects.Graphics,
  color: number,
  x1: number,
  y1: number,
  x2: number,
  x3: number,
  y2: number,
  x4: number,
) {
  g.fillStyle(color);
  if (y1 - y2 <= 2) {
    const left = (x1 + x4) / 2;
    g.fillRect(left, y2, (x2 + x3) / 2 - left, y1 - y2);
    return;
  }
  g.beginPath()
    .moveTo(x1, y1)
    .lineTo(x2, y1)
    .lineTo(x3, y2)
    .lineTo(x4, y2)
    .closePath()
    .fillPath();
}
