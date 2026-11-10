import { clamp } from '../math';

export interface RGB { r: number; g: number; b: number } // 0..255
export interface HSV { h: number; s: number; v: number } // h 0..360, s/v 0..1

export function hexToRgb(hex: string): RGB {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return { r: 0, g: 0, b: 0 };
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
export const isHex = (s: string) => /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s.trim());

export function rgbToHex({ r, g, b }: RGB): string {
  const c = (v: number) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

export function rgbToHsv({ r, g, b }: RGB): HSV {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn), d = max - min;
  let h = 0;
  if (d) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max };
}

export function hsvToRgb({ h, s, v }: HSV): RGB {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

const toLin = (v: number) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const toSrgb = (c: number) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/**
 * Pigment-like mix approximation: weighted geometric mean in linear RGB.
 * NOTE: this is an RGB approximation of subtractive mixing (e.g. blue + yellow trends
 * toward a dull green instead of grey) — it is NOT a Kubelka–Munk pigment model.
 */
export function mixPigments(colors: RGB[], weights?: number[]): RGB {
  const w = weights ?? colors.map(() => 1);
  const total = w.reduce((a, b) => a + b, 0) || 1;
  const ch = (k: 'r' | 'g' | 'b') => {
    let logSum = 0;
    colors.forEach((c, i) => { logSum += (w[i] / total) * Math.log(Math.max(1e-4, toLin(c[k]))); });
    return toSrgb(Math.exp(logSum));
  };
  return { r: ch('r'), g: ch('g'), b: ch('b') };
}

/** Plain linear (additive-light) blend, used for wet paint pickup on the brush. */
export function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}

export const rgbCss = (c: RGB, a = 1) => `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${a})`;
export const shade = (c: RGB, k: number): RGB => ({ r: clamp(c.r * k, 0, 255), g: clamp(c.g * k, 0, 255), b: clamp(c.b * k, 0, 255) });
