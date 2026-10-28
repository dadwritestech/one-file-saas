const { test, expect } = require('@playwright/test');
const fs = require('fs');
const { open } = require('./helpers');

const cents = (page, name) => page.locator(`.bal[data-name="${name}"]`).getAttribute('data-cents').then(Number);

test('splitter: seeded balances, uneven split rounds to the cent, settle up, CSV', async ({ page }) => {
  const g = await open(page, 'apps/splitter.html');
  await expect(page.locator('#gName')).toHaveText('Lisbon trip');
  // hand-checked: equal, exact, percent and shares splits plus one payment
  await expect.poll(() => cents(page, 'Ana')).toBe(40580);
  await expect.poll(() => cents(page, 'Ben')).toBe(-23994);
  await expect.poll(() => cents(page, 'Chloé')).toBe(-14396);
  await expect.poll(() => cents(page, 'Dev')).toBe(-2190);
  await expect(page.locator('#balSum')).toHaveText('Σ 0 ✓');
  await expect(page.locator('.xfer')).toHaveCount(3);

  // 100.01 split three ways: 33.34 + 33.34 + 33.33, nothing lost
  await page.locator('#addExp').click();
  await page.locator('#xDesc').fill('Taxi to airport');
  await page.locator('#xAmt').fill('100.01');
  await page.locator('#xPayer').selectOption({ label: 'Dev' });
  await page.getByLabel('Include Ana').uncheck();
  await expect(page.locator('#xCheck')).toContainText('3 people');
  await page.locator('#xSave').click();
  await expect(page.locator('.exp[data-desc="Taxi to airport"]')).toContainText('split equally · 3');
  await expect.poll(() => cents(page, 'Dev')).toBe(-2190 + 10001 - 3333);
  await expect.poll(() => cents(page, 'Ben')).toBe(-23994 - 3334);
  await expect(page.locator('#balSum')).toHaveText('Σ 0 ✓');

  // percent split that doesn't reach 100% can't be saved
  await page.locator('#addExp').click();
  await page.locator('#xDesc').fill('Museum');
  await page.locator('#xAmt').fill('40');
  await page.locator('#xModes button[data-m="percent"]').click();
  await page.getByLabel('Ana percent').fill('10');
  await expect(page.locator('#xCheck')).toContainText('% left');
  await expect(page.locator('#xSave')).toBeDisabled();
  await page.getByLabel('Ana percent').fill('25');
  await expect(page.locator('#xCheck')).toHaveText('100% ✓');
  await page.locator('#xSave').click();
  await expect(page.locator('.exp[data-desc="Museum"]')).toContainText('by percent');

  // record every suggested transfer: the group ends settled
  while (await page.locator('.xfer button').count()) await page.locator('.xfer button').first().click();
  await expect(page.locator('.settled')).toContainText('All settled up');
  for (const n of ['Ana', 'Ben', 'Chloé', 'Dev']) await expect.poll(() => cents(page, n)).toBe(0);
  await expect(page.locator('.grp[aria-current="true"]')).toContainText('settled up');

  await page.reload();
  await expect(page.locator('.settled')).toBeVisible();
  await expect(page.locator('.exp[data-desc="Taxi to airport"]')).toBeVisible();

  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#csv').click()]);
  const csv = fs.readFileSync(await dl.path(), 'utf8');
  expect(csv.split('\r\n')[0]).toBe('Date,Type,Description,Category,Amount,Paid by,Ana,Ben,Chloé,Dev');
  expect(csv).toMatch(/expense,Taxi to airport,Transport|expense,Taxi to airport,Food & drink/);
  expect(csv).toContain(',100.01,Dev,0.00,-33.34,-33.34,66.68');
  await g.clean();
});

test('splitter: new group with members, exact split, import guard', async ({ page }) => {
  const g = await open(page, 'apps/splitter.html');
  await page.locator('#newGroup').click();
  await page.locator('#gdName').fill('Ski weekend');
  for (const n of ['Kai', 'Mo']) { await page.locator('#gdNew').fill(n); await page.locator('#gdNew').press('Enter'); }
  await page.locator('#gdSave').click();
  await expect(page.locator('#gName')).toHaveText('Ski weekend');
  await expect(page.locator('.grp')).toHaveCount(3);
  await expect(page.locator('#list .empty')).toBeVisible();

  await page.locator('#addExp').click();
  await page.locator('#xDesc').fill('Lift passes');
  await page.locator('#xAmt').fill('120');
  await page.locator('#xModes button[data-m="exact"]').click();
  await page.getByLabel('Kai exact').fill('50');
  await expect(page.locator('#xCheck')).toHaveText('€10.00 left to assign'); // 50 + prefilled 60
  await page.getByLabel('Mo exact').fill('70');
  await expect(page.locator('#xCheck')).toHaveText('Adds up ✓');
  await page.locator('#xSave').click();
  await expect.poll(() => cents(page, 'Kai')).toBe(7000);
  await expect.poll(() => cents(page, 'Mo')).toBe(-7000);
  await expect(page.locator('.xfer')).toContainText('Mo');

  await page.locator('#impFile').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"nope":1}') });
  await expect(page.locator('#toast')).toHaveText('Not a Halves export');
  await expect(page.locator('#gName')).toHaveText('Ski weekend');
  await g.clean();
});
