import * as Phaser from "phaser";
import { BootScene } from "./scenes/boot-scene";
import { ChampionshipScene } from "./scenes/championship-scene";
import { GarageScene } from "./scenes/garage-scene";
import { MenuScene } from "./scenes/menu-scene";
import { RaceScene } from "./scenes/race-scene";
import { SettingsScene } from "./scenes/settings-scene";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#000000",
  scale: { mode: Phaser.Scale.RESIZE },
  scene: [
    BootScene,
    MenuScene,
    ChampionshipScene,
    GarageScene,
    SettingsScene,
    RaceScene,
  ],
});
