import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useApp } from '../../state/store';
import { lastArtworkId, loadMeta, type ArtworkMeta } from '../../storage/artworks';
import { StudioStatic } from './StudioStatic';
import { openArtwork } from '../Gallery';
import { t } from '../../i18n';
import { Icon } from '../Icon';

const StudioScene = lazy(() => import('../../scenes/StudioScene/StudioScene'));

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
export function prefersLite() {
  const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency ?? 8;
  return coarse || cores <= 4;
}

/** Scene 01 — the studio. Shows the latest artwork on the easel. */
export function StudioHome({ onStart }: { onStart: () => void }) {
  const set = useApp((s) => s.set);
  const lite = useApp((s) => s.lite);
  const [last, setLast] = useState<ArtworkMeta | null>(null);
  const [entering, setEntering] = useState(false);
  const [mode, setMode] = useState<'3d' | 'static'>(() => (hasWebGL() ? '3d' : 'static'));
  const [ready, setReady] = useState(false);
  const engineId = useApp((s) => s.engineId);

  useEffect(() => {
    lastArtworkId().then((id) => (id ? loadMeta(id) : undefined)).then((m) => setLast(m ?? null)).catch(() => setLast(null));
    const tm = setTimeout(() => setReady(true), 60);
    return () => clearTimeout(tm);
  }, [engineId]);

  const aspect = last ? last.width / last.height : 0.72;
  const enter = () => { if (mode === 'static') onStart(); else setEntering(true); };
  const scene = useMemo(() => mode, [mode]);

  return (
    <div className="studio" data-testid="studio-home">
      {scene === '3d' ? (
        <Suspense fallback={<StudioStatic preview={last?.preview} aspect={aspect} onEaselClick={enter} />}>
          <StudioScene preview={last?.preview} aspect={aspect} lite={lite} entering={entering} onEaselClick={enter} onEntered={onStart} />
        </Suspense>
      ) : <StudioStatic preview={last?.preview} aspect={aspect} onEaselClick={enter} />}
      <div className="fade-black" style={{ opacity: !ready ? 1 : entering ? 0.85 : 0, transitionDuration: entering ? '1.1s' : '1.2s' }} />
      <div className="studio-ui" style={{ opacity: entering ? 0 : 1, transition: 'opacity .4s' }}>
        <div className="brand">
          <h1>ATELIER</h1>
          <div className="sub">Virtual Painting Studio · {t('app.tagline')}</div>
        </div>
        <div className="home-foot">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="studio-hint">{t('home.hint')}</div>
            <div className="home-menu">
              <button className="btn primary" onClick={enter} data-testid="home-start"><Icon name="brush" size={18} />{t('home.start')}</button>
              <button className="btn" disabled={!last} onClick={() => last && openArtwork(last.id)} data-testid="home-continue" title={last ? last.name : t('home.noRecent')}>
                <Icon name="open" size={18} />{t('home.continue')}{last ? `：${last.name}` : ''}
              </button>
              <button className="btn" onClick={() => set({ overlay: 'gallery' })} data-testid="home-gallery"><Icon name="copy" size={18} />{t('home.gallery')}</button>
              <button className="btn" onClick={() => set({ overlay: 'help' })} data-testid="home-help"><Icon name="help" size={18} />{t('home.help')}</button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
            <div className="home-menu">
              {hasWebGL() && <button className="btn sm" onClick={() => setMode(mode === '3d' ? 'static' : '3d')}>{mode === '3d' ? '靜態畫室' : t('home.full')}</button>}
              {mode === '3d' && <button className="btn sm" onClick={() => set({ lite: !lite })}>{t('home.lite')}：{lite ? t('common.on') : t('common.off')}</button>}
            </div>
            <p className="home-note">{t('home.storageNote')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
