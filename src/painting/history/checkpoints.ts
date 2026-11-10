/**
 * Keeps a few raster snapshots per layer so undo can rebuild a layer by restoring the nearest
 * snapshot and replaying only the strokes after it (instead of copying the canvas per stroke).
 */
export interface Checkpoint<I, W> { opIndex: number; image: I; wet: W }

export class CheckpointList<I, W> {
  items: Checkpoint<I, W>[] = [];
  constructor(readonly interval = 24, readonly max = 5) {}

  /** nearest checkpoint at or before opIndex */
  nearest(opIndex: number): Checkpoint<I, W> | undefined {
    let best: Checkpoint<I, W> | undefined;
    for (const c of this.items) if (c.opIndex <= opIndex && (!best || c.opIndex > best.opIndex)) best = c;
    return best;
  }
  shouldCapture(opCount: number): boolean {
    const last = this.items.length ? Math.max(...this.items.map((c) => c.opIndex)) : 0;
    return opCount - last >= this.interval;
  }
  add(c: Checkpoint<I, W>) {
    this.items.push(c);
    this.items.sort((a, b) => a.opIndex - b.opIndex);
    // thin out: keep the base (oldest) and the most recent ones
    while (this.items.length > this.max) this.items.splice(1, 1);
  }
  /** drop checkpoints that refer to ops that no longer exist */
  invalidateAfter(opCount: number) { this.items = this.items.filter((c) => c.opIndex <= opCount); }
}
