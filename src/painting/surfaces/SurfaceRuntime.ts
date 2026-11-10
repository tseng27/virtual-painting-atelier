import { TILE, generateHeightMap } from './heightmap';
import { surfaceById, type SurfaceDef } from './catalog';
import type { SurfaceSettings } from '../types';
import { createCanvas, ctx2d, type Canvas2D } from '../engine/canvas';
import { hexToRgb } from '../color/color';
import { clamp, smoothstep } from '../math';

export const TOOTH_LEVELS = 6;

/**
 * Runtime representation of the chosen paper/canvas. Brushes query `height()` and use
 * `toothPattern()` so the grain physically gates where pigment lands — the texture is part
 * of the paint behaviour, not an overlay.
 */
export class SurfaceRuntime {
  readonly def: SurfaceDef;
  readonly settings: SurfaceSettings;
  readonly heights: Float32Array;
  private patterns = new Map<string, CanvasPattern>();

  constructor(settings: SurfaceSettings) {
    this.settings = settings;
    this.def = surfaceById(settings.id);
    this.heights = generateHeightMap(this.def.pattern, settings.seed);
  }

  get strength() { return this.settings.textureStrength; }
  get absorbency() { return this.settings.absorbency; }
  get scale() { return this.def.tileScale; }

  /** Height 0..1 at canvas coordinate. */
  height(x: number, y: number): number {
    const s = this.def.tileScale;
    const ix = ((Math.floor(x / s) % TILE) + TILE) % TILE;
    const iy = ((Math.floor(y / s) % TILE) + TILE) % TILE;
    return this.heights[iy * TILE + ix];
  }

  /** How strongly the grain gates dry media (0 = ignores grain). */
  grainInfluence(mediumGrain: number) {
    return clamp(mediumGrain * (0.35 + this.def.roughness * 0.65) * this.strength, 0, 1);
  }

  /**
   * Coloured tooth pattern: pigment only on paper peaks at low pressure, reaching into
   * valleys as pressure rises. Patterns are anchored to canvas origin so grain stays put.
   */
  toothPattern(ctx: CanvasRenderingContext2D, color: string, level: number, mediumGrain: number, coarse = 1): CanvasPattern {
    const infl = this.grainInfluence(mediumGrain);
    const key = `${color}|${level}|${infl.toFixed(2)}|${coarse}`;
    const cached = this.patterns.get(key);
    if (cached) return cached;
    const tile = createCanvas(TILE, TILE);
    const tctx = ctx2d(tile);
    const img = tctx.createImageData(TILE, TILE);
    const { r, g, b } = hexToRgb(color);
    const th = 0.78 - 0.62 * (level / (TOOTH_LEVELS - 1));
    for (let i = 0; i < TILE * TILE; i++) {
      const a = smoothstep(th - 0.14, th + 0.14, this.heights[i]);
      const alpha = 1 - infl + infl * a;
      img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b;
      img.data[i * 4 + 3] = Math.round(alpha * 255);
    }
    tctx.putImageData(img, 0, 0);
    const pat = ctx.createPattern(tile, 'repeat')!;
    const s = this.def.tileScale * coarse;
    pat.setTransform(new DOMMatrix([s, 0, 0, s, 0, 0]));
    if (this.patterns.size > 160) this.patterns.clear();
    this.patterns.set(key, pat);
    return pat;
  }

  /** Paints the visible paper: base colour plus relief shading derived from the height map. */
  renderPaper(target: Canvas2D) {
    const ctx = ctx2d(target);
    const w = target.width, h = target.height;
    const base = hexToRgb(this.settings.paperColor);
    // build one shaded tile, then repeat it as a pattern (fast, resolution independent)
    const tileC = createCanvas(TILE, TILE);
    const tctx = ctx2d(tileC);
    const img = tctx.createImageData(TILE, TILE);
    const k = 0.11 * this.strength * (0.4 + this.def.roughness);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const i = y * TILE + x;
      const hx = this.heights[y * TILE + ((x + 1) % TILE)] - this.heights[y * TILE + ((x + TILE - 1) % TILE)];
      const hy = this.heights[((y + 1) % TILE) * TILE + x] - this.heights[((y + TILE - 1) % TILE) * TILE + x];
      const light = 1 + (-hx - hy) * k * 2.2 + (this.heights[i] - 0.5) * k;
      img.data[i * 4] = clamp(base.r * light, 0, 255);
      img.data[i * 4 + 1] = clamp(base.g * light, 0, 255);
      img.data[i * 4 + 2] = clamp(base.b * light, 0, 255);
      img.data[i * 4 + 3] = 255;
    }
    tctx.putImageData(img, 0, 0);
    const pat = ctx.createPattern(tileC, 'repeat')!;
    pat.setTransform(new DOMMatrix([this.def.tileScale, 0, 0, this.def.tileScale, 0, 0]));
    ctx.save();
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}
