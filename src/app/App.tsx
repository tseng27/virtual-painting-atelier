import { useCallback, useEffect } from 'react';
import { useApp } from '../state/store';
import { closeEngine, saveNow } from '../state/session';
import { StudioHome, prefersLite } from '../components/home/StudioHome';
import { SetupScreen } from '../components/setup/SetupScreen';
import { PaintScreen } from '../components/paint/PaintScreen';
import { Gallery } from '../components/Gallery';
import { Help } from '../components/Help';
import { ExportDialog } from '../components/paint/ExportDialog';
import { ReplayDialog } from '../components/paint/ReplayDialog';

export function App() {
  const screen = useApp((s) => s.screen);
  const overlay = useApp((s) => s.overlay);
  const toast = useApp((s) => s.toast);
  const set = useApp((s) => s.set);

  useEffect(() => { set({ lite: prefersLite(), rightOpen: window.innerWidth > 760 }); }, [set]);

  const backToStudio = useCallback(async () => {
    await saveNow();
    closeEngine();
    set({ screen: 'studio', overlay: null, engineId: null, focusMode: false });
  }, [set]);

  return (
    <>
      {screen === 'studio' && <StudioHome onStart={() => set({ screen: 'setup', overlay: null })} />}
      {screen === 'setup' && <SetupScreen onBack={() => set({ screen: 'studio' })} />}
      {screen === 'paint' && <PaintScreen onBack={backToStudio} />}
      {overlay === 'gallery' && <Gallery onNew={() => set({ screen: 'setup', overlay: null })} />}
      {overlay === 'help' && <Help />}
      {overlay === 'export' && <ExportDialog />}
      {overlay === 'replay' && <ReplayDialog />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
