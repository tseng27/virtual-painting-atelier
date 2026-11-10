import type { PaintingEngine } from './PaintingEngine';
import { loadImage } from './PaintingEngine';

export const IMPORT_MAX_BYTES = 30 * 1024 * 1024;

/**
 * Reads an image file and places it as a base layer (底圖). The picture is downscaled to the
 * canvas size first, so the stored project / undo / replay data stays reasonably small.
 */
export async function importImageFile(engine: PaintingEngine, file: File | Blob, opts: { opacity?: number; fit?: 'contain' | 'cover' } = {}) {
  if (!file.type.startsWith('image/')) throw new Error('not-image');
  if (file.size > IMPORT_MAX_BYTES) throw new Error('too-large');
  const bitmap = await loadImage(file);
  const nw = (bitmap as ImageBitmap).width, nh = (bitmap as ImageBitmap).height;
  if (!nw || !nh) throw new Error('decode');
  const fit = opts.fit ?? 'contain';
  const s = Math.min(1, fit === 'contain' ? Math.min(engine.width / nw, engine.height / nh) : Math.max(engine.width / nw, engine.height / nh));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(nw * s));
  c.height = Math.max(1, Math.round(nh * s));
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, c.width, c.height);
  const keepAlpha = file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/gif' || file.type === 'image/svg+xml';
  const src = c.toDataURL(keepAlpha ? 'image/png' : 'image/jpeg', 0.9);
  const name = 'name' in file && typeof (file as File).name === 'string' ? `底圖 · ${(file as File).name.replace(/\.[^.]+$/, '').slice(0, 24)}` : '底圖';
  return engine.importBaseImage(src, c, { w: nw, h: nh }, { name, opacity: opts.opacity, fit });
}
