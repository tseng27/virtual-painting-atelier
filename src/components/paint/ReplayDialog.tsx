import { useEffect, useRef, useState } from 'react';
import { Modal } from '../Modal';
import { useApp } from '../../state/store';
import { getEngine } from '../../state/session';
import { ReplayPlayer } from '../../painting/replay/ReplayPlayer';
import { PaintingEngine } from '../../painting/engine/PaintingEngine';
import { loadProject } from '../../storage/artworks';
import { recordTimelapse, videoSupport } from '../../export/video';
import { downloadBlob, safeName } from '../../export/download';
import { t } from '../../i18n';
import { Icon } from '../Icon';

const SPEEDS = [1, 2, 4, 8, 16];

/**
 * Process playback: replays the recorded strokes (with original timing, pressure and dwell)
 * and can record the timelapse to a video file.
 */
export function ReplayDialog() {
  const set = useApp((s) => s.set);
  const replayId = useApp((s) => s.replayId);
  const [engine, setEngine] = useState<PaintingEngine | null>(replayId ? null : getEngine());
  const [player, setPlayer] = useState<ReplayPlayer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<'fit' | number>('fit');
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(20);
  const [rec, setRec] = useState<number | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sup = videoSupport();

  useEffect(() => {
    if (!replayId) return;
    let alive = true;
    loadProject(replayId).then(async (p) => { if (p && alive) setEngine(await PaintingEngine.fromProject(p)); });
    return () => { alive = false; };
  }, [replayId]);

  useEffect(() => {
    if (!engine) return;
    const p = new ReplayPlayer(engine, 1280);
    setPlayer(p);
    p.output.dataset.testid = 'replay-canvas';
    hostRef.current?.replaceChildren(p.output);
    setPlaying(p.total > 0);
    return () => { abortRef.current?.abort(); };
  }, [engine]);

  useEffect(() => {
    if (!player || !playing) return;
    let raf = 0, last = performance.now();
    const speed = mode === 'fit' ? Math.max(1, player.total / 30000) : mode;
    const tick = (now: number) => {
      const dt = Math.min(500, now - last); last = now;
      const next = player.currentTime + dt * speed;
      player.seek(next);
      setTime(player.currentTime);
      if (player.currentTime >= player.total) { setPlaying(false); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [player, playing, mode]);

  const record = async () => {
    if (!engine) return;
    setPlaying(false);
    const ac = new AbortController();
    abortRef.current = ac;
    setRec(0);
    try {
      const { blob, ext } = await recordTimelapse(engine, duration * 1000, setRec, ac.signal);
      downloadBlob(blob, `${safeName(engine.meta.name)}-timelapse.${ext}`);
    } catch (err) {
      if ((err as Error).message !== 'aborted') console.error(err);
    } finally { setRec(null); }
  };

  const total = player?.total ?? 0;
  const close = () => { abortRef.current?.abort(); set({ overlay: null, replayId: null }); };
  return (
    <Modal title={t('replay.title')} onClose={close} testId="replay-dialog">
      <div className="replay-stage" ref={hostRef} />
      {player && total === 0 && <p className="muted">{t('replay.empty')}</p>}
      <div className="replay-ctl">
        <button className="icon-btn" aria-label={playing ? t('replay.pause') : t('replay.play')} data-testid="replay-play" disabled={!total || rec !== null}
          onClick={() => { if (player && player.currentTime >= total) player.reset(); setPlaying(!playing); }}>
          <Icon name={playing ? 'pause' : 'play'} />
        </button>
        <button className="icon-btn" aria-label={t('replay.restart')} disabled={!total || rec !== null} onClick={() => { player?.reset(); setTime(0); setPlaying(true); }}><Icon name="reset" /></button>
        <input type="range" min={0} max={total || 1} value={time} aria-label="timeline" data-testid="replay-seek" disabled={rec !== null}
          onChange={(e) => { setPlaying(false); player?.seek(+e.target.value); setTime(+e.target.value); }} />
        <span className="small muted" data-testid="replay-progress">{player ? `${t('replay.stroke')} ${player.strokeIndex}/${player.items.length}` : '…'}</span>
      </div>
      <div className="replay-ctl">
        <span className="small muted">{t('replay.speed')}</span>
        <div className="chips">
          <button className={`chip${mode === 'fit' ? ' sel' : ''}`} onClick={() => setMode('fit')}>{t('replay.fit')}</button>
          {SPEEDS.map((s) => <button key={s} className={`chip${mode === s ? ' sel' : ''}`} onClick={() => setMode(s)}>{s === 1 ? t('replay.real') : `${s}×`}</button>)}
        </div>
      </div>
      <div className="replay-ctl" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
        {sup.supported ? (
          <>
            <span className="small muted">{t('replay.duration')}</span>
            <div className="chips">{[10, 20, 40].map((d) => <button key={d} className={`chip${duration === d ? ' sel' : ''}`} onClick={() => setDuration(d)}>{d} 秒</button>)}</div>
            <div className="grow" />
            {rec === null
              ? <button className="btn sm primary" disabled={!total} onClick={record} data-testid="record-video"><Icon name="video" size={16} />{t('replay.record')} ({sup.ext.toUpperCase()})</button>
              : <button className="btn sm" onClick={() => abortRef.current?.abort()}>{t('replay.recording')} {Math.round(rec * 100)}% · {t('common.cancel')}</button>}
          </>
        ) : <p className="small muted">{t('replay.noVideo')}</p>}
      </div>
      <p className="notice" style={{ marginTop: 12 }}>{t('replay.note')}</p>
    </Modal>
  );
}
