const { test, expect } = require('@playwright/test');
const { open } = require('./helpers');

async function record(page, ms) {
  await page.locator('#start').click();
  await expect(page.locator('#dock')).toBeVisible();
  await page.waitForTimeout(ms);
  await page.locator('#stop').click();
  await expect(page.locator('#player')).toBeVisible();
}

test('recorder: camera-only take lands in the IndexedDB library and plays', async ({ page }) => {
  const g = await open(page, 'apps/recorder.html');
  await expect(page.locator('.empty')).toBeVisible();
  await page.getByRole('button', { name: /Camera/ }).click();
  await page.getByLabel('Countdown').selectOption('0');
  await record(page, 1500);

  const meta = await page.evaluate(() => new Promise((res) => {
    const v = document.querySelector('#pvVideo');
    const done = () => res({ size: v.src.startsWith('blob:'), w: v.videoWidth });
    v.readyState >= 1 ? done() : v.addEventListener('loadedmetadata', done, { once: true });
  }));
  expect(meta.size).toBe(true);
  expect(meta.w).toBeGreaterThan(0);
  await page.getByRole('button', { name: '2×' }).click();
  expect(await page.locator('#pvVideo').evaluate((v) => v.playbackRate)).toBe(2);
  await page.locator('#pvTitle').fill('Standup update');
  await page.locator('#pvTitle').press('Enter');
  await page.locator('#pvClose').click();

  await page.reload();
  await expect(page.locator('.card')).toHaveCount(1);
  await expect(page.locator('.card .ti')).toHaveText('Standup update');
  await expect(page.locator('#libCount')).toContainText('1 ·');
  await g.clean();
});

test('recorder: screen + camera bubble is composited and can be discarded or kept', async ({ page }) => {
  // Headless Chromium has no screen picker; stand in a canvas stream for getDisplayMedia.
  await page.addInitScript(() => {
    navigator.mediaDevices.getDisplayMedia = async () => {
      const c = document.createElement('canvas'); c.width = 1280; c.height = 720;
      const g = c.getContext('2d'); let i = 0;
      setInterval(() => { g.fillStyle = `hsl(${i++ % 360} 60% 50%)`; g.fillRect(0, 0, 1280, 720); }, 33);
      return c.captureStream(30);
    };
  });
  const g = await open(page, 'apps/recorder.html');
  await expect(page.getByRole('button', { name: /Screen \+ cam/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Countdown').selectOption('0');

  await page.locator('#start').click();
  await page.waitForTimeout(600);
  await page.locator('#pause').click();
  await expect(page.locator('#dock')).toHaveClass(/paused/);
  await page.locator('#cancel').click();
  await expect(page.locator('#dock')).toBeHidden();
  await expect(page.locator('.card')).toHaveCount(0);

  await record(page, 1500);
  const w = await page.locator('#pvVideo').evaluate((v) => new Promise((res) => {
    v.readyState >= 1 ? res(v.videoWidth) : v.addEventListener('loadedmetadata', () => res(v.videoWidth), { once: true });
  }));
  expect(w).toBe(1280);
  await page.locator('#pvClose').click();
  await expect(page.locator('.card')).toHaveCount(1);
  await expect(page.locator('.card .thumb')).toHaveAttribute('style', /data:image\/jpeg/);
  await g.clean();
});
