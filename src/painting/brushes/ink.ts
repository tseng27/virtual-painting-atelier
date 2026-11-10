import type { StrokeRenderer, RenderEnv } from './renderer';
import type { BrushPreset } from './presets';
import type { Stroke } from '../types';
import type { Dab } from '../strokes/stamper';
import { clamp, createRng, hash01, lerp, smoothstep } from '../math';
import { emptyRect, growRect, type Rect } from '../engine/canvas';
import { hexToRgb, rgbCss, mixRgb, type RGB } from '../color/color';
import { processWetStroke } from './wetProcess';
import { dryTimeMs } from './watercolor';

interface Bristle { u: number; cap: number; seed: number; px: number; py: number; on: boolean }

/** 1D value noise along the stroke so dry-brush gaps form continuous streaks (飛白). */
function streak(seed: number, x: number) {
  const i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f);
  return hash01(seed, i) * (1 - s) + hash01(seed, i + 1) * s;
}

/**
 * Chinese brush (毛筆). The tip is modelled as a bundle of bristles: light pressure only the
 * pointed tip (筆鋒) touches, pressing spreads the belly. Ink load drains with distance and
 * speed, opening streaky dry-brush gaps (枯筆／飛白) that follow the paper grain. Water
 * dilutes tone (濃墨→淡墨), and on absorbent xuan the ink feathers into the fibres.
 */
export class InkRenderer implements StrokeRenderer {
  readonly usesBuffer = true;
  readonly previewBlend = 'multiply' as const;
  private env!: RenderEnv;
  private stroke!: Stroke;
  private preset!: BrushPreset;
  private bristles: Bristle[] = [];
  private rect: Rect = emptyRect();
  private base!: RGB;
  private lastT = 0;
  private marks: [number, number, number][] = [];

  begin(stroke: Stroke, preset: BrushPreset, env: RenderEnv) {
    this.env = env; this.stroke = stroke; this.preset = preset; this.rect = emptyRect(); this.lastT = 0; this.marks = [];
    const rng = createRng(stroke.seed);
    const n = preset.params.bristles ?? 30;
    this.bristles = Array.from({ length: n }, (_, i) => ({
      u: ((i + 0.5) / n) * 2 - 1 + (rng() - 0.5) * (2 / n),
      cap: 0.7 + rng() * 0.3,
      seed: Math.floor(rng() * 1e9),
      px: NaN, py: NaN, on: false,
    }));
    this.base = hexToRgb(stroke.color);
  }

  dabs(dabs: Dab[]) {
    const ctx = this.env.bufferCtx, surf = this.env.surface;
    const s = this.stroke.settings, pp = this.preset.params;
    const stiff = pp.stiffness ?? 0.5, absorb = pp.absorb ?? 0.6;
    const capacity = s.size * (14 + s.water * 40 + absorb * 26) * (0.5 + s.density * 0.5);
    const paper: RGB = { r: 255, g: 255, b: 255 };
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const d of dabs) {
      const load = clamp(1 - d.dist / capacity, 0, 1);
      const pr = Math.pow(d.p, 1.25);
      const w = s.size * lerp(pp.minSize, 1, pr) * (pp.spread ?? 1);
      const perp = d.angle + Math.PI / 2;
      const cx = Math.cos(perp), cy = Math.sin(perp);
      const dryness = clamp(smoothstep(0.35, 1, 1 - load) * 0.9 + smoothstep(1.2, 4, d.speed) * 0.3 * (1 - s.water) - s.water * 0.2, 0, 0.92);
      // tone: concentrated ink is dark; water and a draining brush lighten it
      const dilute = clamp((1 - s.density) * 0.85 + s.water * 0.22 + (1 - load) * 0.18, 0, 0.92);
      const tone = mixRgb(this.base, paper, dilute);
      const lw = Math.max(0.8, (w / this.bristles.length) * (2.4 - stiff * 0.8));
      ctx.lineWidth = lw;
      for (const b of this.bristles) {
        // tip shape: outer bristles touch only as pressure rises (sharp 筆鋒 when light)
        const reach = 0.25 + pr * 0.9;
        const touches = Math.abs(b.u) <= reach;
        const gap = dryness > 0.05 && streak(b.seed, d.dist / (14 + stiff * 22)) < dryness * (1.05 - b.cap * 0.25);
        const grain = dryness > 0.35 && surf.height(d.x + cx * b.u * w * 0.5, d.y + cy * b.u * w * 0.5) < dryness * 0.85 * surf.grainInfluence(pp.grain) + 0.05;
        const on = touches && !gap && !grain;
        const x = d.x + cx * b.u * w * 0.5, y = d.y + cy * b.u * w * 0.5;
        if (on) {
          ctx.strokeStyle = rgbCss(tone, 1);
          ctx.beginPath();
          if (b.on && isFinite(b.px)) ctx.moveTo(b.px, b.py); else ctx.moveTo(x - 0.01, y);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
        b.on = on; b.px = x; b.py = y;
      }
      if (d.dwell) {
        // resting the brush: ink soaks out into a soft pool (墨暈)
        const rr = Math.max(2, (w / 2) * (0.7 + Math.min(0.9, (d.d / 1400) * (0.4 + this.env.surface.absorbency))));
        const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, rr);
        g.addColorStop(0, rgbCss(tone, 0.5));
        g.addColorStop(0.6, rgbCss(tone, 0.3));
        g.addColorStop(1, rgbCss(tone, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(d.x, d.y, rr, 0, Math.PI * 2); ctx.fill();
        growRect(this.rect, d.x, d.y, rr + 2);
      }
      growRect(this.rect, d.x, d.y, w / 2 + lw + 2);
      if (d.index % 3 === 0) this.marks.push([d.x, d.y, w / 2]);
      this.lastT = d.t;
    }
    ctx.restore();
  }

  end() {
    if (!isFinite(this.rect.x0)) return;
    const s = this.stroke.settings, surf = this.env.surface;
    const now = this.stroke.time + this.lastT;
    const fade = dryTimeMs(s.water, surf.absorbency);
    const xuan = surf.def.category === 'xuan';
    const R = processWetStroke(this.env, this.rect, this.base, {
      dryRadius: 0.6 + s.water * surf.absorbency * 2.5,
      wetRadius: 2 + s.water * 8,
      edge: 0.12,
      granulation: 0.05,
      feather: (xuan ? 1.5 : 0.4) * surf.absorbency * (0.4 + s.water) * 3 * (this.preset.params.absorb ?? 0.6),
      gain: 1.5,
      maxAlpha: s.opacity,
      now, fadeMs: fade,
    });
    if (R) for (const [x, y, r] of this.marks) this.env.wet.wetDisc(x, y, r, now + fade * s.water);
  }
}
