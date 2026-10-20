import * as Phaser from "phaser";
import { sound } from "./audio/sound";
import { loadSave } from "./core/save";
import { BootScene } from "./scenes/boot-scene";
import { ChampionshipScene } from "./scenes/championship-scene";
import { GarageScene } from "./scenes/garage-scene";
import { MenuScene } from "./scenes/menu-scene";
import { RaceScene } from "./scenes/race-scene";
import { SettingsScene } from "./scenes/settings-scene";

const fontsReady = Promise.all(
  ["500", "600", "700", "800"].map((w) =>
    document.fonts.load(`${w} 16px Inter`),
  ),
);
await Promise.race([
  fontsReady.catch(() => undefined),
  new Promise((resolve) => setTimeout(resolve, 3000)),
]);

const { settings } = loadSave();
sound.setVolumes(settings.music, settings.sfx);
const unlockAudio = () => sound.unlock();
window.addEventListener("pointerdown", unlockAudio, { once: true });
window.addEventListener("keydown", unlockAudio, { once: true });

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
