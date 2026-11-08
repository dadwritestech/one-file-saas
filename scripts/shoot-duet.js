// Usage: node scripts/shoot-duet.js docs/duet.png [dark]
// Connects two browsers through Duet (no STUN) and photographs them side by side mid-edit.
const { chromium } = require('@playwright/test');
const fs = require('fs'); const path = require('path'); const { pathToFileURL } = require('url');
(async () => {
  const [out = 'docs/duet.png', scheme = 'light'] = process.argv.slice(2);
  const url = pathToFileURL(path.resolve('apps/duet.html')).href;
  const b = await chromium.launch();
  const mk = async () => (await b.newContext({ viewport: { width: 1100, height: 620 }, colorScheme: scheme })).newPage();
  const [a, g] = [await mk(), await mk()];
  for (const [p, name] of [[a, 'Asha'], [g, 'Ben']]) {
    await p.goto(url); await p.click('#shareBtn'); await p.uncheck('#stun'); await p.fill('#myName', name);
  }
  await a.fill('#title', 'Launch checklist');
  await a.fill('#ed', 'Launch checklist\n\n- write the post\n- record the demo GIF\n');
  await a.click('#inviteBtn');
  await g.fill('#joinCode', await a.locator('[data-invite]').inputValue({ timeout: 10000 }));
  await g.click('#joinGo');
  await a.fill('[data-reply]', await g.locator('[data-answer]').inputValue({ timeout: 10000 }));
  await a.click('[data-connect]');
  await g.locator('#status', { hasText: 'Live' }).waitFor();
  await a.click('#ed'); await a.keyboard.press('Control+End'); await a.keyboard.type('- reply to every comment\n');
  await g.click('#ed'); await g.keyboard.press('Control+End'); await g.keyboard.type('- check the link works on mobile');
  await a.click('#closeLive');
  await a.waitForTimeout(400);
  const shots = [await a.screenshot(), await g.screenshot()].map((x) => 'data:image/png;base64,' + x.toString('base64'));
  const frame = await (await b.newContext({ viewport: { width: 2240, height: 740 }, colorScheme: scheme })).newPage();
  await frame.setContent(`<body style="margin:0;padding:40px 20px;display:flex;gap:40px;justify-content:center;background:${scheme === 'dark' ? '#111' : '#e9e6df'};font:600 15px Segoe UI,sans-serif;color:#888">
    ${shots.map((s, i) => `<figure style="margin:0;text-align:center"><img src="${s}" style="width:1060px;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.25)"><figcaption style="margin-top:10px">${i ? "Ben's browser" : "Asha's browser"}</figcaption></figure>`).join('')}</body>`);
  await frame.screenshot({ path: out, fullPage: true });
  await b.close();
  console.log('wrote', out, fs.statSync(out).size, 'bytes');
})();
