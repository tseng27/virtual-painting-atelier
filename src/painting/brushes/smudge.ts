import type { StrokeRenderer, RenderEnv } from './renderer';
import type { BrushPreset } from './presets';
import type { Stroke } from '../types';
import type { Dab } from '../strokes/stamper';
import { lerp } from '../math';

/** Blending stump: drags existing pigment along the stroke direction. */
export class SmudgeRenderer implements StrokeRenderer {
  readonly usesBuffer = false;
  readonly previewBlend = 'normal' as const;
  private env!: RenderEnv;
  private stroke!: Stroke;
  private preset!: BrushPreset;
  private prev: { x: number; y: number } | null = null;

  begin(stroke: Stroke, preset: BrushPreset, env: RenderEnv) { this.env = env; this.stroke = stroke; this.preset = preset; this.prev = null; }

  dabs(dabs: Dab[]) {
    const { layerCtx: ctx, layer } = this.env;
    const s = this.stroke.settings;
    for (const d of dabs) {
      if (!this.prev) { this.prev = { x: d.x, y: d.y }; continue; }
      const r = Math.max(1, (s.size / 2) * lerp(this.preset.params.minSize, 1, d.p));
      ctx.save();
      ctx.beginPath(); ctx.arc(d.x, d.y, r, 0, Math.PI * 2); ctx.clip();
      ctx.globalAlpha = s.opacity * s.flow * (0.35 + 0.5 * d.p);
      const sx = this.prev.x - r, sy = this.prev.y - r;
      ctx.drawImage(layer, sx, sy, r * 2, r * 2, d.x - r, d.y - r, r * 2, r * 2);
      ctx.restore();
      this.prev = { x: d.x, y: d.y };
    }
  }
  end() {}
}
