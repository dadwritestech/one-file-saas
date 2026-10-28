const path = require('path');
const { pathToFileURL } = require('url');
const { expect } = require('@playwright/test');

const ROOT = path.join(__dirname, '..');
const fileUrl = (rel) => pathToFileURL(path.join(ROOT, rel)).href;

// Opens a file:// page and records console errors, page errors and any request
// that would leave the machine. Every app must keep both lists empty.
async function open(page, rel) {
  const errors = [];
  const external = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (!/^(file|data|blob|about):/.test(r.url())) external.push(r.url());
  });
  await page.goto(fileUrl(rel));
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  return {
    errors,
    external,
    async clean() {
      expect(errors, 'console errors').toEqual([]);
      expect(external, 'external requests').toEqual([]);
    },
  };
}

module.exports = { ROOT, fileUrl, open };
