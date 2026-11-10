import type { LayerModel, LayerOp } from '../types';
import type { PaintingEngine } from '../engine/PaintingEngine';
import { LayerRaster } from '../layers/LayerRaster';
import { StrokeSession } from '../strokes/StrokeSession';
import { createCanvas, ctx2d, type Canvas2D } from '../engine/canvas';
import type { RenderEnv } from '../brushes/renderer';

export interface ScheduledOp { layerId: string; op: LayerOp; start: number; dur: number }

/** Builds the playback schedule. Idle pauses longer than `maxGap` are compressed. */
export function buildSchedule(timeline: { layerId: string; op: LayerOp }[], maxGap = 350): { items: ScheduledOp[]; total: number } {
  const items: ScheduledOp[] = [];
  let t = 0;
  let prevEnd: number | null = null;
  for (const { layerId, op } of timeline) {
    const dur = op.type === 'stroke' ? Math.max(24, op.points.length ? op.points[op.points.length - 1].t : 0) : 250;
    if (prevEnd !== null) t += Math.min(maxGap, Math.max(40, op.time - prevEnd));
    items.push({ layerId, op, start: t, dur });
    t += dur;
    prevEnd = op.time + dur;
  }
  return { items, total: t };
}

/**
 * Re-paints the artwork stroke by stroke from the recorded stroke data — every point keeps
 * its timing, pressure and dwell, so the replay shows the actual process, not a fake wipe.
 */
export class ReplayPlayer {
  readonly items: ScheduledOp[];
  readonly total: number;
  readonly output: Canvas2D;
  private outCtx: CanvasRenderingContext2D;
  private layers: LayerModel[];
  private rasters = new Map<string, LayerRaster>();
  private buffer: Canvas2D;
  private bufferCtx: CanvasRenderingContext2D;
  private cursor = 0;          // index of the op in progress
  private session: StrokeSession | null = null;
  private time = 0;
  private scale: number;

  constructor(private engine: PaintingEngine, maxSide = 1280) {
    const sched = buildSchedule(engine.timeline());
    this.items = sched.items;
    this.total = sched.total;
    this.layers = engine.layers.map((l) => ({ ...l }));
    this.scale = Math.min(1, maxSide / Math.max(engine.width, engine.height));
    this.output = createCanvas(engine.width * this.scale, engine.height * this.scale);
    this.outCtx = ctx2d(this.output);
    this.buffer = createCanvas(engine.width, engine.height);
    this.bufferCtx = ctx2d(this.buffer, true);
    this.reset();
  }

  get currentTime() { return this.time; }
  get progress() { return this.total ? this.time / this.total : 1; }
  get strokeIndex() { return this.cursor; }

  private env(layerId: string): RenderEnv {
    const r = this.rasters.get(layerId)!;
    return { layer: r.canvas, layerCtx: r.ctx, buffer: this.buffer, bufferCtx: this.bufferCtx, surface: this.engine.surface, wet: r.wet, width: this.engine.width, height: this.engine.height };
  }

  reset() {
    this.rasters.clear();
    for (const l of this.layers) this.rasters.set(l.id, new LayerRaster(this.engine.width, this.engine.height));
    this.bufferCtx.clearRect(0, 0, this.buffer.width, this.buffer.height);
    this.cursor = 0;
    this.session = null;
    this.time = 0;
    this.draw();
  }

  /** Advance (or rewind) playback to virtual time `t` ms and redraw the output. */
  seek(t: number) {
    t = Math.max(0, Math.min(this.total, t));
    if (t < this.time) this.reset();
    while (this.cursor < this.items.length) {
      const it = this.items[this.cursor];
      if (t < it.start) break;
      if (it.op.type === 'clear') {
        const env = this.env(it.layerId);
        env.layerCtx.clearRect(0, 0, env.width, env.height);
        env.wet.clear();
        this.cursor++;
        continue;
      }
      const stroke = it.op;
      if (!this.session) this.session = new StrokeSession(stroke, this.env(it.layerId));
      const local = t - it.start;
      if (local >= it.dur) {
        this.session.finish();
        this.session = null;
        this.cursor++;
        continue;
      }
      let n = this.session.fedCount;
      while (n < stroke.points.length && stroke.points[n].t <= local) n++;
      this.session.feedUntil(n);
      break;
    }
    this.time = t;
    this.draw();
  }

  get done() { return this.cursor >= this.items.length; }

  private draw() {
    const ctx = this.outCtx, W = this.output.width, H = this.output.height;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.engine.paper, 0, 0, W, H);
    const activeLayer = this.session ? this.items[this.cursor].layerId : null;
    for (const l of this.layers) {
      if (!l.visible) continue;
      ctx.globalAlpha = l.opacity;
      ctx.drawImage(this.rasters.get(l.id)!.canvas, 0, 0, W, H);
      if (activeLayer === l.id && this.session?.renderer.usesBuffer) {
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(this.buffer, 0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.globalAlpha = 1;
  }
}
