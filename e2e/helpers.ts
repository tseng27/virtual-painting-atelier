import { expect, type Page } from '@playwright/test';

export async function newCanvas(page: Page, opts: { surface?: string; size?: string; medium?: string; name?: string } = {}) {
  await page.goto('./');
  await page.getByTestId('home-start').click();
  await expect(page.getByTestId('setup-screen')).toBeVisible({ timeout: 15000 });
  if (opts.surface) await page.getByTestId(`surface-${opts.surface}`).click();
  if (opts.size) await page.getByTestId(`size-${opts.size}`).click();
  if (opts.medium) await page.getByTestId(`medium-${opts.medium}`).click();
  if (opts.name) await page.getByTestId('art-name').fill(opts.name);
  await page.getByTestId('begin-painting').click();
  await expect(page.getByTestId('paint-screen')).toBeVisible();
  await page.waitForFunction(() => !!(window as any).__atelier?.engine);
}

export async function pickBrush(page: Page, id: string) {
  await page.getByTestId('open-media').click();
  await page.getByTestId(`brush-${id}`).click();
}

/** canvas coords → screen coords through the live view transform */
export async function toScreen(page: Page, x: number, y: number) {
  const box = (await page.getByTestId('stage').boundingBox())!;
  const w = await page.evaluate(() => (window as any).__atelier.engine.width);
  const s = box.width / w;
  return { x: box.x + x * s, y: box.y + y * s, scale: s };
}

/** Draws a polyline in canvas coordinates. `stepMs` controls speed; `dwellAt` pauses at an index. */
export async function draw(page: Page, pts: [number, number][], stepMs = 16, dwellAt?: { index: number; ms: number }) {
  const first = await toScreen(page, ...pts[0]);
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  for (let i = 1; i < pts.length; i++) {
    const p = await toScreen(page, ...pts[i]);
    await page.mouse.move(p.x, p.y);
    if (dwellAt && dwellAt.index === i) await page.waitForTimeout(dwellAt.ms);
    else await page.waitForTimeout(stepMs);
  }
  await page.mouse.up();
  await page.waitForTimeout(50);
}

export const line = (x0: number, y0: number, x1: number, y1: number, n = 30): [number, number][] =>
  Array.from({ length: n + 1 }, (_, i) => [x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]);

/** Reads pixel stats of a layer (or the active layer) inside a rect. */
export async function layerStats(page: Page, rect: { x: number; y: number; w: number; h: number }, layerIndex?: number) {
  return page.evaluate(({ rect, layerIndex }) => {
    const e = (window as any).__atelier.engine;
    const layer = layerIndex === undefined ? e.activeLayer : e.layers[layerIndex];
    const c = e.rasters.get(layer.id).canvas as HTMLCanvasElement;
    const d = c.getContext('2d')!.getImageData(rect.x, rect.y, rect.w, rect.h).data;
    let alphaSum = 0, covered = 0, hash = 0;
    const rows = new Set<number>();
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3];
      alphaSum += a;
      if (a > 20) { covered++; rows.add(Math.floor(i / 4 / rect.w)); }
      hash = (hash * 31 + d[i] + d[i + 1] * 7 + d[i + 2] * 13 + a * 17) >>> 0;
    }
    return { alphaSum, covered, rows: rows.size, hash };
  }, { rect, layerIndex });
}
