import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 45000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    launchOptions: {
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    },
    screenshot: 'only-on-failure',
    viewport: { width: 390, height: 844 }, // Mobile viewport por defecto
  },
});
