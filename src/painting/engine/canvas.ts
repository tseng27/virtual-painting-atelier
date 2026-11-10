export type Canvas2D = HTMLCanvasElement;
export type Ctx2D = CanvasRenderingContext2D;

export function createCanvas(w: number, h: number): Canvas2D {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export function ctx2d(c: Canvas2D, readFrequently = false): Ctx2D {
  const ctx = c.getContext('2d', { willReadFrequently: readFrequently });
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  return ctx;
}

export interface Rect { x0: number; y0: number; x1: number; y1: number }
export const emptyRect = (): Rect => ({ x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity });
export function growRect(r: Rect, x: number, y: number, pad: number) {
  if (x - pad < r.x0) r.x0 = x - pad;
  if (y - pad < r.y0) r.y0 = y - pad;
  if (x + pad > r.x1) r.x1 = x + pad;
  if (y + pad > r.y1) r.y1 = y + pad;
}
export function clipRect(r: Rect, w: number, h: number): Rect | null {
  const out = { x0: Math.max(0, Math.floor(r.x0)), y0: Math.max(0, Math.floor(r.y0)), x1: Math.min(w, Math.ceil(r.x1)), y1: Math.min(h, Math.ceil(r.y1)) };
  return out.x1 > out.x0 && out.y1 > out.y0 ? out : null;
}
