import { describe, expect, it } from 'vitest';
import { PressureSimulator, resolvePressureSource, type RawSample } from '../input/pressure/dynamics';
import { brushById } from '../painting/brushes/presets';

const sample = (x: number, t: number, extra: Partial<RawSample> = {}): RawSample => ({ x, y: 0, t, pressure: 0.5, tiltX: 0, tiltY: 0, pointerType: 'mouse', ...extra });

function runStroke(speedPxPerMs: number, n = 40, model = brushById('pencil-hb').dynamics) {
  const sim = new PressureSimulator('simulated', model);
  let last = 0;
  for (let i = 0; i < n; i++) last = sim.next(sample(i * 16 * speedPxPerMs, i * 16)).p;
  return last;
}

describe('pressure simulation (mode B)', () => {
  it('fast mouse movement gives lighter/thinner effective pressure than slow movement', () => {
    const slow = runStroke(0.15);
    const fast = runStroke(3.5);
    expect(slow).toBeGreaterThan(fast + 0.25);
  });

  it('dwell (pointer resting) accumulates and raises deposit', () => {
    const sim = new PressureSimulator('simulated', brushById('wc-round').dynamics);
    for (let i = 0; i < 10; i++) sim.next(sample(i * 20, i * 16));
    const moving = sim.next(sample(220, 176));
    let rest = moving;
    for (let i = 1; i <= 30; i++) rest = sim.next(sample(220, 176 + i * 50));
    expect(rest.d).toBeGreaterThan(1000);
    expect(moving.d).toBeLessThan(100);
    expect(rest.p).toBeGreaterThanOrEqual(moving.p);
  });

  it('ramps in at the start of a stroke (起筆)', () => {
    const sim = new PressureSimulator('simulated', brushById('ink-large').dynamics);
    const first = sim.next(sample(0, 0));
    let later = first;
    for (let i = 1; i < 12; i++) later = sim.next(sample(i * 2, i * 16));
    expect(later.p).toBeGreaterThan(first.p);
  });

  it('adds a tapering tail when lifting quickly (收筆) but not when slow', () => {
    const fast = new PressureSimulator('simulated');
    const pts = Array.from({ length: 12 }, (_, i) => fast.next(sample(i * 50, i * 16)));
    const tail = fast.tail(pts);
    expect(tail.length).toBeGreaterThan(0);
    expect(tail[tail.length - 1].p).toBeLessThan(pts[pts.length - 1].p);
    const slow = new PressureSimulator('simulated');
    const spts = Array.from({ length: 12 }, (_, i) => slow.next(sample(i * 1, i * 16)));
    expect(slow.tail(spts)).toHaveLength(0);
  });
});

describe('pressure sources', () => {
  it('fixed mode ignores speed', () => {
    const sim = new PressureSimulator('fixed');
    expect(sim.next(sample(0, 0)).p).toBe(1);
    expect(sim.next(sample(500, 16)).p).toBe(1);
  });
  it('never treats a mouse as a real pen', () => {
    expect(resolvePressureSource('pen', 'mouse')).toBe('simulated');
    expect(resolvePressureSource('auto', 'mouse')).toBe('simulated');
    expect(resolvePressureSource('auto', 'pen')).toBe('pen');
    expect(resolvePressureSource('fixed', 'pen')).toBe('fixed');
  });
  it('pen mode reads real pressure and tilt', () => {
    const sim = new PressureSimulator('pen');
    const p = sim.next(sample(0, 0, { pointerType: 'pen', pressure: 0.23, tiltX: 45 }));
    expect(p.p).toBeCloseTo(0.23);
    expect(p.tx).toBeCloseTo(0.5);
  });
  it('falls back to simulation when a "pen" only reports a constant 0.5', () => {
    const sim = new PressureSimulator('pen');
    for (let i = 0; i < 20; i++) sim.next(sample(i * 4, i * 16, { pointerType: 'pen', pressure: 0.5 }));
    expect(sim.pressureSource).toBe('simulated');
  });
});
