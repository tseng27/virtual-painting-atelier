import { useEffect, useState } from 'react';
import { useApp } from '../../state/store';
import { getEngine, saveNow, scheduleSave } from '../../state/session';
import { CanvasView } from './CanvasView';
import { Toolbar } from './Toolbar';
import { SidePanel } from './SidePanel';
import { BottomBar } from './BottomBar';
import { MediaDrawer } from './MediaDrawer';
import { ColorPanel } from './ColorPanel';
import { Icon } from '../Icon';
import { importBase } from './LayersPanel';
import { t } from '../../i18n';

export function PaintScreen({ onBack }: { onBack: () => void }) {
  const focus = useApp((s) => s.focusMode);
  const rightOpen = useApp((s) => s.rightOpen);
  const mediaOpen = useApp((s) => s.mediaOpen);
  const colorOpen = useApp((s) => s.colorOpen);
  const set = useApp((s) => s.set);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const onSave = () => scheduleSave(100);
    window.addEventListener('atelier:save', onSave);
    const key = (ev: KeyboardEvent) => {
      const tgt = ev.target as HTMLElement;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'SELECT' || tgt.tagName === 'TEXTAREA')) return;
      const s = useApp.getState();
      if (s.overlay) return;
      const e = getEngine();
      const mod = ev.ctrlKey || ev.metaKey;
      const k = ev.key.toLowerCase();
      if (mod && k === 'z') { ev.preventDefault(); if (ev.shiftKey) e?.redo(); else e?.undo(); return; }
      if (mod && k === 'y') { ev.preventDefault(); e?.redo(); return; }
      if (mod && k === 's') { ev.preventDefault(); void saveNow(); return; }
      if (mod) return;
      switch (k) {
        case 'b': s.set({ tool: 'brush' }); break;
        case 'e': s.set({ tool: 'eraser' }); break;
        case 'i': s.set({ tool: 'eyedropper' }); break;
        case 'h': s.set({ tool: 'hand' }); break;
        case 'z': s.set({ tool: 'zoom' }); break;
        case 'x': s.swapColors(); break;
        case '[': s.setSetting('size', Math.max(1, s.settings[s.tool === 'eraser' ? 'eraser' : s.brushId].size * 0.85)); break;
        case ']': s.setSetting('size', Math.min(200, s.settings[s.tool === 'eraser' ? 'eraser' : s.brushId].size * 1.18 + 0.5)); break;
        case '0': window.dispatchEvent(new Event('atelier:fit')); break;
        case 'tab': ev.preventDefault(); s.set({ focusMode: !s.focusMode, mediaOpen: false, colorOpen: false }); break;
        case 'escape': s.set({ focusMode: false, mediaOpen: false, colorOpen: false }); break;
      }
    };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('atelier:save', onSave); };
  }, []);

  return (
    <div className={`paint${focus ? ' focus' : ''}${rightOpen ? '' : ' side-closed'}`} data-testid="paint-screen">
      <Toolbar />
      <div style={{ gridColumn: 2, gridRow: 1, position: 'relative', minHeight: 0, minWidth: 0, display: 'grid' }}
        onDragOver={(ev) => { if ([...ev.dataTransfer.items].some((i) => i.kind === 'file')) { ev.preventDefault(); setDragging(true); } }}
        onDragLeave={(ev) => { if (ev.currentTarget === ev.target || !ev.currentTarget.contains(ev.relatedTarget as Node)) setDragging(false); }}
        onDrop={(ev) => { ev.preventDefault(); setDragging(false); const f = [...ev.dataTransfer.files].find((x) => x.type.startsWith('image/')); if (f) void importBase(f); }}>
        {dragging && <div className="drop-hint">{t('layers.dropHere')}</div>}
        <CanvasView />
        {mediaOpen && <MediaDrawer />}
        {colorOpen && <ColorPanel />}
        {focus && <button className="btn sm focus-exit" onClick={() => set({ focusMode: false })}>{t('tool.focus')} · Esc</button>}
        {!focus && <button className="icon-btn collapse-side" title="panel" aria-label="toggle panel" onClick={() => set({ rightOpen: !rightOpen })}><Icon name="panel" /></button>}
      </div>
      {rightOpen && <SidePanel />}
      <BottomBar onBack={onBack} />
    </div>
  );
}
