/**
 * Core data model of an ATELIER artwork. Everything a stroke needs to be re-rendered
 * deterministically lives in the Stroke record, which also powers process replay.
 */
export type RendererKind =
  | 'graphite' | 'smudge' | 'erase'
  | 'watercolor' | 'water' | 'sponge'
  | 'ink' | 'paint' | 'knife';

export type MediumCategory = 'sketch' | 'watercolor' | 'acrylic' | 'oil' | 'ink';
export type PressureMode = 'auto' | 'fixed' | 'dynamic' | 'pen';

export interface BrushSettings {
  size: number;       // diameter in canvas px
  opacity: number;    // 0..1 max opacity
  flow: number;       // 0..1 paint deposited per dab
  hardness: number;   // 0..1 edge hardness
  smoothing: number;  // 0..1 stroke stabiliser
  water: number;      // 0..1 water load (wet media)
  density: number;    // 0..1 pigment / ink concentration
}

/** One processed input sample. p = effective pressure (real or simulated), d = dwell ms. */
export interface StrokePoint {
  x: number; y: number;
  p: number;
  tx: number; ty: number; // tilt normalised -1..1
  t: number;              // ms since stroke start
  d: number;              // accumulated dwell (ms) at this position
}

export interface Stroke {
  type: 'stroke';
  id: string;
  seq: number;          // global order inside the document
  time: number;         // document clock (ms of painting time) at stroke start
  layerId: string;
  brushId: string;
  kind: RendererKind;
  settings: BrushSettings;
  color: string;        // #RRGGBB
  seed: number;
  pressureSource: 'fixed' | 'simulated' | 'pen';
  points: StrokePoint[];
}

export interface ClearOp { type: 'clear'; id: string; seq: number; time: number; layerId: string }
export type LayerOp = Stroke | ClearOp;

export interface LayerModel {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  ops: LayerOp[];
}

export interface SurfaceSettings {
  id: string;            // surface catalog id
  paperColor: string;
  textureStrength: number; // 0..1.5
  absorbency: number;      // 0..1
  seed: number;
}

export interface DocMeta {
  id: string;
  name: string;
  width: number;
  height: number;
  sizePreset: string;
  surface: SurfaceSettings;
  created: number;
  updated: number;
  elapsed: number;   // accumulated painting time in ms (document clock)
  seq: number;       // next op sequence number
}
