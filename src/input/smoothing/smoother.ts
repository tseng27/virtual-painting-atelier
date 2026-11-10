import type { StrokePoint } from '../../painting/types';

/**
 * Lazy-follow stabiliser. smoothing 0 = raw input, 1 = heavy smoothing.
 * Pressure and time pass through untouched; only position is filtered.
 */
export class Smoother {
  private sx = 0;
  private sy = 0;
  private started = false;
  constructor(private smoothing: number) {}

  push(p: StrokePoint): StrokePoint {
    if (!this.started) { this.started = true; this.sx = p.x; this.sy = p.y; return { ...p }; }
    const k = 1 - Math.min(0.92, this.smoothing * 0.92);
    this.sx += (p.x - this.sx) * k;
    this.sy += (p.y - this.sy) * k;
    return { ...p, x: this.sx, y: this.sy };
  }

  /** Points that close the gap between the lagging stabilised position and the real end. */
  finish(last: StrokePoint | undefined): StrokePoint[] {
    if (!last || !this.started) return [];
    const gap = Math.hypot(last.x - this.sx, last.y - this.sy);
    if (gap < 0.5) return [];
    const n = Math.min(8, Math.ceil(gap / 4));
    const out: StrokePoint[] = [];
    for (let i = 1; i <= n; i++) {
      const k = i / n;
      out.push({ ...last, x: this.sx + (last.x - this.sx) * k, y: this.sy + (last.y - this.sy) * k, t: last.t + i });
    }
    this.sx = last.x; this.sy = last.y;
    return out;
  }
}
