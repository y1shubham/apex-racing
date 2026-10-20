import * as Phaser from "phaser";
import { EVENTS } from "../config/championship";
import { TRACKS } from "../config/tracks";
import {
  isComplete,
  isUnlocked,
  nextEvent,
  totalPoints,
} from "../core/championship";
import { loadSave } from "../core/save";
import { formatTime } from "./hud";
import {
  backdrop,
  COLORS,
  header,
  restartOnResize,
  text,
  UI_DEPTH,
} from "./ui";

export class ChampionshipScene extends Phaser.Scene {
  constructor() {
    super("championship");
  }

  create() {
    restartOnResize(this);
    const { width: W, height: H } = this.scale;
    const save = loadSave();
    backdrop(this, "neon-circuit");
    header(this, "CHAMPIONSHIP", () => this.scene.start("menu"));
    text(this, 16, COLORS.dim)
      .setText(
        isComplete(save)
          ? `CHAMPION  ${totalPoints(save)} pts  |  ${save.credits} cr`
          : `${totalPoints(save)} pts  |  ${save.credits} credits`,
      )
      .setOrigin(0.5, 0)
      .setPosition(W / 2, 64);

    const next = nextEvent(save);
    const top = 100;
    const gap = 10;
    const h = Math.min(96, (H - top - 20) / EVENTS.length - gap);
    const w = Math.min(460, W - 24);
    EVENTS.forEach((e, i) => {
      const y = top + i * (h + gap) + h / 2;
      const unlocked = isUnlocked(save, i);
      const record = save.events[e.id];
      const isNext = e === next;
      const card = this.add
        .rectangle(W / 2, y, w, h, COLORS.button, unlocked ? 0.92 : 0.5)
        .setStrokeStyle(2, isNext ? COLORS.accentFill : COLORS.buttonMuted)
        .setDepth(UI_DEPTH);
      const track = TRACKS.find((t) => t.id === e.trackId)!;
      const left = W / 2 - w / 2 + 14;
      text(this, 18, unlocked ? COLORS.text : COLORS.dim)
        .setText(`${i + 1}. ${e.name}`)
        .setPosition(left, y - h / 2 + 10);
      text(this, 13, COLORS.dim)
        .setText(
          `${track.name}${e.reversed ? " (Reverse)" : ""}  |  ${e.difficulty.toUpperCase()}  |  ${e.laps} laps`,
        )
        .setPosition(left, y - h / 2 + 36);
      text(this, 13, record ? COLORS.good : isNext ? COLORS.accent : COLORS.dim)
        .setText(
          record
            ? `Best P${record.bestPosition}  ${formatTime(record.bestTime)}  ${record.points} pts`
            : unlocked
              ? "Tap to race"
              : "Locked",
        )
        .setPosition(left, y - h / 2 + 56);
      if (unlocked)
        card
          .setInteractive({ useHandCursor: true })
          .on("pointerup", () => this.scene.start("race", { eventId: e.id }));
    });
  }
}
