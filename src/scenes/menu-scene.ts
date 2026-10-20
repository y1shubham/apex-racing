import * as Phaser from "phaser";
import { hasProgress, loadSave } from "../core/save";
import { nextEvent } from "../core/championship";
import { backdrop, button, COLORS, restartOnResize, text } from "./ui";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("menu");
  }

  create() {
    restartOnResize(this);
    const { width: W, height: H } = this.scale;
    const save = loadSave();
    backdrop(this, "sunset-coast");
    text(this, 56, COLORS.accent)
      .setText("APEX")
      .setOrigin(0.5)
      .setPosition(W / 2, H * 0.2);
    text(this, 56, COLORS.boost)
      .setText("RUSH")
      .setOrigin(0.5)
      .setPosition(W / 2, H * 0.2 + 58);
    text(this, 16, COLORS.dim)
      .setText(`Credits ${save.credits}`)
      .setOrigin(0.5)
      .setPosition(W / 2, H * 0.2 + 110);

    const next = nextEvent(save);
    const items: [string, () => void][] = [];
    if (hasProgress(save) && next)
      items.push([
        "Continue",
        () => this.scene.start("race", { eventId: next.id }),
      ]);
    items.push(
      ["Championship", () => this.scene.start("championship")],
      ["Garage", () => this.scene.start("garage")],
      ["Settings", () => this.scene.start("settings")],
    );
    const top = H * 0.5;
    items.forEach(([label, action], i) =>
      button(this, W / 2, top + i * 72, label, action, { accent: i === 0 }),
    );
  }
}
