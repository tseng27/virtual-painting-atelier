import type { StrokeRenderer, RenderEnv } from './renderer';
import type { BrushPreset } from './presets';
import type { Stroke } from '../types';
import type { Dab } from '../strokes/stamper';
import { clamp, createRng, hash01, lerp } from '../math';
import { hexToRgb, rgbCss, rgbToHex, mixRgb, shade, type RGB } from '../color/color';
import { TOOTH_LEVELS } from '../surfaces/SurfaceRuntime';

interface Bristle { u: number; jitter: number; seed: number; px: number; py: number; on: boolean; skip: boolean }

/** Samples the average colour under (x,y) in the layer; returns null on empty canvas. */
function sampleUnder(env: RenderEnv, x: number, y: number): { c: RGB; a: number } | null {
  const ix = Math.round(x) - 1, iy = Math.round(y) - 1;
  if (ix < 0 || iy < 0 || ix + 3 > env.width || iy + 3 > env.height) return null;
  const d = env.layerCtx.getImageData(ix, iy, 3, 3).data;
  let r = 0, g = 0, b = 0, a = 0;
  for (let i = 0; i < 9; i++) { const al = d[i * 4 + 3] / 255; r += d[i * 4] * al; g += d[i * 4 + 1] * al; b += d[i * 4 + 2] * al; a += al; }
  if (a < 0.05) return null;
  return { c: { r: r / a, g: g / a, b: b / a }, a: a / 9 };
}

/**
 * Acrylic / oil bristle brush. Opaque coverage; each bristle leaves its own streak with
 * slight value jitter; ridge lighting fakes impasto; the brush picks up wet paint from the
 * canvas (stronger for oil) so colours mix on the surface; a draining load produces dry-brush
 * that only catches the canvas weave.
 */
export class PaintRenderer implements StrokeRenderer {
  readonly usesBuffer = false;
  readonly previewBlend = 'normal' as const;
  private env!: RenderEnv;
  private stroke!: Stroke;
  private preset!: BrushPreset;
  private bristles: Bristle[] = [];
  private color!: RGB;
  private original!: RGB;

  begin(stroke: Stroke, preset: BrushPreset, env: RenderEnv) {
    this.env = env; this.stroke = stroke; this.preset = preset;
    const rng = createRng(stroke.seed);
    const n = preset.params.bristles ?? 20;
    this.bristles = Array.from({ length: n }, (_, i) => ({
      u: ((i + 0.5) / n) * 2 - 1 + (rng() - 0.5) * (1.5 / n),
      jitter: (rng() - 0.5) * 0.16,
      seed: Math.floor(rng() * 1e9),
      px: NaN, py: NaN, on: false,
      skip: !!preset.params.fan && rng() < 0.4,
    }));
    this.original = hexToRgb(stroke.color);
    this.color = { ...this.original };
  }

  dabs(dabs: Dab[]) {
    const env = this.env, ctx = env.layerCtx, surf = env.surface;
    const s = this.stroke.settings, pp = this.preset.params;
    const capacity = s.size * (20 + s.density * 70) * (0.6 + s.flow * 0.6);
    const mix = pp.mix ?? 0.1, impasto = pp.impasto ?? 0.3, stiff = pp.stiffness ?? 0.5;
    const flat = pp.flat ?? 0;
    ctx.save();
    ctx.lineCap = 'round';
    for (const d of dabs) {
      if (d.index % 4 === 0) {
        const under = sampleUnder(env, d.x, d.y);
        if (under) this.color = mixRgb(this.color, under.c, mix * under.a);
        this.color = mixRgb(this.color, this.original, 0.03); // paint reservoir in the brush
      }
      const load = clamp(1 - d.dist / capacity, 0.08, 1);
      const w = s.size * lerp(pp.minSize, 1, d.p) * (pp.spread ?? 1);
      // flat brushes keep their orientation; round brushes splay perpendicular to travel
      const axis = flat > 0.5 ? lerp(d.angle + Math.PI / 2, -0.5, 0.25) : d.angle + Math.PI / 2;
      const cx = Math.cos(axis), cy = Math.sin(axis);
      const lw = Math.max(1, (w / this.bristles.length) * (1.6 + (1 - stiff) * 1.4) * (0.6 + d.p * 0.5));
      const dry = 1 - load;
      const grainK = surf.grainInfluence(pp.grain);
      for (const b of this.bristles) {
        if (b.skip) continue;
        const spreadU = b.u * (pp.fan ? 1 + d.p * 0.3 : 1);
        const x = d.x + cx * spreadU * w * 0.5, y = d.y + cy * spreadU * w * 0.5;
        const ht = surf.height(x, y);
        const on = !(dry > 0.35 && ht < dry * grainK * 1.1) && hash01(b.seed, Math.floor(d.dist / 3)) > dry * 0.5;
        if (on && b.on && isFinite(b.px)) {
          const c = shade(this.color, 1 + b.jitter);
          const alpha = clamp(s.opacity * (0.55 + 0.45 * load) * (0.7 + 0.3 * s.flow), 0, 1);
          if (impasto > 0) {
            ctx.globalAlpha = alpha * 0.35 * impasto;
            ctx.strokeStyle = rgbCss(shade(c, 0.62), 1);
            ctx.lineWidth = lw;
            ctx.beginPath(); ctx.moveTo(b.px + 0.8, b.py + 0.9); ctx.lineTo(x + 0.8, y + 0.9); ctx.stroke();
          }
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = rgbCss(c, 1);
          ctx.lineWidth = lw;
          ctx.beginPath(); ctx.moveTo(b.px, b.py); ctx.lineTo(x, y); ctx.stroke();
          if (impasto > 0 && hash01(b.seed, 7) > 0.45) {
            ctx.globalAlpha = alpha * 0.4 * impasto;
            ctx.strokeStyle = rgbCss(shade(c, 1.35), 1);
            ctx.lineWidth = Math.max(0.6, lw * 0.35);
            ctx.beginPath(); ctx.moveTo(b.px - 0.6, b.py - 0.7); ctx.lineTo(x - 0.6, y - 0.7); ctx.stroke();
          }
        }
        b.on = on; b.px = x; b.py = y;
      }
    }
    ctx.restore();
  }
  end() {}
}

