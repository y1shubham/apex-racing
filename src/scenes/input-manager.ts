import * as Phaser from "phaser";
import { STEERING_INPUT } from "../config/game";
import type { DriveInput } from "../core/physics";
import type { TouchAction, TouchControls } from "./touch-controls";

const K = Phaser.Input.Keyboard.KeyCodes;
const BINDINGS = {
  up: [K.W, K.UP],
  down: [K.S, K.DOWN],
  left: [K.A, K.LEFT],
  right: [K.D, K.RIGHT],
  pause: [K.ESC, K.P],
  handbrake: [K.SPACE],
  nitro: [K.SHIFT],
};

export class InputManager {
  private keys: Record<keyof typeof BINDINGS, Phaser.Input.Keyboard.Key[]>;
  private steer = 0;

  constructor(
    scene: Phaser.Scene,
    private touch: TouchControls | null = null,
  ) {
    const kb = scene.input.keyboard!;
    const add = (codes: number[]) => codes.map((c) => kb.addKey(c));
    this.keys = {
      up: add(BINDINGS.up),
      down: add(BINDINGS.down),
      left: add(BINDINGS.left),
      right: add(BINDINGS.right),
      pause: add(BINDINGS.pause),
      handbrake: add(BINDINGS.handbrake),
      nitro: add(BINDINGS.nitro),
    };
  }

  pausePressed() {
    return this.keys.pause.some((key) => Phaser.Input.Keyboard.JustDown(key));
  }

  read(dt: number): DriveInput {
    const TOUCH: Partial<Record<keyof typeof BINDINGS, TouchAction>> = {
      up: "gas",
      down: "brake",
      left: "left",
      right: "right",
      handbrake: "drift",
      nitro: "nitro",
    };
    const down = (k: keyof typeof BINDINGS) =>
      this.keys[k].some((key) => key.isDown) ||
      (!!this.touch && !!TOUCH[k] && this.touch.isDown(TOUCH[k]));
    const target = (down("right") ? 1 : 0) - (down("left") ? 1 : 0);
    const rate =
      target === 0 || Math.sign(target) !== Math.sign(this.steer)
        ? STEERING_INPUT.return
        : STEERING_INPUT.rise;
    const step = rate * dt;
    this.steer += Math.max(-step, Math.min(step, target - this.steer));
    return {
      throttle: down("up"),
      brake: down("down"),
      steer: this.steer,
      handbrake: down("handbrake"),
      nitro: down("nitro"),
    };
  }
}
