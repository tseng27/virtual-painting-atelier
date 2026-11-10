import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getEngine } from '../../state/session';
import { activeBrushId, useApp } from '../../state/store';
import { PointerController } from '../../input/pointer/PointerController';
import { fitView } from '../../input/pointer/viewTransform';
import { brushById } from '../../painting/brushes/presets';
import { lerp } from '../../painting/math';

/**
 * Hosts the engine's canvases (paper, layers, live stroke buffer) in a CSS-transformed stage.
 * Painting happens on real 2D canvases at document resolution; zoom/pan is a view transform,
 * and every pointer position is mapped back through that transform into canvas coordinates.
 */
export function CanvasView() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const engineId = useApp((s) => s.engineId);
  const docRev = useApp((s) => s.docRev);
  const view = useApp((s) => s.view);
  const tool = useApp((s) => s.tool);
  const [, force] = useState(0);

  // controller lives for the component lifetime and reads fresh state via getters
  useEffect(() => {
    const vp = viewportRef.current!;
    const ctl = new PointerController({
      engine: getEngine,
      view: () => useApp.getState().view,
      setView: (v) => useApp.getState().set({ view: v }),
      tool: () => useApp.getState().tool,
      strokeStart: () => {
        const s = useApp.getState();
        const id = activeBrushId(s);
        return { brushId: id, settings: s.settings[id], color: s.color, pressureSource: 'simulated', pressureMode: s.pressureMode, dynamicsEnabled: s.dynamicsEnabled };
      },
      onPick: (c) => { useApp.getState().setColor(c); useApp.getState().set({ tool: 'brush' }); },
      onPressureSource: (src) => { if (useApp.getState().pressureSource !== src) useApp.getState().set({ pressureSource: src }); },
    });
    ctl.attach(vp);
    return () => ctl.detach();
  }, []);

  // fit document to the viewport when a document opens or the window resizes
  useLayoutEffect(() => {
    const vp = viewportRef.current!;
    const fit = () => {
      const e = getEngine();
      if (!e) return;
      useApp.getState().set({ view: fitView(vp.clientWidth, vp.clientHeight, e.width, e.height, vp.clientWidth < 600 ? 12 : 40) });
    };
    fit();
    const ro = new ResizeObserver(() => fit());
    ro.observe(vp);
    const onFit = () => fit();
    window.addEventListener('atelier:fit', onFit);
    return () => { ro.disconnect(); window.removeEventListener('atelier:fit', onFit); };
  }, [engineId]);

  // mount canvases in layer order; insert the live stroke buffer above its layer
  useEffect(() => {
    const e = getEngine();
    const stage = stageRef.current;
    if (!e || !stage) return;
    const sync = () => {
      const nodes: HTMLCanvasElement[] = [e.paper];
      e.paper.dataset.role = 'paper';
      const stroke = e.currentStroke;
      for (const l of e.layers) {
        const c = e.rasters.get(l.id)!.canvas;
        c.dataset.layer = l.id;
        c.style.opacity = String(l.opacity);
        c.style.display = l.visible ? '' : 'none';
        nodes.push(c);
        if (stroke && stroke.layerId === l.id && e.currentRendererUsesBuffer) {
          e.buffer.style.mixBlendMode = e.currentPreviewBlend;
          e.buffer.style.opacity = String(l.opacity);
          e.buffer.dataset.role = 'buffer';
          nodes.push(e.buffer);
        }
      }
      const cur = Array.from(stage.children);
      if (cur.length !== nodes.length || cur.some((n, i) => n !== nodes[i])) stage.replaceChildren(...nodes);
      for (const n of nodes) { n.style.width = `${e.width}px`; n.style.height = `${e.height}px`; }
    };
    sync();
    const off = e.on('stroke-preview', sync);
    return () => { off(); };
  }, [engineId, docRev]);

  useEffect(() => { force((x) => x + 1); }, [engineId]);

  // brush outline cursor
  useEffect(() => {
    const vp = viewportRef.current!;
    const move = (ev: PointerEvent) => {
      const c = cursorRef.current;
      if (!c) return;
      const s = useApp.getState();
      if (s.tool !== 'brush' && s.tool !== 'eraser') { c.style.display = 'none'; return; }
      const r = vp.getBoundingClientRect();
      const id = activeBrushId(s);
      const size = s.settings[id].size * lerp(brushById(id).params.minSize, 1, 0.85) * s.view.scale;
      c.style.display = 'block';
      c.style.left = `${ev.clientX - r.left}px`;
      c.style.top = `${ev.clientY - r.top}px`;
      c.style.width = c.style.height = `${Math.max(4, size)}px`;
    };
    const leave = () => { if (cursorRef.current) cursorRef.current.style.display = 'none'; };
    vp.addEventListener('pointermove', move);
    vp.addEventListener('pointerleave', leave);
    return () => { vp.removeEventListener('pointermove', move); vp.removeEventListener('pointerleave', leave); };
  }, []);

  const e = getEngine();
  return (
    <div ref={viewportRef} className={`viewport tool-${tool}`} data-testid="viewport">
      <div
        ref={stageRef}
        className="stage"
        data-testid="stage"
        style={{
          width: e?.width, height: e?.height,
          transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
          imageRendering: view.scale > 2 ? 'pixelated' : 'auto',
        }}
      />
      <div ref={cursorRef} className="brush-cursor" style={{ display: 'none' }} />
      <span hidden>{docRev}</span>
    </div>
  );
}
