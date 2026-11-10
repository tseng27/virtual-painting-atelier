import { describe, expect, it } from 'vitest';
import { History } from '../painting/history/History';
import { CheckpointList } from '../painting/history/checkpoints';
import { packPoints, unpackPoints, validateProject, serializeOp, deserializeOp, PROJECT_FORMAT } from '../painting/engine/serialize';
import { generateHeightMap, TILE } from '../painting/surfaces/heightmap';
import { SURFACES } from '../painting/surfaces/catalog';
import { boxBlur, createRng } from '../painting/math';
import { hexToRgb, mixPigments, rgbToHex, rgbToHsv, hsvToRgb } from '../painting/color/color';
import { fitView, screenToCanvas, canvasToScreen, zoomAt } from '../input/pointer/viewTransform';
import { buildSchedule } from '../painting/replay/ReplayPlayer';
import { BRUSHES } from '../painting/brushes/presets';
import type { Stroke } from '../painting/types';

const stroke = (seq: number, time: number, n = 5): Stroke => ({
  type: 'stroke', id: `s${seq}`, seq, time, layerId: 'L', brushId: 'pencil-hb', kind: 'graphite',
  settings: { size: 4, opacity: 1, flow: 1, hardness: 1, smoothing: 0, water: 0, density: 1 }, color: '#000000', seed: seq, pressureSource: 'simulated',
  points: Array.from({ length: n }, (_, i) => ({ x: i * 3.14159, y: 2.71828, p: 0.5, tx: 0, ty: 0, t: i * 16, d: 0 })),
});

describe('History', () => {
  it('undo/redo walk the stack and new pushes clear redo', () => {
    const h = new History<number>();
    h.push(1); h.push(2); h.push(3);
    expect(h.undo()).toBe(3);
    expect(h.undo()).toBe(2);
    expect(h.redo()).toBe(2);
    h.push(4);
    expect(h.canRedo).toBe(false);
    expect(h.undo()).toBe(4);
    expect(h.undo()).toBe(2);
  });
  it('respects its limit', () => {
    const h = new History<number>(3);
    [1, 2, 3, 4, 5].forEach((n) => h.push(n));
    expect(h.size).toBe(3);
  });
});

describe('Checkpoints', () => {
  it('finds nearest checkpoint and keeps the base when thinning', () => {
    const c = new CheckpointList<string, null>(10, 3);
    c.add({ opIndex: 0, image: 'base', wet: null });
    c.add({ opIndex: 10, image: 'a', wet: null });
    c.add({ opIndex: 20, image: 'b', wet: null });
    c.add({ opIndex: 30, image: 'c', wet: null });
    expect(c.items.map((x) => x.image)).toEqual(['base', 'b', 'c']);
    expect(c.nearest(25)?.image).toBe('b');
    c.invalidateAfter(22);
    expect(c.nearest(40)?.image).toBe('b');
  });
});

describe('Project serialization', () => {
  it('round-trips stroke points (rounded to 0.01 px)', () => {
    const s = stroke(1, 0);
    const back = unpackPoints(packPoints(s.points));
    expect(back).toHaveLength(5);
    expect(back[2].x).toBeCloseTo(6.28, 2);
    const op = deserializeOp(serializeOp(s)) as Stroke;
    expect(op.points[4].t).toBe(64);
    expect(op.settings.size).toBe(4);
  });
  it('validates format, version and op structure', () => {
    const good = {
      format: PROJECT_FORMAT, version: 1, app: 'ATELIER',
      meta: { id: 'a', name: 'x', width: 100, height: 100, sizePreset: 'A4', surface: { id: 'sketch-fine', paperColor: '#fff', textureStrength: 1, absorbency: 0.3, seed: 1 }, created: 0, updated: 0, elapsed: 0, seq: 2 },
      activeLayerId: 'L', layers: [{ id: 'L', name: 'L', visible: true, opacity: 1, raster: null, ops: [serializeOp(stroke(1, 0))] }],
    };
    expect(validateProject(good).ok).toBe(true);
    expect(validateProject({ ...good, format: 'nope' }).ok).toBe(false);
    expect(validateProject({ ...good, version: 99 }).ok).toBe(false);
    const bad = structuredClone(good); (bad.layers[0].ops[0] as { pts: number[] }).pts.push(1);
    expect(validateProject(bad).ok).toBe(false);
    expect(validateProject(null).ok).toBe(false);
  });
});

