import type { BrushSettings, MediumCategory, RendererKind } from '../types';
import { DEFAULT_DYNAMICS, type DynamicsModel } from '../../input/pressure/dynamics';

/** Per-preset parameters consumed by the renderer of its `kind`. */
export interface BrushParams {
  minSize: number;     // size ratio at minimum pressure
  grain: number;       // 0..1 how strongly surface tooth gates the medium
  coarse?: number;     // grain scale multiplier (charcoal is coarser)
  dust?: number;       // charcoal powder scatter
  bristles?: number;   // ink/paint bristle count
  spread?: number;     // bristle spread width factor
  stiffness?: number;  // 0 soft .. 1 stiff (streakiness, tip sharpness)
  absorb?: number;     // ink/watercolor brush water capacity
  mix?: number;        // paint pickup / mixing rate
  impasto?: number;    // ridge highlight strength
  flat?: number;       // 0 round .. 1 flat (aspect)
  spacing?: number;    // dab spacing as fraction of size
  fan?: boolean;
}

export interface BrushPreset {
  id: string;
  category: MediumCategory;
  kind: RendererKind;
  defaults: BrushSettings;
  params: BrushParams;
  dynamics: DynamicsModel;
  defaultColor?: string;
}

const S = (o: Partial<BrushSettings>): BrushSettings => ({ size: 12, opacity: 1, flow: 0.8, hardness: 0.8, smoothing: 0.35, water: 0, density: 0.8, ...o });
const D = (o: Partial<DynamicsModel>): DynamicsModel => ({ ...DEFAULT_DYNAMICS, ...o });

const GRAPHITE = '#2E2E33';
const INK = '#161514';

