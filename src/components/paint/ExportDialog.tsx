import { useState } from 'react';
import { Modal } from '../Modal';
import { useApp } from '../../state/store';
import { getEngine } from '../../state/session';
import { exportImage } from '../../export/exportImage';
import { exportProject } from '../../export/projectFile';
import { t } from '../../i18n';
import { Icon } from '../Icon';

export function ExportDialog() {
  const set = useApp((s) => s.set);
  const brushId = useApp((s) => s.brushId);
  const color = useApp((s) => s.color);
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState(false);
  const e = getEngine();
  if (!e) return null;
  const run = async (fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); } finally { setBusy(false); } };
  return (
    <Modal title={t('export.title')} onClose={() => set({ overlay: null })} size="sm" testId="export-dialog">
      <div className="field">
        <span className="lbl">{t('export.scale')}</span>
        <div className="chips">
          {[0.5, 1, 2].map((s) => (
            <button key={s} className={`chip${scale === s ? ' sel' : ''}`} onClick={() => setScale(s)}>{s}× · {Math.round(e.width * s)}×{Math.round(e.height * s)}</button>
          ))}
        </div>
      </div>
      <div className="export-list">
        <div className="export-item"><span>{t('export.png')}</span><button className="btn sm" disabled={busy} data-testid="export-png" onClick={() => run(() => exportImage(e, 'png', scale))}><Icon name="export" size={16} />PNG</button></div>
        <div className="export-item"><span>{t('export.jpg')}</span><button className="btn sm" disabled={busy} data-testid="export-jpg" onClick={() => run(() => exportImage(e, 'jpg', scale))}><Icon name="export" size={16} />JPG</button></div>
        <div className="export-item"><span>{t('export.project')}</span><button className="btn sm" disabled={busy} data-testid="export-project" onClick={() => run(() => exportProject(e, { brushId, color }))}><Icon name="export" size={16} />.atelier.json</button></div>
        <div className="export-item"><span>{t('export.video')}</span><button className="btn sm" onClick={() => set({ overlay: 'replay', replayId: null })}><Icon name="video" size={16} />{t('replay.title')}</button></div>
      </div>
      <p className="notice" style={{ marginTop: 14 }}>{t('export.storageNote')}<br />{t('home.storageNote')}</p>
    </Modal>
  );
}
