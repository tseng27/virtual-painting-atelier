import type { PaintingEngine, StrokeStart } from '../../painting/engine/PaintingEngine';
import { PressureSimulator, resolvePressureSource, type RawSample } from '../pressure/dynamics';
import { Smoother } from '../smoothing/smoother';
import { brushById } from '../../painting/brushes/presets';
import type { PressureMode, StrokePoint } from '../../painting/types';
import { screenToCanvas, zoomAt, type View } from './viewTransform';

export type ToolMode = 'brush' | 'eraser' | 'eyedropper' | 'hand' | 'zoom';

export interface ControllerHost {
  engine: () => PaintingEngine | null;
  view: () => View;
  setView: (v: View) => void;
  tool: () => ToolMode;
  strokeStart: () => StrokeStart & { pressureMode: PressureMode; dynamicsEnabled: boolean };
  onPick: (color: string) => void;
  onPressureSource?: (src: string) => void;
}

/**
 * Pointer → engine bridge. Uses Pointer Events + pointer capture, getCoalescedEvents() when
 * available (falls back to the event itself), synthesises dwell samples while the pointer
 * rests, and separates single-finger painting from two-finger pan/pinch.
 */
export class PointerController {
  private el: HTMLElement | null = null;
  private activeId: number | null = null;
  private sim: PressureSimulator | null = null;
  private smoother: Smoother | null = null;
  private lastRaw: RawSample | null = null;
  private lastPoint: StrokePoint | null = null;
  private dwellTimer: number | null = null;
  private touches = new Map<number, { x: number; y: number }>();
  private gesture: { dist: number; cx: number; cy: number; view: View } | null = null;
  private pan: { x: number; y: number; view: View } | null = null;
  private pendingTouch: { e: PointerEvent; at: number } | null = null;
  private spaceDown = false;

  constructor(private host: ControllerHost) {}

  attach(el: HTMLElement) {
    this.el = el;
    el.addEventListener('pointerdown', this.down);
    el.addEventListener('pointermove', this.move);
    el.addEventListener('pointerup', this.up);
    el.addEventListener('pointercancel', this.cancel);
    el.addEventListener('lostpointercapture', this.lost);
    el.addEventListener('wheel', this.wheel, { passive: false });
    window.addEventListener('keydown', this.key);
    window.addEventListener('keyup', this.key);
  }
  detach() {
    const el = this.el;
    if (!el) return;
    el.removeEventListener('pointerdown', this.down);
    el.removeEventListener('pointermove', this.move);
    el.removeEventListener('pointerup', this.up);
    el.removeEventListener('pointercancel', this.cancel);
    el.removeEventListener('lostpointercapture', this.lost);
    el.removeEventListener('wheel', this.wheel);
    window.removeEventListener('keydown', this.key);
    window.removeEventListener('keyup', this.key);
    this.stopDwell();
  }

  private key = (e: KeyboardEvent) => {
    if (e.code === 'Space' && !(e.target instanceof HTMLInputElement)) this.spaceDown = e.type === 'keydown';
  };

