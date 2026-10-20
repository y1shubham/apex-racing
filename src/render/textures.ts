import type * as Phaser from "phaser";
import type { SceneryKind } from "../config/tracks";

const carUrls = import.meta.glob<string>("../assets/cars/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});
const sceneryUrls = import.meta.glob<string>("../assets/scenery/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});
const backdropUrls = import.meta.glob<string>("../assets/backdrops/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

import logoUrl from "../assets/ui/logo.webp";
import menuBgUrl from "../assets/ui/menu-bg.webp";

export const SCENERY_WORLD_HEIGHT: Record<SceneryKind, number> = {
  palm: 420,
  "coast-lamp": 280,
  "coast-rock": 90,
  "city-lamp": 260,
  barrier: 50,
  "power-pole": 520,
  "fir-a": 380,
  "fir-b": 380,
  "fir-c": 380,
  "alpine-rock": 70,
  "alpine-boulder": 110,
};

export type CarFrame =
  "left" | "straight" | "right" | "drift-left" | "drift-right";
export const carTextureKey = (
  carId: string,
  paintId: string,
  frame: CarFrame = "straight",
) => `car-${carId}-${paintId}-${frame}`;
export const backdropKey = (trackId: string) => `bg-${trackId}`;
export const BACKDROP_HORIZON: Record<string, number> = {
  "sunset-coast": 529,
  "neon-circuit": 571,
  "alpine-rush": 580,
};

const fileKey = (path: string) =>
  path.slice(path.lastIndexOf("/") + 1, path.lastIndexOf("."));

export function loadSprites(scene: Phaser.Scene) {
  for (const [path, url] of Object.entries({ ...carUrls, ...sceneryUrls })) {
    scene.load.image(fileKey(path), url);
  }
  scene.load.image("logo", logoUrl);
  scene.load.image("menu-bg", menuBgUrl);
  for (const [path, url] of Object.entries(backdropUrls)) {
    scene.load.image(backdropKey(fileKey(path)), url);
  }
}
