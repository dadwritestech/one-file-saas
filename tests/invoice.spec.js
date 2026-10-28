const { test, expect } = require('@playwright/test');
const { open } = require('./helpers');

test('invoice: new invoice, line items, tax total, mark paid, print to PDF', async ({ page }) => {
  const g = await open(page, 'apps/invoice.html');
  await expect(page.locator('.inv')).toHaveCount(3);
  await expect(page.locator('.pill.overdue')).toHaveCount(1);

  await page.locator('#newInv').click();
  const year = new Date().getFullYear();
  await expect(page.getByLabel('Invoice number')).toHaveValue(`INV-${year}-004`);
  await page.getByLabel('Client name').fill('Contoso Labs');
  await page.getByLabel('Client address').fill('1 Main St\nSpringfield');
  await page.getByLabel('Currency').selectOption('USD');
  await page.getByLabel('Line description').first().fill('Design sprint');
  await page.getByLabel('Quantity').first().fill('3');
  await page.getByLabel('Unit price').first().fill('120');
  await page.locator('#addLine').click();
  await page.getByLabel('Line description').nth(1).fill('Hosting');
  await page.getByLabel('Unit price').nth(1).fill('40');
  await page.getByLabel('Tax rate').fill('10');
  // (360 + 40) * 1.10 = 440
  await expect(page.locator('#total')).toContainText('440.00');
  await expect(page.locator('.inv.on')).toContainText('Contoso Labs');

  await page.locator('#status').selectOption('paid');
  await expect(page.locator('.stamp')).toHaveText('PAID');
  await expect(page.locator('.inv.on .pill')).toHaveText('paid');

  await page.reload();
  await expect(page.locator('#total')).toContainText('440.00');
  await expect(page.getByLabel('Client name')).toHaveValue('Contoso Labs');

  // print view hides the app chrome and keeps one A4 page
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('aside')).toBeHidden();
  await expect(page.locator('#addLine')).toBeHidden();
  await expect(page.locator('.paper')).toBeVisible();
  const pdf = await page.pdf({ preferCSSPageSize: true });
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  expect(pages).toBe(1);
  await g.clean();
});
