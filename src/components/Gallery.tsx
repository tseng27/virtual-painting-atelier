import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import { useApp } from '../state/store';
import { deleteArtwork, duplicateArtwork, listArtworks, loadMeta, loadProject, type ArtworkMeta } from '../storage/artworks';
import { parseProjectFile } from '../export/projectFile';
import { PaintingEngine } from '../painting/engine/PaintingEngine';
import { openEngine, saveNow } from '../state/session';
import { uid } from '../painting/math';
import { t } from '../i18n';
import { Icon } from './Icon';

export async function openArtwork(id: string) {
  const p = await loadProject(id);
  if (!p) return false;
  const e = await PaintingEngine.fromProject(p);
  openEngine(e, true);
  const app = useApp.getState();
  if (p.tool) app.set({ brushId: p.tool.brushId, color: p.tool.color });
  app.set({ tool: 'brush', screen: 'paint', overlay: null, focusMode: false, mediaOpen: false, colorOpen: false });
  return true;
}

export function Gallery({ onNew }: { onNew: () => void }) {
  const set = useApp((s) => s.set);
  const showToast = useApp((s) => s.showToast);
  const [items, setItems] = useState<ArtworkMeta[] | null>(null);
  const [confirm, setConfirm] = useState<ArtworkMeta | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const refresh = () => listArtworks().then(setItems).catch(() => setItems([]));
  useEffect(() => { refresh(); }, []);

  const importFile = async (f: File) => {
    try {
      const p = await parseProjectFile(f);
      if (await loadMeta(p.meta.id)) p.meta = { ...p.meta, id: uid('art') };
      const e = await PaintingEngine.fromProject(p);
      openEngine(e);
      await saveNow();
      await refresh();
      const app = useApp.getState();
      if (p.tool) app.set({ brushId: p.tool.brushId, color: p.tool.color });
      app.set({ screen: 'paint', overlay: null });
    } catch (err) {
      console.error(err);
      showToast(t('gallery.importError'));
    }
  };

  return (
    <Modal title={t('gallery.title')} onClose={() => set({ overlay: null })} testId="gallery">
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button className="btn sm primary" onClick={onNew}><Icon name="plus" size={16} />{t('gallery.new')}</button>
        <button className="btn sm" onClick={() => fileRef.current?.click()} data-testid="import-project"><Icon name="upload" size={16} />{t('gallery.import')}</button>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden data-testid="import-input" onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ''; }} />
      </div>
      <p className="notice" style={{ marginTop: 14 }}>{t('home.storageNote')}</p>
      {items && items.length === 0 && <p className="muted">{t('gallery.empty')}</p>}
      <div className="gallery-grid">
        {items?.map((m) => (
          <div className="art-card" key={m.id} data-testid="art-card">
            <div className="thumb" onClick={() => openArtwork(m.id)}><img src={m.thumbnail} alt={m.name} /></div>
            <div className="info">
              <div className="nm">{m.name}</div>
              <div className="small muted">{t(`surface.${m.surfaceId}`)} · {m.strokes} {t('bar.strokes')}</div>
              <div className="small muted">{t('gallery.updated')} {new Date(m.updated).toLocaleString('zh-TW', { dateStyle: 'medium', timeStyle: 'short' })}</div>
            </div>
            <div className="acts">
              <button className="btn sm" onClick={() => openArtwork(m.id)} data-testid="art-open"><Icon name="open" size={14} />{t('gallery.open')}</button>
              <button className="btn sm" onClick={() => set({ overlay: 'replay', replayId: m.id })}><Icon name="replay" size={14} />{t('gallery.replay')}</button>
              <button className="btn sm" onClick={async () => { await duplicateArtwork(m.id, t('gallery.copy')); refresh(); }} data-testid="art-duplicate"><Icon name="copy" size={14} />{t('gallery.duplicate')}</button>
              <button className="btn sm danger" onClick={() => setConfirm(m)} data-testid="art-delete"><Icon name="trash" size={14} />{t('gallery.delete')}</button>
            </div>
          </div>
        ))}
      </div>
      {confirm && (
        <Modal title={t('gallery.delete')} onClose={() => setConfirm(null)} size="sm">
          <p>{t('gallery.confirmDelete', { name: confirm.name })}</p>
          <div className="row"><button className="btn danger" data-testid="confirm-delete" onClick={async () => { await deleteArtwork(confirm.id); setConfirm(null); refresh(); }}>{t('gallery.delete')}</button>
            <button className="btn" onClick={() => setConfirm(null)}>{t('common.cancel')}</button></div>
        </Modal>
      )}
    </Modal>
  );
}
