import { del, get, getAll, putBoth, STORE_DATA, STORE_META } from './db';
import type { ProjectFile } from '../painting/engine/serialize';
import { uid } from '../painting/math';

export interface ArtworkMeta {
  id: string;
  name: string;
  created: number;
  updated: number;
  width: number;
  height: number;
  surfaceId: string;
  brushId?: string;
  strokes: number;
  thumbnail: string;  // small JPEG data URL for the gallery
  preview?: string;   // larger JPEG data URL shown on the 3D easel
}

export interface StoredProject { id: string; project: ProjectFile }

const LAST_KEY = 'atelier:last-artwork';

export async function saveArtwork(meta: ArtworkMeta, project: ProjectFile) {
  await putBoth(meta, { id: meta.id, project } satisfies StoredProject);
  try { localStorage.setItem(LAST_KEY, meta.id); } catch { /* private mode */ }
}

export async function listArtworks(): Promise<ArtworkMeta[]> {
  const all = await getAll<ArtworkMeta>(STORE_META);
  return all.sort((a, b) => b.updated - a.updated);
}

export async function loadProject(id: string): Promise<ProjectFile | undefined> {
  return (await get<StoredProject>(STORE_DATA, id))?.project;
}
export const loadMeta = (id: string) => get<ArtworkMeta>(STORE_META, id);

export async function deleteArtwork(id: string) {
  await del(id);
  try { if (localStorage.getItem(LAST_KEY) === id) localStorage.removeItem(LAST_KEY); } catch { /* ignore */ }
}

export async function duplicateArtwork(id: string, copySuffix: string): Promise<string | null> {
  const [meta, project] = await Promise.all([loadMeta(id), loadProject(id)]);
  if (!meta || !project) return null;
  const nid = uid('art');
  const now = Date.now();
  const name = `${meta.name}${copySuffix}`;
  await putBoth(
    { ...meta, id: nid, name, created: now, updated: now },
    { id: nid, project: { ...project, meta: { ...project.meta, id: nid, name, created: now, updated: now } } },
  );
  return nid;
}

export async function lastArtworkId(): Promise<string | null> {
  try {
    const id = localStorage.getItem(LAST_KEY);
    if (id && (await loadMeta(id))) return id;
  } catch { /* ignore */ }
  const list = await listArtworks();
  return list[0]?.id ?? null;
}
