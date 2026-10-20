import * as Phaser from "phaser";
import { AI_DRIVERS, DIFFICULTIES, type Difficulty } from "../config/ai";
import { CARS, PAINTS } from "../config/cars";
import {
  CAMERA_DEPTH,
  CAR_WORLD_WIDTH,
  COLLISION,
  FIXED_STEP,
  PLAYER_Z,
  ROAD_WIDTH,
  SPRITE_SCALE,
  STEERING_INPUT,
} from "../config/game";
import { TRACKS } from "../config/tracks";
import { driveAI, newAIMemory, type AIMemory } from "../core/ai";
import { Race, type Racer } from "../core/race";
import { buildTrack } from "../core/track";
import { RoadRenderer, type CarSprite } from "../render/road-renderer";
import { carTextureKey, type CarFrame } from "../render/textures";
import { Hud } from "./hud";
import { InputManager } from "./input-manager";

export interface RaceSceneData {
  trackId?: string | null;
  paintId?: string | null;
  difficulty?: string | null;
}

const frameFor = (r: Racer, maxSpeed: number): CarFrame =>
  Math.abs(r.state.speed) / maxSpeed < 0.05 ||
  Math.abs(r.steer) < STEERING_INPUT.leanFrameThreshold
    ? "straight"
    : r.steer < 0
      ? "left"
      : "right";

const spinAngle = (r: Racer) =>
  r.spin > 0 ? (1 - r.spin / COLLISION.spinSeconds) * 360 : 0;

export class RaceScene extends Phaser.Scene {
  private setup!: RaceSceneData;
  private race!: Race;
  private road!: RoadRenderer;
  private controls!: InputManager;
  private hud!: Hud;
  private player!: Phaser.GameObjects.Image;
  private memories = new Map<string, AIMemory>();
  private difficulty: Difficulty = "normal";
  private acc = 0;
  private jolt = { time: 0, amp: 0 };
  private resultsShown = false;

  constructor() {
    super("race");
  }

  create(data: RaceSceneData) {
    this.setup = data;
    this.acc = 0;
    this.jolt = { time: 0, amp: 0 };
    this.resultsShown = false;
    const track = buildTrack(
      TRACKS.find((t) => t.id === data.trackId) ?? TRACKS[0]!,
    );
    const car = CARS[0]!;
    const paintId =
      PAINTS.find((p) => p.id === data.paintId)?.id ?? car.defaultPaint;
    this.difficulty =
      data.difficulty && data.difficulty in DIFFICULTIES
        ? (data.difficulty as Difficulty)
        : "normal";

    const rivals = AI_DRIVERS.filter((d) => d.paintId !== paintId).slice(0, 5);
    this.race = new Race(track, car, [
      ...rivals.map((d) => ({
        id: d.name,
        name: d.name,
        isPlayer: false,
        paintId: d.paintId,
      })),
      { id: "player", name: "You", isPlayer: true, paintId },
    ]);
    this.memories = new Map(rivals.map((d) => [d.name, newAIMemory()]));

    this.road = new RoadRenderer(this, track);
    this.controls = new InputManager(this);
    this.player = this.add
      .image(0, 0, carTextureKey(car.id, paintId))
      .setOrigin(0.5, 1)
      .setDepth(1000);
    this.hud = new Hud(this, () => this.pause());

    this.game.events.on(Phaser.Core.Events.BLUR, this.pause, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.game.events.off(Phaser.Core.Events.BLUR, this.pause, this),
    );
  }

  private pause() {
    if (this.race.status !== "racing" && this.race.status !== "countdown")
      return;
    this.race.pause();
    this.hud.showPause(
      () => {
        this.hud.hideOverlay();
        this.race.resume();
      },
      () => this.scene.restart(this.setup),
    );
  }

  update(_time: number, delta: number) {
    const race = this.race;
    if (this.controls.pausePressed()) {
      if (race.status === "paused") {
        this.hud.hideOverlay();
        race.resume();
      } else this.pause();
    }

    const input = this.controls.read(Math.min(delta / 1000, 0.1));
    const profile = DIFFICULTIES[this.difficulty];
    this.acc += Math.min(delta / 1000, 0.1);
    while (this.acc >= FIXED_STEP) {
      const events = race.step(FIXED_STEP, (r) => {
        if (r.isPlayer) return input;
        const others = race.racers.filter((o) => o !== r).map((o) => o.state);
        const style = AI_DRIVERS.find((d) => d.name === r.id)!;
        return driveAI(
          this.memories.get(r.id)!,
          r.state,
          others,
          race.car,
          race.track,
          profile,
          style,
          FIXED_STEP,
          Math.random,
        );
      });
      if (events.some((e) => e.a.isPlayer || e.b.isPlayer)) {
        const hard = events.some((e) => e.spin);
        this.jolt = { time: hard ? 0.3 : 0.12, amp: hard ? 8 : 3 };
      }
      this.acc -= FIXED_STEP;
    }

    const p = race.player;
    const maxSpeed = race.car.maxSpeed;
    const L = race.track.length;
    const cars: CarSprite[] = race.racers
      .filter((r) => !r.isPlayer)
      .map((r) => ({
        z: r.state.z,
        x: r.state.x,
        texture: carTextureKey(race.car.id, r.paintId, frameFor(r, maxSpeed)),
        sizeTexture: carTextureKey(race.car.id, r.paintId),
        angle: spinAngle(r),
      }));
    const ratio = Math.abs(p.state.speed) / maxSpeed;
    const paused = race.status === "paused";
    this.road.render(
      (((p.state.z - PLAYER_Z) % L) + L) % L,
      p.state.x,
      ratio,
      paused ? 0 : delta / 1000,
      cars,
    );

    const { width: W, height: H } = this.scale;
    const offroad = Math.abs(p.state.x) > 1;
    if (!paused) this.jolt.time = Math.max(0, this.jolt.time - delta / 1000);
    const shake =
      (this.jolt.time > 0 ? this.jolt.amp : 0) +
      (offroad && ratio > 0.05 && !paused ? 2 : 0);
    const bounce = Math.sin(p.state.z / 1500) * ratio;
    const straight = this.textures.getFrame(
      carTextureKey(race.car.id, p.paintId),
    );
    const carWidth =
      CAR_WORLD_WIDTH *
      (CAMERA_DEPTH / PLAYER_Z) *
      (W / 2) *
      SPRITE_SCALE *
      ROAD_WIDTH;
    this.player
      .setTexture(carTextureKey(race.car.id, p.paintId, frameFor(p, maxSpeed)))
      .setScale(carWidth / straight.width)
      .setAngle(spinAngle(p))
      .setPosition(
        W / 2 + Phaser.Math.FloatBetween(-shake, shake),
        H - 12 + bounce + Phaser.Math.FloatBetween(-shake, shake) / 2,
      );

    this.hud.update(race);
    if (race.status === "finished" && !this.resultsShown) {
      this.resultsShown = true;
      this.hud.showResults(race, () => this.scene.restart(this.setup));
    }
  }
}
