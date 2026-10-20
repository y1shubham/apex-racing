import * as Phaser from "phaser";
import { hasProgress, loadSave } from "../core/save";
import { nextEvent } from "../core/championship";
import { backdrop, bottomScrim, button, pill, restartOnResize } from "./ui";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("menu");
  }

  create() {
    restartOnResize(this);
    const { width: W, height: H } = this.scale;
    const save = loadSave();
    backdrop(this, 0.15);

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

    const buttonH = 54;
    const gap = 14;
    const bottom = H - Math.max(32, H * 0.05);
    const top = bottom - items.length * buttonH - (items.length - 1) * gap;
    bottomScrim(this, top - 120);
    items.forEach(([label, action], i) =>
      button(
        this,
        W / 2,
        top + buttonH / 2 + i * (buttonH + gap),
        label,
        action,
        {
          width: Math.min(W - 48, 340),
          height: buttonH,
          accent: i === 0,
        },
      ),
    );

    const creditsY = top - 34;
    pill(this, W / 2, creditsY, `${save.credits} credits`);
    const logo = this.add.image(W / 2, 0, "logo");
    const space = creditsY - 30;
    logo
      .setScale(Math.min((W * 0.82) / logo.width, (space * 0.8) / logo.height))
      .setY(space / 2 + 8);
  }
}
