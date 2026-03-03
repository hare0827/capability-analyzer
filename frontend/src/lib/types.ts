// =====================================================
// PCA 공통 타입 정의
// 사양서 §9.2 요청/응답 스키마 기반
// =====================================================

export type AnalysisMode = 'cpk' | 'ppk' | 'dual'
export type SigmaMethod  = 'rbar' | 'sbar'
export type UserRole     = 'admin' | 'engineer' | 'viewer'

// ── 규격 입력 ──────────────────────────────────────
export interface SpecInput {
  usl: number
  lsl: number
  nominal?: number
}

// ── 분석 요청 (§9.2) ───────────────────────────────
export interface AnalyzeRequest {
  mode:            AnalysisMode
  data:            number[]
  usl:             number
  lsl:             number
  nominal?:        number
  subgroup_size?:  number   // Cpk 전용 (default: 5)
  sigma_method?:   SigmaMethod
  outlier_removal?: boolean
}

// ── 단일 지수 결과 ─────────────────────────────────
export interface IndexResult {
  // 주 지수
  cpk?:         number
  ppk?:         number
  // 보조 지수
  cp?:          number
  pp?:          number
  cpu?:         number
  cpl?:         number
  ppu?:         number
  ppl?:         number
  // 표준편차
  sigma_within?: number
  sigma_overall?: number
  // 치우침 (Cpk 전용)
  k?:           number
  // sigma method (Cpk 전용)
  sigma_method_used?: string
  // 불량률 — 방향별 분리
  defect_usl_pct?:    number
  defect_lsl_pct?:    number
  defect_total_pct:   number
  defect_rate_pct?:   number   // 하위 호환
  dpmo:               number
  sigma_level:        number
}

// ── 기술통계 ────────────────────────────────────────
export interface DescriptiveStats {
  n:      number
  mean:   number
  std_overall: number
  min:    number
  max:    number
  median: number
}

// ── 분석 응답 (§9.2) ────────────────────────────────
export interface AnalyzeResponse {
  status:      'ok' | 'error'
  cpk?:        IndexResult
  ppk?:        IndexResult
  stats:       DescriptiveStats
  analysis_id: string
  warnings:    string[]
}

// ── Gauge 등급 ──────────────────────────────────────
export type GradeLevel = 'D' | 'C' | 'B' | 'A' | 'A+' | 'A++'

export interface GradeInfo {
  grade:       GradeLevel
  color:       'red' | 'yellow' | 'green' | 'blue'
  dpmo:        number
  sigma_level: number
}

// §7.2 참조 테이블
export const GRADE_TABLE: Record<GradeLevel, GradeInfo> = {
  'D':   { grade: 'D',   color: 'red',    dpmo: 45500,  sigma_level: 2.0 },
  'C':   { grade: 'C',   color: 'yellow', dpmo: 2700,   sigma_level: 3.0 },
  'B':   { grade: 'B',   color: 'yellow', dpmo: 63.4,   sigma_level: 4.0 },
  'A':   { grade: 'A',   color: 'green',  dpmo: 6.8,    sigma_level: 4.5 },
  'A+':  { grade: 'A+',  color: 'green',  dpmo: 0.573,  sigma_level: 5.0 },
  'A++': { grade: 'A++', color: 'blue',   dpmo: 0.002,  sigma_level: 6.0 },
}

export function getGaugeColor(value: number): 'red' | 'yellow' | 'green' | 'blue' {
  if (value < 1.0)  return 'red'
  if (value < 1.33) return 'yellow'
  if (value < 1.67) return 'green'
  return 'blue'
}
