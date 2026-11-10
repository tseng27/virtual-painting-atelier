import { create } from 'zustand';
import type { BrushSettings, MediumCategory, PressureMode } from '../painting/types';
import { BRUSHES, brushById } from '../painting/brushes/presets';
import type { ToolMode } from '../input/pointer/PointerController';
import type { View } from '../input/pointer/viewTransform';

export type Screen = 'studio' | 'setup' | 'paint';
export type Overlay = null | 'gallery' | 'help' | 'replay' | 'export';
export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

const defaultSettings = () => Object.fromEntries(BRUSHES.map((b) => [b.id, { ...b.defaults }])) as Record<string, BrushSettings>;

interface AppState {
  screen: Screen;
  overlay: Overlay;
  replayId: string | null;          // artwork to replay from the gallery (null = open doc)
  docRev: number;                   // bumps when engine content/layers change (re-render UI)
  engineId: string | null;

  tool: ToolMode;
  brushId: string;                  // current painting brush (never the eraser)
  settings: Record<string, BrushSettings>;
  color: string;
  bgColor: string;
  colorByCategory: Partial<Record<MediumCategory, string>>;
  pressureMode: PressureMode;
  dynamicsEnabled: boolean;
  pressureSource: string;

  view: View;
  focusMode: boolean;
  leftOpen: boolean;
  rightOpen: boolean;
  colorOpen: boolean;
  mediaOpen: boolean;
  saveStatus: SaveStatus;
  lite: boolean;
  toast: string | null;

  set: (p: Partial<AppState>) => void;
  setSetting: (k: keyof BrushSettings, v: number) => void;
  selectBrush: (id: string) => void;
  setColor: (c: string) => void;
  swapColors: () => void;
  bump: () => void;
  showToast: (s: string) => void;
}

export const useApp = create<AppState>((set, get) => ({
  screen: 'studio',
  overlay: null,
  replayId: null,
  docRev: 0,
  engineId: null,
  tool: 'brush',
  brushId: 'pencil-hb',
  settings: defaultSettings(),
  color: '#2E2E33',
  bgColor: '#F5F1E8',
  colorByCategory: {},
  pressureMode: 'auto',
  dynamicsEnabled: true,
  pressureSource: 'simulated',
  view: { scale: 1, tx: 0, ty: 0 },
  focusMode: false,
  leftOpen: true,
  rightOpen: true,
  colorOpen: false,
  mediaOpen: false,
  saveStatus: 'saved',
  lite: false,
  toast: null,

  set: (p) => set(p),
  setSetting: (k, v) => {
    const s = get();
    const id = s.tool === 'eraser' ? 'eraser' : s.brushId;
    set({ settings: { ...s.settings, [id]: { ...s.settings[id], [k]: v } } });
  },
  selectBrush: (id) => {
    if (id === 'eraser') return set({ tool: 'eraser' });
    const s = get();
    const prev = brushById(s.brushId), next = brushById(id);
    const colorByCategory = { ...s.colorByCategory, [prev.category]: s.color };
    // switching medium family restores the colour last used with it (or the medium's default)
    const color = prev.category === next.category ? s.color : colorByCategory[next.category] ?? next.defaultColor ?? s.color;
    set({ brushId: id, tool: 'brush', colorByCategory, color });
  },
  setColor: (c) => set({ color: c.toUpperCase() }),
  swapColors: () => set((s) => ({ color: s.bgColor, bgColor: s.color })),
  bump: () => set((s) => ({ docRev: s.docRev + 1 })),
  showToast: (toast) => { set({ toast }); setTimeout(() => { if (get().toast === toast) set({ toast: null }); }, 3200); },
}));

export const activeBrushId = (s: Pick<AppState, 'tool' | 'brushId'>) => (s.tool === 'eraser' ? 'eraser' : s.brushId);
