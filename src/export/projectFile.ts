import type { PaintingEngine } from '../painting/engine/PaintingEngine';
import { validateProject, type ProjectFile } from '../painting/engine/serialize';
import { blobToDataUrl, canvasToBlob, downloadBlob, safeName } from './download';

export const PROJECT_EXT = '.atelier.json';

/** Editable project: layers (PNG), every stroke, canvas & surface parameters, brush state. */
export async function buildProjectFile(engine: PaintingEngine, tool?: ProjectFile['tool']): Promise<ProjectFile> {
  return engine.toProject(async (_id, canvas) => blobToDataUrl(await canvasToBlob(canvas, 'image/png')), tool);
}

export async function exportProject(engine: PaintingEngine, tool?: ProjectFile['tool']) {
  const p = await buildProjectFile(engine, tool);
  const blob = new Blob([JSON.stringify(p)], { type: 'application/json' });
  downloadBlob(blob, `${safeName(engine.meta.name)}${PROJECT_EXT}`);
}

export async function parseProjectFile(file: File | Blob): Promise<ProjectFile> {
  const text = await file.text();
  let json: unknown;
  try { json = JSON.parse(text); } catch { throw new Error('invalid-json'); }
  const v = validateProject(json);
  if (!v.ok) throw new Error('invalid-project: ' + v.errors.slice(0, 5).join(', '));
  return v.project;
}
