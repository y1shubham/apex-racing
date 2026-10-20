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
    const params = new URLSearchParams(location.search);
    this.scene.start("race", {
      trackId: params.get("track"),
      paintId: params.get("color"),
    });
  }
}
