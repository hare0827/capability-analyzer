/**
 * E2E: 보고서 내보내기 (사양서 §11)
 * API 응답을 route intercept 로 mock 처리하여
 * 실제 파일 생성 없이 다운로드 트리거를 검증한다.
 */
import { test, expect } from '@playwright/test'
import { login, SAMPLE_DATA } from './helpers'

/** 분석 실행 후 결과 페이지까지 이동하는 공통 헬퍼 */
async function goToResult(page: import('@playwright/test').Page) {
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

test.describe('내보내기 메뉴', () => {
  test('Excel 다운로드 요청 전송 확인', async ({ page }) => {
    // /reports/excel 요청을 intercept 하여 xlsx binary stub 반환
    await page.route('**/api/v1/reports/excel', async (route) => {
      await route.fulfill({
        status: 200,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        body: Buffer.from('PK stub'),
      })
    })

    await goToResult(page)

    // 다운로드 이벤트 대기
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      (async () => {
        await page.getByRole('button', { name: /내보내기/ }).click()
        await page.getByText('Excel (.xlsx)').click()
      })(),
    ])

    expect(download.suggestedFilename()).toMatch(/\.xlsx$/)
  })

  test('PDF 다운로드 요청 전송 확인', async ({ page }) => {
    await page.route('**/api/v1/reports/pdf', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        body: Buffer.from('%PDF-1.4 stub'),
      })
    })

    await goToResult(page)

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      (async () => {
        await page.getByRole('button', { name: /내보내기/ }).click()
        await page.getByText('PDF').click()
      })(),
    ])

    expect(download.suggestedFilename()).toMatch(/\.pdf$/)
  })

  test('API 오류 시 에러 toast 표시', async ({ page }) => {
    await page.route('**/api/v1/reports/excel', async (route) => {
      await route.fulfill({ status: 500, body: '{"detail":"Internal"}' })
    })

    await goToResult(page)

    await page.getByRole('button', { name: /내보내기/ }).click()
    await page.getByText('Excel (.xlsx)').click()

    await expect(
      page.locator('text=/보고서 생성에 실패|오류/')
    ).toBeVisible({ timeout: 8_000 })
  })

  test('드롭다운 외부 클릭 시 닫힘', async ({ page }) => {
    await goToResult(page)

    await page.getByRole('button', { name: /내보내기/ }).click()
    await expect(page.getByText('Excel (.xlsx)')).toBeVisible()

    // 외부 클릭
    await page.locator('h1').click()
    await expect(page.getByText('Excel (.xlsx)')).not.toBeVisible()
  })
})
