import { useMemo, useState } from 'react';
import { SURFACES, SIZE_PRESETS, MAX_CANVAS_SIDE, surfaceById, type SurfaceCategory } from '../../painting/surfaces/catalog';
import { CATEGORY_ORDER, FIRST_BRUSH, BRUSHES } from '../../painting/brushes/presets';
import type { MediumCategory, SurfaceSettings } from '../../painting/types';
import { PaintingEngine } from '../../painting/engine/PaintingEngine';
import { newDocMeta, openEngine } from '../../state/session';
import { useApp } from '../../state/store';
import { uid } from '../../painting/math';
import { t } from '../../i18n';
import { SurfaceSwatch, runtimeFor } from './SurfaceSwatch';
import { BrushPreview } from '../paint/BrushPreview';
import { Slider } from '../Slider';
import { Icon } from '../Icon';

const CATS: SurfaceCategory[] = ['sketch', 'watercolor', 'canvas', 'xuan'];

export function SetupScreen({ onBack }: { onBack: () => void }) {
  const [surfaceId, setSurfaceId] = useState('sketch-fine');
  const def = surfaceById(surfaceId);
  const [paperColor, setPaperColor] = useState(def.paperColor);
  const [texture, setTexture] = useState(1);
  const [absorb, setAbsorb] = useState(def.absorbency);
  const [size, setSize] = useState('A4');
  const [landscape, setLandscape] = useState(false);
  const [cw, setCw] = useState(1600);
  const [ch, setCh] = useState(1200);
  const [medium, setMedium] = useState<MediumCategory>('sketch');
  const [name, setName] = useState(t('setup.untitled'));
  const [seed] = useState(() => (Math.random() * 1e9) | 0);
  const app = useApp();

  const pickSurface = (id: string) => {
    const d = surfaceById(id);
    setSurfaceId(id); setPaperColor(d.paperColor); setAbsorb(d.absorbency);
    if (!d.recommended.includes(medium)) setMedium(d.recommended[0]);
  };
  const dims = useMemo(() => {
    if (size === 'custom') return { w: Math.max(64, Math.min(MAX_CANVAS_SIDE, cw)), h: Math.max(64, Math.min(MAX_CANVAS_SIDE, ch)) };
    const p = SIZE_PRESETS.find((s) => s.id === size)!;
    const isLandscape = p.w > p.h;
    const flip = size !== 'square' && landscape !== isLandscape;
    return flip ? { w: p.h, h: p.w } : { w: p.w, h: p.h };
  }, [size, landscape, cw, ch]);
  const surface: SurfaceSettings = { id: surfaceId, paperColor, textureStrength: texture, absorbency: absorb, seed };
  const pvScale = Math.min(380 / dims.w, 300 / dims.h);

  const begin = () => {
    const meta = newDocMeta({ id: uid('art'), name: name.trim() || t('setup.untitled'), width: Math.round(dims.w), height: Math.round(dims.h), sizePreset: size, surface });
    const engine = new PaintingEngine(meta);
    openEngine(engine);
    app.set({ brushId: FIRST_BRUSH[medium], tool: 'brush', color: BRUSHES.find((b) => b.id === FIRST_BRUSH[medium])?.defaultColor ?? '#2E2E33', colorByCategory: {}, focusMode: false, overlay: null, mediaOpen: false, colorOpen: false });
    app.set({ screen: 'paint' });
  };

  return (
    <div className="setup" data-testid="setup-screen">
      <div className="setup-inner">
        <div className="small muted serif" style={{ letterSpacing: '.3em' }}>ATELIER</div>
        <h2>{t('setup.title')}</h2>
        <h3>{t('setup.surface')}</h3>
        <div className="surface-cats">
          {CATS.map((cat) => (
            <div className="surface-cat" key={cat}>
              <h4>{t(`cat.${cat}`)}</h4>
              {SURFACES.filter((s) => s.category === cat).map((s) => (
                <button key={s.id} className={`surface-card${s.id === surfaceId ? ' sel' : ''}`} onClick={() => pickSurface(s.id)} data-testid={`surface-${s.id}`}>
                  <SurfaceSwatch settings={{ id: s.id, paperColor: s.paperColor, textureStrength: 1.2, absorbency: s.absorbency, seed: 11 }} w={112} h={112} />
                  <div><div className="nm">{t(`surface.${s.id}`)}</div><div className="ds">{t(`surfaceDesc.${s.id}`)}</div></div>
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="setup-grid">
          <div>
            <h3>{t('setup.size')}</h3>
            <div className="chips" style={{ marginBottom: 12 }}>
              {[...SIZE_PRESETS.map((s) => s.id), 'custom'].map((id) => (
                <button key={id} className={`chip${size === id ? ' sel' : ''}`} onClick={() => { setSize(id); const pr = SIZE_PRESETS.find((x) => x.id === id); if (pr) setLandscape(pr.w > pr.h); }} data-testid={`size-${id}`}>{t(`size.${id}`)}</button>
              ))}
            </div>
            {size === 'custom' ? (
              <div className="row" style={{ marginBottom: 12 }}>
                <label className="row small muted">{t('setup.width')}<input className="text-in" type="number" style={{ width: 90 }} value={cw} min={64} max={MAX_CANVAS_SIDE} onChange={(e) => setCw(+e.target.value)} /></label>
                <label className="row small muted">{t('setup.height')}<input className="text-in" type="number" style={{ width: 90 }} value={ch} min={64} max={MAX_CANVAS_SIDE} onChange={(e) => setCh(+e.target.value)} /></label>
                <span className="small muted">px（≤ {MAX_CANVAS_SIDE}）</span>
              </div>
            ) : size !== 'square' && (
              <div className="chips" style={{ marginBottom: 12 }}>
                <button className={`chip${!landscape ? ' sel' : ''}`} onClick={() => setLandscape(false)}>{t('setup.portrait')}</button>
                <button className={`chip${landscape ? ' sel' : ''}`} onClick={() => setLandscape(true)}>{t('setup.landscape')}</button>
              </div>
            )}
            <p className="small muted">{dims.w} × {dims.h} px · {t('setup.pxNote')}</p>
            <div className="row" style={{ gap: 16, alignItems: 'flex-start', marginTop: 16, flexWrap: 'wrap' }}>
              <div className="field">
                <span className="lbl">{t('setup.paperColor')}</span>
                <div className="row"><input type="color" value={paperColor} onChange={(e) => setPaperColor(e.target.value.toUpperCase())} aria-label={t('setup.paperColor')} style={{ width: 44, height: 34, border: 0, background: 'none' }} />
                  <button className="btn sm" onClick={() => setPaperColor(def.paperColor)}>{def.paperColor}</button></div>
              </div>
              <div className="grow" style={{ minWidth: 200 }}>
                <Slider label={t('setup.texture')} value={texture} min={0} max={1.5} onChange={setTexture} />
                <Slider label={t('setup.absorbency')} value={absorb} min={0} max={1} onChange={setAbsorb} />
              </div>
            </div>
            <h3>{t('setup.medium')}</h3>
            <div className="chips">
              {CATEGORY_ORDER.map((m) => (
                <button key={m} className={`chip${medium === m ? ' sel' : ''}`} onClick={() => setMedium(m)} data-testid={`medium-${m}`}>
                  {t(`medium.${m}`)}{def.recommended.includes(m) && <span className="rec">{t('setup.recommended')}</span>}
                </button>
              ))}
            </div>
            <div className="row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
              {BRUSHES.filter((b) => b.category === medium && b.kind !== 'erase').slice(0, 4).map((b) => (
                <div key={b.id} style={{ textAlign: 'center' }} className="small muted">
                  <BrushPreview preset={b} surface={runtimeFor(surface)} color={b.defaultColor ?? '#333333'} w={150} h={54} />
                  <div>{t(`brush.${b.id}`)}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3>{t('setup.name')}</h3>
            <input className="text-in" style={{ width: '100%', marginBottom: 16 }} value={name} onChange={(e) => setName(e.target.value)} aria-label={t('setup.name')} data-testid="art-name" />
            <div className="preview-box">
              <SurfaceSwatch key={`${dims.w}x${dims.h}`} settings={surface} w={Math.round(dims.w * pvScale * 2.2)} h={Math.round(dims.h * pvScale * 2.2)} />
            </div>
            <p className="small muted">{t(`surface.${surfaceId}`)} — {t(`surfaceDesc.${surfaceId}`)}</p>
          </div>
        </div>
      </div>
      <div className="setup-actions">
        <button className="btn" onClick={onBack}><Icon name="home" size={16} />{t('setup.back')}</button>
        <button className="btn primary" onClick={begin} data-testid="begin-painting">{t('setup.begin')} →</button>
      </div>
    </div>
  );
}
