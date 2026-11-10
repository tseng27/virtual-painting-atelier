import { useState } from 'react';
import { activeBrushId, useApp } from '../../state/store';
import { getEngine } from '../../state/session';
import { brushById, usesDensity, usesWater } from '../../painting/brushes/presets';
import type { PressureMode } from '../../painting/types';
import { Slider } from '../Slider';
import { Icon } from '../Icon';
import { t } from '../../i18n';
import { LayersPanel } from './LayersPanel';

export function SidePanel() {
  const s = useApp();
  const id = activeBrushId(s);
  const preset = brushById(id);
  const st = s.settings[id];
  const k = preset.kind;
  return (
    <aside className="side" aria-label="parameters">
      <div className="panel">
        <div className="brush-head" style={{ marginBottom: 14 }}>
          <button className="big-swatch" style={{ background: k === 'erase' ? 'repeating-conic-gradient(#888 0 25%, #555 0 50%) 0 0/10px 10px' : s.color }} aria-label={t('param.color')} onClick={() => s.set({ colorOpen: !s.colorOpen, mediaOpen: false })} />
          <div className="grow">
            <div className="nm" data-testid="brush-name">{t(`brush.${id}`)}</div>
            <div className="sub">{t(`medium.${preset.category}`)} · {s.color}</div>
          </div>
          <button className="btn sm" onClick={() => s.set({ mediaOpen: !s.mediaOpen, colorOpen: false })}>{t('tool.media')}</button>
        </div>
        <Slider label={t('param.size')} testId="size-slider" value={st.size} min={1} max={k === 'graphite' ? 60 : 200} step={1} format={(v) => `${Math.round(v)} px`} onChange={(v) => s.setSetting('size', v)} />
        <Slider label={t('param.opacity')} value={st.opacity} min={0.02} max={1} onChange={(v) => s.setSetting('opacity', v)} />
        <Slider label={t('param.flow')} value={st.flow} min={0.02} max={1} onChange={(v) => s.setSetting('flow', v)} />
        <Slider label={t('param.hardness')} value={st.hardness} min={0} max={1} onChange={(v) => s.setSetting('hardness', v)} />
        <Slider label={t('param.smoothing')} value={st.smoothing} min={0} max={1} onChange={(v) => s.setSetting('smoothing', v)} />
        <Slider label={t('param.water')} value={st.water} min={0} max={1} disabled={!usesWater(k)} onChange={(v) => s.setSetting('water', v)} />
        <Slider label={t('param.density')} value={st.density} min={0.05} max={1} disabled={!usesDensity(k)} onChange={(v) => s.setSetting('density', v)} />
        <label className="toggle">{t('param.dynamics')}<input type="checkbox" data-testid="dynamics-toggle" checked={s.dynamicsEnabled} onChange={(e) => s.set({ dynamicsEnabled: e.target.checked })} /></label>
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="lbl">{t('param.pressure')} · <span data-testid="pressure-source">{t(`pressureSrc.${s.pressureSource}`)}</span></span>
          <select className="select" value={s.pressureMode} disabled={!s.dynamicsEnabled} onChange={(e) => s.set({ pressureMode: e.target.value as PressureMode })} data-testid="pressure-mode">
            {(['auto', 'dynamic', 'pen', 'fixed'] as PressureMode[]).map((m) => <option key={m} value={m}>{t(`pressure.${m}`)}</option>)}
          </select>
        </div>
      </div>
      <LayersPanel />
      <ResetPanel />
    </aside>
  );
}

function ResetPanel() {
  const [ask, setAsk] = useState(false);
  const e = getEngine();
  return (
    <div className="panel">
      {!ask ? <button className="btn sm danger" onClick={() => setAsk(true)} data-testid="reset-canvas"><Icon name="reset" size={16} />{t('layers.reset')}</button> : (
        <div>
          <p className="small" style={{ marginTop: 0 }}>{t('layers.resetConfirm')}</p>
          <div className="row"><button className="btn sm danger" data-testid="reset-confirm" onClick={() => { e?.resetCanvas(); setAsk(false); }}>{t('common.confirm')}</button><button className="btn sm" onClick={() => setAsk(false)}>{t('common.cancel')}</button></div>
        </div>
      )}
    </div>
  );
}
