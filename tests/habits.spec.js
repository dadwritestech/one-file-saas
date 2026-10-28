const { test, expect } = require('@playwright/test');
const { open } = require('./helpers');

test('habits: tick, count, streaks, back-fill, new habit, persists', async ({ page }) => {
  const g = await open(page, 'apps/habits.html');
  await expect(page.locator('.habit')).toHaveCount(4);
  await expect(page.locator('#ringNum')).toHaveText('0/4');

  // seeded 9-day reading streak survives until today is over, then grows when ticked
  await expect(page.locator('#curStreak')).toHaveText('9');
  await page.getByLabel('Tick Read 20 pages').click();
  await expect(page.locator('#curStreak')).toHaveText('10');
  await expect(page.locator('#ringNum')).toHaveText('1/4');

  // count habit: 5/8 → 8/8 is done
  const water = page.locator('.habit', { hasText: 'Drink water' });
  await expect(water).toContainText('5 / 8');
  for (let i = 0; i < 3; i++) await page.getByLabel('Tick Drink water').click();
  await expect(page.getByLabel('Tick Drink water')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#ringNum')).toHaveText('2/4');

  // new habit via the dialog, ticked with its number key
  await page.locator('#newHabit').click();
  await page.locator('#fName').fill('Floss');
  await page.getByLabel('Icon 🌱').click();
  await page.locator('#fSave').click();
  await expect(page.locator('.habit')).toHaveCount(5);
  await page.keyboard.press('5');
  await expect(page.getByLabel('Tick Floss')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#curStreak')).toHaveText('1');

  // back-fill yesterday from the day switcher: streak becomes 2
  await page.locator('#prev').click();
  await expect(page.locator('#dayLabel')).toHaveText('Yesterday');
  await page.getByLabel('Tick Floss').click();
  await expect(page.locator('#curStreak')).toHaveText('2');

  await page.reload();
  await expect(page.locator('.habit')).toHaveCount(5);
  await expect(page.locator('#ringNum')).toHaveText('3/5');
  await page.locator('.habit', { hasText: 'Floss' }).click();
  await expect(page.locator('#curStreak')).toHaveText('2');
  await expect(page.locator('.cells button')).not.toHaveCount(0);
  await g.clean();
});
