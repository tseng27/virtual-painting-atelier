import type { StrokeRenderer, RenderEnv } from './renderer';
import type { BrushPreset } from './presets';
import type { Stroke } from '../types';
import type { Dab } from '../strokes/stamper';
import { softStamp } from './stamps';
import { clamp, lerp } from '../math';
import { emptyRect, growRect, type Rect } from '../engine/canvas';
import { hexToRgb } from '../color/color';
import { processWetStroke } from './wetProcess';

export const dryTimeMs = (water: number, absorbency: number) => (5000 + water * 14000) * (1 - absorbency * 0.6);

/**
 * Watercolor: pigment collects in a stroke buffer (live preview, multiplied over the layer),
 * then on lift diffuses (wider where paper is still wet → wet-in-wet bleeding), darkens at
 * its edges, granulates into paper valleys and glazes onto the layer transparently.
 * Resting the brush (dwell) floods a pool of pigment and water.
 */
export class WatercolorRenderer implements StrokeRenderer {
  readonly usesBuffer = true;
  readonly previewBlend = 'multiply' as const;
  private env!: RenderEnv;
  private stroke!: Stroke;
  private preset!: BrushPreset;
  private rect: Rect = emptyRect();
  private lastT = 0;
  private marks: [number, number, number][] = [];

  begin(stroke: Stroke, preset: BrushPreset, env: RenderEnv) {
    this.env = env; this.stroke = stroke; this.preset = preset; this.rect = emptyRect(); this.lastT = 0; this.marks = [];
  }

  dabs(dabs: Dab[]) {
    const { bufferCtx: ctx } = this.env;
    const s = this.stroke.settings, pp = this.preset.params;
    const stamp = softStamp(this.stroke.color, s.hardness * 0.7);
    const capacity = s.size * (40 + s.water * 90);
    ctx.save();
    for (const d of dabs) {
      const load = clamp(1 - d.dist / capacity, 0.3, 1);
      const r = Math.max(1, (s.size / 2) * lerp(pp.minSize, 1, d.p));
      const flat = pp.flat ?? 0;
      let rr = r, alpha = s.flow * 0.2 * (0.45 + 0.55 * d.p) * load;
      if (d.dwell) {
        // resting brush: water and pigment pool outward softly (bloom), not a hard dot
        rr = r * (1.1 + Math.min(1.6, d.d / 1100));
        alpha *= 0.28;
        ctx.globalAlpha = clamp(alpha, 0, 1);
        ctx.drawImage(softStamp(this.stroke.color, 0), d.x - rr, d.y - rr, rr * 2, rr * 2);
        growRect(this.rect, d.x, d.y, rr + 2);
        this.marks.push([d.x, d.y, rr * 1.3]);
        continue;
      }
      ctx.globalAlpha = clamp(alpha, 0, 1);
      if (flat > 0) {
        ctx.save();
        ctx.translate(d.x, d.y); ctx.rotate(-0.6);
        ctx.drawImage(stamp, -rr, -rr * (1 - flat * 0.75), rr * 2, rr * 2 * (1 - flat * 0.75));
        ctx.restore();
      } else ctx.drawImage(stamp, d.x - rr, d.y - rr, rr * 2, rr * 2);
      growRect(this.rect, d.x, d.y, rr + 2);
      if (d.index % 3 === 0) this.marks.push([d.x, d.y, rr]);
      this.lastT = d.t;
    }
    ctx.restore();
  }

  end() {
    if (!isFinite(this.rect.x0)) return;
    const s = this.stroke.settings, surf = this.env.surface;
    const now = this.stroke.time + this.lastT;
    const fade = dryTimeMs(s.water, surf.absorbency);
    const spread = surf.def.spread;
    const R = processWetStroke(this.env, this.rect, hexToRgb(this.stroke.color), {
      dryRadius: 1 + s.water * 4 * (0.5 + spread) * (this.preset.params.absorb ?? 0.6),
      wetRadius: 3 + s.water * 14 * (0.4 + spread),
      edge: clamp(0.3 + s.water * 0.6 - surf.absorbency * 0.3, 0, 1),
      granulation: surf.grainInfluence(this.preset.params.grain) * 0.8,
      feather: surf.def.category === 'xuan' ? 1 + surf.absorbency * s.water * 4 : 0,
      gain: 0.75 + s.density * 0.9,
      maxAlpha: clamp(s.opacity * (0.35 + s.density * 0.65), 0, 1),
      now, fadeMs: fade,
    });
    if (R) {
      // everything this stroke touched stays wet until it dries (local drying state)
      const until = now + fade;
      for (const [x, y, r] of this.marks) this.env.wet.wetDisc(x, y, r, until);
    }
  }
}

/** Clear water brush (清水筆): lifts and softens existing pigment and pre-wets the paper. */
export class WaterRenderer implements StrokeRenderer {
  readonly usesBuffer = false;
  readonly previewBlend = 'normal' as const;
  private env!: RenderEnv;
  private stroke!: Stroke;
  private preset!: BrushPreset;
  private prev: { x: number; y: number } | null = null;
  begin(stroke: Stroke, preset: BrushPreset, env: RenderEnv) { this.env = env; this.stroke = stroke; this.preset = preset; this.prev = null; }
  dabs(dabs: Dab[]) {
    const { layerCtx: ctx, layer, wet, surface } = this.env;
    const s = this.stroke.settings;
    const stamp = softStamp('#000000', 0.2);
    const fade = dryTimeMs(s.water, surface.absorbency);
    for (const d of dabs) {
      const r = Math.max(2, (s.size / 2) * lerp(this.preset.params.minSize, 1, d.p));
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = s.opacity * s.flow * 0.05 * (0.5 + d.p);
      ctx.drawImage(stamp, d.x - r, d.y - r, r * 2, r * 2);
      ctx.restore();
      if (this.prev) {
        ctx.save();
        ctx.beginPath(); ctx.arc(d.x, d.y, r * 0.9, 0, Math.PI * 2); ctx.clip();
        ctx.globalAlpha = 0.18 * s.flow;
        ctx.drawImage(layer, this.prev.x - r, this.prev.y - r, r * 2, r * 2, d.x - r, d.y - r, r * 2, r * 2);
        ctx.restore();
      }
      wet.wetDisc(d.x, d.y, r, this.stroke.time + d.t + fade);
      this.prev = { x: d.x, y: d.y };
    }
  }
  end() {}
}
