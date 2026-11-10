import type { RendererKind } from '../types';
import type { StrokeRenderer } from './renderer';
import { GraphiteRenderer } from './graphite';
import { SmudgeRenderer } from './smudge';
import { EraseRenderer } from './erase';
import { WatercolorRenderer, WaterRenderer } from './watercolor';
import { SpongeRenderer } from './sponge';
import { InkRenderer } from './ink';
import { PaintRenderer, KnifeRenderer } from './paint';

/** Brush Engine registry — add a new medium by registering a renderer for its kind. */
export function createRenderer(kind: RendererKind): StrokeRenderer {
  switch (kind) {
    case 'graphite': return new GraphiteRenderer();
    case 'smudge': return new SmudgeRenderer();
    case 'erase': return new EraseRenderer();
    case 'watercolor': return new WatercolorRenderer();
    case 'water': return new WaterRenderer();
    case 'sponge': return new SpongeRenderer();
    case 'ink': return new InkRenderer();
    case 'paint': return new PaintRenderer();
    case 'knife': return new KnifeRenderer();
  }
}