  private local(e: { clientX: number; clientY: number }) {
    const r = this.el!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private raw(e: PointerEvent): RawSample {
    const l = this.local(e);
    const c = screenToCanvas(this.host.view(), l.x, l.y);
    return { x: c.x, y: c.y, t: e.timeStamp || performance.now(), pressure: e.pressure, tiltX: e.tiltX || 0, tiltY: e.tiltY || 0, pointerType: e.pointerType };
  }

  private down = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') {
      if (e.button === 1) this.startPan(e);
      return;
    }
    e.preventDefault();
    if (e.pointerType === 'touch') {
      this.touches.set(e.pointerId, this.local(e));
      if (this.touches.size === 2) {
        // second finger → abandon any stroke and start pinch/pan
        this.pendingTouch = null;
        this.abortStroke();
        this.beginGesture();
        return;
      }
      if (this.touches.size > 2) return;
      // defer a little so a quick second finger does not leave a dot
      this.pendingTouch = { e, at: performance.now() };
      window.setTimeout(() => { if (this.pendingTouch?.e === e) { this.pendingTouch = null; this.startTool(e); } }, 60);
      return;
    }
    this.startTool(e);
  };

  private startTool(e: PointerEvent) {
    const tool = this.spaceDown ? 'hand' : this.host.tool();
    try { this.el!.setPointerCapture(e.pointerId); } catch { /* element may be gone */ }
    if (tool === 'hand') return this.startPan(e);
    if (tool === 'zoom') {
      const l = this.local(e);
      const v = this.host.view();
      this.host.setView(zoomAt(v, l.x, l.y, v.scale * (e.altKey || e.shiftKey ? 1 / 1.5 : 1.5)));
      return;
    }
    const engine = this.host.engine();
    if (!engine) return;
    const s = this.raw(e);
    if (tool === 'eyedropper') {
      if (s.x >= 0 && s.y >= 0 && s.x < engine.width && s.y < engine.height) this.host.onPick(engine.pickColor(Math.floor(s.x), Math.floor(s.y)));
      return;
    }
    const start = this.host.strokeStart();
    const mode: PressureMode = start.dynamicsEnabled ? start.pressureMode : 'fixed';
    const source = resolvePressureSource(mode, e.pointerType);
    this.sim = new PressureSimulator(source, brushById(start.brushId).dynamics);
    this.smoother = new Smoother(start.settings.smoothing);
    this.activeId = e.pointerId;
    const p = this.smoother.push(this.sim.next(s));
    this.lastRaw = s;
    this.lastPoint = p;
    engine.beginStroke({ ...start, pressureSource: source }, [p]);
    this.host.onPressureSource?.(source);
    this.startDwell();
  }

  private move = (e: PointerEvent) => {
    if (e.pointerType === 'touch' && this.touches.has(e.pointerId)) {
      this.touches.set(e.pointerId, this.local(e));
      if (this.gesture) return this.updateGesture();
      if (this.pendingTouch && this.pendingTouch.e.pointerId === e.pointerId) {
        const pe = this.pendingTouch.e; this.pendingTouch = null; this.startTool(pe);
      }
    }
    if (this.pan) {
      const l = this.local(e);
      this.host.setView({ ...this.pan.view, tx: this.pan.view.tx + l.x - this.pan.x, ty: this.pan.view.ty + l.y - this.pan.y });
      return;
    }
    if (this.activeId !== e.pointerId || !this.sim || !this.smoother) return;
    const engine = this.host.engine();
    if (!engine) return;
    const events = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
    const list = events.length ? events : [e];
    const pts: StrokePoint[] = [];
    for (const ce of list) {
      const s = this.raw(ce);
      if (this.lastRaw && s.t < this.lastRaw.t) s.t = this.lastRaw.t;
      const p = this.smoother.push(this.sim.next(s));
      pts.push(p);
      this.lastRaw = s;
      this.lastPoint = p;
    }
    engine.addPoints(pts);
  };

  private up = (e: PointerEvent) => {
    if (e.pointerType === 'touch') {
      this.touches.delete(e.pointerId);
      if (this.pendingTouch?.e.pointerId === e.pointerId) {
        // quick tap → a dot
        const pe = this.pendingTouch.e; this.pendingTouch = null; this.startTool(pe);
      }
      if (this.gesture) { if (this.touches.size < 2) this.gesture = null; return; }
    }
    if (this.pan) { this.pan = null; return; }
    if (this.activeId !== e.pointerId) return;
    this.finishStroke();
  };

  private cancel = (e: PointerEvent) => {
    this.touches.delete(e.pointerId);
    if (this.activeId === e.pointerId) this.finishStroke();
    this.pan = null;
    this.gesture = null;
  };
  private lost = (e: PointerEvent) => {
    // touch starts with implicit capture on the inner canvas; moving capture to the viewport
    // fires lostpointercapture on that canvas (bubbling here) — that must not end the stroke
    if (e.target !== this.el || this.el?.hasPointerCapture(e.pointerId)) return;
    if (this.activeId === e.pointerId) this.finishStroke();
  };

  private finishStroke() {
    this.stopDwell();
    const engine = this.host.engine();
    if (engine && this.sim && this.smoother) {
      const closing = this.smoother.finish(this.lastRaw ? { ...this.lastPoint!, x: this.lastRaw.x, y: this.lastRaw.y } : undefined);
      if (closing.length) engine.addPoints(closing);
      const pts = engine.currentStroke?.points ?? [];
      const tail = this.sim.tail(pts);
      if (tail.length) engine.addPoints(tail);
      engine.endStroke();
    }
    this.activeId = null;
    this.sim = null;
    this.smoother = null;
    this.lastRaw = null;
  }

  private abortStroke() {
    this.stopDwell();
    this.host.engine()?.cancelStroke();
    this.activeId = null;
    this.sim = null;
  }

  /** While the pointer rests, keep sampling so dwell can deposit pigment / spread ink. */
  private startDwell() {
    this.stopDwell();
    this.dwellTimer = window.setInterval(() => {
      if (!this.lastRaw || !this.sim || !this.smoother) return;
      const now = performance.now();
      if (now - this.lastRaw.t < 40) return;
      const s = { ...this.lastRaw, t: now };
      const p = this.smoother.push(this.sim.next(s));
      this.lastRaw = s;
      this.lastPoint = p;
      this.host.engine()?.addPoints([p]);
    }, 50);
  }
  private stopDwell() { if (this.dwellTimer !== null) { clearInterval(this.dwellTimer); this.dwellTimer = null; } }

  private startPan(e: PointerEvent) {
    const l = this.local(e);
    this.pan = { x: l.x, y: l.y, view: this.host.view() };
    try { this.el!.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  }

  private beginGesture() {
    const [a, b] = [...this.touches.values()];
    this.gesture = { dist: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, view: this.host.view() };
  }
  private updateGesture() {
    if (!this.gesture || this.touches.size < 2) return;
    const [a, b] = [...this.touches.values()];
    const dist = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    const g = this.gesture;
    const zoomed = zoomAt(g.view, g.cx, g.cy, g.view.scale * (dist / (g.dist || 1)));
    this.host.setView({ ...zoomed, tx: zoomed.tx + cx - g.cx, ty: zoomed.ty + cy - g.cy });
  }

  private wheel = (e: WheelEvent) => {
    e.preventDefault();
    const l = this.local(e);
    const v = this.host.view();
    const pinch = e.ctrlKey || e.metaKey;                      // trackpad pinch arrives as ctrl+wheel
    const mouseWheel = e.deltaMode === 1 || (e.deltaX === 0 && Math.abs(e.deltaY) >= 50 && Number.isInteger(e.deltaY));
    if (pinch) this.host.setView(zoomAt(v, l.x, l.y, v.scale * Math.exp(-e.deltaY * 0.01)));
    else if (mouseWheel && !e.shiftKey) this.host.setView(zoomAt(v, l.x, l.y, v.scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
    else this.host.setView({ ...v, tx: v.tx - (e.shiftKey ? e.deltaY : e.deltaX), ty: v.ty - (e.shiftKey ? 0 : e.deltaY) });
  };
}
