import * as Phaser from "phaser";
import type { DriveInput } from "../core/physics";

const K = Phaser.Input.Keyboard.KeyCodes;
const BINDINGS = {
  up: [K.W, K.UP],
  down: [K.S, K.DOWN],
  left: [K.A, K.LEFT],
  right: [K.D, K.RIGHT],
};

export class InputManager {
  private keys: Record<keyof typeof BINDINGS, Phaser.Input.Keyboard.Key[]>;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    const add = (codes: number[]) => codes.map((c) => kb.addKey(c));
    this.keys = {
      up: add(BINDINGS.up),
      down: add(BINDINGS.down),
      left: add(BINDINGS.left),
      right: add(BINDINGS.right),
    };
  }

  read(): DriveInput {
    const down = (k: keyof typeof BINDINGS) =>
      this.keys[k].some((key) => key.isDown);
    return {
      throttle: down("up"),
      brake: down("down"),
      steer: (down("right") ? 1 : 0) - (down("left") ? 1 : 0),
    };
  }
}
