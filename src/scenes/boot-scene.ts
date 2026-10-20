import * as Phaser from "phaser";
import { loadSprites } from "../render/textures";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload() {
    loadSprites(this);
  }

  create() {
    this.scene.start("menu");
  }
}
