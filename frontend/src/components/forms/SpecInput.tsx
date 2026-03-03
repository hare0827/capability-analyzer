/**
 * SCR-03: 규격 입력 (USL / LSL / Nominal)
 * 사양서 §3 F-C-002
 */
import { useAnalysisStore } from '@/stores/analysisStore'
import { Input } from '@/components/ui/Input'

export default function SpecInput() {
  const { spec, setSpec, mode, subgroupSize, setSubgroupSize, sigmaMethod, setSigmaMethod } =
    useAnalysisStore()

  const uslLslError =
    spec.usl && spec.lsl && spec.usl <= spec.lsl
      ? 'USL은 LSL보다 커야 합니다'
      : undefined

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium text-gray-700">규격 입력</p>

      <div className="grid grid-cols-3 gap-3">
        <Input
          label="USL (상한)"
          type="number"
          step="any"
          value={spec.usl || ''}
          onChange={(e) => setSpec({ usl: Number(e.target.value) })}
          error={uslLslError}
          placeholder="예: 10.5"
        />
        <Input
          label="LSL (하한)"
          type="number"
          step="any"
          value={spec.lsl || ''}
          onChange={(e) => setSpec({ lsl: Number(e.target.value) })}
          placeholder="예: 9.5"
        />
        <Input
          label="Nominal (기준값)"
          type="number"
          step="any"
          value={spec.nominal ?? ''}
          onChange={(e) =>
            setSpec({ nominal: e.target.value ? Number(e.target.value) : undefined })
          }
          hint="선택 항목"
          placeholder="예: 10.0"
        />
      </div>

      {/* Cpk 전용 파라미터 */}
      {mode !== 'ppk' && (
        <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              서브그룹 크기 <span className="text-xs text-gray-400">(Cpk 전용, 2~10)</span>
            </label>
            <input
              type="range"
              min={2}
              max={10}
              value={subgroupSize}
              onChange={(e) => setSubgroupSize(Number(e.target.value))}
              className="accent-blue-600"
            />
            <span className="text-center text-sm font-semibold text-blue-600">n = {subgroupSize}</span>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              σ̂ 산출 방식 <span className="text-xs text-gray-400">(Cpk 전용)</span>
            </label>
            <div className="flex gap-3">
              {(['rbar', 'sbar'] as const).map((m) => (
                <label key={m} className="flex cursor-pointer items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    name="sigmaMethod"
                    value={m}
                    checked={sigmaMethod === m}
                    onChange={() => setSigmaMethod(m)}
                    className="accent-blue-600"
                  />
                  {m === 'rbar' ? 'R̄/d₂' : 's̄/c₄'}
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400">
              {sigmaMethod === 'rbar' ? '권장 (서브그룹 범위 기반)' : '서브그룹 표준편차 기반'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
