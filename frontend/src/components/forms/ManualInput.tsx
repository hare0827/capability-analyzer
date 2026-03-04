/**
 * SCR-04: 수동 데이터 입력 — 셀 그리드 방식
 * - 각 셀에 개별 입력 (쉼표 구분 폐기)
 * - Tab / Enter: 다음 셀 이동 (마지막 셀이면 자동 행 추가)
 * - Backspace on empty cell: 해당 행 삭제
 * - n < 5 오류, n < 30 경고, 실시간 통계 (n, 평균, σ)
 */
import { useState, useEffect, useRef } from 'react'
import { useAnalysisStore } from '@/stores/analysisStore'
import { fmt } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'

const INITIAL_ROWS = 15
const COLS = 2 // 2열로 나란히 표시

export default function ManualInput() {
  const { setData, outlierRemoval, setOutlierRemoval } = useAnalysisStore()
  const [cells, setCells] = useState<string[]>(Array(INITIAL_ROWS).fill(''))
  const [stats, setStats] = useState<{ n: number; mean: number; std: number } | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // 셀 → 숫자 배열 변환 + 통계 계산
  useEffect(() => {
    const values = cells
      .map((c) => parseFloat(c.trim()))
      .filter((v) => !isNaN(v))

    setData(values)

    if (values.length === 0) {
      setStats(null)
      return
    }

    const n = values.length
    const mean = values.reduce((a, b) => a + b, 0) / n
    const std =
      n > 1
        ? Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / (n - 1))
        : 0
    setStats({ n, mean, std })
  }, [cells, setData])

  const updateCell = (index: number, value: string) => {
    setCells((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const addRows = (count = 5) => {
    setCells((prev) => [...prev, ...Array(count).fill('')])
  }

  const clearAll = () => {
    setCells(Array(INITIAL_ROWS).fill(''))
    setTimeout(() => inputRefs.current[0]?.focus(), 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault()
      const next = index + 1
      if (next >= cells.length) {
        setCells((prev) => [...prev, ''])
        setTimeout(() => inputRefs.current[next]?.focus(), 0)
      } else {
        inputRefs.current[next]?.focus()
      }
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault()
      if (index > 0) inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'Backspace' && cells[index] === '' && cells.length > 1) {
      e.preventDefault()
      setCells((prev) => prev.filter((_, i) => i !== index))
      setTimeout(() => inputRefs.current[Math.max(0, index - 1)]?.focus(), 0)
    }
  }

  const n = stats?.n ?? 0
  const nColor = n === 0 ? 'gray' : n < 5 ? 'red' : n < 30 ? 'yellow' : 'green'

  // 2열 레이아웃: 절반씩 잘라서 좌/우로 배치
  const half = Math.ceil(cells.length / COLS)
  const leftCells = cells.slice(0, half)
  const rightCells = cells.slice(half)

  return (
    <div className="flex flex-col gap-3">
      {/* 경고 배너 */}
      {n > 0 && n < 5 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          <span className="text-base">⚠️</span>
          데이터 수 {n}개 — 최소 5개 이상이어야 분석 가능합니다.
        </div>
      )}
      {n >= 5 && n < 30 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          <span className="text-base">💡</span>
          데이터 수 {n}개 — 30개 이상 권장합니다. 분석 신뢰도가 낮을 수 있습니다.
        </div>
      )}

      {/* 헤더 + 조작 버튼 */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-700">
          측정값 입력
          <span className="ml-2 text-xs font-normal text-slate-400">
            (Tab / Enter: 다음 셀 이동)
          </span>
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => addRows(5)}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            + 5행 추가
          </button>
          <span className="text-slate-200">|</span>
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-medium text-slate-400 hover:text-red-500 transition-colors"
          >
            전체 지우기
          </button>
        </div>
      </div>

      {/* 셀 그리드 */}
      <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-inner">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {/* 왼쪽 열 */}
          <div className="flex flex-col gap-1">
            {leftCells.map((value, i) => {
              const globalIdx = i
              const isValid = value.trim() !== '' && !isNaN(parseFloat(value))
              return (
                <div key={globalIdx} className="flex items-center gap-1.5">
                  <span className="w-6 shrink-0 text-right font-mono text-[10px] text-slate-400">
                    {globalIdx + 1}
                  </span>
                  <input
                    ref={(el) => { inputRefs.current[globalIdx] = el }}
                    type="number"
                    step="any"
                    value={value}
                    onChange={(e) => updateCell(globalIdx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, globalIdx)}
                    placeholder="—"
                    className={[
                      'w-full rounded-md border px-2 py-1 font-mono text-sm text-right',
                      'transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400',
                      isValid
                        ? 'border-indigo-200 bg-white text-slate-800'
                        : 'border-slate-200 bg-white text-slate-400',
                    ].join(' ')}
                  />
                </div>
              )
            })}
          </div>

          {/* 오른쪽 열 */}
          <div className="flex flex-col gap-1">
            {rightCells.map((value, i) => {
              const globalIdx = half + i
              const isValid = value.trim() !== '' && !isNaN(parseFloat(value))
              return (
                <div key={globalIdx} className="flex items-center gap-1.5">
                  <span className="w-6 shrink-0 text-right font-mono text-[10px] text-slate-400">
                    {globalIdx + 1}
                  </span>
                  <input
                    ref={(el) => { inputRefs.current[globalIdx] = el }}
                    type="number"
                    step="any"
                    value={value}
                    onChange={(e) => updateCell(globalIdx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, globalIdx)}
                    placeholder="—"
                    className={[
                      'w-full rounded-md border px-2 py-1 font-mono text-sm text-right',
                      'transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400',
                      isValid
                        ? 'border-indigo-200 bg-white text-slate-800'
                        : 'border-slate-200 bg-white text-slate-400',
                    ].join(' ')}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 이상치 처리 */}
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={outlierRemoval}
          onChange={(e) => setOutlierRemoval(e.target.checked)}
          className="h-4 w-4 accent-indigo-600"
        />
        <span className="text-slate-700">이상치 자동 제거</span>
        <span className="text-slate-400">(IQR × 1.5 기준)</span>
      </label>

      {/* 실시간 기술통계 */}
      {stats && (
        <div className="flex items-center gap-5 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">n</span>
            <Badge color={nColor} className="font-mono text-sm font-bold">
              {stats.n}
            </Badge>
          </div>
          <div className="text-xs text-slate-500">
            평균{' '}
            <span className="font-mono font-semibold text-slate-800">{fmt(stats.mean)}</span>
          </div>
          <div className="text-xs text-slate-500">
            σ{' '}
            <span className="font-mono font-semibold text-slate-800">{fmt(stats.std)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
