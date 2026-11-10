import { clamp, smoothstep } from '../../painting/math';
import type { PressureMode, StrokePoint } from '../../painting/types';

/** Per-medium response model for simulated (mouse/touch) pressure. */
export interface DynamicsModel {
  speedRef: number;     // px/ms at which the speed effect saturates
  speedThin: number;    // 0..1 how much fast motion lowers effective pressure
  dwellGain: number;    // pressure gained per second of dwell
  dwellMax: number;     // cap on dwell gain
  attackMs: number;     // ramp-in at stroke start (起筆)
  restP: number;        // effective pressure for a slow, steady stroke
  tail: number;         // 0..1 strength of flick-out tail on fast lift (收筆)
}

export const DEFAULT_DYNAMICS: DynamicsModel = {
  speedRef: 2.2, speedThin: 0.55, dwellGain: 0.6, dwellMax: 0.35, attackMs: 60, restP: 0.72, tail: 0.6,
};

export interface RawSample {
  x: number; y: number; t: number; // t in ms (performance clock)
  pressure: number; tiltX: number; tiltY: number;
  pointerType: string;
}

export type PressureSource = 'fixed' | 'simulated' | 'pen';

/**
 * Resolves which pressure source is honest for this pointer. A mouse reports pressure 0.5
 * while a button is down — that is NOT real pressure, so it never becomes 'pen'.
 */
export function resolvePressureSource(mode: PressureMode, pointerType: string): PressureSource {
  if (mode === 'fixed') return 'fixed';
  if (mode === 'dynamic') return 'simulated';
  const isPen = pointerType === 'pen';
  if (mode === 'pen') return isPen ? 'pen' : 'simulated';
  return isPen ? 'pen' : 'simulated'; // auto
}

/**
 * Turns raw pointer samples into StrokePoints with effective pressure p and dwell d.
 * - fixed: p = 1 everywhere
 * - simulated: p from speed (fast → light/thin, slow → full) and dwell (pause → deposit)
 * - pen: real pressure; if the device keeps reporting a constant 0/0.5 it falls back to simulated
 */
export class PressureSimulator {
  private source: PressureSource;
  private model: DynamicsModel;
  private t0 = 0;
  private last: RawSample | null = null;
  private v = 0;
  private dwell = 0;
  private penValues = new Set<number>();
  private lastP = 1;

  constructor(source: PressureSource, model: DynamicsModel = DEFAULT_DYNAMICS) {
    this.source = source;
    this.model = model;
  }

  get pressureSource(): PressureSource { return this.source; }
  get speed() { return this.v; }

  next(s: RawSample): StrokePoint {
    if (!this.last) this.t0 = s.t;
    const dt = this.last ? Math.max(0.5, s.t - this.last.t) : 16;
    const dd = this.last ? Math.hypot(s.x - this.last.x, s.y - this.last.y) : 0;
    const inst = this.last ? dd / dt : 0;
    // exponential smoothing of velocity (time constant ~40ms)
    const a = 1 - Math.exp(-dt / 40);
    this.v += (inst - this.v) * a;

    if (dd < 0.75 && this.last) this.dwell += dt;
    else this.dwell = Math.max(0, this.dwell - dd * 25); // moving away dissipates dwell
    const t = s.t - this.t0;

    let p = 1;
    if (this.source === 'pen') {
      this.penValues.add(Math.round(s.pressure * 1000));
      const flat = this.penValues.size <= 1 && (s.pressure === 0.5 || s.pressure === 0) && t > 120;
      if (flat) this.source = 'simulated';
      else p = clamp(s.pressure, 0.02, 1);
    }
    if (this.source === 'simulated') {
      const m = this.model;
      const speedK = smoothstep(0, m.speedRef, this.v);
      const dwellK = Math.min(m.dwellMax, (this.dwell / 1000) * m.dwellGain);
      const attack = smoothstep(0, m.attackMs, t);
      p = clamp((m.restP + (1 - m.restP) * (1 - speedK) - m.speedThin * speedK * m.restP + dwellK) * (0.35 + 0.65 * attack), 0.05, 1);
    }
    this.lastP = p;
    this.last = s;
    return {
      x: s.x, y: s.y, p,
      tx: clamp(s.tiltX / 90, -1, 1), ty: clamp(s.tiltY / 90, -1, 1),
      t, d: this.dwell,
    };
  }

  /**
   * Natural 收筆: when the pointer lifts while moving fast, extend a short tapering tail
   * along the direction of motion. Slow lifts end bluntly, as with a real brush.
   */
  tail(points: StrokePoint[]): StrokePoint[] {
    if (this.source === 'fixed' || points.length < 3) return [];
    const strength = this.model.tail * smoothstep(0.4, 2.5, this.v);
    if (strength < 0.05) return [];
    const a = points[points.length - 3], b = points[points.length - 1];
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    const reach = Math.min(60, this.v * 14) * strength;
    const out: StrokePoint[] = [];
    const n = 5;
    for (let i = 1; i <= n; i++) {
      const k = i / n;
      out.push({ ...b, x: b.x + (dx / len) * reach * k, y: b.y + (dy / len) * reach * k, p: this.lastP * (1 - k) ** 1.4 * 0.95 + 0.02, t: b.t + i * 6, d: 0 });
    }
    return out;
  }
}
