import type { BrushSettings, DocMeta, ImageOp, LayerModel, LayerOp, Stroke, StrokePoint } from '../types';
import { SurfaceRuntime } from '../surfaces/SurfaceRuntime';
import { LayerRaster } from '../layers/LayerRaster';
import { History } from '../history/History';
import { StrokeSession } from '../strokes/StrokeSession';
import { brushById } from '../brushes/presets';
import { createCanvas, ctx2d, type Canvas2D } from './canvas';
import type { RenderEnv } from '../brushes/renderer';
import { uid } from '../math';
import { deserializeOp, serializeOp, type ProjectFile, PROJECT_FORMAT, PROJECT_VERSION, type SerializedLayer } from './serialize';

type LayerProps = Pick<LayerModel, 'name' | 'visible' | 'opacity'>;
export type HistoryEntry =
  | { kind: 'op'; layerId: string; op: LayerOp }
  | { kind: 'addLayer'; layer: LayerModel; raster: LayerRaster; index: number }
  | { kind: 'deleteLayer'; layer: LayerModel; raster: LayerRaster; index: number }
  | { kind: 'props'; layerId: string; before: LayerProps; after: LayerProps }
  | { kind: 'move'; layerId: string; from: number; to: number }
  | { kind: 'batch'; entries: HistoryEntry[] };

export interface StrokeStart {
  brushId: string;
  settings: BrushSettings;
  color: string;
  pressureSource: Stroke['pressureSource'];
}

export type EngineEvent = 'change' | 'layers' | 'stroke-preview';

/**
 * The painting engine. Owns the document model, layer rasters, the shared stroke buffer and
 * history. Independent of React: UI talks to it via methods + a tiny event emitter.
 */
export class PaintingEngine {
  meta: DocMeta;
  layers: LayerModel[] = [];
  readonly rasters = new Map<string, LayerRaster>();
  readonly surface: SurfaceRuntime;
  readonly paper: Canvas2D;
  readonly buffer: Canvas2D;
  readonly bufferCtx: CanvasRenderingContext2D;
  activeLayerId = '';
  readonly history = new History<HistoryEntry>(300);
  private session: StrokeSession | null = null;
  private current: Stroke | null = null;
  private listeners = new Map<EngineEvent, Set<() => void>>();
  private sessionStart = performance.now();
  private elapsedBase: number;
  /** decoded pictures for image ops (needed to re-render layers synchronously) */
  readonly images = new Map<string, CanvasImageSource>();
  /** increments on every content change (used for autosave) */
  revision = 0;

  constructor(meta: DocMeta, opts: { emptyLayer?: boolean } = {}) {
    this.meta = meta;
    this.elapsedBase = meta.elapsed;
    this.surface = new SurfaceRuntime(meta.surface);
    this.paper = createCanvas(meta.width, meta.height);
    this.surface.renderPaper(this.paper);
    this.buffer = createCanvas(meta.width, meta.height);
    this.bufferCtx = ctx2d(this.buffer, true);
    if (opts.emptyLayer !== false) {
      const l = this.makeLayer('圖層 1');
      this.layers.push(l);
      this.activeLayerId = l.id;
    }
  }

  // ── events ──────────────────────────────────────────────────────────────
  on(ev: EngineEvent, fn: () => void) {
    if (!this.listeners.has(ev)) this.listeners.set(ev, new Set());
    this.listeners.get(ev)!.add(fn);
    return () => this.listeners.get(ev)!.delete(fn);
  }
  private emit(ev: EngineEvent) { this.listeners.get(ev)?.forEach((f) => f()); }
  private changed(layersToo = false) {
    this.revision++;
    this.meta.updated = Date.now();
    if (layersToo) this.emit('layers');
    this.emit('change');
  }

  /** Document clock: painting session time (ms) used for wet/dry state and replay timing. */
  now() { return this.elapsedBase + (performance.now() - this.sessionStart); }
  syncElapsed() { this.meta.elapsed = Math.round(this.now()); }

