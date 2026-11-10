import type { StrokeRenderer, RenderEnv } from './renderer';
import type { BrushPreset } from './presets';
import type { Stroke } from '../types';
import type { Dab } from '../strokes/stamper';
import { createCanvas, ctx2d, type Canvas2D } from '../engine/canvas';
import { createRng, lerp, type Rng } from '../math';
import { hexToRgb } from '../color/color';
import { dryTimeMs } from './watercolor';

/** Natural sponge: porous, irregular dabs that glaze transparently. */
export class SpongeRenderer implements StrokeRenderer {
  readonly usesBuffer = false;
  readonly previewBlend = 'normal' as const;
  private env!: RenderEnv;
  private stroke!: Stroke;
  private preset!: BrushPreset;
  private rng!: Rng;
  private stamp!: Canvas2D;

  begin(stroke: Stroke, preset: BrushPreset, env: RenderEnv) {
    this.env = env; this.stroke = stroke; this.preset = preset; this.rng = createRng(stroke.seed);
    const S = 96, c = createCanvas(S, S), ctx = ctx2d(c);
    const { r, g, b } = hexToRgb(stroke.color);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    for (let i = 0; i < 220; i++) {
      const a = this.rng() * Math.PI * 2, rad = Math.sqrt(this.rng()) * S * 0.45;
      ctx.globalAlpha = 0.25 + this.rng() * 0.5;
      ctx.beginPath(); ctx.arc(S / 2 + Math.cos(a) * rad, S / 2 + Math.sin(a) * rad, 1 + this.rng() * 4, 0, Math.PI * 2); ctx.fill();
    }
    this.stamp = c;
  }
  dabs(dabs: Dab[]) {
    const { layerCtx: ctx, wet, surface } = this.env;
    const s = this.stroke.settings;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    for (const d of dabs) {
      if (d.dwell && d.index % 4 !== 0) continue; // a resting sponge only presses occasionally
      const r = (s.size / 2) * lerp(this.preset.params.minSize, 1, d.p);
      ctx.globalAlpha = s.opacity * s.flow * 0.55 * (0.5 + s.density * 0.5);
      ctx.save();
      ctx.translate(d.x, d.y); ctx.rotate(this.rng() * Math.PI * 2);
      ctx.drawImage(this.stamp, -r, -r, r * 2, r * 2);
      ctx.restore();
      wet.wetDisc(d.x, d.y, r * 0.8, this.stroke.time + d.t + dryTimeMs(s.water, surface.absorbency) * 0.6);
    }
    ctx.restore();
  }
  end() {}
}
