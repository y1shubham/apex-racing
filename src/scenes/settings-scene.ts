import * as Phaser from "phaser";
import { defaultSave, loadSave, writeSave, type Settings } from "../core/save";
import { backdrop, button, COLORS, header, restartOnResize, text } from "./ui";

const CONTROLS: [string, string][] = [
  ["Accelerate", "W / Up"],
  ["Brake / reverse", "S / Down"],
  ["Steer", "A D / Left Right"],
  ["Drift", "Space"],
  ["Nitro", "Shift"],
  ["Pause", "Esc / P"],
];

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super("settings");
  }

  create(data: { confirmReset?: boolean }) {
    restartOnResize(this);
    const { width: W, height: H } = this.scale;
    const save = loadSave();
    backdrop(this, "neon-circuit");
    header(this, "SETTINGS", () => this.scene.start("menu"));

    const volume = (key: keyof Settings, label: string, y: number) => {
      const change = (d: number) => {
        save.settings[key] =
          Math.round(Math.min(1, Math.max(0, save.settings[key] + d)) * 10) /
          10;
        writeSave(save);
        this.scene.restart();
      };
      text(this, 18)
        .setText(`${label}  ${Math.round(save.settings[key] * 100)}%`)
        .setOrigin(0.5)
        .setPosition(W / 2, y);
      button(this, W / 2 - 130, y, "-", () => change(-0.1), {
        width: 48,
        height: 44,
      });
      button(this, W / 2 + 130, y, "+", () => change(0.1), {
        width: 48,
        height: 44,
      });
    };
    volume("music", "Music", 110);
    volume("sfx", "Effects", 166);

    text(this, 20, COLORS.accent)
      .setText("CONTROLS")
      .setOrigin(0.5, 0)
      .setPosition(W / 2, 214);
    CONTROLS.forEach(([action, keys], i) => {
      const y = 250 + i * 26;
      text(this, 15, COLORS.dim)
        .setText(action)
        .setPosition(W / 2 - 150, y);
      text(this, 15)
        .setText(keys)
        .setOrigin(1, 0)
        .setPosition(W / 2 + 150, y);
    });

    const y = H - 70;
    if (data.confirmReset) {
      text(this, 15, COLORS.bad)
        .setText("Erase all progress?")
        .setOrigin(0.5)
        .setPosition(W / 2, y - 60);
      button(
        this,
        W / 2 - 70,
        y,
        "Erase",
        () => {
          writeSave({ ...defaultSave(), settings: save.settings });
          this.scene.start("menu");
        },
        { width: 120, accent: true },
      );
      button(this, W / 2 + 70, y, "Cancel", () => this.scene.restart(), {
        width: 120,
      });
    } else {
      button(this, W / 2, y, "Reset progress", () =>
        this.scene.restart({ confirmReset: true }),
      );
    }
  }
}
