/**
 * Low-resolution map of where the surface is still wet (document clock based, so drying
 * is deterministic during replay). Watercolor reads it for wet-in-wet bleeding.
 */
export class WetMap {
  static CELL = 8;
  readonly cols: number;
  readonly rows: number;
  /** document time (ms) until which each cell stays wet */
  wetUntil: Float32Array;

  constructor(readonly width: number, readonly height: number) {
    this.cols = Math.ceil(width / WetMap.CELL);
    this.rows = Math.ceil(height / WetMap.CELL);
    this.wetUntil = new Float32Array(this.cols * this.rows);
  }

  /** wetness 0..1 at canvas position for the given document time */
  wetness(x: number, y: number, now: number, fadeMs = 4000): number {
    const c = Math.floor(x / WetMap.CELL), r = Math.floor(y / WetMap.CELL);
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return 0;
    const left = this.wetUntil[r * this.cols + c] - now;
    return left <= 0 ? 0 : Math.min(1, left / fadeMs);
  }

  wetCell(x: number, y: number, until: number) {
    const c = Math.floor(x / WetMap.CELL), r = Math.floor(y / WetMap.CELL);
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return;
    const i = r * this.cols + c;
    if (this.wetUntil[i] < until) this.wetUntil[i] = until;
  }

  wetDisc(x: number, y: number, radius: number, until: number) {
    const C = WetMap.CELL;
    for (let yy = y - radius; yy <= y + radius; yy += C)
      for (let xx = x - radius; xx <= x + radius; xx += C)
        if ((xx - x) ** 2 + (yy - y) ** 2 <= radius * radius) this.wetCell(xx, yy, until);
  }

  clear() { this.wetUntil.fill(0); }
  snapshot(): Float32Array { return this.wetUntil.slice(); }
  restore(s: Float32Array) { this.wetUntil.set(s); }
}
