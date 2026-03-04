/**
 * SCR-04: 수동 데이터 입력 — Minitab 워크시트 스타일
 * - 각 행에 하나의 측정값 (쉼표 구분 폐기)
 * - Tab / Enter: 다음 셀 이동 (마지막 행 → 자동 행 추가)
 * - Backspace on empty cell: 해당 행 삭제
 * - n < 5 오류, n < 30 경고, 실시간 통계 (n, 평균, σ)
 */
import { useState, useEffect, useRef } from 'react'
import { useAnalysisStore } from '@/stores/analysisStore'
import { fmt } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'

const INITIAL_ROWS = 20

export default function ManualInput() {
  const { setData, outlierRemoval, setOutlierRemoval } = useAnalysisStore()
  const [cells, setCells] = useState<string[]>(Array(INITIAL_ROWS).fill(''))
  const [stats, setStats] = useState<{ n: number; mean: number; std: number } | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    const values = cells.map((c) => parseFloat(c.trim())).filter((v) => !isNaN(v))
    setData(values)

    if (values.length === 0) { setStats(null); return }
    const n = values.length
    const mean = values.reduce((a, b) => a + b, 0) / n
    const std = n > 1
      ? Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / (n - 1))
      : 0
    setStats({ n, mean, std })
  }, [cells, setData])

  const updateCell = (i: number, v: string) =>
    setCells((prev) => { const next = [...prev]; next[i] = v; return next })

  const addRows = (count = 10) =>
    setCells((prev) => [...prev, ...Array(count).fill('')])

  const clearAll = () => {
    setCells(Array(INITIAL_ROWS).fill(''))
    setTimeout(() => inputRefs.current[0]?.focus(), 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, i: number) => {
    if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault()
      const next = i + 1
      if (next >= cells.length) {
        setCells((prev) => [...prev, ''])
        setTimeout(() => inputRefs.current[next]?.focus(), 0)
      } else {
        inputRefs.current[next]?.focus()
      }
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault()
      if (i > 0) inputRefs.current[i - 1]?.focus()
    } else if (e.key === 'Backspace' && cells[i] === '' && cells.length > 1) {
      e.preventDefault()
      setCells((prev) => prev.filter((_, idx) => idx !== i))
      setTimeout(() => inputRefs.current[Math.max(0, i - 1)]?.focus(), 0)
    }
  }

  const n = stats?.n ?? 0
  const nColor: 'red' | 'yellow' | 'green' | 'gray' =
    n === 0 ? 'gray' : n < 5 ? 'red' : n < 30 ? 'yellow' : 'green'

  return (
    <div className="flex flex-col gap-3">
      {/* 경고 배너 */}
      {n > 0 && n < 5 && (
        <div className="flex items-center gap-2 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
          <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          데이터 수 {n}개 — 최소 5개 이상이어야 분석 가능합니다.
        </div>
      )}
      {n >= 5 && n < 30 && (
        <div className="flex items-center gap-2 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
          <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          데이터 수 {n}개 — 30개 이상 권장합니다.
        </div>
      )}

      {/* 워크시트 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">
            Worksheet
          </span>
          <span className="text-[11px] text-gray-400">
            Tab / Enter: 다음 셀
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => addRows(10)}
            className="text-[12px] text-[#0083CA] hover:underline font-medium"
          >
            + 10행 추가
          </button>
          <span className="text-gray-200">|</span>
          <button
            type="button"
            onClick={clearAll}
            className="text-[12px] text-gray-400 hover:text-red-500 font-medium"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* ── Minitab 워크시트 스타일 표 ── */}
      <div className="overflow-hidden rounded-sm border border-gray-300">
        {/* 열 헤더 */}
        <div className="grid border-b border-gray-300 bg-gray-100"
          style={{ gridTemplateColumns: '44px 1fr 44px 1fr' }}>
          <div className="border-r border-gray-300 px-2 py-1.5 text-center text-[11px] font-semibold text-gray-500" />
          <div className="border-r border-gray-300 px-3 py-1.5 text-[11px] font-semibold text-gray-600 text-center">
            C1 — Measurement
          </div>
          <div className="border-r border-gray-300 px-2 py-1.5 text-center text-[11px] font-semibold text-gray-500" />
          <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-600 text-center">
            C2 — Measurement
          </div>
        </div>

        {/* 셀 영역 */}
        <div
          className="max-h-72 overflow-y-auto scrollbar-thin bg-white"
        >
          {(() => {
            const half = Math.ceil(cells.length / 2)
            const rows = Array.from({ length: half }, (_, r) => r)
            return rows.map((r) => {
              const leftIdx = r
              const rightIdx = r + half
              const hasRight = rightIdx < cells.length

              return (
                <div
                  key={r}
                  className="grid border-b border-gray-100 last:border-b-0 hover:bg-[#f0f7fc]"
                  style={{ gridTemplateColumns: '44px 1fr 44px 1fr' }}
                >
                  {/* 왼쪽 행번호 */}
                  <div className="flex items-center justify-center border-r border-gray-200 bg-gray-50 py-0.5 text-[11px] font-mono text-gray-400">
                    {leftIdx + 1}
                  </div>
                  {/* 왼쪽 셀 */}
                  <div className="border-r border-gray-200">
                    <input
                      ref={(el) => { inputRefs.current[leftIdx] = el }}
                      type="number"
                      step="any"
                      value={cells[leftIdx]}
                      onChange={(e) => updateCell(leftIdx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, leftIdx)}
                      placeholder=""
                      className={[
                        'w-full px-3 py-1 font-mono text-[13px] text-right',
                        'focus:outline-none focus:bg-[#e6f3fb]',
                        cells[leftIdx].trim() !== '' && !isNaN(parseFloat(cells[leftIdx]))
                          ? 'text-gray-800'
                          : 'text-gray-300',
                      ].join(' ')}
                    />
                  </div>
                  {/* 오른쪽 행번호 */}
                  <div className="flex items-center justify-center border-r border-gray-200 bg-gray-50 py-0.5 text-[11px] font-mono text-gray-400">
                    {hasRight ? rightIdx + 1 : ''}
                  </div>
                  {/* 오른쪽 셀 */}
                  <div>
                    {hasRight ? (
                      <input
                        ref={(el) => { inputRefs.current[rightIdx] = el }}
                        type="number"
                        step="any"
                        value={cells[rightIdx]}
                        onChange={(e) => updateCell(rightIdx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, rightIdx)}
                        placeholder=""
                        className={[
                          'w-full px-3 py-1 font-mono text-[13px] text-right',
                          'focus:outline-none focus:bg-[#e6f3fb]',
                          cells[rightIdx].trim() !== '' && !isNaN(parseFloat(cells[rightIdx]))
                            ? 'text-gray-800'
                            : 'text-gray-300',
                        ].join(' ')}
                      />
                    ) : null}
                  </div>
                </div>
              )
            })
          })()}
        </div>
      </div>

      {/* 이상치 처리 */}
      <label className="flex cursor-pointer items-center gap-2 text-[13px]">
        <input
          type="checkbox"
          checked={outlierRemoval}
          onChange={(e) => setOutlierRemoval(e.target.checked)}
          className="h-3.5 w-3.5 accent-[#0083CA]"
        />
        <span className="text-gray-700">이상치 자동 제거</span>
        <span className="text-gray-400 text-[12px]">(IQR × 1.5)</span>
      </label>

      {/* 실시간 통계 */}
      {stats && (
        <div className="flex items-center gap-5 rounded-sm border border-[#b3d9f0] bg-[#e6f3fb] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">n</span>
            <Badge color={nColor}>{stats.n}</Badge>
          </div>
          <div className="text-[12px] text-gray-600">
            Mean{' '}
            <span className="font-mono font-semibold text-gray-900">{fmt(stats.mean)}</span>
          </div>
          <div className="text-[12px] text-gray-600">
            StDev{' '}
            <span className="font-mono font-semibold text-gray-900">{fmt(stats.std)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
