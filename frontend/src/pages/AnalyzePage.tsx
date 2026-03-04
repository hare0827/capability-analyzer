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
  const {
    mode, spec, data, subgroupSize, sigmaMethod,
    outlierRemoval, setResult,
  } = useAnalysisStore()

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
          <p className="text-[12px] text-gray-500 mt-0.5">Configure analysis options and enter measurement data</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* ── 왼쪽: 설정 + 실행 ── */}
        <div className="flex flex-col gap-4 lg:col-span-1">
          {/* 분석 옵션 */}
          <Card>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-100 pb-2">
              Analysis Options
            </p>
            <div className="flex flex-col gap-5">
              <ModeSelector />
              <SpecInput />
            </div>
          </Card>

          {/* 입력 현황 */}
          {data.length > 0 && (
            <div className="rounded-sm border border-gray-200 bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Input Summary
              </p>
              <div className="grid grid-cols-3 divide-x divide-gray-100 text-center">
                <div className="pr-2">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">N</p>
                  <p className={`text-xl font-bold ${
                    data.length < 5 ? 'text-red-600' : data.length < 30 ? 'text-amber-600' : 'text-[#0083CA]'
                  }`}>{data.length}</p>
                </div>
                <div className="px-2">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">USL</p>
                  <p className="text-xl font-bold text-gray-800">{spec.usl || '—'}</p>
                </div>
                <div className="pl-2">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">LSL</p>
                  <p className="text-xl font-bold text-gray-800">{spec.lsl || '—'}</p>
                </div>
              </div>
            </div>
          )}

          {/* 유효성 메시지 */}
          {!canAnalyze && data.length > 0 && (
            <div className="rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
              {data.length < 5
                ? `데이터 ${data.length}개 — 최소 5개 필요`
                : spec.usl <= spec.lsl
                ? 'USL must be greater than LSL'
                : '규격값을 확인하세요'}
            </div>
          )}

          {/* 실행 버튼 */}
          <Button size="lg" className="w-full" disabled={!canAnalyze} loading={loading} onClick={handleAnalyze}>
            {loading ? 'Calculating...' : 'Run Analysis'}
          </Button>

          {apiError && (
            <div className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-600">
              {apiError}
            </div>
          )}
        </div>

        {/* ── 오른쪽: 데이터 입력 ── */}
        <Card className="lg:col-span-2">
          <Tabs value={inputTab} onValueChange={(v) => setInputTab(v as 'manual' | 'file')}>
            <TabsList className="mb-4 w-full max-w-xs">
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
  )
}
