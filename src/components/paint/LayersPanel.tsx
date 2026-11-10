import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../state/store';
import { getEngine } from '../../state/session';
import { Icon } from '../Icon';
import { t } from '../../i18n';
import type { LayerModel } from '../../painting/types';
import { importImageFile } from '../../painting/engine/importImage';

export async function importBase(file: File) {
  const e = getEngine();
  if (!e) return;
  const app = useApp.getState();
  try { await importImageFile(e, file); app.showToast(t('layers.imported')); } catch (err) { console.error(err); app.showToast(t('layers.importError')); }
}

function Thumb({ layerId, rev }: { layerId: string; rev: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const e = getEngine(); const c = ref.current;
    const r = e?.rasters.get(layerId);
    if (!e || !c || !r) return;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    const s = Math.min(c.width / e.width, c.height / e.height);
    const w = e.width * s, h = e.height * s;
    ctx.fillStyle = '#f2efe8'; ctx.fillRect((c.width - w) / 2, (c.height - h) / 2, w, h);
    ctx.drawImage(r.canvas, (c.width - w) / 2, (c.height - h) / 2, w, h);
  }, [layerId, rev]);
  return <canvas ref={ref} width={80} height={60} />;
}

export function LayersPanel() {
  const rev = useApp((s) => s.docRev);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const e = getEngine();
  if (!e) return null;
  const layers = [...e.layers].reverse(); // top first
  const active = e.activeLayer;
  const row = (l: LayerModel) => (
    <div key={l.id} className={`layer${l.id === active.id ? ' active' : ''}`} data-testid="layer-row" onClick={() => e.setActiveLayer(l.id)}>
      <button className="icon-btn" style={{ width: 28, height: 28 }} aria-label={t('layers.visible')} onClick={(ev) => { ev.stopPropagation(); e.setLayerProps(l.id, { visible: !l.visible }); }}>
        <Icon name={l.visible ? 'eye' : 'eyeOff'} size={16} />
      </button>
      <Thumb layerId={l.id} rev={rev} />
      <div className="lname" onDoubleClick={() => setEditing(l.id)}>
        {editing === l.id ? (
          <input className="text-in" autoFocus defaultValue={l.name} onBlur={(ev) => { e.setLayerProps(l.id, { name: ev.target.value.trim() || l.name }); setEditing(null); }}
            onKeyDown={(ev) => { if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur(); if (ev.key === 'Escape') setEditing(null); }} />
        ) : l.name}
      </div>
      <span className="op">{Math.round(l.opacity * 100)}%</span>
    </div>
  );
  return (
    <div className="panel">
      <div className="panel-h"><h5>{t('layers.title')}</h5><span className="small muted" data-testid="layer-count">{e.layers.length}</span></div>
      <div className="layers">{layers.map(row)}</div>
      <div className="slider" style={{ marginTop: 10 }}>
        <label>{t('layers.opacity')}</label><output>{Math.round(active.opacity * 100)}%</output>
        <input type="range" min={0} max={1} step={0.01} value={active.opacity} aria-label={t('layers.opacity')}
          onChange={(ev) => e.setLayerProps(active.id, { opacity: +ev.target.value }, false)}
          onPointerUp={(ev) => e.setLayerProps(active.id, { opacity: +(ev.target as HTMLInputElement).value })} />
      </div>
      <div className="layer-actions">
        <button className="icon-btn" title={t('layers.add')} aria-label={t('layers.add')} data-testid="layer-add" onClick={() => e.addLayer()}><Icon name="plus" /></button>
        <button className="icon-btn" title={t('layers.delete')} aria-label={t('layers.delete')} data-testid="layer-delete" disabled={e.layers.length <= 1} onClick={() => e.deleteLayer(active.id)}><Icon name="trash" /></button>
        <button className="icon-btn" title={t('layers.rename')} aria-label={t('layers.rename')} onClick={() => setEditing(active.id)}><Icon name="edit" /></button>
        <button className="icon-btn" title={t('layers.up')} aria-label={t('layers.up')} onClick={() => e.moveLayer(active.id, 1)}><Icon name="up" /></button>
        <button className="icon-btn" title={t('layers.down')} aria-label={t('layers.down')} onClick={() => e.moveLayer(active.id, -1)}><Icon name="down" /></button>
        <button className="icon-btn" title={t('layers.clear')} aria-label={t('layers.clear')} data-testid="layer-clear" onClick={() => setConfirmClear(true)}><Icon name="clear" /></button>
      </div>
      <button className="btn sm" style={{ width: '100%', marginTop: 8 }} data-testid="import-base" title={t('layers.importHint')} onClick={() => fileRef.current?.click()}>
        <Icon name="image" size={16} />{t('layers.importBase')}
      </button>
      <input ref={fileRef} type="file" accept="image/*" hidden data-testid="import-base-input" onChange={(ev) => { const f = ev.target.files?.[0]; if (f) void importBase(f); ev.target.value = ''; }} />
      {confirmClear && (
        <div style={{ marginTop: 8 }}>
          <p className="small" style={{ margin: '0 0 6px' }}>{t('layers.clearConfirm')}</p>
          <div className="row"><button className="btn sm danger" onClick={() => { e.clearLayer(active.id); setConfirmClear(false); }}>{t('common.confirm')}</button><button className="btn sm" onClick={() => setConfirmClear(false)}>{t('common.cancel')}</button></div>
        </div>
      )}
    </div>
  );
}
