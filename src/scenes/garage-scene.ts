import * as Phaser from "phaser";
import { CARS, PAINT_COST, PAINTS } from "../config/cars";
import { EVENTS } from "../config/championship";
import {
  buyCar,
  buyPaint,
  carStats,
  selectCar,
  selectPaint,
  type GarageResult,
} from "../core/garage";
import { loadSave, writeSave } from "../core/save";
import { carTextureKey } from "../render/textures";
import {
  backdrop,
  button,
  COLORS,
  header,
  restartOnResize,
  text,
  UI_DEPTH,
} from "./ui";

interface GarageData {
  index?: number;
  message?: string;
}

const STAT_LABELS = [
  ["speed", "Top speed"],
  ["acceleration", "Acceleration"],
  ["handling", "Handling"],
  ["nitro", "Nitro"],
] as const;

export class GarageScene extends Phaser.Scene {
  constructor() {
    super("garage");
  }

  create(data: GarageData) {
    restartOnResize(this);
    const { width: W, height: H } = this.scale;
    const save = loadSave();
    const index =
      data.index ??
      Math.max(
        0,
        CARS.findIndex((c) => c.id === save.selectedCarId),
      );
    const car = CARS[index]!;
    const owned = save.ownedCars.includes(car.id);
    const paints = save.paints[car.id]!;
    const apply = (result: GarageResult) => {
      if (result.ok) writeSave(result.save);
      this.scene.restart({ index, message: result.ok ? "" : result.reason });
    };

    backdrop(this, "alpine-rush");
    header(this, "GARAGE", () => this.scene.start("menu"));
    text(this, 16, COLORS.dim)
      .setText(`${save.credits} credits`)
      .setOrigin(0.5, 0)
      .setPosition(W / 2, 64);

    const go = (d: number) =>
      this.scene.restart({ index: (index + d + CARS.length) % CARS.length });
    button(this, 36, H * 0.27, "<", () => go(-1), {
      width: 48,
      height: 64,
      size: 26,
    });
    button(this, W - 36, H * 0.27, ">", () => go(1), {
      width: 48,
      height: 64,
      size: 26,
    });

    const img = this.add
      .image(W / 2, H * 0.34, carTextureKey(car.id, paints.selected))
      .setOrigin(0.5, 1)
      .setDepth(UI_DEPTH);
    img.setScale(Math.min(W - 120, 300) / img.width);
    if (!owned) img.setTint(0x555555);
    text(this, 28)
      .setText(car.name)
      .setOrigin(0.5, 0)
      .setPosition(W / 2, H * 0.35);
    text(this, 14, COLORS.accent)
      .setText(car.tier.toUpperCase())
      .setOrigin(0.5, 0)
      .setPosition(W / 2, H * 0.35 + 34);

    const stats = carStats(car);
    const barW = Math.min(220, W - 180);
    STAT_LABELS.forEach(([key, label], i) => {
      const y = H * 0.35 + 68 + i * 28;
      text(this, 14, COLORS.dim)
        .setText(label)
        .setPosition(W / 2 - barW / 2 - 70, y);
      this.add
        .rectangle(
          W / 2 - barW / 2 + 40,
          y + 4,
          barW,
          10,
          COLORS.meterTrack,
          0.6,
        )
        .setOrigin(0)
        .setDepth(UI_DEPTH);
      this.add
        .rectangle(
          W / 2 - barW / 2 + 40,
          y + 4,
          barW * stats[key],
          10,
          COLORS.meterFill,
        )
        .setOrigin(0)
        .setDepth(UI_DEPTH);
    });

    const swatchY = H * 0.35 + 196;
    const size = Math.min(44, (W - 40) / PAINTS.length - 10);
    PAINTS.forEach((p, i) => {
      const x = W / 2 + (i - (PAINTS.length - 1) / 2) * (size + 10);
      const has = paints.owned.includes(p.id);
      const swatch = this.add
        .rectangle(x, swatchY, size, size, p.color)
        .setStrokeStyle(
          p.id === paints.selected ? 4 : 2,
          p.id === paints.selected ? 0xffffff : COLORS.buttonMuted,
        )
        .setAlpha(has ? 1 : 0.45)
        .setDepth(UI_DEPTH);
      if (owned)
        swatch
          .setInteractive({ useHandCursor: true })
          .on("pointerup", () =>
            apply(
              has
                ? selectPaint(save, car.id, p.id)
                : buyPaint(save, car.id, p.id),
            ),
          );
    });
    text(this, 13, COLORS.dim)
      .setText(
        owned
          ? `Faded paints cost ${PAINT_COST} credits`
          : "Unlock the car to paint it",
      )
      .setOrigin(0.5, 0)
      .setPosition(W / 2, swatchY + size / 2 + 8);

    const actionY = H - 70;
    if (!owned) {
      const event = EVENTS.find((e) => e.id === car.unlockEvent);
      button(
        this,
        W / 2,
        actionY,
        `Buy  ${car.unlockCost} cr`,
        () => apply(buyCar(save, car.id)),
        {
          accent: true,
          disabled: save.credits < car.unlockCost,
        },
      );
      if (event)
        text(this, 13, COLORS.dim)
          .setText(`or win "${event.name}"`)
          .setOrigin(0.5, 0)
          .setPosition(W / 2, actionY + 34);
    } else if (save.selectedCarId === car.id) {
      button(this, W / 2, actionY, "Selected", () => {}, { disabled: true });
    } else {
      button(
        this,
        W / 2,
        actionY,
        "Select",
        () => apply(selectCar(save, car.id)),
        { accent: true },
      );
    }
    if (data.message)
      text(this, 15, COLORS.bad)
        .setText(data.message)
        .setOrigin(0.5)
        .setPosition(W / 2, actionY - 48);
  }
}
