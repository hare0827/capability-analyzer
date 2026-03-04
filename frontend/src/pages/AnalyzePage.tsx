/**
 * SCR-03 + SCR-04: 분석 설정 + 데이터 입력 통합 페이지
 * - 모드 선택 → 규격 입력 → 데이터 입력 → 분석 실행
 * - 실시간 재계산 (debounce 300ms)
 * - 결과는 resultStore에 저장 → ResultPage로 이동
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
    data.length >= 5 &&
    spec.usl !== 0 &&
    spec.lsl !== 0 &&
    spec.usl > spec.lsl

  const handleAnalyze = async () => {
    if (!canAnalyze) return
    setLoading(true)
    setApiError(null)

    try {
      const req: AnalyzeRequest = {
        mode,
        data,
        usl: spec.usl,
        lsl: spec.lsl,
        nominal: spec.nominal,
        subgroup_size: subgroupSize,
        sigma_method: sigmaMethod,
        outlier_removal: outlierRemoval,
      }
      const result = await analyzeApi.run(req)
      setResult(result)
      navigate('/result')
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } }).response?.data?.detail
      setApiError(
        typeof detail === 'string' ? detail : '분석 중 오류가 발생했습니다.',
      )
    } finally {
      setLoading(false)
    }
  }

  // 데이터 상태 색상
  const nStatus =
    data.length === 0 ? 'none'
    : data.length < 5 ? 'error'
    : data.length < 30 ? 'warn'
    : 'ok'

  const nColor = {
    none:  'text-slate-400',
    error: 'text-red-600',
    warn:  'text-amber-600',
    ok:    'text-emerald-600',
  }[nStatus]

  return (
    <div className="flex flex-col gap-6">
      {/* 페이지 헤더 */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">
            Analysis Setup
          </p>
          <h1 className="mt-0.5 text-2xl font-black text-slate-900">새 분석</h1>
          <p className="text-sm text-slate-500">공정 능력 지수를 계산합니다</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── 왼쪽: 설정 패널 ─────────────────────────────── */}
        <div className="flex flex-col gap-4 lg:col-span-1">
          {/* 분석 설정 카드 */}
          <Card className="border-l-4 border-l-indigo-500">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-black text-indigo-600">
                1
              </span>
              분석 설정
            </h2>
            <div className="flex flex-col gap-5">
              <ModeSelector />
              <SpecInput />
            </div>
          </Card>

          {/* 데이터 상태 요약 */}
          {data.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                입력 현황
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-100">
                  <p className="text-[10px] text-slate-400">데이터 수</p>
                  <p className={`text-xl font-black ${nColor}`}>{data.length}</p>
                </div>
                <div className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-100">
                  <p className="text-[10px] text-slate-400">USL</p>
                  <p className="text-xl font-black text-slate-800">{spec.usl || '—'}</p>
                </div>
                <div className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-100">
                  <p className="text-[10px] text-slate-400">LSL</p>
                  <p className="text-xl font-black text-slate-800">{spec.lsl || '—'}</p>
                </div>
              </div>
            </div>
          )}

          {/* 분석 실행 버튼 */}
          <div className="flex flex-col gap-2">
            {!canAnalyze && data.length > 0 && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {data.length < 5
                  ? `데이터 ${data.length}개 — 최소 5개 필요합니다`
                  : spec.usl <= spec.lsl
                  ? 'USL이 LSL보다 커야 합니다'
                  : '규격값을 확인하세요'}
              </p>
            )}
            <Button
              size="lg"
              className="w-full"
              disabled={!canAnalyze}
              loading={loading}
              onClick={handleAnalyze}
            >
              {loading ? '분석 중...' : '🔬 분석 실행'}
            </Button>
            {apiError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{apiError}</p>
            )}
          </div>
        </div>

        {/* ── 오른쪽: 데이터 입력 ──────────────────────────── */}
        <Card className="border-l-4 border-l-blue-500 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-black text-blue-600">
              2
            </span>
            데이터 입력
          </h2>
          <Tabs value={inputTab} onValueChange={(v) => setInputTab(v as 'manual' | 'file')}>
            <TabsList className="mb-5 w-full max-w-xs">
              <TabsTrigger value="manual">✏️ 수동 입력</TabsTrigger>
              <TabsTrigger value="file">📂 파일 업로드</TabsTrigger>
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
