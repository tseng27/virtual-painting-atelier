import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { saveArtwork, listArtworks, loadProject, deleteArtwork, duplicateArtwork, lastArtworkId, type ArtworkMeta } from '../storage/artworks';
import { PROJECT_FORMAT, type ProjectFile } from '../painting/engine/serialize';

const meta = (id: string, updated: number): ArtworkMeta => ({ id, name: `作品 ${id}`, created: 1, updated, width: 100, height: 80, surfaceId: 'wc-cold', strokes: 1, thumbnail: 'data:,' });
const project = (id: string): ProjectFile => ({
  format: PROJECT_FORMAT, version: 1, app: 'ATELIER', activeLayerId: 'L',
  meta: { id, name: 'x', width: 100, height: 80, sizePreset: 'custom', surface: { id: 'wc-cold', paperColor: '#fff', textureStrength: 1, absorbency: 0.5, seed: 3 }, created: 1, updated: 1, elapsed: 0, seq: 2 },
  layers: [{ id: 'L', name: '圖層 1', visible: true, opacity: 0.8, raster: 'data:image/png;base64,AAAA', ops: [{ type: 'stroke', id: 's', seq: 1, time: 0, layerId: 'L', brushId: 'wc-round', kind: 'watercolor', settings: { size: 10, opacity: 1, flow: 1, hardness: 1, smoothing: 0, water: 0.5, density: 0.5 }, color: '#123456', seed: 1, pressureSource: 'simulated', pts: [1, 2, 0.5, 0, 0, 0, 0] }] }],
});

describe('IndexedDB artwork storage', () => {
  it('saves, lists newest first, reopens, duplicates and deletes', async () => {
    await saveArtwork(meta('a', 10), project('a'));
    await saveArtwork(meta('b', 20), project('b'));
    const list = await listArtworks();
    expect(list.map((m) => m.id)).toEqual(['b', 'a']);
    const p = await loadProject('a');
    expect(p?.layers[0].opacity).toBe(0.8);
    expect((p?.layers[0].ops[0] as { pts: number[] }).pts).toEqual([1, 2, 0.5, 0, 0, 0, 0]);
    expect(await lastArtworkId()).toBe('b');
    const copy = await duplicateArtwork('a', '（副本）');
    expect(copy).toBeTruthy();
    expect((await listArtworks()).find((m) => m.id === copy)?.name).toBe('作品 a（副本）');
    await deleteArtwork('a');
    expect(await loadProject('a')).toBeUndefined();
    expect((await listArtworks()).length).toBe(2);
  });
});
