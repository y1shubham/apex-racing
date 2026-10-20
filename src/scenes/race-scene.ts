import * as Phaser from "phaser";
import { CARS, PAINTS, type CarDefinition } from "../config/cars";
import {
  CAMERA_DEPTH,
  CAR_WORLD_WIDTH,
  FIXED_STEP,
  PLAYER_Z,
  ROAD_WIDTH,
  SPEED_TO_KMH,
  SPRITE_SCALE,
} from "../config/game";
import { TRACKS } from "../config/tracks";
import { stepVehicle, type VehicleState } from "../core/physics";
import { buildTrack, segmentAt, type Track } from "../core/track";
import { RoadRenderer } from "../render/road-renderer";
import { carTextureKey, type CarFrame } from "../render/textures";
import { InputManager } from "./input-manager";

export class RaceScene extends Phaser.Scene {
  private track!: Track;
  private car!: CarDefinition;
  private paintId!: string;
  private road!: RoadRenderer;
  private controls!: InputManager;
  private player!: Phaser.GameObjects.Image;
  private speedText!: Phaser.GameObjects.Text;
  private state: VehicleState = { z: 0, x: 0, speed: 0 };
  private acc = 0;

  constructor() {
    super("race");
  }

  create({
    trackId,
    paintId,
  }: {
    trackId?: string | null;
    paintId?: string | null;
  }) {
    this.track = buildTrack(TRACKS.find((t) => t.id === trackId) ?? TRACKS[0]!);
    this.car = CARS[0]!;
    this.state = { z: 0, x: 0, speed: 0 };
    this.road = new RoadRenderer(this, this.track);
    this.controls = new InputManager(this);

    this.paintId =
      PAINTS.find((p) => p.id === paintId)?.id ?? this.car.defaultPaint;
    this.player = this.add
      .image(0, 0, carTextureKey(this.car.id, this.paintId))
      .setOrigin(0.5, 1)
      .setDepth(1000);
    this.speedText = this.add
      .text(0, 48, "", {
        fontFamily: "monospace",
        fontSize: "28px",
        color: "#ffffff",
      })
      .setOrigin(1, 1)
      .setDepth(2000);
  }

  update(_time: number, delta: number) {
    const input = this.controls.read();
    this.acc += Math.min(delta / 1000, 0.1);
    while (this.acc >= FIXED_STEP) {
      const curve = segmentAt(this.track, this.state.z + PLAYER_Z).curve;
      this.state = stepVehicle(
        this.state,
        input,
        this.car,
        curve,
        this.track.length,
        FIXED_STEP,
      );
      this.acc -= FIXED_STEP;
    }

    const ratio = Math.abs(this.state.speed) / this.car.maxSpeed;
    this.road.render(this.state.z, this.state.x, ratio, delta / 1000);

    const offroad = Math.abs(this.state.x) > 1;
    const bounce =
      offroad && ratio > 0.05
        ? Phaser.Math.Between(-3, 3)
        : Math.sin(this.state.z / 300) * 1.5 * ratio;
    const { width: W, height: H } = this.scale;
    const carWidth =
      CAR_WORLD_WIDTH *
      (CAMERA_DEPTH / PLAYER_Z) *
      (W / 2) *
      SPRITE_SCALE *
      ROAD_WIDTH;
    const straight = this.textures.getFrame(
      carTextureKey(this.car.id, this.paintId),
    );
    const frame: CarFrame =
      ratio < 0.05 || !input.steer
        ? "straight"
        : input.steer < 0
          ? "left"
          : "right";
    this.player
      .setTexture(carTextureKey(this.car.id, this.paintId, frame))
      .setScale(carWidth / straight.width)
      .setPosition(W / 2, H - 12 + bounce);
    this.speedText
      .setX(W - 16)
      .setText(`${Math.round(Math.abs(this.state.speed) * SPEED_TO_KMH)} km/h`);
  }
}
