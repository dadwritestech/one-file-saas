// Usage: node scripts/shoot.js apps/kanban.html out.png [width] [height] [dark]
const { chromium } = require('@playwright/test');
const path = require('path'); const { pathToFileURL } = require('url');
(async () => {
  const [file, out, w = 1280, hgt = 800, scheme = 'light'] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: +w, height: +hgt }, colorScheme: scheme, deviceScaleFactor: 1 });
  await p.goto(pathToFileURL(path.resolve(file)).href);
  await p.waitForTimeout(900);
  await p.screenshot({ path: out });
  await b.close();
})();
