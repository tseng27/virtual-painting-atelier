import { describe, expect, it } from 'vitest';
import { Stamper } from '../painting/strokes/stamper';
import type { StrokePoint } from '../painting/types';

const pt = (x: number, y: number, t: number, d = 0, p = 1): StrokePoint => ({ x, y, p, tx: 0, ty: 0, t, d });

describe('Stamper (continuous strokes)', () => {
  it('fills large gaps between sparse fast samples with evenly spaced dabs', () => {
    const s = new Stamper(() => 2);
    const dabs = [...s.add([pt(0, 0, 0), pt(200, 0, 16), pt(400, 0, 32), pt(600, 0, 48)]), ...s.finish()];
    expect(dabs.length).toBeGreaterThan(250);
    for (let i = 1; i < dabs.length; i++) {
      const gap = Math.hypot(dabs[i].x - dabs[i - 1].x, dabs[i].y - dabs[i - 1].y);
      expect(gap).toBeLessThan(2.6);
    }
    expect(dabs[dabs.length - 1].x).toBeGreaterThan(597);
  });

  it('spacing follows brush size (bigger brush → fewer dabs)', () => {
    const count = (sp: number) => { const s = new Stamper(() => sp); return [...s.add([pt(0, 0, 0), pt(100, 0, 20), pt(200, 0, 40)]), ...s.finish()].length; };
    expect(count(1)).toBeGreaterThan(count(8) * 4);
  });

  it('emits dwell dabs when the brush rests in place', () => {
    const s = new Stamper(() => 2);
    const pts = [pt(0, 0, 0), pt(10, 0, 16)];
    for (let i = 1; i <= 10; i++) pts.push(pt(10, 0, 16 + i * 50, i * 50));
    const dabs = [...s.add(pts), ...s.finish()];
    expect(dabs.filter((d) => d.dwell).length).toBeGreaterThan(3);
  });

  it('is incremental: feeding in chunks equals feeding all at once', () => {
    const pts = Array.from({ length: 30 }, (_, i) => pt(i * 7, Math.sin(i) * 20, i * 16));
    const a = new Stamper(() => 1.5);
    const all = [...a.add(pts), ...a.finish()];
    const b = new Stamper(() => 1.5);
    const chunks: ReturnType<Stamper['add']> = [];
    for (let i = 0; i < pts.length; i += 4) chunks.push(...b.add(pts.slice(i, i + 4)));
    chunks.push(...b.finish());
    expect(chunks.length).toBe(all.length);
    expect(chunks[50].x).toBeCloseTo(all[50].x, 6);
  });
});
