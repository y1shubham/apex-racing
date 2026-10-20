import * as Phaser from "phaser";
import { BootScene } from "./scenes/boot-scene";
import { RaceScene } from "./scenes/race-scene";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#000000",
  scale: { mode: Phaser.Scale.RESIZE },
  scene: [BootScene, RaceScene],
});
