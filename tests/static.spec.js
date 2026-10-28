// Contract every entry must meet: one file, under the line budget, nothing loaded from the network.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { ROOT } = require('./helpers');

const files = ['index.html', ...fs.readdirSync(path.join(ROOT, 'apps')).filter((f) => f.endsWith('.html')).map((f) => 'apps/' + f)];

for (const f of files) {
  test(`static contract: ${f}`, () => {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const lines = src.split('\n').length;
    expect(lines, 'line budget').toBeLessThanOrEqual(1500);
    expect(src).not.toMatch(/<script[^>]+src=/i);
    expect(src).not.toMatch(/<link[^>]+rel=["']?stylesheet/i);
    expect(src).not.toMatch(/@import|url\(\s*['"]?https?:/i);
    expect(src).not.toMatch(/fetch\(\s*['"`]https?:/i);
    if (f.startsWith('apps/')) {
      expect(src, 'header comment names what it replaces').toMatch(/Replaces:/);
      expect(src, 'every app offers JSON export').toMatch(/Export/);
    }
  });
}
