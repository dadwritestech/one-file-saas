const { test, expect } = require('@playwright/test');
const { open } = require('./helpers');

test('forms: build a question, fill the form, see the response summary', async ({ page }) => {
  const g = await open(page, 'apps/forms.html');
  await page.getByRole('button', { name: '+ Email' }).click();
  await page.getByLabel('Question', { exact: true }).fill('Where can we reach you?');
  await expect(page.locator('.qi').last()).toContainText('Where can we reach you?');

  await page.getByRole('tab', { name: 'Fill' }).click();
  await page.getByRole('button', { name: 'Start' }).click();
  await page.keyboard.type('Ada');
  await page.keyboard.press('Enter');
  await page.keyboard.press('b'); // "Search"
  await page.getByRole('button', { name: '4', exact: true }).click();
  await page.getByRole('button', { name: /Boards/ }).click();
  await page.getByRole('button', { name: /Reports/ }).click();
  await page.getByRole('button', { name: 'OK ✓' }).click();
  await page.getByRole('button', { name: '9', exact: true }).click();
  await page.locator('textarea.ans').fill('Dark mode please');
  await page.getByRole('button', { name: 'OK ✓' }).click();
  await page.locator('input.ans').fill('not-an-email');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.locator('.ferr')).toContainText('email');
  await page.locator('input.ans').fill('ada@example.com');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Thanks!')).toBeVisible();

  await page.getByRole('tab', { name: /Responses/ }).click();
  await expect(page.locator('#respCount')).toHaveText('1');
  await expect(page.locator('.sumcard', { hasText: 'How did you hear' })).toContainText('Search · 1');
  await expect(page.locator('table')).toContainText('ada@example.com');
  await g.clean();
});

test('forms: a respondent on another device gets a code the owner can import', async ({ page }) => {
  const g = await open(page, 'apps/forms.html');
  await page.locator('.qi', { hasText: 'Welcome' }).click();
  await expect(page.locator('#shareLink')).toContainText('#fill=z');
  const link = await page.locator('#shareLink').textContent();
  const base = link.split('#')[0];
  const owner = await page.evaluate(() => localStorage.getItem('ofs.forms.v1'));

  await page.evaluate(() => localStorage.clear()); // simulate a stranger's browser
  await page.goto(link);
  await page.getByRole('button', { name: 'Start' }).click();
  await page.keyboard.type('Grace'); await page.keyboard.press('Enter');
  await page.keyboard.press('a');
  await page.getByRole('button', { name: '5', exact: true }).click();
  await page.getByRole('button', { name: 'OK ✓' }).click();
  await page.getByRole('button', { name: '10', exact: true }).click();
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.locator('#respCode')).toContainText('ASKS-');
  const code = await page.locator('#respCode').textContent();

  await page.evaluate((s) => localStorage.setItem('ofs.forms.v1', s), owner);
  await page.goto(base);
  await page.getByRole('tab', { name: /Responses/ }).click();
  await page.locator('#codeIn').fill(code);
  await page.getByRole('button', { name: 'Add response' }).click();
  await expect(page.locator('#respCount')).toHaveText('1');
  await expect(page.locator('table')).toContainText('Grace');
  await g.clean();
});
