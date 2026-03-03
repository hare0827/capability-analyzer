import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E 설정 (사양서 §13)
 * 실행: npx playwright test
 * CI:   npx playwright test --reporter=github
 *
 * 환경변수:
 *   BASE_URL  — 테스트 대상 URL (default: http://localhost:5173)
 *   CI        — CI 환경 여부
 */

const baseURL = process.env.BASE_URL ?? 'http://localhost:5173'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: process.env.CI
    ? [['github'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : [['html', { open: 'on-failure' }]],

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],

  // 로컬 dev 서버 자동 시작 (CI에서는 이미 기동되어 있음)
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 30_000,
      },
})