  get width() { return this.meta.width; }
  get height() { return this.meta.height; }
  get activeLayer() { return this.layers.find((l) => l.id === this.activeLayerId) ?? this.layers[this.layers.length - 1]; }
  get isDrawing() { return !!this.session; }
  get currentStroke() { return this.current; }
  get currentRendererUsesBuffer() { return this.session?.renderer.usesBuffer ?? false; }
  get currentPreviewBlend() { return this.session?.renderer.previewBlend ?? 'normal'; }

  private makeLayer(name: string): LayerModel {
    const l: LayerModel = { id: uid('layer'), name, visible: true, opacity: 1, ops: [] };
    this.rasters.set(l.id, new LayerRaster(this.width, this.height));
    return l;
  }

  envFor(layerId: string): RenderEnv {
    const r = this.rasters.get(layerId)!;
    return { layer: r.canvas, layerCtx: r.ctx, buffer: this.buffer, bufferCtx: this.bufferCtx, surface: this.surface, wet: r.wet, width: this.width, height: this.height };
  }

  // ── strokes ─────────────────────────────────────────────────────────────
  beginStroke(start: StrokeStart, first: StrokePoint[]): Stroke | null {
    if (this.session) this.endStroke();
    const layer = this.activeLayer;
    if (!layer || !layer.visible) return null;
    const preset = brushById(start.brushId);
    const stroke: Stroke = {
      type: 'stroke', id: uid('s'), seq: this.meta.seq++, time: Math.round(this.now()), layerId: layer.id,
      brushId: preset.id, kind: preset.kind, settings: { ...start.settings }, color: start.color,
      seed: (Math.random() * 2 ** 31) | 0, pressureSource: start.pressureSource, points: [],
    };
    this.current = stroke;
    this.session = new StrokeSession(stroke, this.envFor(layer.id));
    this.addPoints(first);
    return stroke;
  }

  addPoints(points: StrokePoint[]) {
    if (!this.session || !this.current || !points.length) return;
    this.current.points.push(...points);
    this.session.feedUntil(this.current.points.length);
    this.emit('stroke-preview');
  }

  endStroke() {
    if (!this.session || !this.current) return;
    const stroke = this.current;
    this.session.finish();
    this.session = null;
    this.current = null;
    const layer = this.layers.find((l) => l.id === stroke.layerId);
    if (!layer) return;
    this.commitOp(layer, stroke);
    this.history.push({ kind: 'op', layerId: layer.id, op: stroke });
    this.emit('stroke-preview');
    this.changed();
  }

  cancelStroke() {
    if (!this.session || !this.current) return;
    const layerId = this.current.layerId;
    this.session = null;
    this.current = null;
    this.bufferCtx.clearRect(0, 0, this.width, this.height);
    this.meta.seq--;
    this.rerenderLayer(layerId);
    this.emit('stroke-preview');
  }

  private commitOp(layer: LayerModel, op: LayerOp) {
    layer.ops.push(op);
    const r = this.rasters.get(layer.id)!;
    r.version++;
    r.checkpoints.invalidateAfter(layer.ops.length);
    if (r.checkpoints.shouldCapture(layer.ops.length)) r.capture(layer.ops.length);
  }

  private applyOp(layerId: string, op: LayerOp) {
    const env = this.envFor(layerId);
    if (op.type === 'clear') { env.layerCtx.clearRect(0, 0, this.width, this.height); env.wet.clear(); return; }
    if (op.type === 'image') { drawImageOp(env.layerCtx, op, this.images.get(op.id)); return; }
    const s = new StrokeSession(op, env);
    s.finish();
  }

  /** Rebuilds a layer from its nearest checkpoint + subsequent ops. */
  rerenderLayer(layerId: string) {
    const layer = this.layers.find((l) => l.id === layerId);
    const r = this.rasters.get(layerId);
    if (!layer || !r) return;
    r.checkpoints.invalidateAfter(layer.ops.length);
    const cp = r.checkpoints.nearest(layer.ops.length)!;
    r.restore(cp);
    for (let i = cp.opIndex; i < layer.ops.length; i++) this.applyOp(layerId, layer.ops[i]);
    r.version++;
  }

