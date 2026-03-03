/**
 * 불량률 카드 (사양서 §7.3)
 * - DPMO 대형 숫자 + % 동시 표시
 * - 색상 코드: 적(>1000) / 황(63~1000) / 녹(<63) / 청(<1)
 * - USL 초과 / LSL 미달 방향 분리
 */
import { fmtDpmo, getDpmoColor } from '@/lib/utils'

interface DefectCardProps {
  dpmo:           number
  defectTotalPct: number
  defectUslPct:   number
  defectLslPct:   number
  sigmaLevel:     number
  label?:         string
}

function pctToStr(pct: number): string {
  if (pct === 0) return '0%'
  if (pct < 1e-6) return pct.toExponential(2) + '%'
  if (pct < 0.001) return pct.toFixed(6) + '%'
  return pct.toFixed(4) + '%'
}

export default function DefectCard({
  dpmo, defectTotalPct, defectUslPct, defectLslPct, sigmaLevel, label = '불량률',
}: DefectCardProps) {
  const color = getDpmoColor(dpmo)

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-gray-600">{label}</p>

      {/* 대형 DPMO */}
      <div className="flex items-end gap-3">
        <span className={`text-4xl font-bold font-mono leading-none ${color}`}>
          {fmtDpmo(dpmo)}
        </span>
        <span className="mb-1 text-sm text-gray-400">DPMO</span>
      </div>

      {/* % 표시 */}
      <div className={`text-xl font-semibold font-mono ${color}`}>
        {pctToStr(defectTotalPct)}
        <span className="ml-1 text-sm font-normal text-gray-400">총 불량률</span>
      </div>

      {/* 방향별 분리 (사양서 §7.3) */}
      <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">USL 초과</p>
          <p className="text-sm font-mono font-medium text-red-500">{pctToStr(defectUslPct)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">LSL 미달</p>
          <p className="text-sm font-mono font-medium text-red-500">{pctToStr(defectLslPct)}</p>
        </div>
      </div>

      {/* 시그마 레벨 */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-3">
        <span className="text-xs text-gray-400">Sigma Level</span>
        <span className="text-lg font-bold font-mono text-gray-700">{sigmaLevel.toFixed(2)}σ</span>
      </div>

      {/* DPMO 색상 가이드 */}
      <div className="flex gap-3 text-xs text-gray-400">
        <span className="text-red-400">&gt;1,000 위험</span>
        <span className="text-yellow-400">63~1,000 주의</span>
        <span className="text-green-400">&lt;63 양호</span>
        <span className="text-blue-400">&lt;1 우수</span>
      </div>
    </div>
  )
}
