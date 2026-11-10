import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../state/store';
import { hexToRgb, hsvToRgb, isHex, mixPigments, rgbToHex, rgbToHsv, type HSV } from '../../painting/color/color';
import { t } from '../../i18n';
import { Icon } from '../Icon';

const COMMON = [
  '#1B1A19', '#2E2E33', '#5B5853', '#9A968E', '#F5F1E8', '#FFFFFF', '#7A1F1F', '#B5523B', '#E07A3F', '#E9C46A',
  '#F2E8CF', '#8C6A3F', '#5C4033', '#3B4A2A', '#6B8F5E', '#2A9D8F', '#2F5D8A', '#1D3557', '#5E4B8B', '#C97B9B',
];
const SW_KEY = 'atelier:swatches';

function loadSwatches(): string[] {
  try { const v = JSON.parse(localStorage.getItem(SW_KEY) ?? '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; } catch { return []; }
}

export function ColorPanel() {
  const color = useApp((s) => s.color);
  const bg = useApp((s) => s.bgColor);
  const setColor = useApp((s) => s.setColor);
  const swap = useApp((s) => s.swapColors);
  const set = useApp((s) => s.set);
  const [hsv, setHsv] = useState<HSV>(() => rgbToHsv(hexToRgb(color)));
  const [hexIn, setHexIn] = useState(color);
  const [swatches, setSwatches] = useState<string[]>(loadSwatches);
  const [mixA, setMixA] = useState(color);
  const [mixB, setMixB] = useState('#E9C46A');
  const [mixC, setMixC] = useState<string | null>(null);
  const [ratio, setRatio] = useState(0.5);
  const [ratioC, setRatioC] = useState(0.25);
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  // keep HSV in sync when colour changes elsewhere (eyedropper, swatch)
  useEffect(() => {
    setHexIn(color);
    const cur = rgbToHex(hsvToRgb(hsv));
    if (cur !== color.toUpperCase()) setHsv(rgbToHsv(hexToRgb(color)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color]);

  const applyHsv = (n: HSV) => { setHsv(n); setColor(rgbToHex(hsvToRgb(n))); };
  const drag = (fn: (x: number, y: number) => void) => (e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const go = (ev: { clientX: number; clientY: number }) => {
      const r = el.getBoundingClientRect();
      fn(Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)));
    };
    go(e);
    const mv = (ev: PointerEvent) => go(ev);
    const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); };
    el.addEventListener('pointermove', mv);
    el.addEventListener('pointerup', up);
  };
  const rgb = hexToRgb(color);
  const saveSwatches = (s: string[]) => { setSwatches(s); try { localStorage.setItem(SW_KEY, JSON.stringify(s)); } catch { /* ignore */ } };
  const mixed = rgbToHex(mixPigments(
    [hexToRgb(mixA), hexToRgb(mixB), ...(mixC ? [hexToRgb(mixC)] : [])],
    [1 - ratio, ratio, ...(mixC ? [ratioC / (1 - ratioC + 1e-6)] : [])],
  ));

  return (
    <div className="float color-panel" data-testid="color-panel">
      <div className="panel-h"><h5>{t('color.title')}</h5><button className="icon-btn" onClick={() => set({ colorOpen: false })} aria-label={t('common.close')}><Icon name="close" /></button></div>
      <div ref={svRef} className="sv-box" style={{ background: `linear-gradient(0deg,#000,transparent), linear-gradient(90deg,#fff,hsl(${hsv.h},100%,50%))` }}
        onPointerDown={drag((x, y) => applyHsv({ ...hsv, s: x, v: 1 - y }))} data-testid="sv-box">
        <div className="sv-knob" style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: color }} />
      </div>
      <div ref={hueRef} className="hue-bar" onPointerDown={drag((x) => applyHsv({ ...hsv, h: Math.min(359.9, x * 360) }))}>
        <div className="hue-knob" style={{ left: `${(hsv.h / 360) * 100}%`, background: `hsl(${hsv.h},100%,50%)` }} />
      </div>
      <div className="row" style={{ marginBottom: 10 }}>
        <div className="fg-bg">
          <div className="fg" style={{ background: color }} title={t('color.fg')} />
          <div className="bg" style={{ background: bg }} title={t('color.bg')} onClick={swap} />
        </div>
        <button className="icon-btn" onClick={swap} aria-label={t('color.swap')} title={t('color.swap')}><Icon name="swap" /></button>
        <button className="icon-btn" onClick={() => set({ tool: 'eyedropper', colorOpen: false })} aria-label={t('color.pick')} title={t('color.pick')}><Icon name="eyedropper" /></button>
      </div>
      <div className="row" style={{ marginBottom: 8 }}>
        <label className="small muted" style={{ width: 32 }}>{t('color.hex')}</label>
        <input className="text-in grow" data-testid="hex-input" value={hexIn} onChange={(e) => { setHexIn(e.target.value); if (isHex(e.target.value)) setColor(rgbToHex(hexToRgb(e.target.value))); }} />
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        {(['r', 'g', 'b'] as const).map((k) => (
          <label key={k} className="row small muted" style={{ gap: 4 }}>{k.toUpperCase()}
            <input className="text-in" style={{ width: 58 }} type="number" min={0} max={255} value={Math.round(rgb[k])}
              onChange={(e) => setColor(rgbToHex({ ...rgb, [k]: Math.max(0, Math.min(255, +e.target.value || 0)) }))} />
          </label>
        ))}
      </div>
      <div className="small muted" style={{ marginBottom: 6 }}>{t('color.common')}</div>
      <div className="swatches" style={{ marginBottom: 12 }}>
        {COMMON.map((c) => <button key={c} style={{ background: c }} aria-label={c} onClick={() => setColor(c)} />)}
      </div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
        <span className="small muted">{t('color.custom')}</span>
        <button className="btn sm" onClick={() => saveSwatches([color, ...swatches.filter((s) => s !== color)].slice(0, 30))}>{t('color.addSwatch')}</button>
      </div>
      <div className="swatches" style={{ marginBottom: 14 }}>
        {swatches.map((c) => <button key={c} style={{ background: c }} aria-label={c} onClick={() => setColor(c)} onContextMenu={(e) => { e.preventDefault(); saveSwatches(swatches.filter((s) => s !== c)); }} />)}
      </div>
      <div className="small muted" style={{ marginBottom: 6 }}>{t('color.mixer')}</div>
      <div className="row" style={{ marginBottom: 8 }}>
        <MixWell label={t('color.mixA')} c={mixA} onSet={() => setMixA(color)} />
        <MixWell label={t('color.mixB')} c={mixB} onSet={() => setMixB(color)} />
        <MixWell label={t('color.mixC')} c={mixC} onSet={() => setMixC(color)} onClear={mixC ? () => setMixC(null) : undefined} />
        <div className="grow" />
        <div style={{ width: 44, height: 44, borderRadius: 8, background: mixed, border: '1px solid rgba(255,255,255,.2)' }} data-testid="mix-result" />
      </div>
      <input type="range" min={0} max={1} step={0.01} value={ratio} onChange={(e) => setRatio(+e.target.value)} style={{ width: '100%', accentColor: 'var(--champagne)' }} aria-label={t('color.ratio')} />
      {mixC && <input type="range" min={0} max={0.9} step={0.01} value={ratioC} onChange={(e) => setRatioC(+e.target.value)} style={{ width: '100%', accentColor: 'var(--champagne)' }} aria-label={t('color.mixC')} />}
      <button className="btn sm" style={{ width: '100%', margin: '8px 0' }} onClick={() => setColor(mixed)}>{t('color.useMix')}</button>
      <p className="small muted" style={{ lineHeight: 1.5, margin: 0 }}>{t('color.mixNote')}</p>
    </div>
  );
}

function MixWell({ label, c, onSet, onClear }: { label: string; c: string | null; onSet: () => void; onClear?: () => void }) {
  return (
    <button title={`${label}：點擊放入目前顏色`} onClick={onSet} onContextMenu={(e) => { e.preventDefault(); onClear?.(); }}
      style={{ width: 34, height: 34, borderRadius: '50%', border: '1px dashed rgba(255,255,255,.35)', background: c ?? 'transparent', cursor: 'pointer', fontSize: 10, color: '#aaa' }}>
      {c ? '' : '+'}
    </button>
  );
}
