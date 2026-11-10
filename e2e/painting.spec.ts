import { test, expect } from '@playwright/test';
import { newCanvas, draw, line, layerStats, pickBrush } from './helpers';

const errorsOf = (page: import('@playwright/test').Page) => {
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  return errs;
};

test('1. studio home renders and a new canvas accepts a stroke', async ({ page }) => {
  const errs = errorsOf(page);
  await page.goto('./');
  await expect(page.getByTestId('studio-home')).toBeVisible();
  await expect(page.getByTestId('home-start')).toBeVisible();
  await page.waitForTimeout(3500);
  const shot = await page.screenshot();
  expect(shot.byteLength).toBeGreaterThan(60_000); // a blank page compresses to a few KB
  await newCanvas(page);
  const before = await layerStats(page, { x: 100, y: 100, w: 600, h: 200 });
  expect(before.covered).toBe(0);
  await draw(page, line(150, 200, 650, 200));
  const after = await layerStats(page, { x: 100, y: 100, w: 600, h: 200 });
  expect(after.covered).toBeGreaterThan(300);
  expect(errs).toEqual([]);
});

test('2. brush size changes the stroke width', async ({ page }) => {
  await newCanvas(page);
  await page.getByTestId('dynamics-toggle').uncheck(); // fixed width for a clean measurement
  const slider = page.getByTestId('size-slider');
  await slider.fill('4');
  await draw(page, line(150, 200, 650, 200));
  const thin = await layerStats(page, { x: 300, y: 150, w: 200, h: 100 });
  await slider.fill('30');
  await draw(page, line(150, 500, 650, 500));
  const thick = await layerStats(page, { x: 300, y: 450, w: 200, h: 100 });
  expect(thick.rows).toBeGreaterThan(thin.rows * 3);
});

test('3. mouse speed and dwell change the simulated stroke', async ({ page }) => {
  await newCanvas(page, { surface: 'wc-cold', medium: 'watercolor' });
  // slow vs fast with the same path length
  await draw(page, line(100, 200, 700, 200, 60), 30);
  await draw(page, line(100, 500, 700, 500, 6), 16);
  await page.waitForTimeout(200);
  const slow = await layerStats(page, { x: 250, y: 120, w: 300, h: 160 });
  const fast = await layerStats(page, { x: 250, y: 420, w: 300, h: 160 });
  expect(slow.rows).toBeGreaterThan(fast.rows);
  expect(slow.alphaSum).toBeGreaterThan(fast.alphaSum * 1.3);
  // dwell: resting the brush pools pigment
  await draw(page, line(100, 800, 700, 800, 30), 16);
  await draw(page, line(100, 1100, 700, 1100, 30), 16, { index: 15, ms: 1200 });
  const noDwell = await layerStats(page, { x: 360, y: 730, w: 80, h: 140 });
  const dwell = await layerStats(page, { x: 360, y: 1030, w: 80, h: 140 });
  expect(dwell.alphaSum).toBeGreaterThan(noDwell.alphaSum * 1.25);
});

test('4. undo and redo restore strokes exactly', async ({ page }) => {
  await newCanvas(page);
  const R = { x: 0, y: 0, w: 1240, h: 1000 };
  await draw(page, line(150, 200, 650, 260));
  const one = await layerStats(page, R);
  await draw(page, line(150, 600, 650, 500));
  const two = await layerStats(page, R);
  expect(two.hash).not.toBe(one.hash);
  await page.getByTestId('undo').click();
  expect((await layerStats(page, R)).hash).toBe(one.hash);
  await page.getByTestId('redo').click();
  expect((await layerStats(page, R)).hash).toBe(two.hash);
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+z');
  expect((await layerStats(page, R)).covered).toBe(0);
  await page.keyboard.press('Control+Shift+z');
  expect((await layerStats(page, R)).hash).toBe(one.hash);
});

test('5. layers do not damage each other', async ({ page }) => {
  await newCanvas(page);
  const R = { x: 0, y: 0, w: 1240, h: 1000 };
  await draw(page, line(150, 300, 800, 300));
  const base = await layerStats(page, R, 0);
  await page.getByTestId('layer-add').click();
  await expect(page.getByTestId('layer-row')).toHaveCount(2);
  await draw(page, line(150, 320, 800, 320));
  await pickBrush(page, 'eraser');
  await page.getByTestId('size-slider').fill('120');
  await draw(page, line(150, 310, 800, 310));
  expect((await layerStats(page, R, 0)).hash).toBe(base.hash);
  await page.getByTestId('layer-clear').click();
  await page.getByRole('button', { name: '確定' }).click();
  expect((await layerStats(page, R, 0)).hash).toBe(base.hash);
  expect((await layerStats(page, R, 1)).covered).toBe(0);
  await page.getByTestId('layer-delete').click();
  await expect(page.getByTestId('layer-row')).toHaveCount(1);
  await page.getByTestId('undo').click();
  await expect(page.getByTestId('layer-row')).toHaveCount(2);
});

