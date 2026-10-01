import { clamp01 } from "../easing";
import type { CitySceneId } from "../journey-config";
import { smootherRange } from "../motion";

/**
 * The passage between the Earth and a city, as a pure function of its depth (0 Earth, 1 city).
 * The picture breaks into a mosaic of LED tiles, a front of tiles flips over to reveal the city assembling
 * behind them, and the mosaic resolves into the sharp scene. The same depth plays it backwards when leaving.
 */
export function pixelPassage(position: number, reduced = false) {
  const depth = clamp01(position);
  const flip = reduced ? Number(depth >= 0.5) : smootherRange(0.22, 0.74, depth);
  const mosaic = reduced ? 0 : smootherRange(0, 0.3, depth) * (1 - smootherRange(0.62, 1, depth));
  return {
    depth,
    /** How coarse the mosaic is: 0 is the untouched picture, 1 the largest tiles. */
    mosaic,
    /** How far the front of flipping tiles has travelled across the screen. */
    flip,
    /** The scene most of the screen shows. */
    scene: flip < 0.5 ? "earth" as const : "city" as const,
    /** How much the interface should step aside while the tiles move. */
    cover: mosaic,
  };
}
export type PixelPassage = ReturnType<typeof pixelPassage>;

/** The shape of each city's front of flipping tiles: one theme, five gestures. */
export const PASSAGE_PATTERNS: Record<CitySceneId, { id: number; name: string }> = {
  "st-louis-sky": { id: 0, name: "ripple from the centre" },
  "granada-sky": { id: 1, name: "a wavy curtain falling" },
  "brno-pixel": { id: 2, name: "rows refreshing like an LED display" },
  "munich-mission": { id: 3, name: "a spiral" },
  "madrid-latent": { id: 4, name: "a noise dissolve" },
};

/** Largest mosaic tile, in CSS pixels. */
export const tileSize = (width: number) => (width < 700 ? 22 : 34);

/**
 * Flights through a passage: one velocity hump, peaking at about 30% of the way and braking continuously,
 * so the tiles have time to flip rather than being rushed past.
 */
export function passageFlightEase(t: number) {
  const x = clamp01(t);
  const gentle = 1 - (1 - x) ** 3 * (1 + 3 * x);
  const prompt = (1 - (1 - x) ** 3) * (1 - Math.exp(-((x / 0.07) ** 2)));
  return 0.8 * gentle + 0.2 * prompt;
}

/** The Earth camera's dive towards the city: it starts moving at once, then eases into the mosaic. */
export const passageDive = (depth: number) => Math.sin(Math.min(1, clamp01(depth) / 0.5) * Math.PI / 2);
