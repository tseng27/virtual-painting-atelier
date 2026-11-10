/** Canvas view transform: screen = canvas * scale + (tx, ty). Pure & unit-tested. */
export interface View { scale: number; tx: number; ty: number }

export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 16;

export function screenToCanvas(v: View, sx: number, sy: number) {
  return { x: (sx - v.tx) / v.scale, y: (sy - v.ty) / v.scale };
}
export function canvasToScreen(v: View, cx: number, cy: number) {
  return { x: cx * v.scale + v.tx, y: cy * v.scale + v.ty };
}
/** Zoom keeping the canvas point under (sx, sy) fixed on screen. */
export function zoomAt(v: View, sx: number, sy: number, nextScale: number): View {
  const s = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextScale));
  const c = screenToCanvas(v, sx, sy);
  return { scale: s, tx: sx - c.x * s, ty: sy - c.y * s };
}
export function fitView(viewW: number, viewH: number, docW: number, docH: number, margin = 40): View {
  const s = Math.max(MIN_ZOOM, Math.min((viewW - margin * 2) / docW, (viewH - margin * 2) / docH));
  return { scale: s, tx: (viewW - docW * s) / 2, ty: (viewH - docH * s) / 2 };
}
