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
  label,
  panel,
  pill,
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
    backdrop(this, 0.6);
    header(this, "Championship", () => this.scene.start("menu"));
    pill(
      this,
      W / 2,
      84,
      isComplete(save)
        ? `Champion  ${totalPoints(save)} pts`
        : `${totalPoints(save)} pts  |  ${save.credits} credits`,
    );

    const next = nextEvent(save);
    const top = 116;
    const gap = 10;
    const h = Math.min(88, (H - top - 20) / EVENTS.length - gap);
    const w = Math.min(W - 32, 420);
    const left = W / 2 - w / 2;
    EVENTS.forEach((e, i) => {
      const y = top + i * (h + gap) + h / 2;
      const unlocked = isUnlocked(save, i);
      const record = save.events[e.id];
      const isNext = e === next;
      const track = TRACKS.find((t) => t.id === e.trackId)!;
      panel(this, W / 2, y, w, h, {
        highlight: isNext,
        alpha: unlocked ? 0.7 : 0.45,
        onClick: unlocked
          ? () => this.scene.start("race", { eventId: e.id })
          : undefined,
      });

      const badgeX = left + 30;
      this.add
        .graphics({ x: badgeX, y })
        .fillStyle(record ? COLORS.accentFill : COLORS.glass, record ? 1 : 0.8)
        .fillCircle(0, 0, 16)
        .lineStyle(1, COLORS.glassEdge, 0.3)
        .strokeCircle(0, 0, 16)
        .setDepth(UI_DEPTH);
      text(this, 15, record ? COLORS.onAccent : COLORS.text)
        .setText(String(i + 1))
        .setOrigin(0.5)
        .setShadow(0, 0, "#000000", 0)
        .setPosition(badgeX, y);

      const tx = left + 60;
      text(this, 17, unlocked ? COLORS.text : COLORS.dim)
        .setText(e.name)
        .setOrigin(0, 1)
        .setPosition(tx, y - 2);
      label(
        this,
        `${track.name}${e.reversed ? " rev" : ""}  ${e.difficulty}  ${e.laps} laps`,
        11,
      )
        .setOrigin(0, 0)
        .setPosition(tx, y + 4);

      const status = record
        ? `P${record.bestPosition}  ${record.points} pts`
        : isNext
          ? "Next"
          : unlocked
            ? "Open"
            : "Locked";
      label(
        this,
        status,
        11,
        record ? COLORS.good : isNext ? COLORS.accent : COLORS.dim,
      )
        .setOrigin(1, 1)
        .setPosition(left + w - 16, y - 2);
      if (record)
        label(this, formatTime(record.bestTime), 11)
          .setOrigin(1, 0)
          .setPosition(left + w - 16, y + 4);
    });
  }
}
