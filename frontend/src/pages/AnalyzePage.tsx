/**
 * SCR-03 + SCR-04: 분석 설정 + 데이터 입력 통합 페이지 — Minitab 스타일
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAnalysisStore } from '@/stores/analysisStore'
import { analyzeApi } from '@/lib/api'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import ModeSelector from '@/components/forms/ModeSelector'
import SpecInput from '@/components/forms/SpecInput'
import ManualInput from '@/components/forms/ManualInput'
import FileUpload from '@/components/forms/FileUpload'
import type { AnalyzeRequest } from '@/lib/types'

export default function AnalyzePage() {
  const navigate = useNavigate()
  const { mode, spec, data, subgroupSize, sigmaMethod, outlierRemoval, setResult } = useAnalysisStore()

  const [inputTab, setInputTab] = useState<'manual' | 'file'>('manual')
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const canAnalyze =
    data.length >= 5 && spec.usl !== 0 && spec.lsl !== 0 && spec.usl > spec.lsl

  const handleAnalyze = async () => {
    if (!canAnalyze) return
    setLoading(true)
    setApiError(null)
    try {
      const req: AnalyzeRequest = {
        mode, data, usl: spec.usl, lsl: spec.lsl, nominal: spec.nominal,
        subgroup_size: subgroupSize, sigma_method: sigmaMethod,
        outlier_removal: outlierRemoval,
      }
      const result = await analyzeApi.run(req)
      setResult(result)
      navigate('/result')
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } }).response?.data?.detail
      setApiError(typeof detail === 'string' ? detail : '분석 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 페이지 타이틀 바 */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Capability Analysis</h1>
          <p className="text-[12px] text-gray-500 mt-0.5">
            Configure options and enter measurement data, then click Run Analysis
          </p>
        </div>
        <Button size="lg" disabled={!canAnalyze} loading={loading} onClick={handleAnalyze}>
          {loading ? 'Calculating...' : 'Run Analysis'}
        </Button>
      </div>

      {/* 오류 / 유효성 메시지 */}
      {apiError && (
        <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-600">
          {apiError}
        </div>
      )}
      {!canAnalyze && data.length > 0 && (
        <div className="rounded-sm border border-amber-200 bg-amber-50 px-4 py-2.5 text-[12px] text-amber-700">
          {data.length < 5
            ? `데이터 ${data.length}개 — Run Analysis를 위해 최소 5개가 필요합니다`
            : spec.usl <= spec.lsl
            ? 'USL은 LSL보다 커야 합니다'
            : '규격값(USL / LSL)을 입력하세요'}
        </div>
      )}

      {/* ── 메인 컨텐츠: 좌(옵션) + 우(워크시트) ── */}
      <div className="flex gap-5">
        {/* 왼쪽 사이드바 — 고정 너비 280px */}
        <div className="flex w-[280px] shrink-0 flex-col gap-4">
          <Card>
            <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-[#0083CA] border-b border-gray-100 pb-2">
              Analysis Options
            </p>
            <div className="flex flex-col gap-5">
              <ModeSelector />
              <SpecInput />
            </div>
          </Card>

          {/* 입력 현황 */}
          <Card>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Input Summary
            </p>
            <div className="flex flex-col gap-2">
              {[
                { label: 'N (데이터 수)', value: data.length || '—',
                  color: data.length < 5 && data.length > 0 ? 'text-red-600'
                       : data.length < 30 && data.length > 0 ? 'text-amber-600'
                       : 'text-[#0083CA]' },
                { label: 'USL', value: spec.usl || '—', color: 'text-gray-800' },
                { label: 'LSL', value: spec.lsl || '—', color: 'text-gray-800' },
                { label: 'Mode', value: mode.toUpperCase(), color: 'text-gray-800' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between border-b border-gray-50 py-1.5 last:border-b-0">
                  <span className="text-[12px] text-gray-500">{label}</span>
                  <span className={`font-mono text-[13px] font-semibold ${color}`}>{value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* 오른쪽 워크시트 — 나머지 너비 전부 */}
        <div className="flex flex-1 flex-col">
          <Card className="flex-1">
            <Tabs value={inputTab} onValueChange={(v) => setInputTab(v as 'manual' | 'file')}>
              <TabsList className="mb-4 w-full max-w-sm">
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                <TabsTrigger value="file">File Import</TabsTrigger>
              </TabsList>
              <TabsContent value="manual">
                <ManualInput />
              </TabsContent>
              <TabsContent value="file">
                <FileUpload />
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  )
}