test('6. saved work survives a reload and reopens', async ({ page }) => {
  await newCanvas(page, { surface: 'xuan-raw', medium: 'ink' });
  await draw(page, line(200, 300, 900, 380));
  await draw(page, line(200, 600, 900, 500));
  const R = { x: 0, y: 0, w: 1240, h: 1000 };
  const before = await layerStats(page, R);
  await page.evaluate(() => (window as any).__atelier.saveNow());
  await expect(page.getByTestId('save-status')).toContainText('已儲存');
  await page.reload();
  await page.getByTestId('home-continue').click();
  await expect(page.getByTestId('paint-screen')).toBeVisible();
  await page.waitForFunction(() => !!(window as any).__atelier?.engine);
  const after = await layerStats(page, R);
  expect(after.covered).toBe(before.covered);
  expect(Math.abs(after.alphaSum - before.alphaSum) / before.alphaSum).toBeLessThan(0.01);
  // the reopened document keeps its stroke data for replay
  expect(await page.evaluate(() => (window as any).__atelier.engine.strokeCount)).toBe(2);
});

test('7. PNG export has correct size and content; project file round-trips', async ({ page }) => {
  // ASCII name: headless Chromium reports blob downloads with non-ASCII names as "download"
  await newCanvas(page, { size: 'square', name: 'e2e-artwork' });
  await draw(page, line(200, 200, 1200, 1200));
  await page.getByTestId('open-export').click();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-png').click()]);
  const buf = await (await dl.createReadStream()).toArray().then((c) => Buffer.concat(c));
  expect(buf.subarray(1, 4).toString()).toBe('PNG');
  expect(buf.readUInt32BE(16)).toBe(1400);
  expect(buf.readUInt32BE(20)).toBe(1400);
  expect(buf.byteLength).toBeGreaterThan(20_000);
  const [pj] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-project').click()]);
  expect(pj.suggestedFilename()).toBe('e2e-artwork.atelier.json');
  const json = JSON.parse(Buffer.concat(await (await pj.createReadStream()).toArray()).toString());
  expect(json.format).toBe('atelier-project');
  expect(json.version).toBe(1);
  expect(json.layers[0].ops).toHaveLength(1);
  expect(json.layers[0].raster).toMatch(/^data:image\/png;base64,/);
  // import it back via the gallery
  await page.keyboard.press('Escape');
  await page.getByTestId('back-studio').click();
  await page.getByTestId('home-gallery').click();
  await page.getByTestId('import-input').setInputFiles({ name: 'x.atelier.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(json)) });
  await expect(page.getByTestId('paint-screen')).toBeVisible({ timeout: 20000 });
  expect(await page.evaluate(() => (window as any).__atelier.engine.strokeCount)).toBe(1);
});

test('8. process replay re-paints the recorded strokes', async ({ page }) => {
  await newCanvas(page, { surface: 'wc-cold', medium: 'watercolor' });
  await draw(page, line(150, 300, 900, 300));
  await draw(page, line(150, 500, 900, 700));
  await draw(page, line(500, 150, 500, 900));
  await page.getByTestId('open-replay').click();
  const dlg = page.getByTestId('replay-dialog');
  await expect(dlg).toBeVisible();
  await expect(page.getByTestId('replay-progress')).toContainText('/3');
  await expect(page.getByTestId('replay-progress')).toContainText('3/3', { timeout: 20000 });
  const painted = await page.evaluate(() => {
    const c = document.querySelector('[data-testid=replay-dialog] canvas') as HTMLCanvasElement;
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    let dark = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 2] - d[i] > 25) dark++;
    return dark;
  });
  expect(painted).toBeGreaterThan(500);
});

