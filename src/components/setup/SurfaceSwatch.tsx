import { useEffect, useRef } from 'react';
import { SurfaceRuntime } from '../../painting/surfaces/SurfaceRuntime';
import type { SurfaceSettings } from '../../painting/types';

const cache = new Map<string, SurfaceRuntime>();
export function runtimeFor(s: SurfaceSettings) {
  const key = `${s.id}|${s.seed}|${s.paperColor}|${s.textureStrength}|${s.absorbency}`;
  let r = cache.get(key);
  if (!r) { r = new SurfaceRuntime(s); if (cache.size > 40) cache.clear(); cache.set(key, r); }
  return r;
}

export function SurfaceSwatch({ settings, w, h, className }: { settings: SurfaceSettings; w: number; h: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { if (ref.current) runtimeFor(settings).renderPaper(ref.current); }, [settings]);
  return <canvas ref={ref} width={w} height={h} className={className} />;
}
