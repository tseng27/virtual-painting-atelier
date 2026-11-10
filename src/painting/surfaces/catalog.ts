import type { MediumCategory } from '../types';

export type SurfaceCategory = 'sketch' | 'watercolor' | 'canvas' | 'xuan';
export type TexturePattern =
  | 'fine' | 'rough' | 'hot' | 'cold' | 'roughWc' | 'cotton' | 'linen' | 'primed' | 'rawXuan' | 'sizedXuan';

/** Shared Surface Material definition. These parameters feed the brush engines directly. */
export interface SurfaceDef {
  id: string;
  category: SurfaceCategory;
  pattern: TexturePattern;
  paperColor: string;
  roughness: number;   // 0..1 — how much tooth/grain gates dry media
  absorbency: number;  // 0..1 — how fast water/ink sinks in (shorter wet time, more feathering on xuan)
  spread: number;      // 0..1 — lateral wet diffusion (bleeding)
  adhesion: number;    // 0..1 — how readily pigment attaches (low = skips, needs pressure)
  tileScale: number;   // texture tile magnification in canvas px per texel
  recommended: MediumCategory[];
}

export const SURFACES: SurfaceDef[] = [
  { id: 'sketch-fine', category: 'sketch', pattern: 'fine', paperColor: '#F4F0E6', roughness: 0.45, absorbency: 0.3, spread: 0.2, adhesion: 0.8, tileScale: 1, recommended: ['sketch'] },
  { id: 'sketch-rough', category: 'sketch', pattern: 'rough', paperColor: '#F1ECE0', roughness: 0.85, absorbency: 0.35, spread: 0.2, adhesion: 0.65, tileScale: 1.6, recommended: ['sketch'] },
  { id: 'sketch-grey', category: 'sketch', pattern: 'fine', paperColor: '#B9B6AE', roughness: 0.55, absorbency: 0.3, spread: 0.2, adhesion: 0.75, tileScale: 1.2, recommended: ['sketch'] },
  { id: 'wc-hot', category: 'watercolor', pattern: 'hot', paperColor: '#F7F4EC', roughness: 0.2, absorbency: 0.45, spread: 0.75, adhesion: 0.9, tileScale: 2, recommended: ['watercolor', 'ink', 'sketch'] },
  { id: 'wc-cold', category: 'watercolor', pattern: 'cold', paperColor: '#F6F2E7', roughness: 0.55, absorbency: 0.55, spread: 0.6, adhesion: 0.85, tileScale: 2, recommended: ['watercolor', 'sketch'] },
  { id: 'wc-rough', category: 'watercolor', pattern: 'roughWc', paperColor: '#F5F0E3', roughness: 0.9, absorbency: 0.6, spread: 0.5, adhesion: 0.8, tileScale: 2.6, recommended: ['watercolor'] },
  { id: 'canvas-cotton', category: 'canvas', pattern: 'cotton', paperColor: '#EEE8DA', roughness: 0.65, absorbency: 0.25, spread: 0.15, adhesion: 0.7, tileScale: 1.4, recommended: ['acrylic', 'oil'] },
  { id: 'canvas-linen', category: 'canvas', pattern: 'linen', paperColor: '#D9CDB4', roughness: 0.8, absorbency: 0.3, spread: 0.12, adhesion: 0.65, tileScale: 1.8, recommended: ['oil', 'acrylic'] },
  { id: 'canvas-primed', category: 'canvas', pattern: 'primed', paperColor: '#F2EFE8', roughness: 0.35, absorbency: 0.1, spread: 0.1, adhesion: 0.85, tileScale: 1.4, recommended: ['oil', 'acrylic'] },
  { id: 'xuan-raw', category: 'xuan', pattern: 'rawXuan', paperColor: '#F3EEDF', roughness: 0.3, absorbency: 0.95, spread: 0.9, adhesion: 0.95, tileScale: 2, recommended: ['ink', 'watercolor'] },
  { id: 'xuan-sized', category: 'xuan', pattern: 'sizedXuan', paperColor: '#F0E9D6', roughness: 0.25, absorbency: 0.35, spread: 0.35, adhesion: 0.9, tileScale: 2, recommended: ['ink', 'watercolor'] },
];

export const surfaceById = (id: string) => SURFACES.find((s) => s.id === id) ?? SURFACES[0];

/** Canvas sizes are managed in canvas px at 150 px/inch (A-series) — export scale is separate. */
export const SIZE_PRESETS: { id: string; w: number; h: number }[] = [
  { id: 'A5', w: 874, h: 1240 },
  { id: 'A4', w: 1240, h: 1754 },
  { id: 'A3', w: 1754, h: 2480 },
  { id: 'square', w: 1400, h: 1400 },
  { id: 'wide', w: 1920, h: 1080 },
];
export const MAX_CANVAS_SIDE = 4096;
