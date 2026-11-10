import { useEffect, useRef } from 'react';
import type { BrushPreset } from '../../painting/brushes/presets';
import type { SurfaceRuntime } from '../../painting/surfaces/SurfaceRuntime';
import { LayerRaster } from '../../painting/layers/LayerRaster';
import { createCanvas, ctx2d } from '../../painting/engine/canvas';
import { renderStroke } from '../../painting/strokes/StrokeSession';
import type { Stroke, StrokePoint } from '../../painting/types';

/** Renders a real sample stroke with the preset — the preview *is* the engine output. */
export function BrushPreview({ preset, surface, color, w = 176, h = 60 }: { preset: BrushPreset; surface: SurfaceRuntime; color: string; w?: number; h?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const out = ref.current;
    if (!out) return;
    const raster = new LayerRaster(w, h);
    const buffer = createCanvas(w, h);
    const env = { layer: raster.canvas, layerCtx: raster.ctx, buffer, bufferCtx: ctx2d(buffer, true), surface, wet: raster.wet, width: w, height: h };
    const size = Math.min(preset.defaults.size, h * 0.5);
    if (preset.kind === 'erase' || preset.kind === 'smudge' || preset.kind === 'water') {
      // show the effect on a band of graphite/paint
      raster.ctx.fillStyle = preset.category === 'ink' ? '#222' : preset.category === 'watercolor' ? '#5277a8' : '#555';
      raster.ctx.fillRect(0, h * 0.3, w, h * 0.4);
    }
    const pts: StrokePoint[] = [];
    const n = 40;
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      pts.push({ x: 10 + k * (w - 20), y: h / 2 + Math.sin(k * Math.PI * 2) * h * 0.2, p: 0.35 + 0.65 * Math.sin(k * Math.PI), tx: 0, ty: 0, t: i * 14, d: 0 });
    }
    const stroke: Stroke = { type: 'stroke', id: 'pv', seq: 0, time: 0, layerId: 'pv', brushId: preset.id, kind: preset.kind, settings: { ...preset.defaults, size }, color, seed: 7, pressureSource: 'simulated', points: pts };
    renderStroke(stroke, env);
    const o = ctx2d(out);
    o.clearRect(0, 0, w, h);
    o.fillStyle = surface.settings.paperColor;
    o.fillRect(0, 0, w, h);
    o.drawImage(raster.canvas, 0, 0);
  }, [preset, surface, color, w, h]);
  return <canvas ref={ref} width={w} height={h} />;
}
