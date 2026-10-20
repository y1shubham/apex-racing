import * as Phaser from "phaser";
import { defaultSave, loadSave, writeSave, type Settings } from "../core/save";
import {
  backdrop,
  button,
  COLORS,
  header,
  label,
  panel,
  restartOnResize,
  text,
} from "./ui";

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
    backdrop(this, 0.6);
    header(this, "Settings", () => this.scene.start("menu"));

    const w = Math.min(W - 32, 420);
    const left = W / 2 - w / 2 + 20;
    const right = W / 2 + w / 2 - 20;

    const audioTop = 84;
    const audioH = 132;
    panel(this, W / 2, audioTop + audioH / 2, w, audioH);
    label(this, "Audio").setPosition(left, audioTop + 16);
    const volume = (key: keyof Settings, name: string, y: number) => {
      const change = (d: number) => {
        save.settings[key] =
          Math.round(Math.min(1, Math.max(0, save.settings[key] + d)) * 10) /
          10;
        writeSave(save);
        this.scene.restart();
      };
      text(this, 16).setText(name).setOrigin(0, 0.5).setPosition(left, y);
      text(this, 16, COLORS.accent)
        .setText(`${Math.round(save.settings[key] * 100)}%`)
        .setOrigin(0.5)
        .setPosition(right - 66, y);
      button(this, right - 118, y, "-", () => change(-0.1), {
        width: 40,
        height: 40,
        size: 20,
      });
      button(this, right - 20, y, "+", () => change(0.1), {
        width: 40,
        height: 40,
        size: 20,
      });
    };
    volume("music", "Music", audioTop + 62);
    volume("sfx", "Effects", audioTop + 106);

    const controlsTop = audioTop + audioH + 16;
    const controlsH = 52 + CONTROLS.length * 30;
    panel(this, W / 2, controlsTop + controlsH / 2, w, controlsH);
    label(this, "Controls").setPosition(left, controlsTop + 16);
    CONTROLS.forEach(([action, keys], i) => {
      const y = controlsTop + 56 + i * 30;
      text(this, 14, COLORS.dim)
        .setText(action)
        .setOrigin(0, 0.5)
        .setPosition(left, y);
      label(this, keys, 12, COLORS.text)
        .setOrigin(1, 0.5)
        .setPosition(right, y);
    });

    const y = H - Math.max(28, H * 0.04) - 27;
    if (data.confirmReset) {
      label(this, "Erase all progress? This cannot be undone.", 12, COLORS.bad)
        .setOrigin(0.5)
        .setPosition(W / 2, y - 48);
      const half = (w - 12) / 2;
      button(
        this,
        W / 2 - half / 2 - 6,
        y,
        "Erase",
        () => {
          writeSave({ ...defaultSave(), settings: save.settings });
          this.scene.start("menu");
        },
        { width: half, accent: true },
      );
      button(
        this,
        W / 2 + half / 2 + 6,
        y,
        "Cancel",
        () => this.scene.restart(),
        {
          width: half,
        },
      );
    } else {
      button(
        this,
        W / 2,
        y,
        "Reset progress",
        () => this.scene.restart({ confirmReset: true }),
        { width: w },
      );
    }
  }
}
