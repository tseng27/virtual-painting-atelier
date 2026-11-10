import { createCanvas, ctx2d, type Canvas2D, type Ctx2D } from '../engine/canvas';
import { WetMap } from '../engine/WetMap';
import { CheckpointList } from '../history/checkpoints';

/** Pixel storage for one layer + its wet map and undo checkpoints. */
export class LayerRaster {
  readonly canvas: Canvas2D;
  readonly ctx: Ctx2D;
  readonly wet: WetMap;
  readonly checkpoints = new CheckpointList<Canvas2D, Float32Array>();
  version = 0;

  constructor(readonly width: number, readonly height: number) {
    this.canvas = createCanvas(width, height);
    this.ctx = ctx2d(this.canvas);
    this.wet = new WetMap(width, height);
    this.checkpoints.add({ opIndex: 0, image: createCanvas(1, 1), wet: this.wet.snapshot() });
  }

  /** replaces the base checkpoint with current pixels (used after loading saved rasters) */
  setBase(opIndex: number) {
    const img = createCanvas(this.width, this.height);
    ctx2d(img).drawImage(this.canvas, 0, 0);
    this.checkpoints.items = [{ opIndex, image: img, wet: this.wet.snapshot() }];
  }

  capture(opIndex: number) {
    const img = createCanvas(this.width, this.height);
    ctx2d(img).drawImage(this.canvas, 0, 0);
    this.checkpoints.add({ opIndex, image: img, wet: this.wet.snapshot() });
  }

  restore(cp: { image: Canvas2D; wet: Float32Array }) {
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.globalAlpha = 1;
    this.ctx.clearRect(0, 0, this.width, this.height);
    if (cp.image.width === this.width) this.ctx.drawImage(cp.image, 0, 0);
    this.ctx.restore();
    this.wet.restore(cp.wet);
  }
}
