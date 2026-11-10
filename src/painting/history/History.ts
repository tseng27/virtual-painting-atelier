/**
 * Generic undo/redo stack. Entries describe *changes* (a stroke appended, a layer added…),
 * never full-canvas copies, so memory stays proportional to the work done.
 */
export class History<E> {
  private past: E[] = [];
  private future: E[] = [];
  constructor(private limit = 300) {}

  push(e: E) {
    this.past.push(e);
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
  }
  undo(): E | undefined {
    const e = this.past.pop();
    if (e !== undefined) this.future.push(e);
    return e;
  }
  redo(): E | undefined {
    const e = this.future.pop();
    if (e !== undefined) this.past.push(e);
    return e;
  }
  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
  get size() { return this.past.length; }
  clear() { this.past = []; this.future = []; }
}
