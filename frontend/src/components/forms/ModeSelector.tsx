/**
 * SCR-03: 모드 선택 탭 (Cpk / Ppk / Dual)
 * 사양서 §3 F-C-001
 * - 모드 전환 시 데이터 유지 (Zustand store 유지)
 */
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useAnalysisStore } from '@/stores/analysisStore'
import type { AnalysisMode } from '@/lib/types'

const MODES: { value: AnalysisMode; label: string; desc: string }[] = [
  { value: 'cpk',  label: 'Cpk 모드',  desc: '단기 공정 능력 (군내 σ̂)' },
  { value: 'ppk',  label: 'Ppk 모드',  desc: '장기 공정 성능 (전체 σ)' },
  { value: 'dual', label: 'Dual 비교', desc: 'Cpk + Ppk 동시 분석' },
]

export default function ModeSelector() {
  const { mode, setMode } = useAnalysisStore()

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">분석 모드</label>
      <Tabs value={mode} onValueChange={(v) => setMode(v as AnalysisMode)}>
        <TabsList className="w-full">
          {MODES.map((m) => (
            <TabsTrigger key={m.value} value={m.value}>
              {m.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <p className="text-xs text-gray-400">
        {MODES.find((m) => m.value === mode)?.desc}
      </p>
    </div>
  )
}