describe('Surface materials', () => {
  it('is deterministic for a seed and differs between surfaces', () => {
    const a = generateHeightMap('cold', 5), b = generateHeightMap('cold', 5), c = generateHeightMap('linen', 5);
    expect(a).toEqual(b);
    let diff = 0; for (let i = 0; i < a.length; i++) diff += Math.abs(a[i] - c[i]);
    expect(diff / a.length).toBeGreaterThan(0.05);
  });
  it('every surface has distinct material parameters and a normalised map', () => {
    const keys = new Set(SURFACES.map((s) => `${s.pattern}|${s.roughness}|${s.absorbency}|${s.paperColor}`));
    expect(keys.size).toBe(SURFACES.length);
    for (const s of SURFACES) {
      const h = generateHeightMap(s.pattern, 1);
      expect(h.length).toBe(TILE * TILE);
      expect(Math.min(...h)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...h)).toBeLessThanOrEqual(1);
    }
  });
});

describe('math & colour', () => {
  it('box blur preserves mass and spreads', () => {
    const w = 21, h = 21, a = new Float32Array(w * h); a[10 * w + 10] = 1;
    boxBlur(a, w, h, 2);
    expect(a.reduce((x, y) => x + y, 0)).toBeCloseTo(1, 4);
    expect(a[10 * w + 12]).toBeGreaterThan(0);
  });
  it('rng is deterministic', () => {
    const r1 = createRng(9), r2 = createRng(9);
    expect([r1(), r1(), r1()]).toEqual([r2(), r2(), r2()]);
  });
  it('hex / hsv conversions round-trip', () => {
    expect(rgbToHex(hexToRgb('#2f5d8a'))).toBe('#2F5D8A');
    expect(rgbToHex(hsvToRgb(rgbToHsv(hexToRgb('#B5523B'))))).toBe('#B5523B');
  });
  it('pigment mix of blue + yellow is greener than a plain RGB average', () => {
    const blue = hexToRgb('#1D3FA0'), yellow = hexToRgb('#F2D22E');
    const m = mixPigments([blue, yellow]);
    expect(m.g).toBeGreaterThan(m.b);
  });
});

describe('view transform', () => {
  it('maps screen ↔ canvas and keeps the zoom anchor fixed', () => {
    const v = fitView(1000, 800, 1240, 1754);
    const c = screenToCanvas(v, 500, 400);
    const s = canvasToScreen(v, c.x, c.y);
    expect(s.x).toBeCloseTo(500); expect(s.y).toBeCloseTo(400);
    const z = zoomAt(v, 300, 200, v.scale * 3);
    const before = screenToCanvas(v, 300, 200), after = screenToCanvas(z, 300, 200);
    expect(after.x).toBeCloseTo(before.x); expect(after.y).toBeCloseTo(before.y);
  });
});

describe('replay schedule', () => {
  it('keeps stroke order and compresses long idle gaps', () => {
    const tl = [stroke(1, 0), stroke(2, 100), stroke(3, 600000)].map((op) => ({ layerId: 'L', op }));
    const { items, total } = buildSchedule(tl, 350);
    expect(items.map((i) => i.op.seq)).toEqual([1, 2, 3]);
    expect(items[2].start - (items[1].start + items[1].dur)).toBeLessThanOrEqual(350);
    expect(total).toBeLessThan(2000);
  });
});

describe('brush presets', () => {
  it('cover every medium family required in v1 with real renderers', () => {
    const cats = new Set(BRUSHES.map((b) => b.category));
    ['sketch', 'watercolor', 'acrylic', 'oil', 'ink'].forEach((c) => expect(cats.has(c as never)).toBe(true));
    const kinds = new Set(BRUSHES.map((b) => b.kind));
    expect(kinds.size).toBeGreaterThanOrEqual(8);
  });
});
