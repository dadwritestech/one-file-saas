const { test, expect } = require('@playwright/test');
const { open } = require('./helpers');

test('scheduler: time zone math handles DST', async ({ page }) => {
  const g = await open(page, 'apps/scheduler.html');
  const r = await page.evaluate(() => [
    zoned(2026, 3, 29, 9, 0, 'Europe/Berlin') === Date.UTC(2026, 2, 29, 7, 0), // CEST, UTC+2
    zoned(2026, 3, 28, 9, 0, 'Europe/Berlin') === Date.UTC(2026, 2, 28, 8, 0), // CET, UTC+1
    zoned(2026, 11, 1, 9, 0, 'America/New_York') === Date.UTC(2026, 10, 1, 14, 0), // EST after fall back
  ]);
  expect(r).toEqual([true, true, true]);
  await g.clean();
});

test('scheduler: host shares link, booker books, booking lands in host list', async ({ page }) => {
  const g = await open(page, 'apps/scheduler.html');
  await page.locator('#hostName').fill('Ada Host');
  await expect(page.locator('#link')).toContainText('#book=z');
  const link = await page.locator('#link').textContent();

  await page.goto(link);
  await expect(page.locator('.host')).toHaveText('Ada Host');
  await page.locator('.cal button.avail').first().click();
  await page.locator('.slot button').first().click();
  await page.locator('.slot.chosen .go').click();
  await page.locator('input[name=name]').fill('Grace Booker');
  await page.locator('input[name=email]').fill('grace@example.com');
  await page.getByRole('button', { name: 'Confirm booking' }).click();
  await expect(page.getByText('You are booked')).toBeVisible();
  await expect(page.locator('#bookingCode')).toContainText('SLOT-');

  await page.goto(link.split('#')[0]);
  await expect(page.locator('#bookList')).toContainText('Grace Booker');
  await g.clean();
});
