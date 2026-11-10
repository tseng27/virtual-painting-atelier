import { ReplayPlayer } from '../painting/replay/ReplayPlayer';
import type { PaintingEngine } from '../painting/engine/PaintingEngine';

const CANDIDATES = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];

export function videoSupport(): { supported: boolean; mime: string; ext: string } {
  if (typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement.prototype.captureStream !== 'function') return { supported: false, mime: '', ext: '' };
  const mime = CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
  return { supported: !!mime, mime, ext: mime.startsWith('video/mp4') ? 'mp4' : 'webm' };
}

/**
 * Records a timelapse of the painting process: replays every stroke into a canvas and
 * captures it with MediaRecorder. Runs in real time for `durationMs`.
 */
export async function recordTimelapse(engine: PaintingEngine, durationMs: number, onProgress: (p: number) => void, signal?: AbortSignal): Promise<{ blob: Blob; ext: string }> {
  const sup = videoSupport();
  if (!sup.supported) throw new Error('video-unsupported');
  const player = new ReplayPlayer(engine, 1280);
  // even dimensions keep H.264 encoders happy
  const out = document.createElement('canvas');
  out.width = player.output.width & ~1; out.height = player.output.height & ~1;
  const octx = out.getContext('2d')!;
  const stream = out.captureStream(30);
  const rec = new MediaRecorder(stream, { mimeType: sup.mime, videoBitsPerSecond: 6_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise<void>((res) => { rec.onstop = () => res(); });
  const holdMs = 1500;
  const speed = player.total / Math.max(1000, durationMs);
  rec.start(250);
  const t0 = performance.now();
  await new Promise<void>((resolve) => {
    const frame = () => {
      if (signal?.aborted) return resolve();
      const el = performance.now() - t0;
      player.seek(Math.min(player.total, el * speed));
      octx.drawImage(player.output, 0, 0, out.width, out.height);
      onProgress(Math.min(1, el / (durationMs + holdMs)));
      if (el >= durationMs + holdMs) return resolve();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  rec.stop();
  await stopped;
  stream.getTracks().forEach((t) => t.stop());
  if (signal?.aborted) throw new Error('aborted');
  return { blob: new Blob(chunks, { type: sup.mime.split(';')[0] }), ext: sup.ext };
}
