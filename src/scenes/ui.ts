import * as Phaser from "phaser";
import { sound } from "../audio/sound";

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
  glass: 0x0d0e12,
  glassEdge: 0xffffff,
  onAccent: "#1b0d03",
  accentHover: 0xff9a4d,
  glassHover: 0x262a35,
};
export const RADIUS = 14;
export const FONT = "Inter, system-ui, sans-serif";
const TEXT_RESOLUTION = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
export const UI_DEPTH = 3000;

export const text = (scene: Phaser.Scene, size: number, color = COLORS.text) =>
  scene.add
    .text(0, 0, "", {
      fontFamily: FONT,
      fontSize: `${size}px`,
      fontStyle: size >= 26 ? "800" : size >= 18 ? "700" : "600",
      color,
      resolution: TEXT_RESOLUTION,
    })
    .setShadow(0, 2, "#000000", 6, false, true)
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
    height = 54,
    size = 15,
    disabled = false,
    accent = false,
  }: ButtonOptions = {},
) {
  const r = Math.min(RADIUS, height / 2);
  if (disabled) accent = false;
  const g = scene.add.graphics({ x, y }).setDepth(UI_DEPTH);
  const draw = (hover: boolean) => {
    g.clear();
    if (accent && !disabled)
      g.fillStyle(COLORS.accentFill, hover ? 0.38 : 0.22).fillRoundedRect(
        -width / 2 - 5,
        -height / 2 - 5,
        width + 10,
        height + 10,
        r + 5,
      );
    const fill = accent
      ? hover
        ? COLORS.accentHover
        : COLORS.accentFill
      : hover
        ? COLORS.glassHover
        : COLORS.glass;
    g.fillStyle(fill, accent ? 1 : hover ? 0.82 : 0.62)
      .fillRoundedRect(-width / 2, -height / 2, width, height, r)
      .lineStyle(
        hover && !accent ? 1.5 : 1,
        hover && !accent ? COLORS.accentFill : COLORS.glassEdge,
        hover && !accent ? 0.9 : accent ? 0.35 : 0.22,
      )
      .strokeRoundedRect(-width / 2, -height / 2, width, height, r);
  };
  draw(false);
  const caption = text(
    scene,
    size,
    accent ? COLORS.onAccent : disabled ? COLORS.dim : COLORS.text,
  )
    .setText(label.toUpperCase())
    .setLetterSpacing(1.5)
    .setOrigin(0.5)
    .setPosition(x, y);
  if (accent) caption.setShadow(0, 0, "#000000", 0);
  const hit = scene.add.zone(x, y, width, height).setDepth(UI_DEPTH);
  if (disabled) {
    g.setAlpha(0.7);
  } else {
    let pressed = false;
    const scaleTo = (value: number) =>
      scene.tweens.add({
        targets: [g, caption],
        scale: value,
        duration: 90,
        ease: "Quad.easeOut",
      });
    hit
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => draw(true))
      .on("pointerout", () => {
        draw(false);
        if (pressed) scaleTo(1);
        pressed = false;
      })
      .on("pointerdown", () => {
        pressed = true;
        draw(true);
        scaleTo(0.96);
      })
      .on("pointerup", () => {
        if (!pressed) return;
        pressed = false;
        sound.click();
        scene.tweens.add({
          targets: [g, caption],
          scale: 1,
          duration: 140,
          ease: "Back.easeOut",
          onComplete: onClick,
        });
      });
  }
  return [g, caption, hit] as const;
}

export function pill(scene: Phaser.Scene, x: number, y: number, label: string) {
  const caption = text(scene, 13, COLORS.text)
    .setText(label.toUpperCase())
    .setLetterSpacing(1.5)
    .setOrigin(0.5);
  const w = caption.width + 28;
  const h = 30;
  scene.add
    .graphics({ x, y })
    .fillStyle(COLORS.glass, 0.6)
    .fillRoundedRect(-w / 2, -h / 2, w, h, h / 2)
    .lineStyle(1, COLORS.glassEdge, 0.2)
    .strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2)
    .setDepth(UI_DEPTH);
  caption.setPosition(x, y).setDepth(UI_DEPTH + 1);
}

