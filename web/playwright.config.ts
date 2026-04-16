import process from 'node:process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

/**
 * See https://playwright.dev/docs/test-configuration.
 *
 * This config boots BOTH the API (Bun, :3001) and the web dev server (Vite,
 * :5173) so every test hits the real backend — no mocks.
 */
const WEB_DIR = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(WEB_DIR, '..')
const API_DIR = path.join(ROOT, 'api')
const DB_PATH = path.join(ROOT, 'data', 'when2meet.db')

export default defineConfig({
  testDir: './e2e',
  /* Maximum time one test can run for. */
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    actionTimeout: 0,
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    headless: true,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  /* Boot API and Web together. */
  webServer: [
    {
      command: 'bun run dev',
      cwd: API_DIR,
      port: 3001,
      env: {
        DB_PATH,
        PORT: '3001',
      },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'bun run dev',
      cwd: WEB_DIR,
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})