  clearLayer(layerId = this.activeLayerId) {
    const layer = this.layers.find((l) => l.id === layerId);
    if (!layer) return;
    const op: LayerOp = { type: 'clear', id: uid('c'), seq: this.meta.seq++, time: Math.round(this.now()), layerId };
    this.applyOp(layerId, op);
    this.commitOp(layer, op);
    this.history.push({ kind: 'op', layerId, op });
    this.changed();
  }

  /** 重設畫布: clears every layer as one undoable step */
  resetCanvas() {
    const entries: HistoryEntry[] = [];
    for (const layer of this.layers) {
      const op: LayerOp = { type: 'clear', id: uid('c'), seq: this.meta.seq++, time: Math.round(this.now()), layerId: layer.id };
      this.applyOp(layer.id, op);
      this.commitOp(layer, op);
      entries.push({ kind: 'op', layerId: layer.id, op });
    }
    this.history.push({ kind: 'batch', entries });
    this.changed();
  }

  /**
   * Imports a picture as a base/reference layer (底圖): a new layer at the bottom of the stack,
   * semi-transparent so it can be traced over. One undoable step.
   */
  importBaseImage(src: string, img: CanvasImageSource, natural: { w: number; h: number }, opts: { name?: string; opacity?: number; fit?: 'contain' | 'cover' } = {}) {
    const fit = opts.fit ?? 'contain';
    const s = fit === 'contain' ? Math.min(this.width / natural.w, this.height / natural.h) : Math.max(this.width / natural.w, this.height / natural.h);
    const w = natural.w * s, h = natural.h * s;
    const layer = this.makeLayer(opts.name ?? '底圖');
    layer.opacity = opts.opacity ?? 0.6;
    this.layers.unshift(layer);
    const op: ImageOp = { type: 'image', id: uid('img'), seq: this.meta.seq++, time: Math.round(this.now()), layerId: layer.id, src, x: (this.width - w) / 2, y: (this.height - h) / 2, w, h };
    this.images.set(op.id, img);
    this.applyOp(layer.id, op);
    this.commitOp(layer, op);
    this.history.push({ kind: 'batch', entries: [
      { kind: 'addLayer', layer, raster: this.rasters.get(layer.id)!, index: 0 },
      { kind: 'op', layerId: layer.id, op },
    ] });
    this.changed(true);
    return layer;
  }

  // ── layers ──────────────────────────────────────────────────────────────
  addLayer(name?: string) {
    const layer = this.makeLayer(name ?? `圖層 ${this.layers.length + 1}`);
    const idx = this.layers.findIndex((l) => l.id === this.activeLayerId) + 1 || this.layers.length;
    this.layers.splice(idx, 0, layer);
    this.activeLayerId = layer.id;
    this.history.push({ kind: 'addLayer', layer, raster: this.rasters.get(layer.id)!, index: idx });
    this.changed(true);
    return layer;
  }

  deleteLayer(id: string) {
    if (this.layers.length <= 1) return false;
    const index = this.layers.findIndex((l) => l.id === id);
    if (index < 0) return false;
    const [layer] = this.layers.splice(index, 1);
    const raster = this.rasters.get(id)!;
    this.rasters.delete(id);
    if (this.activeLayerId === id) this.activeLayerId = this.layers[Math.max(0, index - 1)].id;
    this.history.push({ kind: 'deleteLayer', layer, raster, index });
    this.changed(true);
    return true;
  }

  setLayerProps(id: string, props: Partial<LayerProps>, record = true) {
    const l = this.layers.find((x) => x.id === id);
    if (!l) return;
    const before = { name: l.name, visible: l.visible, opacity: l.opacity };
    Object.assign(l, props);
    if (record) this.history.push({ kind: 'props', layerId: id, before, after: { name: l.name, visible: l.visible, opacity: l.opacity } });
    this.changed(true);
  }

