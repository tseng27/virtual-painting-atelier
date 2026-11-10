import type { StrokeRenderer, RenderEnv } from './renderer';
import type { BrushPreset } from './presets';
import type { Stroke } from '../types';
import type { Dab } from '../strokes/stamper';
import { softStamp } from './stamps';
import { lerp } from '../math';

export class EraseRenderer implements StrokeRenderer {
  readonly usesBuffer = false;
  readonly previewBlend = 'normal' as const;
  private env!: RenderEnv;
  private stroke!: Stroke;
  private preset!: BrushPreset;
  begin(stroke: Stroke, preset: BrushPreset, env: RenderEnv) { this.env = env; this.stroke = stroke; this.preset = preset; }
  dabs(dabs: Dab[]) {
    const ctx = this.env.layerCtx, s = this.stroke.settings;
    const stamp = softStamp('#000000', s.hardness);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    for (const d of dabs) {
      const r = Math.max(0.5, (s.size / 2) * lerp(this.preset.params.minSize, 1, d.p));
      ctx.globalAlpha = s.opacity * s.flow * (0.55 + 0.45 * d.p);
      ctx.drawImage(stamp, d.x - r, d.y - r, r * 2, r * 2);
    }
    ctx.restore();
  }
  end() {}
}
