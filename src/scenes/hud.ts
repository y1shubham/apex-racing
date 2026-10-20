import * as Phaser from "phaser";
import { SPEED_TO_KMH } from "../config/game";
import type { Race } from "../core/race";

const COLORS = {
  text: "#ffffff",
  dim: "#b7bcc8",
  accent: "#ff7a1a",
  boost: "#19e3ff",
  good: "#9dff2b",
  meterFill: 0x19e3ff,
  meterTrack: 0x000000,
  panel: 0x0d0e12,
  button: 0x1d1f24,
  buttonEdge: 0xff7a1a,
};
const FONT = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
const DEPTH = 3000;
const METER = { width: 140, height: 12, bankShowSeconds: 1.2 };

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

const text = (scene: Phaser.Scene, size: number, color = COLORS.text) =>
  scene.add
    .text(0, 0, "", {
      fontFamily: FONT,
      fontSize: `${size}px`,
      fontStyle: "bold",
      color,
      stroke: "#000000",
      strokeThickness: 4,
    })
    .setDepth(DEPTH);

export class Hud {
  private position: Phaser.GameObjects.Text;
  private lap: Phaser.GameObjects.Text;
  private timer: Phaser.GameObjects.Text;
  private speed: Phaser.GameObjects.Text;
  private gear: Phaser.GameObjects.Text;
  private countdown: Phaser.GameObjects.Text;
  private pauseButton: Phaser.GameObjects.Text;
  private nitroLabel: Phaser.GameObjects.Text;
  private nitroTrack: Phaser.GameObjects.Rectangle;
  private nitroFill: Phaser.GameObjects.Rectangle;
  private drift: Phaser.GameObjects.Text;
  private overlay: Phaser.GameObjects.Container | null = null;

  constructor(
    private scene: Phaser.Scene,
    onPause: () => void,
  ) {
    this.position = text(scene, 34).setOrigin(0, 0);
    this.lap = text(scene, 18, COLORS.dim).setOrigin(0, 0);
    this.timer = text(scene, 18).setOrigin(1, 0);
    this.speed = text(scene, 30).setOrigin(1, 1);
    this.gear = text(scene, 18, COLORS.accent).setOrigin(1, 1);
    this.countdown = text(scene, 96, COLORS.accent).setOrigin(0.5);
    this.nitroLabel = text(scene, 14, COLORS.boost)
      .setText("NITRO")
      .setOrigin(0, 1);
    this.nitroTrack = scene.add
      .rectangle(0, 0, METER.width, METER.height, COLORS.meterTrack, 0.55)
      .setOrigin(0, 1)
      .setStrokeStyle(1, COLORS.meterFill, 0.8)
      .setDepth(DEPTH);
    this.nitroFill = scene.add
      .rectangle(0, 0, METER.width, METER.height, COLORS.meterFill)
      .setOrigin(0, 1)
      .setDepth(DEPTH);
    this.drift = text(scene, 26).setOrigin(0.5);
    this.pauseButton = text(scene, 22)
      .setText("II")
      .setOrigin(1, 0)
      .setPadding(14, 8, 14, 8)
      .setBackgroundColor("#00000066")
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", onPause);
  }

  update(race: Race) {
    const { width: W, height: H } = this.scene.scale;
    const p = race.player;
    this.position
      .setPosition(16, 12)
      .setText(`P${race.position(p)}/${race.racers.length}`);
    this.lap.setPosition(16, 54).setText(`LAP ${race.lap(p)}/${race.laps}`);
    this.pauseButton.setPosition(W - 12, 12);
    this.timer.setPosition(W - 72, 20).setText(formatTime(race.time));
    this.speed
      .setPosition(W - 16, H - 40)
      .setText(`${Math.round(Math.abs(p.state.speed) * SPEED_TO_KMH)} km/h`);
    this.gear
      .setPosition(W - 16, H - 16)
      .setText(`GEAR ${gear(p.state.speed, race.car.maxSpeed)}`);

    const fill = p.nitro / race.car.nitroCapacity;
    this.nitroTrack.setPosition(16, H - 16);
    this.nitroFill
      .setPosition(16, H - 16)
      .setSize(METER.width * fill, METER.height)
      .setAlpha(p.boosting ? 0.6 + 0.4 * Math.sin(race.time * 30) : 1);
    this.nitroLabel.setPosition(16, H - 32);

    const banked =
      p.lastDrift && race.time - p.lastDrift.at < METER.bankShowSeconds;
    this.drift.setPosition(W / 2, H * 0.45);
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

    const c = race.countdown;
    const showGo = race.status === "racing" && race.time < 0.8;
    this.countdown
      .setPosition(W / 2, H * 0.35)
      .setVisible(race.status === "countdown" || showGo)
      .setText(race.status === "countdown" ? String(Math.ceil(c)) : "GO!");
  }

  showPause(onResume: () => void, onRestart: () => void) {
    this.showOverlay(
      "PAUSED",
      [],
      [
        ["Resume", onResume],
        ["Restart", onRestart],
      ],
    );
  }

  showResults(race: Race, onRetry: () => void) {
    const p = race.player;
    const lines = [
      `Time  ${formatTime(p.finishTime)}`,
      `Best lap  ${formatTime(race.bestLap(p))}`,
      `Drift score  ${p.driftScore}`,
      "",
      ...race
        .standings()
        .map(
          (r, i) =>
            `${i + 1}. ${r.isPlayer ? "YOU" : r.name}  ${r.finishTime === null ? "" : formatTime(r.finishTime)}`,
        ),
    ];
    this.showOverlay(`FINISHED P${race.position(p)}`, lines, [
      ["Retry", onRetry],
    ]);
  }

  hideOverlay() {
    this.overlay?.destroy();
    this.overlay = null;
  }

  private showOverlay(
    title: string,
    lines: string[],
    buttons: [string, () => void][],
  ) {
    this.hideOverlay();
    const { width: W, height: H } = this.scene.scale;
    const items: Phaser.GameObjects.GameObject[] = [
      this.scene.add
        .rectangle(0, 0, W, H, COLORS.panel, 0.78)
        .setOrigin(0)
        .setInteractive(),
      text(this.scene, 40, COLORS.accent)
        .setText(title)
        .setOrigin(0.5)
        .setPosition(W / 2, H * 0.22),
      text(this.scene, 18)
        .setText(lines.join("\n"))
        .setOrigin(0.5, 0)
        .setAlign("center")
        .setLineSpacing(6)
        .setPosition(W / 2, H * 0.22 + 44),
    ];
    buttons.forEach(([label, action], i) => {
      const y = H * 0.72 + i * 72;
      const bg = this.scene.add
        .rectangle(W / 2, y, Math.min(260, W - 48), 56, COLORS.button)
        .setStrokeStyle(2, COLORS.buttonEdge)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", action);
      items.push(
        bg,
        text(this.scene, 22)
          .setText(label)
          .setOrigin(0.5)
          .setPosition(W / 2, y),
      );
    });
    this.overlay = this.scene.add.container(0, 0, items).setDepth(DEPTH + 10);
  }
}
