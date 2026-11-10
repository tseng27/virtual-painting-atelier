import { useApp } from '../../state/store';
import { getEngine } from '../../state/session';
import { Icon } from '../Icon';
import { t } from '../../i18n';
import type { ToolMode } from '../../input/pointer/PointerController';

export function Toolbar() {
  const tool = useApp((s) => s.tool);
  const set = useApp((s) => s.set);
  const color = useApp((s) => s.color);
  const colorOpen = useApp((s) => s.colorOpen);
  const mediaOpen = useApp((s) => s.mediaOpen);
  useApp((s) => s.docRev);
  const e = getEngine();
  const T = (id: ToolMode, icon: string, label: string, key: string) => (
    <button className={`icon-btn tip${tool === id ? ' active' : ''}`} data-tip={`${label} (${key})`} aria-label={label} data-testid={`tool-${id}`} onClick={() => set({ tool: id })}>
      <Icon name={icon} />
    </button>
  );
  return (
    <nav className="toolbar" aria-label="tools">
      <button className={`icon-btn tip${mediaOpen ? ' active' : ''}`} data-tip={t('tool.media')} aria-label={t('tool.media')} data-testid="open-media" onClick={() => set({ mediaOpen: !mediaOpen, colorOpen: false })}><Icon name="media" /></button>
      <div className="sep" />
      {T('brush', 'brush', t('tool.brush'), 'B')}
      {T('eraser', 'eraser', t('tool.eraser'), 'E')}
      {T('eyedropper', 'eyedropper', t('tool.eyedropper'), 'I')}
      <button className={`icon-btn tip${colorOpen ? ' active' : ''}`} data-tip={t('tool.palette')} aria-label={t('tool.palette')} data-testid="open-color" onClick={() => set({ colorOpen: !colorOpen, mediaOpen: false })}><Icon name="palette" /></button>
      {T('hand', 'hand', t('tool.hand'), 'H / Space')}
      {T('zoom', 'zoom', t('tool.zoom'), 'Z')}
      <div className="sep" />
      <button className="icon-btn tip" data-tip={`${t('tool.undo')} (Ctrl+Z)`} aria-label={t('tool.undo')} data-testid="undo" disabled={!e?.canUndo} onClick={() => e?.undo()}><Icon name="undo" /></button>
      <button className="icon-btn tip" data-tip={`${t('tool.redo')} (Ctrl+Shift+Z)`} aria-label={t('tool.redo')} data-testid="redo" disabled={!e?.canRedo} onClick={() => e?.redo()}><Icon name="redo" /></button>
      <div className="sep" />
      <button className="swatch-btn tip" data-tip={t('param.color')} aria-label={t('param.color')} style={{ background: color }} onClick={() => set({ colorOpen: !colorOpen, mediaOpen: false })} />
      <div className="grow" />
      <button className="icon-btn tip" data-tip={`${t('tool.focus')} (Tab)`} aria-label={t('tool.focus')} data-testid="focus" onClick={() => set({ focusMode: true, colorOpen: false, mediaOpen: false })}><Icon name="focus" /></button>
    </nav>
  );
}