export function bottomScrim(scene: Phaser.Scene, from: number) {
  const { width: W, height: H } = scene.scale;
  scene.add
    .graphics()
    .fillGradientStyle(
      COLORS.panel,
      COLORS.panel,
      COLORS.panel,
      COLORS.panel,
      0,
      0,
      0.88,
      0.88,
    )
    .fillRect(0, from, W, H - from);
}

export function backdrop(scene: Phaser.Scene, dim = 0.45) {
  const { width: W, height: H } = scene.scale;
  const img = scene.add.image(W / 2, H / 2, "menu-bg");
  img.setScale(Math.max(W / img.width, H / img.height));
  scene.add.rectangle(0, 0, W, H, COLORS.panel, dim).setOrigin(0);
}

export interface PanelOptions {
  alpha?: number;
  highlight?: boolean;
  radius?: number;
  onClick?: () => void;
}

export function panel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  {
    alpha = 0.62,
    highlight = false,
    radius = RADIUS,
    onClick,
  }: PanelOptions = {},
) {
  const g = scene.add.graphics({ x, y }).setDepth(UI_DEPTH - 1);
  const draw = (hover: boolean) => {
    g.clear();
    if (highlight)
      g.fillStyle(COLORS.accentFill, 0.18).fillRoundedRect(
        -width / 2 - 4,
        -height / 2 - 4,
        width + 8,
        height + 8,
        radius + 4,
      );
    g.fillStyle(hover ? COLORS.glassHover : COLORS.glass, hover ? 0.82 : alpha)
      .fillRoundedRect(-width / 2, -height / 2, width, height, radius)
      .lineStyle(
        highlight || hover ? 1.5 : 1,
        highlight || hover ? COLORS.accentFill : COLORS.glassEdge,
        highlight || hover ? 0.9 : 0.18,
      )
      .strokeRoundedRect(-width / 2, -height / 2, width, height, radius);
  };
  draw(false);
  if (onClick) {
    const hit = scene.add
      .zone(x, y, width, height)
      .setDepth(UI_DEPTH)
      .setInteractive({ useHandCursor: true });
    let pressed = false;
    hit
      .on("pointerover", () => draw(true))
      .on("pointerout", () => {
        draw(false);
        pressed = false;
        g.setScale(1);
      })
      .on("pointerdown", () => {
        pressed = true;
        scene.tweens.add({ targets: g, scale: 0.98, duration: 90 });
      })
      .on("pointerup", () => {
        if (!pressed) return;
        pressed = false;
        sound.click();
        scene.tweens.add({
          targets: g,
          scale: 1,
          duration: 140,
          ease: "Back.easeOut",
          onComplete: onClick,
        });
      });
  }
  return g;
}

export const label = (
  scene: Phaser.Scene,
  value: string,
  size = 12,
  color = COLORS.dim,
) =>
  text(scene, size, color).setText(value.toUpperCase()).setLetterSpacing(1.5);

export const HEADER_HEIGHT = 72;

export function header(
  scene: Phaser.Scene,
  title: string,
  onBack?: () => void,
) {
  const { width: W } = scene.scale;
  text(scene, 18)
    .setText(title.toUpperCase())
    .setLetterSpacing(3)
    .setOrigin(0.5)
    .setPosition(W / 2, 36);
  if (onBack)
    button(scene, 38, 36, "\u2039", onBack, {
      width: 44,
      height: 44,
      size: 24,
    });
}

export function restartOnResize(scene: Phaser.Scene) {
  const restart = () => scene.scene.restart();
  scene.scale.on(Phaser.Scale.Events.RESIZE, restart);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
    scene.scale.off(Phaser.Scale.Events.RESIZE, restart),
  );
}
