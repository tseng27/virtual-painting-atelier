import type { StrokePoint } from '../types';

/** A single brush imprint ("dab") along the interpolated path. */
export interface Dab {
  x: number; y: number;
  p: number; tx: number; ty: number;
  angle: number;   // direction of travel (rad)
  speed: number;   // px/ms
  dist: number;    // cumulative path length to this dab
  d: number;       // dwell ms
  t: number;
  dwell: boolean;  // emitted because the brush rested in place
  index: number;
}

/**
 * Converts a growing list of StrokePoints into evenly spaced dabs using Catmull-Rom
 * interpolation, so fast mouse moves (sparse samples) still produce a continuous,
 * smoothly curved stroke. Works incrementally for live drawing and replay alike.
 */
export class Stamper {
  private pts: StrokePoint[] = [];
  private done = 0;          // segments fully stamped
  private carry = 0;         // distance since last dab
  private dist = 0;
  private count = 0;
  private lastDwell = 0;
  private lastAngle = 0;

  constructor(private spacingFor: (p: number) => number) {}

  get points() { return this.pts; }

  /** Adds points; returns dabs that can be safely drawn now (one-point look-ahead). */
  add(points: StrokePoint[]): Dab[] {
    const out: Dab[] = [];
    for (const p of points) {
      const isFirst = this.pts.length === 0;
      this.pts.push(p);
      if (isFirst) out.push(this.makeDab(p.x, p.y, p, p, 0, 0, false));
    }
    while (this.done + 2 < this.pts.length) this.stampSegment(this.done++, out);
    return out;
  }

  /** Flushes the final segment(s) at stroke end. */
  finish(): Dab[] {
    const out: Dab[] = [];
    while (this.done + 1 < this.pts.length) this.stampSegment(this.done++, out);
    return out;
  }

  private stampSegment(i: number, out: Dab[]) {
    const P = this.pts;
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const dtSeg = Math.max(0.5, p2.t - p1.t);
    const speed = segLen / dtSeg;

    if (segLen < 0.4) {
      // resting brush: emit a dwell dab whenever dwell has grown meaningfully
      if (p2.d - this.lastDwell > 45) {
        this.lastDwell = p2.d;
        out.push(this.makeDab(p2.x, p2.y, p2, p2, this.lastAngle, 0, true));
      }
      return;
    }
    this.lastDwell = p2.d;
    const steps = Math.max(2, Math.ceil(segLen / 0.75));
    let px = p1.x, py = p1.y;
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const [x, y] = catmull(p0, p1, p2, p3, t);
      const step = Math.hypot(x - px, y - py);
      const ang = Math.atan2(y - py, x - px);
      this.carry += step;
      this.dist += step;
      const pr = p1.p + (p2.p - p1.p) * t;
      const spacing = Math.max(0.4, this.spacingFor(pr));
      while (this.carry >= spacing) {
        this.carry -= spacing;
        const back = this.carry / (step || 1);
        const dx = x - (x - px) * back, dy = y - (y - py) * back;
        this.lastAngle = ang;
        const tp = { ...p1, p: pr, tx: p1.tx + (p2.tx - p1.tx) * t, ty: p1.ty + (p2.ty - p1.ty) * t, t: p1.t + (p2.t - p1.t) * t, d: p2.d };
        out.push(this.makeDab(dx, dy, tp, p2, ang, speed, false, this.dist - this.carry));
      }
      px = x; py = y;
    }
  }

  private makeDab(x: number, y: number, p: StrokePoint, _n: StrokePoint, angle: number, speed: number, dwell: boolean, dist = this.dist): Dab {
    return { x, y, p: p.p, tx: p.tx, ty: p.ty, angle, speed, dist, d: p.d, t: p.t, dwell, index: this.count++ };
  }
}

function catmull(p0: StrokePoint, p1: StrokePoint, p2: StrokePoint, p3: StrokePoint, t: number): [number, number] {
  const t2 = t * t, t3 = t2 * t;
  const f = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return [f(p0.x, p1.x, p2.x, p3.x), f(p0.y, p1.y, p2.y, p3.y)];
}
