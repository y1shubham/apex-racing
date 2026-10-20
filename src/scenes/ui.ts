import * as Phaser from "phaser";
import { backdropKey } from "../render/textures";

export const COLORS = {
  text: "#ffffff",
  dim: "#b7bcc8",
  accent: "#ff7a1a",
  boost: "#19e3ff",
  good: "#9dff2b",
  bad: "#ff4d5e",
  meterFill: 0x19e3ff,
  meterTrack: 0x000000,
  accentFill: 0xff7a1a,
  panel: 0x0d0e12,
  button: 0x1d1f24,
  buttonEdge: 0xff7a1a,
  buttonMuted: 0x3a3d46,
};
export const FONT = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
export const UI_DEPTH = 3000;

export const text = (scene: Phaser.Scene, size: number, color = COLORS.text) =>
  scene.add
    .text(0, 0, "", {
      fontFamily: FONT,
      fontSize: `${size}px`,
      fontStyle: "bold",
      color,
      stroke: "#000000",
      strokeThickness: 4,
    })
    .setDepth(UI_DEPTH);

export interface ButtonOptions {
  width?: number;
  height?: number;
  size?: number;
  disabled?: boolean;
  accent?: boolean;
}

export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  {
    width = 260,
    height = 56,
    size = 22,
    disabled = false,
    accent = false,
  }: ButtonOptions = {},
) {
  const bg = scene.add
    .rectangle(
      x,
      y,
      width,
      height,
      accent ? COLORS.accentFill : COLORS.button,
      disabled ? 0.5 : 1,
    )
    .setStrokeStyle(2, disabled ? COLORS.buttonMuted : COLORS.buttonEdge)
    .setDepth(UI_DEPTH);
  const label_ = text(scene, size, disabled ? COLORS.dim : COLORS.text)
    .setText(label)
    .setOrigin(0.5)
    .setPosition(x, y);
  if (!disabled)
    bg.setInteractive({ useHandCursor: true }).on("pointerup", onClick);
  return [bg, label_] as const;
}

export function backdrop(scene: Phaser.Scene, trackId = "neon-circuit") {
  const { width: W, height: H } = scene.scale;
  const img = scene.add.image(W / 2, H / 2, backdropKey(trackId));
  img.setScale(Math.max(W / img.width, H / img.height));
  scene.add.rectangle(0, 0, W, H, COLORS.panel, 0.6).setOrigin(0);
}

export function header(
  scene: Phaser.Scene,
  title: string,
  onBack?: () => void,
) {
  const { width: W } = scene.scale;
  text(scene, 30, COLORS.accent)
    .setText(title)
    .setOrigin(0.5, 0)
    .setPosition(W / 2, 20);
  if (onBack)
    button(scene, 50, 40, "<", onBack, { width: 56, height: 44, size: 24 });
}

export function restartOnResize(scene: Phaser.Scene) {
  const restart = () => scene.scene.restart();
  scene.scale.on(Phaser.Scale.Events.RESIZE, restart);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
    scene.scale.off(Phaser.Scale.Events.RESIZE, restart),
  );
}
