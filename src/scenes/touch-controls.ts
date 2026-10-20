import * as Phaser from "phaser";
import { COLORS, label, UI_DEPTH } from "./ui";

export type TouchAction =
  "left" | "right" | "gas" | "brake" | "drift" | "nitro";

const BIG = 72;
const SMALL = 56;
const GAP = 12;
const MARGIN = 16;
export const TOUCH_INSET = BIG + GAP + SMALL + MARGIN + 8;

interface Pad {
  action: TouchAction;
  x: number;
  y: number;
  size: number;
  g: Phaser.GameObjects.Graphics;
  pointers: Set<number>;
  accent: number;
}

export class TouchControls {
  private pads: Pad[] = [];

  constructor(scene: Phaser.Scene) {
    scene.input.addPointer(3);
    const { width: W, height: H } = scene.scale;
    const row1 = H - MARGIN - BIG / 2;
    const row2 = row1 - BIG / 2 - GAP - SMALL / 2;
    const add = (
      action: TouchAction,
      x: number,
      y: number,
      size: number,
      caption: string,
      accent: number = COLORS.glassEdge,
    ) => {
      const g = scene.add.graphics({ x, y }).setDepth(UI_DEPTH);
      const pad = {
        action,
        x,
        y,
        size,
        g,
        pointers: new Set<number>(),
        accent,
      };
      if (caption === "<" || caption === ">") {
        const d = caption === "<" ? -1 : 1;
        scene.add
          .graphics({ x, y })
          .fillStyle(0xffffff, 0.9)
          .fillTriangle(d * 12, 0, -d * 8, -14, -d * 8, 14)
          .setDepth(UI_DEPTH + 1);
      } else {
        label(scene, caption, 11, COLORS.text)
          .setOrigin(0.5)
          .setPosition(x, y)
          .setDepth(UI_DEPTH + 1);
      }
      const zone = scene.add
        .zone(x, y, size + GAP, size + GAP)
        .setDepth(UI_DEPTH + 2)
        .setInteractive();
      zone.on("pointerdown", (p: Phaser.Input.Pointer) =>
        this.press(pad, p.id),
      );
      zone.on("pointerover", (p: Phaser.Input.Pointer) => {
        if (p.isDown && (action === "left" || action === "right"))
          this.press(pad, p.id);
      });
      zone.on("pointerout", (p: Phaser.Input.Pointer) =>
        this.release(pad, p.id),
      );
      this.pads.push(pad);
      this.draw(pad);
    };

    const left = MARGIN + BIG / 2;
    add("left", left, row1, BIG, "<");
    add("right", left + BIG + GAP, row1, BIG, ">");
    const right = W - MARGIN - BIG / 2;
    add("gas", right, row1, BIG, "Gas", COLORS.accentFill);
    add("brake", right - BIG - GAP, row1, BIG, "Brake");
    add("nitro", right, row2, SMALL, "Nitro", COLORS.meterFill);
    add("drift", right - BIG - GAP, row2, SMALL, "Drift");

    const releaseAll = (p: Phaser.Input.Pointer) =>
      this.pads.forEach((pad) => this.release(pad, p.id));
    scene.input.on(Phaser.Input.Events.POINTER_UP, releaseAll);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, releaseAll);
    scene.input.on(Phaser.Input.Events.GAME_OUT, () => this.reset());
    scene.game.events.on(Phaser.Core.Events.BLUR, this.reset, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      scene.game.events.off(Phaser.Core.Events.BLUR, this.reset, this),
    );
  }

  isDown(action: TouchAction) {
    return this.pads.some((p) => p.action === action && p.pointers.size > 0);
  }

  reset() {
    this.pads.forEach((pad) => {
      pad.pointers.clear();
      this.draw(pad);
    });
  }

  private press(pad: Pad, id: number) {
    pad.pointers.add(id);
    this.draw(pad);
  }

  private release(pad: Pad, id: number) {
    if (pad.pointers.delete(id)) this.draw(pad);
  }

  private draw(pad: Pad) {
    const active = pad.pointers.size > 0;
    const r = pad.size / 2;
    pad.g
      .clear()
      .fillStyle(active ? pad.accent : COLORS.glass, active ? 0.55 : 0.5)
      .fillRoundedRect(-r, -r, pad.size, pad.size, 18)
      .lineStyle(active ? 2 : 1, pad.accent, active ? 1 : 0.35)
      .strokeRoundedRect(-r, -r, pad.size, pad.size, 18)
      .setScale(active ? 0.94 : 1);
  }
}
