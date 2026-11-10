import { boxBlur, clamp } from '../math';
import { clipRect, type Rect } from '../engine/canvas';
import type { RenderEnv } from './renderer';

export interface WetProcessOptions {
  dryRadius: number;      // diffusion radius on dry paper
  wetRadius: number;      // diffusion radius where the paper is still wet
  edge: number;           // edge-darkening strength (pigment pooling at the rim)
  granulation: number;    // pigment settling into paper valleys
  feather: number;        // xuan-style fibre feathering halo
  gain: number;           // alpha gain applied after diffusion
  maxAlpha: number;
  now: number;            // document time for wetness lookup
  fadeMs: number;
}

/**
 * Post-processes a wet stroke held in env.buffer (region `rect`) and composites it onto the
 * layer with multiply (transparent glazing). Steps: diffusion (more where wet) → edge
 * darkening → granulation by paper height → optional fibre feathering.
 * Returns the processed alpha mask's bounding rect (for wet-map updates).
 */
export function processWetStroke(env: RenderEnv, rect: Rect, color: { r: number; g: number; b: number }, o: WetProcessOptions): Rect | null {
  const pad = Math.ceil(Math.max(o.dryRadius, o.wetRadius) * 2.5 + o.feather * 4 + 2);
  const R = clipRect({ x0: rect.x0 - pad, y0: rect.y0 - pad, x1: rect.x1 + pad, y1: rect.y1 + pad }, env.width, env.height);
  if (!R) return null;
  const w = R.x1 - R.x0, h = R.y1 - R.y0;
  const img = env.bufferCtx.getImageData(R.x0, R.y0, w, h);
  const px = img.data;
  const n = w * h;
  const A = new Float32Array(n);
  const tone = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = px[i * 4 + 3] / 255;
    A[i] = a;
    tone[i * 3] = px[i * 4] * a; tone[i * 3 + 1] = px[i * 4 + 1] * a; tone[i * 3 + 2] = px[i * 4 + 2] * a;
  }
  // wetness per pixel (sampled from coarse wet map)
  const wet = new Float32Array(n);
  let anyWet = false;
  for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) {
    const v = env.wet.wetness(R.x0 + x, R.y0 + y, o.now, o.fadeMs);
    if (v > 0) anyWet = true;
    for (let yy = y; yy < Math.min(h, y + 4); yy++) for (let xx = x; xx < Math.min(w, x + 4); xx++) wet[yy * w + xx] = v;
  }
  const Dd = boxBlur(boxBlur(A.slice(), w, h, o.dryRadius / 2), w, h, o.dryRadius / 2);
  const Dw = anyWet ? boxBlur(boxBlur(A.slice(), w, h, o.wetRadius / 2), w, h, o.wetRadius / 2) : Dd;
  const D = new Float32Array(n);
  for (let i = 0; i < n; i++) D[i] = Dd[i] + (Dw[i] - Dd[i]) * wet[i];
  // edge darkening: where diffusion front exceeds its own blur → rim
  const Db = boxBlur(D.slice(), w, h, Math.max(2, o.dryRadius * 0.9));
  const F = o.feather > 0 ? boxBlur(boxBlur(A.slice(), w, h, o.feather), w, h, o.feather) : null;
  // averaged pigment colour for halo pixels
  const surf = env.surface;
  const out = env.bufferCtx.createImageData(w, h);
  const od = out.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const d = D[i];
    const rim = Math.max(0, d - Db[i]);
    const ht = surf.height(R.x0 + x, R.y0 + y);
    let a = d * (1 - o.edge * 0.25) + rim * o.edge * 3.2 * (1 - wet[i] * 0.6);
    a *= 1 - o.granulation * 0.5 + o.granulation * (1 - ht);
    if (F) {
      const halo = Math.max(0, F[i] * 1.25 - A[i]) * (0.35 + 0.65 * ht * 1.2);
      a = Math.max(a, halo * 0.55);
    }
    a = clamp(a * o.gain, 0, o.maxAlpha);
    const src = A[i] > 0.02 ? i : -1;
    const k = i * 4;
    if (src >= 0) {
      const inv = 1 / A[i];
      od[k] = tone[i * 3] * inv; od[k + 1] = tone[i * 3 + 1] * inv; od[k + 2] = tone[i * 3 + 2] * inv;
    } else { od[k] = color.r; od[k + 1] = color.g; od[k + 2] = color.b; }
    od[k + 3] = a * 255;
  }
  env.bufferCtx.clearRect(R.x0, R.y0, w, h);
  env.bufferCtx.putImageData(out, R.x0, R.y0);
  const ctx = env.layerCtx;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(env.buffer, R.x0, R.y0, w, h, R.x0, R.y0, w, h);
  ctx.restore();
  env.bufferCtx.clearRect(R.x0, R.y0, w, h);
  return R;
}
