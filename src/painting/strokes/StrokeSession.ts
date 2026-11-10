import type { Stroke, StrokePoint } from '../types';
import { brushById } from '../brushes/presets';
import { createRenderer } from '../brushes';
import type { RenderEnv, StrokeRenderer } from '../brushes/renderer';
import { Stamper } from './stamper';
import { lerp } from '../math';

/**
 * Drives one stroke through stamper → renderer. Used identically by live drawing,
 * undo/redo replay and process playback, which is what keeps them consistent.
 */
export class StrokeSession {
  readonly renderer: StrokeRenderer;
  private stamper: Stamper;
  private fed = 0;

  constructor(readonly stroke: Stroke, env: RenderEnv) {
    const preset = brushById(stroke.brushId);
    this.renderer = createRenderer(stroke.kind);
    const ratio = preset.params.spacing ?? 0.1;
    const size = stroke.settings.size;
    this.stamper = new Stamper((p) => Math.max(0.5, size * lerp(preset.params.minSize, 1, p) * ratio));
    this.renderer.begin(stroke, preset, env);
  }

  /** Feed points (they must also be appended to stroke.points by the caller if live). */
  add(points: StrokePoint[]) {
    if (!points.length) return;
    this.fed += points.length;
    this.renderer.dabs(this.stamper.add(points));
  }

  /** Feed stroke.points up to index `upto` (exclusive) — used by playback. */
  feedUntil(upto: number) {
    if (upto > this.fed) this.add(this.stroke.points.slice(this.fed, upto));
  }
  get fedCount() { return this.fed; }

  finish() {
    this.feedUntil(this.stroke.points.length);
    this.renderer.dabs(this.stamper.finish());
    this.renderer.end();
  }
}

export function renderStroke(stroke: Stroke, env: RenderEnv) {
  const s = new StrokeSession(stroke, env);
  s.finish();
}
