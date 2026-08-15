import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 5173);

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.mjs',
  // 地図の描画は並列にすると GPU 周りで揺れることがあるので直列にする
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  outputDir: 'test-results',

  use: {
    baseURL: `http://127.0.0.1:${PORT}/`,
    // 実機に近い縦長。deviceScaleFactor を固定しないと画像が一致しない
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 2,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 } },
  ],

  webServer: {
    command: 'node support/server.mjs',
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 30000,
  },
});