export const BRUSHES: BrushPreset[] = [
  // ── Sketch ───────────────────────────────────────────────────────────────
  { id: 'pencil-2h', category: 'sketch', kind: 'graphite', defaultColor: GRAPHITE, defaults: S({ size: 3, opacity: 0.45, flow: 0.5, hardness: 0.95 }), params: { minSize: 0.7, grain: 0.95, spacing: 0.12 }, dynamics: D({ speedThin: 0.4, dwellGain: 0.3, tail: 0.3 }) },
  { id: 'pencil-hb', category: 'sketch', kind: 'graphite', defaultColor: GRAPHITE, defaults: S({ size: 4, opacity: 0.7, flow: 0.6, hardness: 0.9 }), params: { minSize: 0.65, grain: 0.85, spacing: 0.12 }, dynamics: D({ speedThin: 0.45, dwellGain: 0.4, tail: 0.35 }) },
  { id: 'pencil-2b', category: 'sketch', kind: 'graphite', defaultColor: GRAPHITE, defaults: S({ size: 5, opacity: 0.85, flow: 0.7, hardness: 0.85 }), params: { minSize: 0.6, grain: 0.75, spacing: 0.12 }, dynamics: D({ speedThin: 0.5, dwellGain: 0.5, tail: 0.4 }) },
  { id: 'pencil-6b', category: 'sketch', kind: 'graphite', defaultColor: '#1F1F22', defaults: S({ size: 7, opacity: 1, flow: 0.85, hardness: 0.75 }), params: { minSize: 0.55, grain: 0.6, spacing: 0.12 }, dynamics: D({ speedThin: 0.55, dwellGain: 0.6, tail: 0.45 }) },
  { id: 'charcoal', category: 'sketch', kind: 'graphite', defaultColor: '#1A1817', defaults: S({ size: 16, opacity: 0.9, flow: 0.7, hardness: 0.45 }), params: { minSize: 0.5, grain: 0.9, coarse: 1.8, dust: 0.6, spacing: 0.15 }, dynamics: D({ speedThin: 0.5, dwellGain: 0.7, tail: 0.3 }) },
  { id: 'stump', category: 'sketch', kind: 'smudge', defaults: S({ size: 22, opacity: 0.8, flow: 0.55, hardness: 0.3 }), params: { minSize: 0.7, grain: 0.2, spacing: 0.08 }, dynamics: D({ speedThin: 0.3, tail: 0 }) },
  { id: 'eraser', category: 'sketch', kind: 'erase', defaults: S({ size: 24, opacity: 1, flow: 0.9, hardness: 0.8 }), params: { minSize: 0.8, grain: 0.15, spacing: 0.1 }, dynamics: D({ speedThin: 0.2, tail: 0 }) },

  // ── Watercolor ───────────────────────────────────────────────────────────
  { id: 'wc-round', category: 'watercolor', kind: 'watercolor', defaultColor: '#2F5D8A', defaults: S({ size: 34, opacity: 0.85, flow: 0.55, hardness: 0.4, water: 0.6, density: 0.6 }), params: { minSize: 0.35, grain: 0.55, absorb: 0.7, spacing: 0.1 }, dynamics: D({ speedThin: 0.6, dwellGain: 0.8, dwellMax: 0.5, tail: 0.7 }) },
  { id: 'wc-flat', category: 'watercolor', kind: 'watercolor', defaultColor: '#B5523B', defaults: S({ size: 42, opacity: 0.85, flow: 0.5, hardness: 0.55, water: 0.55, density: 0.55 }), params: { minSize: 0.75, grain: 0.55, absorb: 0.6, flat: 0.8, spacing: 0.08 }, dynamics: D({ speedThin: 0.35, tail: 0.3 }) },
  { id: 'wc-detail', category: 'watercolor', kind: 'watercolor', defaultColor: '#3B4A2A', defaults: S({ size: 8, opacity: 0.9, flow: 0.65, hardness: 0.6, water: 0.35, density: 0.75 }), params: { minSize: 0.3, grain: 0.4, absorb: 0.4, spacing: 0.1 }, dynamics: D({ speedThin: 0.65, tail: 0.8 }) },
  { id: 'wc-water', category: 'watercolor', kind: 'water', defaults: S({ size: 40, opacity: 0.6, flow: 0.5, hardness: 0.3, water: 0.9, density: 0 }), params: { minSize: 0.5, grain: 0.3, spacing: 0.1 }, dynamics: D({ tail: 0 }) },
  { id: 'wc-sponge', category: 'watercolor', kind: 'sponge', defaultColor: '#6B8F5E', defaults: S({ size: 70, opacity: 0.8, flow: 0.45, hardness: 0.5, water: 0.4, density: 0.6 }), params: { minSize: 0.8, grain: 0.6, spacing: 0.5 }, dynamics: D({ speedThin: 0.2, tail: 0 }) },

  // ── Acrylic ──────────────────────────────────────────────────────────────
  { id: 'ac-flat', category: 'acrylic', kind: 'paint', defaultColor: '#C8553D', defaults: S({ size: 36, opacity: 0.95, flow: 0.8, hardness: 0.8, density: 0.85 }), params: { minSize: 0.8, grain: 0.6, bristles: 22, spread: 1, stiffness: 0.7, mix: 0.12, impasto: 0.45, flat: 1, spacing: 0.06 }, dynamics: D({ speedThin: 0.3, tail: 0.2 }) },
  { id: 'ac-round', category: 'acrylic', kind: 'paint', defaultColor: '#2F6690', defaults: S({ size: 24, opacity: 0.95, flow: 0.8, hardness: 0.7, density: 0.85 }), params: { minSize: 0.45, grain: 0.55, bristles: 16, spread: 0.9, stiffness: 0.6, mix: 0.12, impasto: 0.4, flat: 0, spacing: 0.06 }, dynamics: D({ speedThin: 0.45, tail: 0.5 }) },
  { id: 'ac-fan', category: 'acrylic', kind: 'paint', defaultColor: '#4F772D', defaults: S({ size: 48, opacity: 0.85, flow: 0.6, hardness: 0.6, density: 0.6 }), params: { minSize: 0.85, grain: 0.7, bristles: 26, spread: 1.15, stiffness: 0.5, mix: 0.1, impasto: 0.2, flat: 1, fan: true, spacing: 0.08 }, dynamics: D({ speedThin: 0.3, tail: 0.3 }) },
  { id: 'ac-knife', category: 'acrylic', kind: 'knife', defaultColor: '#E9C46A', defaults: S({ size: 40, opacity: 1, flow: 0.9, hardness: 1, density: 0.9 }), params: { minSize: 0.9, grain: 0.7, mix: 0.2, impasto: 0.6, spacing: 0.05 }, dynamics: D({ speedThin: 0.2, tail: 0 }) },

  // ── Oil ──────────────────────────────────────────────────────────────────
  { id: 'oil-hog', category: 'oil', kind: 'paint', defaultColor: '#8C3B2E', defaults: S({ size: 32, opacity: 1, flow: 0.85, hardness: 0.8, density: 0.9 }), params: { minSize: 0.7, grain: 0.5, bristles: 20, spread: 1, stiffness: 0.9, mix: 0.3, impasto: 0.75, flat: 0.6, spacing: 0.05 }, dynamics: D({ speedThin: 0.35, tail: 0.3 }) },
  { id: 'oil-soft', category: 'oil', kind: 'paint', defaultColor: '#D4A373', defaults: S({ size: 28, opacity: 0.95, flow: 0.75, hardness: 0.5, density: 0.8 }), params: { minSize: 0.5, grain: 0.3, bristles: 34, spread: 0.85, stiffness: 0.25, mix: 0.4, impasto: 0.35, flat: 0.2, spacing: 0.05 }, dynamics: D({ speedThin: 0.45, tail: 0.5 }) },
  { id: 'oil-knife', category: 'oil', kind: 'knife', defaultColor: '#F2E8CF', defaults: S({ size: 44, opacity: 1, flow: 0.95, hardness: 1, density: 1 }), params: { minSize: 0.9, grain: 0.6, mix: 0.45, impasto: 0.9, spacing: 0.05 }, dynamics: D({ speedThin: 0.2, tail: 0 }) },

  // ── Ink (水墨) ────────────────────────────────────────────────────────────
  { id: 'ink-large', category: 'ink', kind: 'ink', defaultColor: INK, defaults: S({ size: 46, opacity: 1, flow: 0.8, hardness: 0.6, water: 0.35, density: 0.9 }), params: { minSize: 0.15, grain: 0.7, bristles: 44, spread: 1, stiffness: 0.55, absorb: 0.8, spacing: 0.05 }, dynamics: D({ speedThin: 0.75, dwellGain: 0.9, dwellMax: 0.5, attackMs: 90, tail: 0.9 }) },
  { id: 'ink-small', category: 'ink', kind: 'ink', defaultColor: INK, defaults: S({ size: 14, opacity: 1, flow: 0.85, hardness: 0.7, water: 0.25, density: 0.95 }), params: { minSize: 0.2, grain: 0.6, bristles: 20, spread: 1, stiffness: 0.65, absorb: 0.6, spacing: 0.06 }, dynamics: D({ speedThin: 0.7, attackMs: 70, tail: 0.9 }) },
  { id: 'ink-wolf', category: 'ink', kind: 'ink', defaultColor: INK, defaults: S({ size: 22, opacity: 1, flow: 0.8, hardness: 0.85, water: 0.2, density: 0.95 }), params: { minSize: 0.1, grain: 0.8, bristles: 26, spread: 0.85, stiffness: 0.9, absorb: 0.45, spacing: 0.05 }, dynamics: D({ speedThin: 0.8, attackMs: 50, tail: 1 }) },
  { id: 'ink-goat', category: 'ink', kind: 'ink', defaultColor: INK, defaults: S({ size: 34, opacity: 1, flow: 0.75, hardness: 0.35, water: 0.55, density: 0.75 }), params: { minSize: 0.3, grain: 0.5, bristles: 40, spread: 1.2, stiffness: 0.2, absorb: 1, spacing: 0.05 }, dynamics: D({ speedThin: 0.55, dwellGain: 1, dwellMax: 0.6, attackMs: 110, tail: 0.6 }) },
  { id: 'ink-water', category: 'ink', kind: 'water', defaults: S({ size: 36, opacity: 0.5, flow: 0.45, hardness: 0.3, water: 1, density: 0 }), params: { minSize: 0.4, grain: 0.3, spacing: 0.1 }, dynamics: D({ tail: 0 }) },
];

export const brushById = (id: string) => BRUSHES.find((b) => b.id === id) ?? BRUSHES[1];
export const CATEGORY_ORDER: MediumCategory[] = ['sketch', 'watercolor', 'acrylic', 'oil', 'ink'];
export const FIRST_BRUSH: Record<MediumCategory, string> = {
  sketch: 'pencil-hb', watercolor: 'wc-round', acrylic: 'ac-flat', oil: 'oil-hog', ink: 'ink-large',
};
export const usesWater = (kind: RendererKind) => kind === 'watercolor' || kind === 'water' || kind === 'ink' || kind === 'sponge';
export const usesDensity = (kind: RendererKind) => kind !== 'erase' && kind !== 'smudge' && kind !== 'water';
