import { activeBrushId, useApp } from '../../state/store';
import { getEngine } from '../../state/session';
import { zoomAt } from '../../input/pointer/viewTransform';
import { t } from '../../i18n';
import { Icon } from '../Icon';

export function BottomBar({ onBack }: { onBack: () => void }) {
  const s = useApp();
  const e = getEngine();
  if (!e) return null;
  const zoom = (f: number) => {
    const vp = document.querySelector('.viewport') as HTMLElement;
    s.set({ view: zoomAt(s.view, vp.clientWidth / 2, vp.clientHeight / 2, s.view.scale * f) });
  };
  return (
    <footer className="bottombar">
      <button className="btn sm" onClick={onBack} data-testid="back-studio"><Icon name="home" size={16} />{t('bar.back')}</button>
      <span className="sep" />
      <input className="text-in" style={{ width: 150, height: 28 }} aria-label={t('setup.name')} defaultValue={e.meta.name} key={e.meta.id}
        onBlur={(ev) => { const v = ev.target.value.trim(); if (v && v !== e.meta.name) { e.meta.name = v; e.revision++; s.bump(); window.dispatchEvent(new Event('atelier:save')); } }} />
      <span title={e.surface.def.id}>{t(`surface.${e.surface.def.id}`)} · {e.width}×{e.height}</span>
      <span>{t(`brush.${activeBrushId(s)}`)}</span>
      <span className="sep" />
      <span className="zoom-ctl">
        <button onClick={() => zoom(1 / 1.25)} aria-label="zoom out">−</button>
        <span data-testid="zoom-label" style={{ minWidth: 44, textAlign: 'center' }}>{Math.round(s.view.scale * 100)}%</span>
        <button onClick={() => zoom(1.25)} aria-label="zoom in">＋</button>
        <button onClick={() => window.dispatchEvent(new Event('atelier:fit'))} title={t('tool.fit')} aria-label={t('tool.fit')}><Icon name="fit" size={14} /></button>
      </span>
      <span className="sep" />
      <span data-testid="save-status"><span className={`status-dot ${s.saveStatus}`} />{t(`bar.${s.saveStatus}`)}</span>
      <span>{t('bar.strokes')} {e.strokeCount}</span>
      <div className="grow" />
      <button className="btn sm" onClick={() => s.set({ overlay: 'replay', replayId: null })} data-testid="open-replay"><Icon name="replay" size={16} />{t('bar.replay')}</button>
      <button className="btn sm primary" onClick={() => s.set({ overlay: 'export' })} data-testid="open-export"><Icon name="export" size={16} />{t('bar.export')}</button>
    </footer>
  );
}
