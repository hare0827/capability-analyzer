/**
 * E2E: 분석 플로우 (SCR-03/04/05, 사양서 §9.2)
 * - 수동 입력 → Cpk 분석 → 결과 페이지
 * - Dual 모드 전환 확인
 * - 분석 실행 버튼 활성화 조건 확인
 */
import { test, expect } from '@playwright/test'
import { login, SAMPLE_DATA } from './helpers'

test.describe('분석 플로우', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'engineer')
    await page.goto('/analyze')
  })

  test('수동 입력 Cpk 분석 → 결과 페이지 이동', async ({ page }) => {
    // 1. 규격 입력
    await page.getByLabel('USL').fill('10.5')
    await page.getByLabel('LSL').fill('9.5')

    // 2. 데이터 입력
    const textarea = page.locator('textarea').first()
    await textarea.fill(SAMPLE_DATA)

    // 3. 분석 버튼 활성화 대기
    const analyzeBtn = page.getByRole('button', { name: /분석 실행|분석하기/ })
    await expect(analyzeBtn).toBeEnabled({ timeout: 5_000 })

    // 4. 분석 실행
    await analyzeBtn.click()

    // 5. 결과 페이지 이동 확인
    await expect(page).toHaveURL(/result/, { timeout: 15_000 })
    await expect(page.getByText('분석 결과')).toBeVisible()
  })

  test('USL ≤ LSL 일 때 분석 버튼 비활성화', async ({ page }) => {
    await page.getByLabel('USL').fill('9.0')
    await page.getByLabel('LSL').fill('10.0')

    const textarea = page.locator('textarea').first()
    await textarea.fill(SAMPLE_DATA)

    const analyzeBtn = page.getByRole('button', { name: /분석 실행|분석하기/ })
    await expect(analyzeBtn).toBeDisabled()
  })

  test('데이터 4개 이하 → 분석 버튼 비활성화', async ({ page }) => {
    await page.getByLabel('USL').fill('10.5')
    await page.getByLabel('LSL').fill('9.5')

    const textarea = page.locator('textarea').first()
    await textarea.fill('10.0\n10.1\n9.9\n10.2')   // 4개

    const analyzeBtn = page.getByRole('button', { name: /분석 실행|분석하기/ })
    await expect(analyzeBtn).toBeDisabled()
  })

  test('Dual 모드 선택 후 분석 → 결과에 Cpk + Ppk 모두 표시', async ({ page }) => {
    // 모드 선택
    const dualOption = page.getByText('Dual').first()
    await dualOption.click()

    await page.getByLabel('USL').fill('10.5')
    await page.getByLabel('LSL').fill('9.5')

    const textarea = page.locator('textarea').first()
    await textarea.fill(SAMPLE_DATA)

    const analyzeBtn = page.getByRole('button', { name: /분석 실행|분석하기/ })
    await expect(analyzeBtn).toBeEnabled({ timeout: 5_000 })
    await analyzeBtn.click()

    await expect(page).toHaveURL(/result/, { timeout: 15_000 })
    // Dual 모드: Cpk와 Ppk 모두 표시
    await expect(page.getByText(/Cpk/i).first()).toBeVisible()
    await expect(page.getByText(/Ppk/i).first()).toBeVisible()
  })
})

test.describe('결과 페이지', () => {
  // 분석 완료 후 결과 페이지에서의 테스트
  async function analyzeAndNavigate(page: import('@playwright/test').Page) {
    await login(page, 'engineer')
    await page.goto('/analyze')
    await page.getByLabel('USL').fill('10.5')
    await page.getByLabel('LSL').fill('9.5')
    const textarea = page.locator('textarea').first()
    await textarea.fill(SAMPLE_DATA)
    const analyzeBtn = page.getByRole('button', { name: /분석 실행|분석하기/ })
    await expect(analyzeBtn).toBeEnabled({ timeout: 5_000 })
    await analyzeBtn.click()
    await expect(page).toHaveURL(/result/, { timeout: 15_000 })
  }

  test('분석 ID 표시', async ({ page }) => {
    await analyzeAndNavigate(page)
    await expect(page.locator('text=/ID:/i')).toBeVisible()
  })

  test('재분석 버튼 → /analyze 로 이동', async ({ page }) => {
    await analyzeAndNavigate(page)
    await page.getByRole('button', { name: '재분석' }).click()
    await expect(page).toHaveURL(/analyze/)
  })

  test('내보내기 드롭다운 메뉴 열림', async ({ page }) => {
    await analyzeAndNavigate(page)
    const exportBtn = page.getByRole('button', { name: /내보내기/ })
    await exportBtn.click()
    await expect(page.getByText('Excel (.xlsx)')).toBeVisible()
    await expect(page.getByText('PDF')).toBeVisible()
  })
})
