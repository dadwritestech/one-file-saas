const { test, expect } = require('@playwright/test');
const fs = require('fs');
const { open } = require('./helpers');

// A fixed Wednesday afternoon keeps the seeded week and the chart deterministic.
test.beforeEach(async ({ page }) => { await page.clock.install({ time: new Date(2026, 9, 28, 14, 0, 0) }); });

test('pomodoro: timer, reload while running, manual entry, project, CSV', async ({ page }) => {
  const g = await open(page, 'apps/pomodoro.html');
  await expect(page.locator('#weekLabel')).toHaveText('This week');
  await expect(page.locator('#chart rect')).not.toHaveCount(0);

  await page.locator('#desc').fill('Write tests');
  await page.locator('#proj').selectOption({ label: 'Acme redesign · Acme GmbH' });
  await page.getByLabel('Start timer').click();
  await page.clock.fastForward('01:30:00');
  await expect(page.locator('#clock')).toHaveText('1:30:00');
  await expect(page.locator('#liveDur')).toHaveText('1:30:00');
  await page.getByLabel('Stop timer').click();
  const today = page.locator('.day', { hasText: 'Today' });
  await expect(today.locator('.entry').first().locator('.d')).toHaveValue('Write tests');
  await expect(today.locator('.day-h')).toContainText('1:45:00'); // + seeded 15-min standup

  // a running timer survives a reload because only its start time is stored
  await page.locator('h2#weekLabel').click();
  await page.keyboard.press('s');
  await page.clock.fastForward('10:00');
  await page.reload();
  await expect(page.locator('#clock')).toHaveText(/^0:10:0\d$/);
  await expect(page.locator('#desc')).toHaveValue('Write tests');
  await page.getByLabel('Stop timer').click();

  // manual entry with N
  await page.locator('h2#weekLabel').click();
  await page.keyboard.press('n');
  await page.locator('#eDesc').fill('Planning');
  await page.locator('#eStart').fill('08:00');
  await page.locator('#eEnd').fill('08:45');
  await page.locator('#eSave').click();
  await expect(today.locator('.entry', { has: page.locator('.d[data-desc="Planning"]') })).toContainText('0:45:00');

  await page.locator('#newProj').click();
  await page.locator('#pName').fill('Side quest');
  await page.locator('#pRate').fill('50');
  await page.locator('#pSave').click();
  await expect(page.locator('#projList')).toContainText('Side quest');
  await expect(page.locator('#proj option:checked')).toHaveText('Side quest');

  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#csvWeek').click()]);
  const csv = fs.readFileSync(await dl.path(), 'utf8');
  expect(csv.split('\r\n')[0]).toBe('Date,Start,End,Duration (h),Project,Client,Description,Amount (EUR)');
  expect(csv).toContain('2026-10-28,14:00,15:30,1.50,Acme redesign,Acme GmbH,Write tests,127.50');
  await g.clean();
});

test('pomodoro: focus session auto-logs and the break starts on its own', async ({ page }) => {
  const g = await open(page, 'apps/pomodoro.html');
  await page.locator('#mPomo').click();
  await expect(page.locator('#pomo')).toBeVisible();
  await expect(page.locator('#pClock')).toHaveText('25:00');
  await page.locator('#desc').fill('Deep spec');
  await page.getByLabel('Start timer').click();
  await page.clock.fastForward('12:00');
  await expect(page.locator('#pClock')).toHaveText('13:00');
  await page.clock.fastForward('13:01');
  await expect(page.locator('#pPhase')).toHaveText('Short break');
  await expect(page.locator('#dots span.on')).toHaveCount(1);
  const logged = page.locator('.entry', { has: page.locator('.d[data-desc="Deep spec"]') });
  await expect(logged).toContainText('0:25:00');
  await expect(logged).toContainText('🍅');
  await page.locator('#skip').click();
  await expect(page.locator('#pPhase')).toHaveText('Focus');
  await expect(page.getByLabel('Start timer')).toBeVisible();
  await g.clean();
});