/**
 * Palette knife: a flat blade that lays thick, sharp-edged slabs of paint, scrapes over the
 * weave when the load runs thin, and pushes up a ridge along its edge.
 */
export class KnifeRenderer implements StrokeRenderer {
  readonly usesBuffer = false;
  readonly previewBlend = 'normal' as const;
  private env!: RenderEnv;
  private stroke!: Stroke;
  private preset!: BrushPreset;
  private color!: RGB;
  private original!: RGB;
  private prev: { ax: number; ay: number; bx: number; by: number } | null = null;

  begin(stroke: Stroke, preset: BrushPreset, env: RenderEnv) {
    this.env = env; this.stroke = stroke; this.preset = preset; this.prev = null;
    this.original = hexToRgb(stroke.color); this.color = { ...this.original };
  }
  dabs(dabs: Dab[]) {
    const env = this.env, ctx = env.layerCtx, surf = env.surface;
    const s = this.stroke.settings, pp = this.preset.params;
    const capacity = s.size * (10 + s.density * 30);
    ctx.save();
    for (const d of dabs) {
      if (d.index % 3 === 0) {
        const under = sampleUnder(env, d.x, d.y);
        if (under) this.color = mixRgb(this.color, under.c, (pp.mix ?? 0.3) * under.a);
      }
      const load = clamp(1 - d.dist / capacity, 0, 1);
      const half = (s.size / 2) * lerp(pp.minSize, 1, d.p);
      const blade = -0.55 + (d.tx || 0) * 0.5;
      const ax = d.x + Math.cos(blade) * half, ay = d.y + Math.sin(blade) * half;
      const bx = d.x - Math.cos(blade) * half, by = d.y - Math.sin(blade) * half;
      if (this.prev) {
        const level = Math.round(clamp(load * 1.3, 0, 1) * (TOOTH_LEVELS - 1));
        ctx.globalAlpha = s.opacity;
        ctx.fillStyle = load > 0.75 ? rgbCss(this.color, 1) : surf.toothPattern(ctx, rgbToHex(quant(this.color)), level, 1);
        ctx.beginPath();
        ctx.moveTo(this.prev.ax, this.prev.ay); ctx.lineTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(this.prev.bx, this.prev.by);
        ctx.closePath(); ctx.fill();
        const imp = pp.impasto ?? 0.5;
        ctx.lineWidth = 1.6;
        ctx.globalAlpha = 0.45 * imp * load;
        ctx.strokeStyle = rgbCss(shade(this.color, 0.6), 1);
        ctx.beginPath(); ctx.moveTo(this.prev.bx, this.prev.by); ctx.lineTo(bx, by); ctx.stroke();
        ctx.strokeStyle = rgbCss(shade(this.color, 1.3), 1);
        ctx.beginPath(); ctx.moveTo(this.prev.ax, this.prev.ay); ctx.lineTo(ax, ay); ctx.stroke();
      }
      this.prev = { ax, ay, bx, by };
    }
    ctx.restore();
  }
  end() {}
}

const quant = (c: RGB): RGB => ({ r: Math.round(c.r / 8) * 8, g: Math.round(c.g / 8) * 8, b: Math.round(c.b / 8) * 8 });
