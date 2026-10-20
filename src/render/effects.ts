import * as Phaser from "phaser";

const FX = {
  smoke: 0xe8e8ec,
  flame: 0x19e3ff,
  flameCore: 0xe6fdff,
};

function softDot(
  scene: Phaser.Scene,
  key: string,
  color: number,
  core?: number,
) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({}, false);
  for (let r = 16; r > 0; r -= 2)
    g.fillStyle(color, 0.08 + (1 - r / 16) * 0.25).fillCircle(16, 16, r);
  if (core !== undefined) g.fillStyle(core, 0.9).fillCircle(16, 16, 5);
  g.generateTexture(key, 32, 32);
  g.destroy();
}

export class CarEffects {
  private smoke: Phaser.GameObjects.Particles.ParticleEmitter;
  private flame: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene, depth: number) {
    softDot(scene, "fx-smoke", FX.smoke);
    softDot(scene, "fx-flame", FX.flame, FX.flameCore);
    this.smoke = scene.add
      .particles(0, 0, "fx-smoke", {
        lifespan: 700,
        x: { min: -45, max: 45 },
        speedY: { min: -40, max: -90 },
        speedX: { min: -60, max: 60 },
        scale: { start: 0.8, end: 3 },
        alpha: { start: 0.55, end: 0 },
        frequency: 25,
        quantity: 2,
        emitting: false,
      })
      .setDepth(depth - 1);
    this.flame = scene.add
      .particles(0, 0, "fx-flame", {
        lifespan: 220,
        x: { min: -10, max: 10 },
        speedY: { min: 60, max: 140 },
        speedX: { min: -15, max: 15 },
        scale: { start: 0.9, end: 0.1 },
        alpha: { start: 1, end: 0 },
        blendMode: Phaser.BlendModes.ADD,
        frequency: 16,
        quantity: 2,
        emitting: false,
      })
      .setDepth(depth + 1);
  }

  update(car: Phaser.GameObjects.Image, drifting: boolean, boosting: boolean) {
    this.smoke.setPosition(car.x, car.y - car.displayHeight * 0.1);
    this.smoke.emitting = drifting;
    this.flame.setPosition(car.x, car.y - car.displayHeight * 0.18);
    this.flame.emitting = boosting;
  }
}
