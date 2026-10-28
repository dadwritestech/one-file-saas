const { test, expect } = require('@playwright/test');
const fs = require('fs');
const { open } = require('./helpers');

test('link-in-bio: edit profile, add a link, download a script-free page', async ({ page }) => {
  const g = await open(page, 'apps/link-in-bio.html');
  await page.locator('#name').fill('Ada Lovelace');
  await page.locator('#addLink').click();
  const first = page.locator('#links .link').first();
  await first.getByLabel('Link title').fill('Analytical Engine notes');
  await first.getByLabel('Link URL').fill('ada.example.org/notes');
  await first.getByLabel('Highlight link').click();

  // a javascript: URL is flagged and never reaches the page
  await page.locator('#addLink').click();
  await page.locator('#links .link').first().getByLabel('Link title').fill('Evil');
  await page.locator('#links .link').first().getByLabel('Link URL').fill('javascript:alert(1)');
  await expect(page.locator('#links .link').first().getByLabel('Link URL')).toHaveClass(/bad/);

  await page.getByRole('button', { name: 'Theme Midnight' }).click();
  const frame = page.frameLocator('#frame');
  await expect(frame.locator('h1')).toHaveText('Ada Lovelace');
  await expect(frame.locator('a.l.star', { hasText: 'Analytical' })).toHaveAttribute('href', 'https://ada.example.org/notes');
  await expect(frame.getByText('Evil')).toHaveCount(0);
  await expect(page.locator('#size')).toContainText('KB');

  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#dl').click()]);
  const html = fs.readFileSync(await dl.path(), 'utf8');
  expect(dl.suggestedFilename()).toBe('index.html');
  expect(html).toContain('Analytical Engine notes');
  expect(html).toContain('#0e1220'); // midnight theme
  expect(html).not.toContain('<script');
  expect(html).not.toContain('javascript:');

  await page.reload();
  await expect(page.locator('#name')).toHaveValue('Ada Lovelace');
  await g.clean();
});
