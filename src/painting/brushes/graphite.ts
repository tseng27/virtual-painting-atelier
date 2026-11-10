import type { StrokeRenderer, RenderEnv } from './renderer';
import type { BrushPreset } from './presets';
import type { Stroke } from '../types';
import type { Dab } from '../strokes/stamper';
import { TOOTH_LEVELS } from '../surfaces/SurfaceRuntime';
import { clamp, createRng, lerp, type Rng } from '../math';

/**
 * Pencil / charcoal. Graphite catches on the paper's peaks: low pressure only marks the
 * tooth, higher pressure (or dwell, or repeated passes) fills the valleys and darkens.
 */
export class GraphiteRenderer implements StrokeRenderer {
  readonly usesBuffer = false;
  readonly previewBlend = 'normal' as const;
  private env!: RenderEnv;
  private stroke!: Stroke;
  private preset!: BrushPreset;
  private rng!: Rng;

  begin(stroke: Stroke, preset: BrushPreset, env: RenderEnv) {
    this.env = env; this.stroke = stroke; this.preset = preset; this.rng = createRng(stroke.seed);
  }

  dabs(dabs: Dab[]) {
    const { layerCtx: ctx, surface } = this.env;
    const s = this.stroke.settings, pp = this.preset.params;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    for (const d of dabs) {
      const p = d.p;
      const r = Math.max(0.5, (s.size / 2) * lerp(pp.minSize, 1, p));
      const dwellBoost = d.dwell ? Math.min(0.6, d.d / 2500) : 0;
      const level = clamp(Math.round((p * 0.85 + s.flow * 0.15 + dwellBoost) * (TOOTH_LEVELS - 1)), 0, TOOTH_LEVELS - 1);
      const alpha = clamp(s.opacity * s.flow * (0.18 + 0.5 * p) + dwellBoost * 0.25, 0, 1);
      ctx.fillStyle = surface.toothPattern(ctx, this.stroke.color, level, pp.grain, pp.coarse ?? 1);
      ctx.globalAlpha = alpha;
      // tilt (real pen) lays the lead on its side: wider, softer ellipse
      const tilt = Math.hypot(d.tx, d.ty);
      ctx.beginPath();
      if (tilt > 0.2) ctx.ellipse(d.x, d.y, r * (1 + tilt * 1.8), r, Math.atan2(d.ty, d.tx), 0, Math.PI * 2);
      else ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
      ctx.fill();
      if (s.hardness < 0.7) {
        ctx.globalAlpha = alpha * 0.35;
        ctx.beginPath(); ctx.arc(d.x, d.y, r * (1.6 - s.hardness * 0.6), 0, Math.PI * 2); ctx.fill();
      }
      if (pp.dust) {
        const n = Math.round(pp.dust * 4);
        ctx.globalAlpha = alpha * 0.5;
        for (let i = 0; i < n; i++) {
          const a = this.rng() * Math.PI * 2, rr = r * (0.8 + this.rng() * 1.2);
          ctx.beginPath();
          ctx.arc(d.x + Math.cos(a) * rr, d.y + Math.sin(a) * rr, 0.4 + this.rng() * 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  end() {}
}
