/**
 * E2E 테스트 공용 헬퍼
 */
import { Page, expect } from '@playwright/test'

export const SEED = {
  admin:    { email: 'admin@pca.local',    password: 'Admin1234!' },
  engineer: { email: 'engineer@pca.local', password: 'Engineer123!' },
  viewer:   { email: 'viewer@pca.local',   password: 'Viewer1234!' },
} as const

export const SAMPLE_DATA = Array.from({ length: 30 }, (_, i) =>
  (10.0 + (i % 5) * 0.05 - 0.1).toFixed(4)
).join('\n')

/** 로그인하고 dashboard로 이동 */
export async function login(page: Page, role: keyof typeof SEED = 'engineer') {
  const { email, password } = SEED[role]
  await page.goto('/login')
  await page.getByLabel('이메일').fill(email)
  await page.getByLabel('비밀번호').fill(password)
  await page.getByRole('button', { name: '로그인' }).click()
  await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 })
}

/** localStorage 에서 직접 토큰 설정 (API mock 사전 주입) */
export async function setTokens(page: Page, access: string, refresh: string) {
  await page.evaluate(([a, r]) => {
    localStorage.setItem('access_token', a)
    localStorage.setItem('refresh_token', r)
  }, [access, refresh])
}
