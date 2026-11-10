import type { DocMeta, LayerOp, Stroke, StrokePoint, RendererKind } from '../types';

export const PROJECT_FORMAT = 'atelier-project';
export const PROJECT_VERSION = 1;
const PT_FIELDS = 7; // x y p tx ty t d

export type SerializedStroke = Omit<Stroke, 'points'> & { pts: number[] };
export type SerializedOp = SerializedStroke | Extract<LayerOp, { type: 'clear' }> | Extract<LayerOp, { type: 'image' }>;

export interface SerializedLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  /** PNG of the layer pixels — a data URL in files, may be a Blob inside IndexedDB */
  raster: string | Blob | null;
  ops: SerializedOp[];
}

export interface ProjectFile {
  format: typeof PROJECT_FORMAT;
  version: number;
  app: 'ATELIER';
  meta: DocMeta;
  activeLayerId: string;
  layers: SerializedLayer[];
  tool?: { brushId: string; color: string };
}

const r2 = (v: number) => Math.round(v * 100) / 100;

export function packPoints(points: StrokePoint[]): number[] {
  const out: number[] = new Array(points.length * PT_FIELDS);
  points.forEach((p, i) => {
    const k = i * PT_FIELDS;
    out[k] = r2(p.x); out[k + 1] = r2(p.y); out[k + 2] = Math.round(p.p * 1000) / 1000;
    out[k + 3] = r2(p.tx); out[k + 4] = r2(p.ty); out[k + 5] = Math.round(p.t); out[k + 6] = Math.round(p.d);
  });
  return out;
}

export function unpackPoints(pts: number[]): StrokePoint[] {
  const out: StrokePoint[] = [];
  for (let k = 0; k + PT_FIELDS <= pts.length; k += PT_FIELDS)
    out.push({ x: pts[k], y: pts[k + 1], p: pts[k + 2], tx: pts[k + 3], ty: pts[k + 4], t: pts[k + 5], d: pts[k + 6] });
  return out;
}

export function serializeOp(op: LayerOp): SerializedOp {
  if (op.type === 'clear' || op.type === 'image') return { ...op };
  const { points, ...rest } = op;
  return { ...rest, settings: { ...rest.settings }, pts: packPoints(points) };
}

export function deserializeOp(op: SerializedOp): LayerOp {
  if (op.type === 'clear' || op.type === 'image') return { ...op };
  const { pts, ...rest } = op;
  return { ...rest, points: unpackPoints(pts) } as Stroke;
}

const KINDS: RendererKind[] = ['graphite', 'smudge', 'erase', 'watercolor', 'water', 'sponge', 'ink', 'paint', 'knife'];
const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown) => typeof v === 'string';

/** Validates an imported project file. Returns human-readable reasons on failure. */
export function validateProject(data: unknown): { ok: true; project: ProjectFile } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const d = data as Partial<ProjectFile> | null;
  if (!d || typeof d !== 'object') return { ok: false, errors: ['not an object'] };
  if (d.format !== PROJECT_FORMAT) errors.push('format');
  if (!isNum(d.version)) errors.push('version');
  else if ((d.version as number) > PROJECT_VERSION) errors.push(`version ${d.version} is newer than supported ${PROJECT_VERSION}`);
  const m = d.meta as DocMeta | undefined;
  if (!m || !isStr(m.id) || !isNum(m.width) || !isNum(m.height) || m.width < 16 || m.height < 16 || m.width > 8192 || m.height > 8192) errors.push('meta');
  if (m && (!m.surface || !isStr(m.surface.id) || !isNum(m.surface.seed))) errors.push('meta.surface');
  if (!Array.isArray(d.layers) || d.layers.length === 0) errors.push('layers');
  else d.layers.forEach((l, i) => {
    if (!isStr(l.id) || !isStr(l.name) || typeof l.visible !== 'boolean' || !isNum(l.opacity)) errors.push(`layers[${i}]`);
    if (!Array.isArray(l.ops)) errors.push(`layers[${i}].ops`);
    else l.ops.forEach((op, j) => {
      if (op.type === 'clear') { if (!isNum(op.seq)) errors.push(`layers[${i}].ops[${j}]`); return; }
      if (op.type === 'image') {
        if (!isNum(op.seq) || !isStr(op.src) || !op.src.startsWith('data:image/') || ![op.x, op.y, op.w, op.h].every(isNum)) errors.push(`layers[${i}].ops[${j}]`);
        return;
      }
      if (op.type !== 'stroke' || !KINDS.includes(op.kind) || !Array.isArray(op.pts) || op.pts.length % PT_FIELDS !== 0 || !isStr(op.color) || !isNum(op.seed))
        errors.push(`layers[${i}].ops[${j}]`);
    });
  });
  return errors.length ? { ok: false, errors } : { ok: true, project: d as ProjectFile };
}