  moveLayer(id: string, delta: number) {
    const from = this.layers.findIndex((l) => l.id === id);
    const to = Math.max(0, Math.min(this.layers.length - 1, from + delta));
    if (from < 0 || from === to) return;
    const [l] = this.layers.splice(from, 1);
    this.layers.splice(to, 0, l);
    this.history.push({ kind: 'move', layerId: id, from, to });
    this.changed(true);
  }

  setActiveLayer(id: string) { if (this.rasters.has(id)) { this.activeLayerId = id; this.emit('layers'); } }

  // ── undo / redo ─────────────────────────────────────────────────────────
  get canUndo() { return this.history.canUndo; }
  get canRedo() { return this.history.canRedo; }

  undo() {
    if (this.session) this.endStroke();
    const e = this.history.undo();
    if (!e) return;
    this.revert(e);
    this.changed(true);
  }
  redo() {
    if (this.session) this.endStroke();
    const e = this.history.redo();
    if (!e) return;
    this.reapply(e);
    this.changed(true);
  }

  private revert(e: HistoryEntry) {
    switch (e.kind) {
      case 'op': {
        const layer = this.layers.find((l) => l.id === e.layerId);
        if (!layer) return;
        const idx = layer.ops.lastIndexOf(e.op);
        if (idx >= 0) layer.ops.splice(idx, 1);
        this.rerenderLayer(layer.id);
        break;
      }
      case 'addLayer': {
        this.layers = this.layers.filter((l) => l.id !== e.layer.id);
        this.rasters.delete(e.layer.id);
        if (this.activeLayerId === e.layer.id) this.activeLayerId = this.layers[Math.max(0, e.index - 1)].id;
        break;
      }
      case 'deleteLayer': {
        this.layers.splice(e.index, 0, e.layer);
        this.rasters.set(e.layer.id, e.raster);
        this.activeLayerId = e.layer.id;
        break;
      }
      case 'props': { const l = this.layers.find((x) => x.id === e.layerId); if (l) Object.assign(l, e.before); break; }
      case 'move': {
        const i = this.layers.findIndex((l) => l.id === e.layerId);
        const [l] = this.layers.splice(i, 1);
        this.layers.splice(e.from, 0, l);
        break;
      }
      case 'batch': [...e.entries].reverse().forEach((x) => this.revert(x)); break;
    }
  }

  private reapply(e: HistoryEntry) {
    switch (e.kind) {
      case 'op': {
        const layer = this.layers.find((l) => l.id === e.layerId);
        if (!layer) return;
        if (layer.ops.includes(e.op)) return;
        this.applyOp(layer.id, e.op);
        this.commitOp(layer, e.op);
        break;
      }
      case 'addLayer': {
        this.layers.splice(e.index, 0, e.layer);
        this.rasters.set(e.layer.id, e.raster);
        this.activeLayerId = e.layer.id;
        break;
      }
      case 'deleteLayer': {
        this.layers = this.layers.filter((l) => l.id !== e.layer.id);
        this.rasters.delete(e.layer.id);
        if (this.activeLayerId === e.layer.id) this.activeLayerId = this.layers[Math.max(0, e.index - 1)].id;
        break;
      }
      case 'props': { const l = this.layers.find((x) => x.id === e.layerId); if (l) Object.assign(l, e.after); break; }
      case 'move': {
        const i = this.layers.findIndex((l) => l.id === e.layerId);
        const [l] = this.layers.splice(i, 1);
        this.layers.splice(e.to, 0, l);
        break;
      }
      case 'batch': e.entries.forEach((x) => this.reapply(x)); break;
    }
  }

  // ── output ──────────────────────────────────────────────────────────────
  /** Flattens paper + visible layers at `scale` onto a new canvas. */
  composite(scale = 1, withPaper = true): Canvas2D {
    const out = createCanvas(this.width * scale, this.height * scale);
    const ctx = ctx2d(out);
    ctx.imageSmoothingQuality = 'high';
    if (withPaper) ctx.drawImage(this.paper, 0, 0, out.width, out.height);
    for (const l of this.layers) {
      if (!l.visible) continue;
      ctx.globalAlpha = l.opacity;
      ctx.drawImage(this.rasters.get(l.id)!.canvas, 0, 0, out.width, out.height);
    }
    ctx.globalAlpha = 1;
    return out;
  }

