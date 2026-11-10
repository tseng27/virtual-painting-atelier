import type { PaintingEngine } from '../painting/engine/PaintingEngine';
import { canvasToBlob, downloadBlob, safeName } from './download';

export type ImageFormat = 'png' | 'jpg';

/** Flattens the artwork at the chosen output scale (independent of canvas resolution). */
export async function renderImage(engine: PaintingEngine, format: ImageFormat, scale = 1): Promise<Blob> {
  const c = engine.composite(scale, true);
  return format === 'png' ? canvasToBlob(c, 'image/png') : canvasToBlob(c, 'image/jpeg', 0.92);
}

export async function exportImage(engine: PaintingEngine, format: ImageFormat, scale = 1) {
  const blob = await renderImage(engine, format, scale);
  downloadBlob(blob, `${safeName(engine.meta.name)}.${format}`);
  return blob;
}
