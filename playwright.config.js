// Headless Chromium with fake camera/mic so the recorder can be exercised for real.
const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: 'tests',
  timeout: 30000,
  workers: 4,
  reporter: [['list']],
  use: {
    browserName: 'chromium',
    headless: true,
    viewport: { width: 1280, height: 800 },
    permissions: ['camera', 'microphone', 'clipboard-read', 'clipboard-write', 'notifications'],
    launchOptions: {
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--auto-select-desktop-capture-source=Entire screen'],
    },
  },
});