  /** Colour of the flattened artwork at canvas position (eyedropper). */
  pickColor(x: number, y: number): string {
    const c = createCanvas(1, 1);
    const ctx = ctx2d(c, true);
    ctx.drawImage(this.paper, x, y, 1, 1, 0, 0, 1, 1);
    for (const l of this.layers) {
      if (!l.visible) continue;
      ctx.globalAlpha = l.opacity;
      ctx.drawImage(this.rasters.get(l.id)!.canvas, x, y, 1, 1, 0, 0, 1, 1);
    }
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  /** All ops of the document in painting order (for process replay). */
  timeline(): { layerId: string; op: LayerOp }[] {
    const all: { layerId: string; op: LayerOp }[] = [];
    for (const l of this.layers) for (const op of l.ops) all.push({ layerId: l.id, op });
    return all.sort((a, b) => a.op.seq - b.op.seq);
  }

  get strokeCount() { return this.layers.reduce((n, l) => n + l.ops.filter((o) => o.type === 'stroke').length, 0); }

  // ── persistence ─────────────────────────────────────────────────────────
  async toProject(rasterFor: (layerId: string, canvas: Canvas2D, version: number) => Promise<string | Blob | null>, tool?: ProjectFile['tool']): Promise<ProjectFile> {
    this.syncElapsed();
    const layers: SerializedLayer[] = [];
    for (const l of this.layers) {
      const r = this.rasters.get(l.id)!;
      layers.push({ id: l.id, name: l.name, visible: l.visible, opacity: l.opacity, raster: await rasterFor(l.id, r.canvas, r.version), ops: l.ops.map(serializeOp) });
    }
    return { format: PROJECT_FORMAT, version: PROJECT_VERSION, app: 'ATELIER', meta: { ...this.meta, surface: { ...this.meta.surface } }, activeLayerId: this.activeLayerId, layers, tool };
  }

  /**
   * Restores a project. Layer pixels come from the saved raster when present (fast);
   * otherwise the layer is rebuilt by replaying its strokes.
   */
  static async fromProject(p: ProjectFile): Promise<PaintingEngine> {
    const e = new PaintingEngine({ ...p.meta, surface: { ...p.meta.surface } }, { emptyLayer: false });
    for (const sl of p.layers) {
      const layer: LayerModel = { id: sl.id, name: sl.name, visible: sl.visible, opacity: sl.opacity, ops: sl.ops.map(deserializeOp) };
      e.layers.push(layer);
      const r = new LayerRaster(e.width, e.height);
      e.rasters.set(layer.id, r);
      for (const op of layer.ops) if (op.type === 'image' && !e.images.has(op.id)) {
        try { e.images.set(op.id, await loadImage(op.src)); } catch { /* corrupt image: skipped */ }
      }
      let drawn = false;
      if (sl.raster) {
        try {
          const img = await loadImage(sl.raster);
          r.ctx.drawImage(img, 0, 0, e.width, e.height);
          drawn = true;
        } catch { drawn = false; }
      }
      if (!drawn) for (const op of layer.ops) e.applyOp(layer.id, op);
      r.setBase(layer.ops.length);
    }
    e.activeLayerId = e.layers.some((l) => l.id === p.activeLayerId) ? p.activeLayerId : e.layers[e.layers.length - 1].id;
    return e;
  }
}

async function loadImage(src: string | Blob): Promise<CanvasImageSource> {
  if (typeof src !== 'string') return await createImageBitmap(src);
  return await new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

export function drawImageOp(ctx: CanvasRenderingContext2D, op: ImageOp, img: CanvasImageSource | undefined) {
  if (!img) return;
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, op.x, op.y, op.w, op.h);
  ctx.restore();
}

export { loadImage };
