import { create } from 'zustand'
import type { AnalysisMode, SigmaMethod, AnalyzeResponse, SpecInput } from '@/lib/types'

interface AnalysisState {
  // 모드
  mode: AnalysisMode
  setMode: (mode: AnalysisMode) => void

  // 규격
  spec: SpecInput
  setSpec: (spec: Partial<SpecInput>) => void

  // 데이터
  data: number[]
  setData: (data: number[]) => void

  // Cpk 전용 파라미터
  subgroupSize: number
  setSubgroupSize: (size: number) => void
  sigmaMethod: SigmaMethod
  setSigmaMethod: (method: SigmaMethod) => void

  // 이상치 처리
  outlierRemoval: boolean
  setOutlierRemoval: (v: boolean) => void

  // 분석 결과
  result: AnalyzeResponse | null
  setResult: (result: AnalyzeResponse | null) => void

  // 전체 초기화
  reset: () => void
}

const INITIAL_SPEC: SpecInput = { usl: 0, lsl: 0, nominal: undefined }

export const useAnalysisStore = create<AnalysisState>((set) => ({
  mode: 'cpk',
  setMode: (mode) => set({ mode }),

  spec: INITIAL_SPEC,
  setSpec: (partial) =>
    set((s) => ({ spec: { ...s.spec, ...partial } })),

  data: [],
  setData: (data) => set({ data }),

  subgroupSize: 5,
  setSubgroupSize: (subgroupSize) => set({ subgroupSize }),

  sigmaMethod: 'rbar',
  setSigmaMethod: (sigmaMethod) => set({ sigmaMethod }),

  outlierRemoval: false,
  setOutlierRemoval: (outlierRemoval) => set({ outlierRemoval }),

  result: null,
  setResult: (result) => set({ result }),

  reset: () => set({
    mode: 'cpk',
    spec: INITIAL_SPEC,
    data: [],
    subgroupSize: 5,
    sigmaMethod: 'rbar',
    outlierRemoval: false,
    result: null,
  }),
}))
