import * as Phaser from "phaser";
import { CARS } from "../config/cars";
import { SPEED_TO_KMH } from "../config/game";
import type { Reward } from "../core/championship";
import type { Race } from "../core/race";
import { button, COLORS, label, panel, text, UI_DEPTH } from "./ui";

const DEPTH = UI_DEPTH;
const BANK_SHOW_SECONDS = 1.2;
const MARGIN = 14;

export function formatTime(seconds: number | null) {
  if (seconds === null) return "--:--.---";
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s.toFixed(3).padStart(6, "0")}`;
}

export function gear(speed: number, maxSpeed: number) {
  if (speed < -1) return "R";
  if (speed < 1) return "N";
  return String(1 + Math.min(5, Math.floor((speed / maxSpeed) * 6)));
}

type Item = Phaser.GameObjects.GameObject &
  Phaser.GameObjects.Components.Transform;

export class Hud {
  private frame: Phaser.GameObjects.Graphics;
  private meter: Phaser.GameObjects.Graphics;
  private position: Phaser.GameObjects.Text;
  private positionOf: Phaser.GameObjects.Text;
  private lap: Phaser.GameObjects.Text;
  private timer: Phaser.GameObjects.Text;
  private speed: Phaser.GameObjects.Text;
  private gear: Phaser.GameObjects.Text;
  private nitroLabel: Phaser.GameObjects.Text;
  private countdown: Phaser.GameObjects.Text;
  private drift: Phaser.GameObjects.Text;
  private pause: readonly Item[];
  private overlay: Phaser.GameObjects.Container | null = null;
  private size = { w: 0, h: 0 };

  constructor(
    private scene: Phaser.Scene,
    onPause: () => void,
    private bottomInset = 0,
  ) {
    this.frame = scene.add.graphics().setDepth(DEPTH - 1);
    this.meter = scene.add.graphics().setDepth(DEPTH);
    this.position = text(scene, 30).setOrigin(0, 0);
    this.positionOf = text(scene, 15, COLORS.dim).setOrigin(0, 0);
    this.lap = label(scene, "", 11);
    this.timer = label(scene, "", 13, COLORS.text).setOrigin(0.5);
    this.speed = text(scene, 30).setOrigin(1, 0);
    this.gear = label(scene, "", 11).setOrigin(1, 0);
    this.nitroLabel = label(scene, "Nitro", 11, COLORS.boost);
    this.countdown = text(scene, 110, COLORS.accent).setOrigin(0.5);
    this.drift = text(scene, 22).setOrigin(0.5).setLetterSpacing(2);
    this.pause = button(scene, 0, 0, "II", onPause, {
      width: 44,
      height: 44,
      size: 14,
    });
  }

  private layout(W: number, H: number) {
    this.size = { w: W, h: H };
    const bottom = this.bottomInset ? MARGIN + 66 + 12 + 64 : H - MARGIN;
    const g = this.frame.clear();
    const card = (x: number, y: number, w: number, h: number, r = 14) =>
      g
        .fillStyle(COLORS.glass, 0.62)
        .fillRoundedRect(x, y, w, h, r)
        .lineStyle(1, COLORS.glassEdge, 0.18)
        .strokeRoundedRect(x, y, w, h, r);
    card(MARGIN, MARGIN, 112, 66);
    card(W - MARGIN - 44 - 8 - 112, MARGIN + 6, 112, 32, 16);
    card(W - MARGIN - 120, bottom - 64, 120, 64);
    card(MARGIN, bottom - 52, 160, 52);

    this.position.setPosition(MARGIN + 14, MARGIN + 6);
    this.lap.setPosition(MARGIN + 14, MARGIN + 44);
    this.timer.setPosition(W - MARGIN - 52 - 56, MARGIN + 22);
    for (const item of this.pause)
      item.setPosition(W - MARGIN - 22, MARGIN + 22);
    this.speed.setPosition(W - MARGIN - 14, bottom - 58);
    this.gear.setPosition(W - MARGIN - 14, bottom - 20);
    this.nitroLabel.setPosition(MARGIN + 14, bottom - 42);
    this.countdown.setPosition(W / 2, H * 0.35);
    this.drift.setPosition(W / 2, H * 0.42);
  }

  update(race: Race) {
    const { width: W, height: H } = this.scene.scale;
    if (W !== this.size.w || H !== this.size.h) this.layout(W, H);
    const p = race.player;
    const bottom = this.bottomInset ? MARGIN + 66 + 12 + 64 : H - MARGIN;

    this.position.setText(`P${race.position(p)}`);
    this.positionOf
      .setText(`/${race.racers.length}`)
      .setPosition(
        this.position.x + this.position.width + 2,
        this.position.y + 13,
      );
    this.lap.setText(`Lap ${race.lap(p)}/${race.laps}`.toUpperCase());
    this.timer.setText(formatTime(race.time));
    this.speed.setText(
      String(Math.round(Math.abs(p.state.speed) * SPEED_TO_KMH)),
    );
    this.gear.setText(`KM/H  GEAR ${gear(p.state.speed, p.car.maxSpeed)}`);

    const fill = p.nitro / p.car.nitroCapacity;
    const barX = MARGIN + 14;
    const barY = bottom - 20;
    const barW = 132;
    this.meter
      .clear()
      .fillStyle(COLORS.meterTrack, 0.6)
      .fillRoundedRect(barX, barY, barW, 8, 4);
    if (fill > 0)
      this.meter
        .fillStyle(
          COLORS.meterFill,
          p.boosting ? 0.6 + 0.4 * Math.sin(race.time * 30) : 1,
        )
        .fillRoundedRect(barX, barY, Math.max(8, barW * fill), 8, 4);

    const banked =
      p.lastDrift && race.time - p.lastDrift.at < BANK_SHOW_SECONDS;
    if (p.state.drift) {
      this.drift
        .setVisible(true)
        .setColor(p.driftControl === 1 ? COLORS.good : COLORS.text)
        .setText(`DRIFT ${Math.round(p.driftPending)}`);
    } else if (banked) {
      this.drift
        .setVisible(true)
        .setColor(COLORS.accent)
        .setText(`+${p.lastDrift!.points}`);
    } else this.drift.setVisible(false);

    const showGo = race.status === "racing" && race.time < 0.8;
    this.countdown
      .setVisible(race.status === "countdown" || showGo)
      .setText(
        race.status === "countdown" ? String(Math.ceil(race.countdown)) : "GO!",
      );
  }

  showPause(onResume: () => void, onRestart: () => void, onQuit: () => void) {
    this.showOverlay(
      "Paused",
      [],
      [],
      [
        ["Resume", onResume],
        ["Restart", onRestart],
        ["Quit", onQuit],
      ],
    );
  }

  showResults(race: Race, reward: Reward, actions: [string, () => void][]) {
    const p = race.player;
    const rows: [string, string, string?][] = [
      ["Time", formatTime(p.finishTime)],
      [
        "Best lap",
        formatTime(race.bestLap(p)),
        reward.newBestLap ? COLORS.good : undefined,
      ],
      ["Drift score", String(p.driftScore)],
      ["Credits", `+${reward.credits}`, COLORS.accent],
      [
        "Points",
        reward.pointsGained < reward.points
          ? `+${reward.points} (${reward.pointsGained} new)`
          : `+${reward.points}`,
        COLORS.accent,
      ],
      ...reward.unlockedCars.map((id): [string, string, string] => [
        "Unlocked",
        CARS.find((c) => c.id === id)?.name ?? id,
        COLORS.good,
      ]),
    ];
    const standings = race
      .standings()
      .map((r, i): [string, string, string?] => [
        `${i + 1}  ${r.isPlayer ? "You" : r.name}`,
        r.finishTime === null ? "--" : formatTime(r.finishTime),
        r.isPlayer ? COLORS.accent : undefined,
      ]);
    this.showOverlay(`Finished P${race.position(p)}`, rows, standings, actions);
  }

  hideOverlay() {
    this.overlay?.destroy();
    this.overlay = null;
  }

  private showOverlay(
    title: string,
    rows: [string, string, string?][],
    standings: [string, string, string?][],
    buttons: [string, () => void][],
  ) {
    this.hideOverlay();
    const s = this.scene;
    const { width: W, height: H } = s.scale;
    const w = Math.min(W - 32, 400);
    const left = W / 2 - w / 2 + 20;
    const right = W / 2 + w / 2 - 20;
    const buttonH = 50;
    const gap = 12;
    const buttonsH = buttons.length * buttonH + (buttons.length - 1) * gap;
    const cardH =
      64 +
      rows.length * 28 +
      (standings.length ? 20 + standings.length * 24 : 0) +
      12;
    const totalH = cardH + 20 + buttonsH;
    const top = Math.max(24, (H - totalH) / 2);

    const items: Phaser.GameObjects.GameObject[] = [
      s.add
        .rectangle(0, 0, W, H, COLORS.panel, 0.72)
        .setOrigin(0)
        .setInteractive(),
      panel(s, W / 2, top + cardH / 2, w, cardH, { alpha: 0.85 }),
      text(s, 22, COLORS.accent)
        .setText(title.toUpperCase())
        .setLetterSpacing(3)
        .setOrigin(0.5, 0)
        .setPosition(W / 2, top + 20),
    ];
    let y = top + 64;
    const row = (
      [name, value, color]: [string, string, string?],
      size: number,
      step: number,
    ) => {
      items.push(
        label(s, name, 12, color ?? COLORS.dim).setPosition(left, y),
        text(s, size, color ?? COLORS.text)
          .setText(value)
          .setOrigin(1, 0)
          .setPosition(right, y - 2),
      );
      y += step;
    };
    rows.forEach((r) => row(r, 15, 28));
    if (standings.length) {
      y += 6;
      items.push(
        s.add
          .rectangle(W / 2, y, w - 40, 1, COLORS.glassEdge, 0.15)
          .setDepth(DEPTH),
      );
      y += 14;
      standings.forEach((r) => row(r, 14, 24));
    }

    let by = top + cardH + 20 + buttonH / 2;
    buttons.forEach(([name, action], i) => {
      items.push(
        ...button(s, W / 2, by, name, action, {
          width: w,
          height: buttonH,
          accent: i === 0,
        }),
      );
      by += buttonH + gap;
    });
    this.overlay = s.add.container(0, 0, items).setDepth(DEPTH + 10);
  }
}
