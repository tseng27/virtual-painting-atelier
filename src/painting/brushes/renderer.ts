import type { Stroke } from '../types';
import type { Dab } from '../strokes/stamper';
import type { SurfaceRuntime } from '../surfaces/SurfaceRuntime';
import type { WetMap } from '../engine/WetMap';
import type { Canvas2D, Ctx2D } from '../engine/canvas';
import type { BrushPreset } from './presets';

export interface RenderEnv {
  layer: Canvas2D;
  layerCtx: Ctx2D;
  buffer: Canvas2D;      // shared stroke buffer (same size as the document)
  bufferCtx: Ctx2D;
  surface: SurfaceRuntime;
  wet: WetMap;
  width: number;
  height: number;
}

/**
 * A StrokeRenderer turns dabs into pigment for one stroke. Renderers are pure functions of
 * (stroke data, canvas state) + the stroke seed, which makes undo-by-replay and process
 * playback reproduce the same marks.
 */
export interface StrokeRenderer {
  /** true → marks accumulate in env.buffer and are composited on end() */
  readonly usesBuffer: boolean;
  /** CSS blend used for the live preview of the buffer */
  readonly previewBlend: 'multiply' | 'normal';
  begin(stroke: Stroke, preset: BrushPreset, env: RenderEnv): void;
  dabs(dabs: Dab[]): void;
  end(): void;
}
