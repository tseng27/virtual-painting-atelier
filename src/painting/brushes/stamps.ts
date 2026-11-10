import { createCanvas, ctx2d, type Canvas2D } from '../engine/canvas';
import { hexToRgb } from '../color/color';

const cache = new Map<string, Canvas2D>();
export const STAMP = 64;

/** Radial soft stamp tinted with a colour. hardness 1 → crisp disc, 0 → gaussian-like. */
export function softStamp(color: string, hardness: number): Canvas2D {
  const h = Math.round(hardness * 10) / 10;
  const key = `${color}|${h}`;
  let c = cache.get(key);
  if (c) return c;
  c = createCanvas(STAMP, STAMP);
  const ctx = ctx2d(c);
  const { r, g, b } = hexToRgb(color);
  const grad = ctx.createRadialGradient(STAMP / 2, STAMP / 2, 0, STAMP / 2, STAMP / 2, STAMP / 2);
  const inner = Math.min(0.95, h * 0.9);
  grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(inner, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(Math.min(1, inner + (1 - inner) * 0.5), `rgba(${r},${g},${b},${0.35 + h * 0.3})`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, STAMP, STAMP);
  if (cache.size > 64) cache.clear();
  cache.set(key, c);
  return c;
}