test('9. GitHub Pages sub-path: no asset 404s', async ({ page }) => {
  const bad: string[] = [];
  page.on('response', (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
  await page.goto('./');
  await page.waitForTimeout(3000);
  await newCanvas(page);
  expect(bad).toEqual([]);
  const scripts = await page.evaluate(() => [...document.querySelectorAll('script[src],link[rel=stylesheet]')].map((n) => (n as HTMLScriptElement).src || (n as HTMLLinkElement).href));
  for (const s of scripts.filter((s) => s.includes('localhost'))) expect(s).toContain('/virtual-painting-atelier/');
});

test('10. returning to the studio shows the latest work on the easel', async ({ page }) => {
  await newCanvas(page);
  await draw(page, line(150, 300, 900, 300));
  await page.getByTestId('back-studio').click();
  await expect(page.getByTestId('studio-home')).toBeVisible();
  await expect(page.getByTestId('home-continue')).toBeEnabled();
  await expect(page.getByTestId('home-continue')).toContainText('未命名作品');
  await page.screenshot({ path: 'test-results/studio-latest.png' });
});

test('11. touch: one finger paints a full stroke, two fingers pinch-zoom without painting', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await newCanvas(page);
  const box = (await page.getByTestId('stage').boundingBox())!;
  const cdp = await ctx.newCDPSession(page);
  const touch = (type: string, pts: { x: number; y: number }[]) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts } as never);
  await touch('touchStart', [{ x: box.x + 40, y: box.y + 100 }]);
  for (let i = 1; i <= 20; i++) { await touch('touchMove', [{ x: box.x + 40 + i * 10, y: box.y + 100 + i * 4 }]); await page.waitForTimeout(16); }
  await touch('touchEnd', []);
  await page.waitForTimeout(100);
  const n = await page.evaluate(() => (window as any).__atelier.engine.layers[0].ops[0].points.length);
  expect(n).toBeGreaterThan(15);
  const zoom0 = await page.getByTestId('zoom-label').textContent();
  const c = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await touch('touchStart', [{ x: c.x - 30, y: c.y }, { x: c.x + 30, y: c.y }]);
  for (let i = 1; i <= 10; i++) { await touch('touchMove', [{ x: c.x - 30 - i * 8, y: c.y }, { x: c.x + 30 + i * 8, y: c.y }]); await page.waitForTimeout(16); }
  await touch('touchEnd', []);
  expect(await page.getByTestId('zoom-label').textContent()).not.toBe(zoom0);
  expect(await page.evaluate(() => (window as any).__atelier.engine.strokeCount)).toBe(1);
  await ctx.close();
});

test('12. import an image as a base layer (底圖): undoable, saved, replayed', async ({ page }) => {
  await newCanvas(page, { size: 'square' });
  // a 400×200 test picture (red left half, blue right half)
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 400; c.height = 200;
    const x = c.getContext('2d')!; x.fillStyle = '#d02020'; x.fillRect(0, 0, 200, 200); x.fillStyle = '#2040d0'; x.fillRect(200, 0, 200, 200);
    return c.toDataURL('image/png').split(',')[1];
  });
  const activeBefore = await page.evaluate(() => (window as any).__atelier.engine.activeLayerId);
  await page.getByTestId('import-base-input').setInputFiles({ name: 'ref.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') });
  await expect(page.getByTestId('layer-row')).toHaveCount(2);
  const info = await page.evaluate(() => {
    const e = (window as any).__atelier.engine;
    const base = e.layers[0];
    const px = (x: number, y: number) => Array.from(e.rasters.get(base.id).canvas.getContext('2d').getImageData(x, y, 1, 1).data);
    return { name: base.name, opacity: base.opacity, active: e.activeLayerId, left: px(300, 700), right: px(1100, 700), outside: px(700, 100) };
  });
  expect(info.name).toContain('底圖');
  expect(info.opacity).toBeCloseTo(0.6);
  expect(info.active).toBe(activeBefore);               // painting continues on the user's layer
  expect(info.left[0]).toBeGreaterThan(180); expect(info.left[2]).toBeLessThan(80);
  expect(info.right[2]).toBeGreaterThan(180);
  expect(info.outside[3]).toBe(0);                       // fitted with letterbox (2:1 into square)
  // drawing still lands on the top layer, not the base
  await draw(page, line(200, 700, 1200, 700));
  expect((await layerStats(page, { x: 0, y: 0, w: 1400, h: 1400 }, 1)).covered).toBeGreaterThan(300);
  await page.getByTestId('undo').click();               // stroke
  await page.getByTestId('undo').click();               // import
  await expect(page.getByTestId('layer-row')).toHaveCount(1);
  await page.getByTestId('redo').click();
  await expect(page.getByTestId('layer-row')).toHaveCount(2);
  expect((await layerStats(page, { x: 0, y: 0, w: 1400, h: 1400 }, 0)).covered).toBeGreaterThan(100000);
  // persists across reload
  await page.evaluate(() => (window as any).__atelier.saveNow());
  await page.reload();
  await page.getByTestId('home-continue').click();
  await page.waitForFunction(() => !!(window as any).__atelier?.engine);
  expect((await layerStats(page, { x: 0, y: 0, w: 1400, h: 1400 }, 0)).covered).toBeGreaterThan(100000);
  // replay shows the base picture
  await page.getByTestId('open-replay').click();
  await expect(page.getByTestId('replay-progress')).toContainText('1/1', { timeout: 15000 });
  const blueish = await page.evaluate(() => {
    const c = document.querySelector('[data-testid=replay-dialog] canvas') as HTMLCanvasElement;
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 2] - d[i] > 40) n++;
    return n;
  });
  expect(blueish).toBeGreaterThan(5000);
});
