/**
 * SCR-04: 수동 데이터 입력
 * 사양서 §4.1
 * - 쉼표 / 줄바꿈 구분
 * - n < 5 오류, n < 30 경고
 * - 실시간 기술통계 표시 (n, 평균, σ)
 */
import { useState, useEffect, useCallback } from 'react'
import { useAnalysisStore } from '@/stores/analysisStore'
import { parseDataInput, debounce, fmt } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'

export default function ManualInput() {
  const { setData, outlierRemoval, setOutlierRemoval } = useAnalysisStore()
  const [raw, setRaw] = useState('')
  const [stats, setStats] = useState<{ n: number; mean: number; std: number } | null>(null)
  const [errors, setErrors] = useState<string[]>([])

  const process = useCallback(
    debounce((text: string) => {
      const { values, errors: parseErrors } = parseDataInput(text)
      setErrors(parseErrors)

      if (values.length === 0) {
        setData([])
        setStats(null)
        return
      }

      setData(values)

      const n = values.length
      const mean = values.reduce((a, b) => a + b, 0) / n
      const std = n > 1
        ? Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / (n - 1))
        : 0

      setStats({ n, mean, std })
    }, 300),
    [setData],
  )

  useEffect(() => {
    process(raw)
  }, [raw, process])

  const n = stats?.n ?? 0
  const nColor = n === 0 ? 'gray' : n < 5 ? 'red' : n < 30 ? 'yellow' : 'green'

  return (
    <div className="flex flex-col gap-3">
      {/* 경고 배너 */}
      {n > 0 && n < 5 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          데이터 수 {n}개 — 최소 5개 이상이어야 분석 가능합니다.
        </div>
      )}
      {n >= 5 && n < 30 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-700">
          데이터 수 {n}개 — 30개 이상 권장합니다. 분석 신뢰도가 낮을 수 있습니다.
        </div>
      )}

      {/* 텍스트 입력 영역 */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          측정값 입력{' '}
          <span className="font-normal text-gray-400">(쉼표, 줄바꿈, 공백으로 구분)</span>
        </label>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={8}
          placeholder={'23.1, 22.9, 23.5, 23.2\n22.8, 23.4, 23.0, 22.7\n...'}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-400"
          spellCheck={false}
        />
      </div>

      {/* 이상치 처리 */}
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={outlierRemoval}
          onChange={(e) => setOutlierRemoval(e.target.checked)}
          className="h-4 w-4 accent-blue-600"
        />
        <span className="text-gray-700">이상치 자동 제거</span>
        <span className="text-gray-400">(IQR × 1.5 기준)</span>
      </label>

      {/* 파싱 오류 */}
      {errors.length > 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2">
          <p className="mb-1 text-xs font-medium text-orange-700">숫자가 아닌 값은 무시됩니다:</p>
          <ul className="list-inside list-disc space-y-0.5 text-xs text-orange-600">
            {errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
            {errors.length > 5 && <li>외 {errors.length - 5}개...</li>}
          </ul>
        </div>
      )}

      {/* 실시간 기술통계 */}
      {stats && (
        <div className="flex items-center gap-4 rounded-lg bg-gray-50 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">n</span>
            <Badge color={nColor} className="font-mono text-sm">
              {stats.n}
            </Badge>
          </div>
          <div className="text-xs text-gray-500">
            평균 <span className="font-mono font-medium text-gray-800">{fmt(stats.mean)}</span>
          </div>
          <div className="text-xs text-gray-500">
            σ <span className="font-mono font-medium text-gray-800">{fmt(stats.std)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
