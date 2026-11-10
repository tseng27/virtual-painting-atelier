import { PaintingEngine } from '../painting/engine/PaintingEngine';
import type { DocMeta } from '../painting/types';
import { useApp } from './store';
import { saveArtwork, type ArtworkMeta } from '../storage/artworks';
import { canvasToBlob } from '../export/download';
import type { ProjectFile } from '../painting/engine/serialize';

/**
 * Holds the single open PaintingEngine (outside React) and runs autosave to IndexedDB.
 * Layer rasters are stored as PNG blobs and only re-encoded when a layer changed.
 */
let engine: PaintingEngine | null = null;
let unsub: (() => void)[] = [];
let saveTimer: number | null = null;
let savedRevision = -1;
let saving: Promise<void> | null = null;
const blobCache = new Map<string, { version: number; blob: Blob }>();

export const getEngine = () => engine;

export function openEngine(e: PaintingEngine, alreadySaved = false) {
  closeEngine();
  engine = e;
  blobCache.clear();
  savedRevision = alreadySaved ? e.revision : -1;
  const app = useApp.getState();
  app.set({ engineId: e.meta.id, saveStatus: alreadySaved ? 'saved' : 'unsaved' });
  unsub = [
    e.on('change', () => { useApp.getState().bump(); scheduleSave(); }),
    e.on('layers', () => useApp.getState().bump()),
  ];
  if (!alreadySaved) scheduleSave(200);
  // diagnostic handle (used by the automated browser tests; exposes no private data)
  (window as unknown as { __atelier: unknown }).__atelier = { engine: e, saveNow };
}

export function closeEngine() {
  unsub.forEach((u) => u());
  unsub = [];
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  engine = null;
}

export function scheduleSave(delay = 1500) {
  if (!engine) return;
  useApp.getState().set({ saveStatus: 'unsaved' });
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => { saveNow(); }, delay);
}

export async function saveNow(): Promise<void> {
  if (!engine) return;
  if (saving) await saving;
  const e = engine;
  if (e.revision === savedRevision) { useApp.getState().set({ saveStatus: 'saved' }); return; }
  if (e.isDrawing) { scheduleSave(800); return; }
  const rev = e.revision;
  useApp.getState().set({ saveStatus: 'saving' });
  saving = (async () => {
    try {
      const s = useApp.getState();
      const project = await e.toProject(async (id, canvas, version) => {
        const c = blobCache.get(id);
        if (c && c.version === version) return c.blob;
        const blob = await canvasToBlob(canvas, 'image/png');
        blobCache.set(id, { version, blob });
        return blob;
      }, { brushId: s.brushId, color: s.color });
      const meta = await buildMeta(e, project);
      await saveArtwork(meta, project);
      savedRevision = rev;
      if (engine === e) useApp.getState().set({ saveStatus: e.revision === rev ? 'saved' : 'unsaved' });
    } catch (err) {
      console.error('autosave failed', err);
      useApp.getState().set({ saveStatus: 'error' });
    } finally {
      saving = null;
    }
  })();
  await saving;
}

async function buildMeta(e: PaintingEngine, project: ProjectFile): Promise<ArtworkMeta> {
  const thumb = e.composite(Math.min(1, 360 / Math.max(e.width, e.height)));
  const prev = e.composite(Math.min(1, 1024 / Math.max(e.width, e.height)));
  return {
    id: e.meta.id, name: e.meta.name, created: e.meta.created, updated: e.meta.updated,
    width: e.width, height: e.height, surfaceId: e.meta.surface.id, brushId: project.tool?.brushId,
    strokes: e.strokeCount,
    thumbnail: thumb.toDataURL('image/jpeg', 0.82),
    preview: prev.toDataURL('image/jpeg', 0.86),
  };
}

export function newDocMeta(p: Omit<DocMeta, 'created' | 'updated' | 'elapsed' | 'seq'>): DocMeta {
  const now = Date.now();
  return { ...p, created: now, updated: now, elapsed: 0, seq: 1 };
}

// best-effort flush when the tab is hidden or closed
if (typeof window !== 'undefined') {
  const flush = () => { if (engine && engine.revision !== savedRevision) void saveNow(); };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', (ev) => {
    if (engine && engine.revision !== savedRevision) { flush(); ev.preventDefault(); }
  });
}
