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
  label,
  panel,
  pill,
  restartOnResize,
  text,
  UI_DEPTH,
} from "./ui";

interface GarageData {
  index?: number;
  message?: string;
}

const STATS = [
  ["speed", "Top speed"],
  ["acceleration", "Acceleration"],
  ["handling", "Handling"],
  ["nitro", "Nitro"],
] as const;

const LOCKED_TINT = 0x3a3d46;

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
    const go = (d: number) =>
      this.scene.restart({ index: (index + d + CARS.length) % CARS.length });

    backdrop(this, 0.6);
    header(this, "Garage", () => this.scene.start("menu"));
    pill(this, W / 2, 84, `${save.credits} credits`);

    const panelW = Math.min(W - 32, 420);
    const panelH = owned ? 256 : 280;
    const buttonY = H - Math.max(28, H * 0.04) - 27;
    const panelTop = buttonY - 27 - 40 - panelH;
    const stageTop = 112;
    const stageH = Math.max(90, panelTop - stageTop - 12);

    const img = this.add
      .image(W / 2, stageTop + stageH, carTextureKey(car.id, paints.selected))
      .setOrigin(0.5, 1)
      .setDepth(UI_DEPTH);
    img.setScale(
      Math.min((W - 130) / img.width, stageH / img.height, 300 / img.width),
    );
    if (!owned) {
      img.setTint(LOCKED_TINT);
      pill(this, W / 2, stageTop + stageH / 2, "Locked");
    }
    const arrowY = stageTop + stageH / 2;
    button(this, 38, arrowY, "‹", () => go(-1), {
      width: 44,
      height: 44,
      size: 24,
    });
    button(this, W - 38, arrowY, "›", () => go(1), {
      width: 44,
      height: 44,
      size: 24,
    });

    panel(this, W / 2, panelTop + panelH / 2, panelW, panelH);
    const left = W / 2 - panelW / 2 + 20;
    const right = W / 2 + panelW / 2 - 20;
    let y = panelTop + 18;
    text(this, 24).setText(car.name).setPosition(left, y);
    const tier = label(this, car.tier, 11, COLORS.accent).setOrigin(1, 0);
    tier.setPosition(right, y + 8);
    y += 46;

    const barX = left + 130;
    const barW = right - barX;
    const stats = carStats(car);
    STATS.forEach(([key, name]) => {
      label(this, name).setPosition(left, y);
      this.add
        .graphics()
        .fillStyle(COLORS.meterTrack, 0.5)
        .fillRoundedRect(barX, y + 3, barW, 8, 4)
        .fillStyle(COLORS.meterFill, 1)
        .fillRoundedRect(barX, y + 3, Math.max(8, barW * stats[key]), 8, 4)
        .setDepth(UI_DEPTH);
      y += 26;
    });
    y += 10;

    label(this, "Paint").setPosition(left, y);
    if (owned)
      label(this, `New paint ${PAINT_COST} cr`)
        .setOrigin(1, 0)
        .setPosition(right, y);
    y += 40;
    const gap = (right - left) / PAINTS.length;
    PAINTS.forEach((p, i) => {
      const cx = left + gap * (i + 0.5);
      const has = paints.owned.includes(p.id);
      const selected = p.id === paints.selected;
      const swatch = this.add
        .graphics({ x: cx, y })
        .fillStyle(p.color, has ? 1 : 0.35)
        .fillCircle(0, 0, 15)
        .lineStyle(selected ? 3 : 1, 0xffffff, selected ? 1 : 0.3)
        .strokeCircle(0, 0, selected ? 20 : 15)
        .setDepth(UI_DEPTH);
      if (!owned) return;
      this.add
        .zone(cx, y, 44, 44)
        .setDepth(UI_DEPTH)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => swatch.setScale(1.1))
        .on("pointerout", () => swatch.setScale(1))
        .on("pointerup", () =>
          apply(
            has
              ? selectPaint(save, car.id, p.id)
              : buyPaint(save, car.id, p.id),
          ),
        );
    });
    if (!owned)
      label(this, "Unlock this car to paint it")
        .setOrigin(0.5, 0)
        .setPosition(W / 2, y + 30);

    const hintY = buttonY - 27 - 20;
    const buttonW = Math.min(W - 32, 420);
    if (data.message)
      text(this, 13, COLORS.bad)
        .setText(data.message)
        .setOrigin(0.5)
        .setPosition(W / 2, hintY);
    if (!owned) {
      const event = EVENTS.find((e) => e.id === car.unlockEvent);
      const affordable = save.credits >= car.unlockCost;
      if (!data.message && event)
        label(this, `Or win "${event.name}" to unlock free`, 12)
          .setOrigin(0.5)
          .setPosition(W / 2, hintY);
      button(
        this,
        W / 2,
        buttonY,
        affordable ? `Buy  ${car.unlockCost} cr` : `Need ${car.unlockCost} cr`,
        () => apply(buyCar(save, car.id)),
        { width: buttonW, accent: true, disabled: !affordable },
      );
    } else if (save.selectedCarId === car.id) {
      button(this, W / 2, buttonY, "Selected", () => {}, {
        width: buttonW,
        disabled: true,
      });
    } else {
      button(
        this,
        W / 2,
        buttonY,
        "Select",
        () => apply(selectCar(save, car.id)),
        {
          width: buttonW,
          accent: true,
        },
      );
    }
  }
}
