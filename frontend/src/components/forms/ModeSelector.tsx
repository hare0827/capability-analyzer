/**
 * SCR-03: 모드 선택 탭 (Cpk / Ppk / Dual)
 */
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useAnalysisStore } from '@/stores/analysisStore'
import type { AnalysisMode } from '@/lib/types'

const MODES: { value: AnalysisMode; label: string; desc: string }[] = [
  { value: 'cpk',  label: 'Cpk',  desc: 'Short-term — within-subgroup σ̂' },
  { value: 'ppk',  label: 'Ppk',  desc: 'Long-term — overall σ' },
  { value: 'dual', label: 'Dual', desc: 'Compare Cpk and Ppk' },
]

export default function ModeSelector() {
  const { mode, setMode } = useAnalysisStore()

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        Analysis Type
      </label>
      <Tabs value={mode} onValueChange={(v) => setMode(v as AnalysisMode)}>
        <TabsList className="w-full">
          {MODES.map((m) => (
            <TabsTrigger key={m.value} value={m.value}>
              {m.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <p className="text-[11px] text-gray-400">
        {MODES.find((m) => m.value === mode)?.desc}
      </p>
    </div>
  )
}
