const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { open, ROOT } = require('./helpers');

test('gallery: receipt totals, ticks persist, every card opens its app', async ({ page }) => {
  const g = await open(page, 'index.html');
  await expect(page.locator('.item')).toHaveCount(11);
  await expect(page.locator('#total')).toHaveText('$1,354');
  await expect(page.locator('#count')).toHaveText('11 / 11');

  await page.locator('.item input[data-app="forms"]').uncheck();
  await page.locator('.item input[data-app="habits"]').uncheck();
  await expect(page.locator('#total')).toHaveText('$1,024'); // 1354 − 300 − 30
  await expect(page.locator('#monthly')).toHaveText('$85.33');
  await page.reload();
  await expect(page.locator('#total')).toHaveText('$1,024');
  await expect(page.locator('.item input[data-app="forms"]')).not.toBeChecked();

  await page.locator('#none').click();
  await expect(page.locator('#total')).toHaveText('$0');
  await expect(page.locator('#stamp')).toBeHidden();
  await page.locator('#all').click();
  await expect(page.locator('#total')).toHaveText('$1,354');

  // every card links to a file that exists, and every app is on the shelf
  const hrefs = await page.locator('.card').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  const apps = fs.readdirSync(path.join(ROOT, 'apps')).filter((f) => f.endsWith('.html')).map((f) => 'apps/' + f);
  expect(hrefs.sort()).toEqual(apps.sort());
  await page.locator('.card[data-app="splitter"]').click();
  await expect(page).toHaveTitle(/Halves/);
  await g.clean();
});
