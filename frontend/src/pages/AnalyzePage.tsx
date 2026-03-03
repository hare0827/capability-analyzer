/**
 * SCR-03 + SCR-04: 분석 설정 + 데이터 입력 통합 페이지
 * 사양서 §3, §4
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

  // 분석 실행 가능 여부
  const canAnalyze =
    data.length >= 5 &&
    spec.usl > 0 &&
    spec.lsl > 0 &&
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">새 분석</h1>
        <p className="text-sm text-gray-500">공정 능력 지수를 분석합니다</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 왼쪽: 설정 패널 */}
        <div className="flex flex-col gap-4 lg:col-span-1">
          {/* SCR-03: 분석 설정 */}
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-gray-700">분석 설정</h2>
            <div className="flex flex-col gap-5">
              <ModeSelector />
              <SpecInput />
            </div>
          </Card>

          {/* 분석 실행 */}
          <div className="flex flex-col gap-2">
            {!canAnalyze && data.length > 0 && (
              <p className="text-xs text-yellow-600">
                {data.length < 5
                  ? `데이터 ${data.length}개 — 최소 5개 필요`
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
              분석 실행
            </Button>
            {apiError && (
              <p className="text-xs text-red-500">{apiError}</p>
            )}
          </div>

          {/* 데이터 상태 요약 */}
          {data.length > 0 && (
            <Card className="bg-gray-50 py-3">
              <div className="flex justify-around text-center">
                <div>
                  <p className="text-xs text-gray-400">데이터 수</p>
                  <p className="text-lg font-bold text-gray-800">{data.length}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">USL</p>
                  <p className="text-lg font-bold text-gray-800">{spec.usl || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">LSL</p>
                  <p className="text-lg font-bold text-gray-800">{spec.lsl || '—'}</p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* 오른쪽: SCR-04 데이터 입력 */}
        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">데이터 입력</h2>
          <Tabs value={inputTab} onValueChange={(v) => setInputTab(v as 'manual' | 'file')}>
            <TabsList className="mb-4 w-full max-w-xs">
              <TabsTrigger value="manual">수동 입력</TabsTrigger>
              <TabsTrigger value="file">파일 업로드</TabsTrigger>
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
