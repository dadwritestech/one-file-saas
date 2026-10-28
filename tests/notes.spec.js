const { test, expect } = require('@playwright/test');
const { open } = require('./helpers');

test('notes: markdown shortcuts, slash menu, to-dos, search, export, persists', async ({ page }) => {
  const g = await open(page, 'apps/notes.html');
  await expect(page.locator('.node')).toHaveCount(5);
  await expect(page.locator('h1.title')).toHaveText('Getting started');
  await expect(page.locator('#crumbs')).toHaveText('👋 Getting started');

  await page.locator('#newRoot').click();
  await expect(page.locator('h1.title')).toBeFocused();
  await page.keyboard.type('Trip plan');
  await page.keyboard.press('Enter');
  await page.keyboard.type('## Packing');
  await expect(page.locator('#blocks .block').first()).toHaveClass(/t-h2/);
  await expect(page.locator('#blocks .t-h2 .c')).toHaveText('Packing');
  await page.keyboard.press('Enter');
  await page.keyboard.type('[] passport');
  await page.keyboard.press('Enter');
  await page.keyboard.type('tickets');
  await expect(page.locator('.t-todo')).toHaveCount(2);
  await page.locator('.t-todo input').first().check();
  await expect(page.locator('.t-todo').first()).toHaveClass(/done/);
  await page.locator('.t-todo .c').last().click();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter'); // empty to-do turns back into text
  await expect(page.locator('.t-todo')).toHaveCount(2);
  await page.keyboard.type('/quo');
  await expect(page.locator('.slash button')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await page.keyboard.type('Pack light.');
  await expect(page.locator('.t-quote .c')).toHaveText('Pack light.');
  await expect(page.locator('.node.on')).toContainText('Trip plan');

  // inline bold survives a save + reload
  await page.keyboard.press('Enter');
  await page.keyboard.press('Control+b');
  await page.keyboard.type('Bold move');
  await expect(page.locator('#blocks .c b')).toHaveText('Bold move');

  await page.reload();
  await expect(page.locator('h1.title')).toHaveText('Trip plan');
  await expect(page.locator('.t-todo')).toHaveCount(2);
  await expect(page.locator('.t-todo input').first()).toBeChecked();
  await expect(page.locator('#blocks .c b')).toHaveText('Bold move');

  // quick switcher searches body text
  await page.locator('.node', { hasText: 'Reading list' }).click();
  await page.keyboard.press('Control+k');
  await page.keyboard.type('passport');
  await expect(page.locator('#qRes button')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await expect(page.locator('h1.title')).toHaveText('Trip plan');

  await page.locator('#menuBtn').click();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#mMd').click()]);
  const md = require('fs').readFileSync(await dl.path(), 'utf8');
  expect(md).toContain('# Trip plan');
  expect(md).toContain('## Packing');
  expect(md).toContain('- [x] passport\n- [ ] tickets');
  expect(md).toContain('> Pack light.');
  expect(md).toContain('**Bold move**');
  await g.clean();
});

test('notes: stored HTML is sanitized on render', async ({ page }) => {
  const g = await open(page, 'apps/notes.html');
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('ofs.notes.v1'));
    s.pages[s.cur].blocks.unshift({ id: 'x', type: 'p', html: 'hi <img src=x onerror="window.pwned=1"><a href="javascript:alert(1)">link</a><script>window.pwned=2</script><b>ok</b>' });
    localStorage.setItem('ofs.notes.v1', JSON.stringify(s));
  });
  await page.reload();
  await expect(page.locator('#blocks .c').first()).toHaveText('hi linkok');
  await expect(page.locator('#doc img')).toHaveCount(0);
  await expect(page.locator('#blocks .c a').first()).not.toHaveAttribute('href', /.+/);
  expect(await page.evaluate(() => window.pwned)).toBeUndefined();
  await g.clean();
});
