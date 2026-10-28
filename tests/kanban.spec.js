const { test, expect } = require('@playwright/test');
const { open } = require('./helpers');

test('kanban: add a card, drag it to another column, survives reload', async ({ page }) => {
  const g = await open(page, 'apps/kanban.html');
  const backlog = page.locator('.col').first();
  await backlog.getByText('+ Add a card').click();
  await page.keyboard.type('Ship v0');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await expect(backlog.locator('.card', { hasText: 'Ship v0' })).toBeVisible();

  const done = page.locator('.col').last();
  await page.locator('.card', { hasText: 'Ship v0' }).dragTo(done.locator('.col-body'));
  await expect(done.locator('.card', { hasText: 'Ship v0' })).toBeVisible();

  // open the card, add a label and checklist item
  await done.locator('.card', { hasText: 'Ship v0' }).click();
  await page.getByLabel('green label').click();
  await page.getByText('+ Add item').click();
  await page.keyboard.type('Write tests');
  await page.locator('#dSave').click();
  await expect(done.locator('.card', { hasText: 'Ship v0' }).locator('.meta')).toContainText('0/1');

  await page.reload();
  await expect(page.locator('.col').last().locator('.card', { hasText: 'Ship v0' })).toBeVisible();
  await g.clean();
});
