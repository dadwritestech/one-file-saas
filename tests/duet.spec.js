const { test, expect } = require('@playwright/test');
const { open } = require('./helpers');

test('duet: the CRDT converges whatever order edits arrive in', async ({ page }) => {
  const g = await open(page, 'apps/duet.html');
  const result = await page.evaluate(() => {
    // three sites edit the same text concurrently; each sees the others' ops shuffled and late
    let seed = 7;
    const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
    const base = new Doc({ id: 't' }, 'base');
    const start = base.edit('', 'the quick brown fox');
    const sites = ['aa', 'bb', 'cc'].map((s) => { const d = new Doc({ id: 't' }, s); d.apply(...start); return d; });
    const log = [];
    for (let round = 0; round < 60; round++) {
      const d = sites[rnd(3)];
      const before = d.text();
      const at = rnd(before.length + 1);
      const after = rnd(3) === 0 && before.length
        ? before.slice(0, at) + before.slice(Math.min(before.length, at + 1 + rnd(4)))
        : before.slice(0, at) + 'xyz'.slice(0, 1 + rnd(3)) + before.slice(at);
      log.push(...d.edit(before, after));
    }
    for (const d of sites) {
      const shuffled = [...log].sort(() => rnd(3) - 1); // children can arrive before parents
      d.apply(...shuffled);
    }
    return { texts: sites.map((d) => d.text()), pending: sites.map((d) => d.pending.length) };
  });
  expect(result.pending).toEqual([0, 0, 0]);
  expect(new Set(result.texts).size).toBe(1);
  expect(result.texts[0].length).toBeGreaterThan(10);
  await g.clean();
});

test('duet: two browsers connect with an invite + reply and edit together live', async ({ browser }) => {
  // two separate contexts = two people with their own storage
  const a = await browser.newContext(), b = await browser.newContext();
  const host = await a.newPage(), guest = await b.newPage();
  const gh = await open(host, 'apps/duet.html');
  const gg = await open(guest, 'apps/duet.html');
  for (const p of [host, guest]) {
    await p.locator('#shareBtn').click();
    await p.locator('#stun').uncheck(); // same machine: no STUN, so not a single packet leaves it
  }
  await host.locator('#myName').fill('Asha');
  await guest.locator('#myName').fill('Ben');

  await host.locator('#title').fill('Trip notes');
  await host.locator('#ed').fill('Packing list\n');
  await host.locator('#inviteBtn').click();
  const invite = await host.locator('[data-invite]').inputValue({ timeout: 10000 });
  expect(invite.length).toBeGreaterThan(100);

  await guest.locator('#joinCode').fill(invite);
  await guest.locator('#joinGo').click();
  await expect(guest.locator('[data-answer]')).toBeVisible({ timeout: 10000 });
  const reply = await guest.locator('[data-answer]').inputValue();

  await host.locator('[data-reply]').fill(reply);
  await host.locator('[data-connect]').click();
  await expect(host.locator('#status')).toHaveText('Live · 2 people', { timeout: 15000 });
  await expect(guest.locator('#status')).toHaveText('Live · 2 people');
  await expect(guest.locator('#ed')).toHaveValue('Packing list\n');
  await expect(guest.locator('#title')).toHaveValue('Trip notes');
  await expect(host.locator('.chip[title="Ben"]')).toBeVisible();

  // both type at once in different places; both copies end up identical and keep both edits
  await host.locator('#ed').click();
  await host.keyboard.press('Control+End');
  await guest.locator('#ed').click();
  await guest.keyboard.press('Control+Home');
  await Promise.all([host.keyboard.type('- passport\n', { delay: 15 }), guest.keyboard.type('TODO ', { delay: 15 })]);
  await expect.poll(async () => [await host.locator('#ed').inputValue(), await guest.locator('#ed').inputValue()], { timeout: 5000 })
    .toEqual(['TODO Packing list\n- passport\n', 'TODO Packing list\n- passport\n']);

  // the guest's caret stayed where they were typing while the host's text arrived
  await guest.keyboard.type('!');
  await expect(host.locator('#ed')).toHaveValue('TODO !Packing list\n- passport\n');

  // deletes and title edits travel too, and survive a reload on the guest side
  await host.locator('#ed').fill('Packing: passport');
  await expect(guest.locator('#ed')).toHaveValue('Packing: passport');
  await guest.locator('#title').fill('Lisbon trip');
  await expect(host.locator('#title')).toHaveValue('Lisbon trip');
  await guest.waitForTimeout(400);
  await guest.reload();
  await expect(guest.locator('#ed')).toHaveValue('Packing: passport');
  await expect(guest.locator('.docs button', { hasText: 'Lisbon trip' })).toBeVisible();

  await gh.clean();
  await gg.clean();
  await a.close(); await b.close();
});

test('duet: copies edited apart merge when they sync again', async ({ page }) => {
  const g = await open(page, 'apps/duet.html');
  const merged = await page.evaluate(() => {
    const a = new Doc({ id: 'm' }, 'a1');
    a.edit('', 'shared line\n');
    const b = new Doc(JSON.parse(JSON.stringify(a.toJSON())), 'b1'); // b got a copy earlier
    a.edit(a.text(), a.text() + 'from a\n');
    b.edit(b.text(), 'from b\n' + b.text());
    a.apply(...b.allOps()); b.apply(...a.allOps());
    return [a.text(), b.text()];
  });
  expect(merged).toEqual(['from b\nshared line\nfrom a\n', 'from b\nshared line\nfrom a\n']);
  await g.clean();
});

test('duet: the host relays edits between guests (three people)', async ({ browser }) => {
  const ctxs = await Promise.all([0, 1, 2].map(() => browser.newContext()));
  const [host, g1, g2] = await Promise.all(ctxs.map((c) => c.newPage()));
  const guards = [];
  for (const p of [host, g1, g2]) {
    guards.push(await open(p, 'apps/duet.html'));
    await p.locator('#shareBtn').click();
    await p.locator('#stun').uncheck();
  }
  await host.locator('#ed').fill('agenda\n');
  for (const guest of [g1, g2]) {
    await host.locator('#inviteBtn').click();
    const card = host.locator('.card[data-status="inviting"]');
    const invite = await card.locator('[data-invite]').inputValue({ timeout: 10000 });
    await guest.locator('#joinCode').fill(invite);
    await guest.locator('#joinGo').click();
    const reply = await guest.locator('[data-answer]').inputValue({ timeout: 10000 });
    await card.locator('[data-reply]').fill(reply);
    await card.locator('[data-connect]').click();
    await expect(guest.locator('#status')).toHaveText('Live · 2 people', { timeout: 15000 });
  }
  await expect(host.locator('#status')).toHaveText('Live · 3 people');
  await g1.locator('#ed').click();
  await g1.keyboard.press('Control+End');
  await g1.keyboard.type('from guest one');
  await expect(g2.locator('#ed')).toHaveValue('agenda\nfrom guest one'); // g1 → host → g2
  for (const gd of guards) await gd.clean();
  for (const c of ctxs) await c.close();
});
