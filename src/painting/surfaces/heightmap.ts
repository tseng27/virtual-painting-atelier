import { createRng, clamp, boxBlur } from '../math';
import type { TexturePattern } from './catalog';

export const TILE = 256;

/** Tileable value noise lattice. */
function makeLattice(rng: () => number, period: number) {
  const g = new Float32Array(period * period);
  for (let i = 0; i < g.length; i++) g[i] = rng();
  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = x - xi, fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const m = (v: number) => ((v % period) + period) % period;
    const a = g[m(yi) * period + m(xi)], b = g[m(yi) * period + m(xi + 1)];
    const c = g[m(yi + 1) * period + m(xi)], d = g[m(yi + 1) * period + m(xi + 1)];
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

function fbm(rng: () => number, periods: number[], amps: number[]) {
  const layers = periods.map((p) => makeLattice(rng, p));
  return (x: number, y: number) => {
    let v = 0, tot = 0;
    layers.forEach((l, i) => { v += l((x / TILE) * periods[i], (y / TILE) * periods[i]) * amps[i]; tot += amps[i]; });
    return v / tot;
  };
}

/** Tileable Worley (F1) noise: gives the dimpled 'cold press' / 'rough' watercolor paper look. */
function worley(rng: () => number, cells: number) {
  const pts: [number, number][] = [];
  for (let i = 0; i < cells * cells; i++) pts.push([rng(), rng()]);
  const cs = TILE / cells;
  return (x: number, y: number) => {
    const cx = Math.floor(x / cs), cy = Math.floor(y / cs);
    let best = 9;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const gx = cx + ox, gy = cy + oy;
      const wx = ((gx % cells) + cells) % cells, wy = ((gy % cells) + cells) % cells;
      const p = pts[wy * cells + wx];
      const px = (gx + p[0]) * cs, py = (gy + p[1]) * cs;
      const d = Math.hypot(px - x, py - y) / cs;
      if (d < best) best = d;
    }
    return clamp(best);
  };
}

function weave(x: number, y: number, period: number, jitter: (x: number, y: number) => number, irregular = 0) {
  const j = (jitter(x, y) - 0.5) * irregular;
  const u = (x / period) + j, v = (y / period) - j;
  const cu = Math.floor(u), cv = Math.floor(v);
  const fu = u - cu, fv = v - cv;
  const threadV = Math.sin(Math.PI * fu); // vertical thread profile
  const threadH = Math.sin(Math.PI * fv);
  const over = (cu + cv) % 2 === 0;
  return over ? Math.max(threadV * 0.9, threadH * 0.55) : Math.max(threadH * 0.9, threadV * 0.55);
}

/**
 * Generates a seamless height map (0 = valley, 1 = peak) for a paper/canvas pattern.
 * Deterministic for a given (pattern, seed) so a saved artwork re-creates the same grain.
 */
export function generateHeightMap(pattern: TexturePattern, seed: number): Float32Array {
  const rng = createRng(seed ^ 0x9e3779b9);
  const out = new Float32Array(TILE * TILE);
  const set = (fn: (x: number, y: number) => number) => {
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) out[y * TILE + x] = fn(x, y);
  };
  switch (pattern) {
    case 'fine': { const n = fbm(rng, [64, 128], [0.6, 0.4]); set(n); break; }
    case 'rough': {
      const n = fbm(rng, [16, 32, 64, 128], [0.35, 0.3, 0.2, 0.15]); const w = worley(rng, 24);
      set((x, y) => n(x, y) * 0.6 + (1 - w(x, y)) * 0.4); break;
    }
    case 'hot': { const n = fbm(rng, [8, 16, 64], [0.5, 0.35, 0.15]); set(n); break; }
    case 'cold': {
      const w = worley(rng, 18); const n = fbm(rng, [32, 128], [0.6, 0.4]);
      set((x, y) => (1 - w(x, y)) * 0.65 + n(x, y) * 0.35); break;
    }
    case 'roughWc': {
      const w = worley(rng, 9); const w2 = worley(rng, 22); const n = fbm(rng, [16, 64], [0.6, 0.4]);
      set((x, y) => (1 - w(x, y)) * 0.5 + (1 - w2(x, y)) * 0.25 + n(x, y) * 0.25); break;
    }
    case 'cotton': {
      const j = fbm(rng, [8, 32], [0.7, 0.3]); const n = fbm(rng, [128], [1]);
      set((x, y) => weave(x, y, 4, j, 0.15) * 0.8 + n(x, y) * 0.2); break;
    }
    case 'linen': {
      const j = fbm(rng, [4, 16], [0.6, 0.4]); const slub = fbm(rng, [32, 64], [0.5, 0.5]);
      set((x, y) => weave(x, y, 5.33, j, 0.6) * (0.7 + slub(x, y) * 0.5) * 0.85 + slub(x * 2, y) * 0.15); break;
    }
    case 'primed': {
      const j = fbm(rng, [8], [1]); const n = fbm(rng, [16, 64], [0.5, 0.5]);
      set((x, y) => weave(x, y, 4, j, 0.1) * 0.45 + n(x, y) * 0.55);
      boxBlur(out, TILE, TILE, 1); break;
    }
    case 'rawXuan':
    case 'sizedXuan': {
      const n = fbm(rng, [4, 16, 64], [0.5, 0.3, 0.2]);
      set((x, y) => n(x, y) * 0.5);
      // fibres: long thin random curves accumulated into the map (wrapped for tiling)
      const fibres = pattern === 'rawXuan' ? 260 : 140;
      for (let f = 0; f < fibres; f++) {
        let x = rng() * TILE, y = rng() * TILE, a = rng() * Math.PI * 2;
        const len = 20 + rng() * 90, s = 0.25 + rng() * 0.35;
        for (let i = 0; i < len; i++) {
          a += (rng() - 0.5) * 0.25; x += Math.cos(a); y += Math.sin(a);
          const ix = ((Math.round(x) % TILE) + TILE) % TILE, iy = ((Math.round(y) % TILE) + TILE) % TILE;
          out[iy * TILE + ix] += s;
        }
      }
      if (pattern === 'sizedXuan') boxBlur(out, TILE, TILE, 1);
      break;
    }
  }
  // normalise to 0..1
  let lo = Infinity, hi = -Infinity;
  for (const v of out) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const span = hi - lo || 1;
  for (let i = 0; i < out.length; i++) out[i] = (out[i] - lo) / span;
  return out;
}
