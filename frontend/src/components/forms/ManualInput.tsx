/**
 * SCR-04: 수동 데이터 입력 — Minitab 워크시트 스타일
 * - 행 우선(row-major): Tab → 오른쪽 → 다음 행 왼쪽 (엑셀과 동일)
 * - cells[row * 2 + col] 방식으로 인덱스 관리
 */
import { useState, useEffect, useRef } from 'react'
import { useAnalysisStore } from '@/stores/analysisStore'
import { fmt } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'

const NUM_COLS = 2
const INITIAL_VISUAL_ROWS = 12   // 12행 × 2열 = 24 셀

function makeEmptyCells(rows: number) {
  return Array(rows * NUM_COLS).fill('')
}

export default function ManualInput() {
  const { setData, outlierRemoval, setOutlierRemoval } = useAnalysisStore()
  const [cells, setCells] = useState<string[]>(makeEmptyCells(INITIAL_VISUAL_ROWS))
  const [stats, setStats] = useState<{ n: number; mean: number; std: number } | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const numRows = Math.ceil(cells.length / NUM_COLS)

  // 셀 → 숫자 배열 + 통계
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

  const updateCell = (idx: number, val: string) =>
    setCells((prev) => { const next = [...prev]; next[idx] = val; return next })

  const addRows = (count = 5) =>
    setCells((prev) => [...prev, ...Array(count * NUM_COLS).fill('')])

  const clearAll = () => {
    setCells(makeEmptyCells(INITIAL_VISUAL_ROWS))
    setTimeout(() => inputRefs.current[0]?.focus(), 0)
  }

  // 키 내비게이션
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    const row = Math.floor(idx / NUM_COLS)
    const col = idx % NUM_COLS

    if (e.key === 'ArrowUp') {
      // ↑ 위 행 같은 열
      e.preventDefault()
      const upIdx = idx - NUM_COLS
      if (upIdx >= 0) inputRefs.current[upIdx]?.focus()
    } else if (e.key === 'ArrowDown') {
      // ↓ 아래 행 같은 열 (없으면 행 추가)
      e.preventDefault()
      const downIdx = idx + NUM_COLS
      if (downIdx < cells.length) {
        inputRefs.current[downIdx]?.focus()
      } else {
        setCells((prev) => [...prev, ...Array(NUM_COLS).fill('')])
        setTimeout(() => inputRefs.current[downIdx]?.focus(), 0)
      }
    } else if (e.key === 'ArrowLeft') {
      if (col > 0) { e.preventDefault(); inputRefs.current[idx - 1]?.focus() }
    } else if (e.key === 'ArrowRight') {
      if (col < NUM_COLS - 1) { e.preventDefault(); inputRefs.current[idx + 1]?.focus() }
    } else if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
      // Enter / Tab → 오른쪽, 오른쪽 끝이면 다음 행 왼쪽
      e.preventDefault()
      const next = idx + 1
      if (next >= cells.length) {
        setCells((prev) => [...prev, ...Array(NUM_COLS).fill('')])
        setTimeout(() => inputRefs.current[next]?.focus(), 0)
      } else {
        inputRefs.current[next]?.focus()
      }
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault()
      if (idx > 0) inputRefs.current[idx - 1]?.focus()
    } else if (e.key === 'Backspace' && cells[idx] === '' && cells.length > NUM_COLS) {
      // 빈 셀에서 Backspace → 해당 행 삭제
      e.preventDefault()
      const newCells = cells.filter((_, i) => Math.floor(i / NUM_COLS) !== row)
      setCells(newCells.length >= NUM_COLS ? newCells : makeEmptyCells(INITIAL_VISUAL_ROWS))
      setTimeout(() => inputRefs.current[Math.max(0, row * NUM_COLS - 1)]?.focus(), 0)
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

      {/* 툴바 */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          Worksheet &nbsp;·&nbsp; Tab / Enter: 오른쪽 → 다음 행
        </span>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => addRows(5)}
            className="text-[12px] font-medium text-[#0083CA] hover:underline">
            + 5행 추가
          </button>
          <span className="text-gray-200 select-none">|</span>
          <button type="button" onClick={clearAll}
            className="text-[12px] font-medium text-gray-400 hover:text-red-500">
            Clear All
          </button>
        </div>
      </div>

      {/* ── 워크시트 테이블 ── */}
      <div className="overflow-hidden rounded-sm border border-gray-300">
        {/* 열 헤더 */}
        <div className="grid bg-gray-100 border-b border-gray-300"
          style={{ gridTemplateColumns: '40px 1fr 1fr' }}>
          <div className="border-r border-gray-300 py-1.5" />
          <div className="border-r border-gray-300 px-3 py-1.5 text-center text-[11px] font-bold text-gray-600 uppercase tracking-wide">
            C1
          </div>
          <div className="px-3 py-1.5 text-center text-[11px] font-bold text-gray-600 uppercase tracking-wide">
            C2
          </div>
        </div>
        {/* 열 이름 행 */}
        <div className="grid border-b border-gray-200 bg-gray-50"
          style={{ gridTemplateColumns: '40px 1fr 1fr' }}>
          <div className="border-r border-gray-200 py-1" />
          <div className="border-r border-gray-200 px-3 py-1 text-center text-[11px] text-gray-400 italic">
            Measurement
          </div>
          <div className="px-3 py-1 text-center text-[11px] text-gray-400 italic">
            Measurement
          </div>
        </div>

        {/* 데이터 행 (row-major) */}
        <div className="max-h-72 overflow-y-auto bg-white">
          {Array.from({ length: numRows }, (_, r) => {
            const idxL = r * NUM_COLS       // C1 셀
            const idxR = r * NUM_COLS + 1   // C2 셀

            const valL = cells[idxL] ?? ''
            const valR = cells[idxR] ?? ''
            const hasRight = idxR < cells.length

            return (
              <div key={r}
                className="grid border-b border-gray-100 last:border-b-0 hover:bg-[#f0f7fc] transition-colors"
                style={{ gridTemplateColumns: '40px 1fr 1fr' }}>
                {/* 행 번호 */}
                <div className="flex items-center justify-center border-r border-gray-200 bg-gray-50 text-[11px] font-mono text-gray-400 select-none">
                  {r + 1}
                </div>
                {/* C1 셀 */}
                <div className="border-r border-gray-100">
                  <input
                    ref={(el) => { inputRefs.current[idxL] = el }}
                    type="number"
                    step="any"
                    value={valL}
                    onChange={(e) => updateCell(idxL, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, idxL)}
                    className={[
                      'w-full px-3 py-[5px] font-mono text-[13px] text-right bg-transparent',
                      'focus:outline-none focus:bg-[#e6f3fb]',
                      valL.trim() !== '' && !isNaN(parseFloat(valL))
                        ? 'text-gray-800' : 'text-transparent',
                    ].join(' ')}
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                </div>
                {/* C2 셀 */}
                <div>
                  {hasRight ? (
                    <input
                      ref={(el) => { inputRefs.current[idxR] = el }}
                      type="number"
                      step="any"
                      value={valR}
                      onChange={(e) => updateCell(idxR, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idxR)}
                      className={[
                        'w-full px-3 py-[5px] font-mono text-[13px] text-right bg-transparent',
                        'focus:outline-none focus:bg-[#e6f3fb]',
                        valR.trim() !== '' && !isNaN(parseFloat(valR))
                          ? 'text-gray-800' : 'text-transparent',
                      ].join(' ')}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 이상치 처리 */}
      <label className="flex cursor-pointer items-center gap-2 text-[13px]">
        <input type="checkbox" checked={outlierRemoval}
          onChange={(e) => setOutlierRemoval(e.target.checked)}
          className="h-3.5 w-3.5 accent-[#0083CA]" />
        <span className="text-gray-700">이상치 자동 제거</span>
        <span className="text-[12px] text-gray-400">(IQR × 1.5)</span>
      </label>

      {/* 실시간 통계 */}
      {stats && (
        <div className="flex items-center gap-5 rounded-sm border border-[#b3d9f0] bg-[#e6f3fb] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">N</span>
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
