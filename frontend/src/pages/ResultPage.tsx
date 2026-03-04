/**
 * SCR-05/06/07: 분석 결과 페이지 (Phase 4 차트 통합)
 * - Cpk 모드: Gauge + 정규분포 + X̄-R 관리도
 * - Ppk 모드: Gauge + 히스토그램 + 확률지
 * - Dual 모드: 두 모드 나란히 + 두 σ 곡선 동시 표시
 */
import { useNavigate } from 'react-router-dom'
import { useAnalysisStore } from '@/stores/analysisStore'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { getGrade, getDpmoColor, fmtDpmo, fmt } from '@/lib/utils'
import type { GradeLevel, IndexResult } from '@/lib/types'
import ExportMenu from '@/components/ExportMenu'

import GaugeChart       from '@/components/charts/GaugeChart'
import NormalDistChart  from '@/components/charts/NormalDistChart'
import HistogramChart   from '@/components/charts/HistogramChart'
import DefectCard       from '@/components/charts/DefectCard'
import SigmaBarChart    from '@/components/charts/SigmaBarChart'
import XBarRChart       from '@/components/charts/XBarRChart'
import ProbabilityPlot  from '@/components/charts/ProbabilityPlot'

const GRADE_COLOR: Record<GradeLevel, 'red' | 'yellow' | 'green' | 'blue'> = {
  D: 'red', C: 'yellow', B: 'yellow', A: 'green', 'A+': 'green', 'A++': 'blue',
}

export default function ResultPage() {
  const navigate = useNavigate()
  const { result, mode, spec, data, subgroupSize, sigmaMethod, setSpec } = useAnalysisStore()

  if (!result) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <p className="text-slate-500">분석 결과가 없습니다.</p>
        <Button onClick={() => navigate('/analyze')}>분석 시작하기</Button>
      </div>
    )
  }

  const { cpk, ppk, stats } = result

  // USL/LSL 드래그 핸들러 → store 업데이트 → 실제 재계산은 AnalyzePage에서
  const handleSpecChange = (newUsl: number, newLsl: number) => {
    setSpec({ usl: parseFloat(newUsl.toFixed(4)), lsl: parseFloat(newLsl.toFixed(4)) })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">
            Analysis Result
          </p>
          <h1 className="mt-0.5 text-2xl font-black text-slate-900">분석 결과</h1>
          <p className="font-mono text-xs text-slate-400">ID: {result.analysis_id}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/analyze')}>↩ 재분석</Button>
          <ExportMenu
            result={result}
            mode={mode}
            usl={spec.usl}
            lsl={spec.lsl}
            nominal={spec.nominal}
            subgroupSize={subgroupSize}
            sigmaMethod={sigmaMethod}
            data={data}
          />
        </div>
      </div>

      {/* 경고 */}
      {result.warnings.length > 0 && (
        <div className="flex flex-col gap-2">
          {result.warnings.map((w: string, i: number) => (
            <div key={i} className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
              {w}
            </div>
          ))}
        </div>
      )}

      {/* ── Dual Mode ───────────────────────────────────────────── */}
      {mode === 'dual' && cpk && ppk && (
        <>
          {/* Dual: 나란히 Gauge + 지수 */}
          <div className="grid grid-cols-2 gap-6">
            <IndexCard label="Cpk" res={cpk} />
            <IndexCard label="Ppk" res={ppk} />
          </div>

          {/* 두 σ 동시 표시 정규분포 */}
          <Card>
            <CardHeader><CardTitle>정규분포 비교 (σ̂ vs σ_overall)</CardTitle></CardHeader>
            <NormalDistChart
              mean={stats.mean} sigma={cpk.sigma_within ?? cpk.sigma_overall ?? stats.std_overall}
              usl={spec.usl} lsl={spec.lsl}
              label="σ̂ (within)"
              sigma2={ppk.sigma_overall}
              label2="σ (overall)"
              onSpecChange={handleSpecChange}
            />
            {Math.abs((cpk.cpk ?? 0) - (ppk.ppk ?? 0)) > 0.2 && (
              <p className="mt-3 text-xs text-orange-600 bg-orange-50 rounded px-3 py-1.5">
                Cpk − Ppk 차이 {Math.abs((cpk.cpk ?? 0) - (ppk.ppk ?? 0)).toFixed(4)} &gt; 0.2
                — 공정 불안정 신호. σ̂ 와 σ_overall 두 곡선의 너비 차이를 확인하세요.
              </p>
            )}
          </Card>

          {/* Dual 불량률 나란히 */}
          <div className="grid grid-cols-2 gap-6">
            <DefectCard label="Cpk 기준 불량률" dpmo={cpk.dpmo} defectTotalPct={cpk.defect_total_pct}
              defectUslPct={cpk.defect_usl_pct ?? 0} defectLslPct={cpk.defect_lsl_pct ?? 0}
              sigmaLevel={cpk.sigma_level} />
            <DefectCard label="Ppk 기준 불량률" dpmo={ppk.dpmo} defectTotalPct={ppk.defect_total_pct}
              defectUslPct={ppk.defect_usl_pct ?? 0} defectLslPct={ppk.defect_lsl_pct ?? 0}
              sigmaLevel={ppk.sigma_level} />
          </div>
        </>
      )}

      {/* ── Cpk 모드 ─────────────────────────────────────────────── */}
      {mode === 'cpk' && cpk && (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Gauge */}
            <Card className="flex flex-col items-center justify-center">
              <CardHeader className="w-full"><CardTitle>Cpk Gauge</CardTitle></CardHeader>
              <GaugeChart value={cpk.cpk ?? 0} label="Cpk" />
            </Card>
            {/* 지수 카드 */}
            <div className="lg:col-span-2">
              <IndexCard label="Cpk" res={cpk} />
            </div>
          </div>

          {/* 정규분포 곡선 */}
          <Card>
            <CardHeader><CardTitle>정규분포 곡선 (σ̂ within)</CardTitle></CardHeader>
            <NormalDistChart
              mean={stats.mean}
              sigma={cpk.sigma_within ?? stats.std_overall}
              usl={spec.usl} lsl={spec.lsl}
              label={`σ̂=${fmt(cpk.sigma_within ?? 0, 5)}`}
              onSpecChange={handleSpecChange}
            />
            <p className="mt-2 text-xs text-slate-400">USL/LSL 선을 드래그하면 규격이 변경됩니다.</p>
          </Card>

          {/* 불량률 + Sigma Bar */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <DefectCard dpmo={cpk.dpmo} defectTotalPct={cpk.defect_total_pct}
              defectUslPct={cpk.defect_usl_pct ?? 0} defectLslPct={cpk.defect_lsl_pct ?? 0}
              sigmaLevel={cpk.sigma_level} />
            <Card>
              <CardHeader><CardTitle>Sigma Level</CardTitle></CardHeader>
              <SigmaBarChart sigmaLevel={cpk.sigma_level} />
            </Card>
          </div>

          {/* X̄-R 관리도 */}
          <Card>
            <CardHeader>
              <CardTitle>X̄-R 관리도</CardTitle>
              <Badge color="gray">서브그룹 n={subgroupSize}</Badge>
            </CardHeader>
            <XBarRChart data={data} subgroupSize={subgroupSize} usl={spec.usl} lsl={spec.lsl} />
          </Card>
        </>
      )}

      {/* ── Ppk 모드 ─────────────────────────────────────────────── */}
      {mode === 'ppk' && ppk && (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="flex flex-col items-center justify-center">
              <CardHeader className="w-full"><CardTitle>Ppk Gauge</CardTitle></CardHeader>
              <GaugeChart value={ppk.ppk ?? 0} label="Ppk" />
            </Card>
            <div className="lg:col-span-2">
              <IndexCard label="Ppk" res={ppk} />
            </div>
          </div>

          {/* 히스토그램 */}
          <Card>
            <CardHeader><CardTitle>히스토그램 + 정규분포 오버레이</CardTitle></CardHeader>
            <HistogramChart
              data={data} mean={stats.mean}
              sigma={ppk.sigma_overall ?? stats.std_overall}
              usl={spec.usl} lsl={spec.lsl}
            />
          </Card>

          {/* 불량률 + Sigma Bar */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <DefectCard dpmo={ppk.dpmo} defectTotalPct={ppk.defect_total_pct}
              defectUslPct={ppk.defect_usl_pct ?? 0} defectLslPct={ppk.defect_lsl_pct ?? 0}
              sigmaLevel={ppk.sigma_level} />
            <Card>
              <CardHeader><CardTitle>Sigma Level</CardTitle></CardHeader>
              <SigmaBarChart sigmaLevel={ppk.sigma_level} />
            </Card>
          </div>

          {/* 확률지 */}
          <Card>
            <CardHeader><CardTitle>정규 확률지 (Normal Probability Plot)</CardTitle></CardHeader>
            <ProbabilityPlot data={data} />
            <p className="mt-2 text-xs text-slate-400">
              점이 기준 직선에 가까울수록 정규분포를 잘 따릅니다.
            </p>
          </Card>
        </>
      )}

      {/* 기술통계 */}
      <Card>
        <CardHeader><CardTitle>기술통계</CardTitle></CardHeader>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
          {[
            { label: 'n',          value: String(stats.n) },
            { label: '평균',       value: fmt(stats.mean) },
            { label: 'σ (overall)', value: fmt(stats.std_overall) },
            { label: '최솟값',     value: fmt(stats.min) },
            { label: '최댓값',     value: fmt(stats.max) },
            { label: '중앙값',     value: fmt(stats.median) },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5 text-center">
              <p className="text-xs text-slate-400">{label}</p>
              <p className="font-mono text-sm font-semibold text-slate-800">{value}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* 참조 테이블 */}
      <Card>
        <CardHeader><CardTitle>지수-불량률 참조 테이블</CardTitle></CardHeader>
        <RefTable currentVal={(cpk?.cpk ?? ppk?.ppk) ?? 0} />
      </Card>
    </div>
  )
}

/* ── 보조 컴포넌트 ─────────────────────────────────────────────────────────── */

function IndexCard({ label, res }: { label: string; res: IndexResult }) {
  const val   = (label === 'Cpk' ? res.cpk : res.ppk) ?? 0
  const grade = getGrade(val)
  const isCpk = label === 'Cpk'

  return (
    <Card>
      <CardHeader>
        <CardTitle>{label} 분석 결과</CardTitle>
        <Badge color={GRADE_COLOR[grade]}>{grade}등급</Badge>
      </CardHeader>
      <div className="mb-4 flex items-end gap-3">
        <span className={`text-5xl font-bold ${
          val < 1.0 ? 'text-red-500' : val < 1.33 ? 'text-yellow-500' :
          val < 1.67 ? 'text-green-500' : 'text-blue-500'
        }`}>{fmt(val)}</span>
        <span className="mb-1 text-sm text-slate-400">{label}</span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
        <div>
          <p className="text-xs text-slate-400">DPMO</p>
          <p className={`text-lg font-bold font-mono ${getDpmoColor(res.dpmo)}`}>{fmtDpmo(res.dpmo)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Sigma Level</p>
          <p className="text-lg font-bold font-mono text-slate-800">{fmt(res.sigma_level, 2)}σ</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        {(isCpk ? [
          { l: 'Cp',          v: fmt(res.cp ?? 0) },
          { l: 'Cpu',         v: fmt(res.cpu ?? 0) },
          { l: 'Cpl',         v: fmt(res.cpl ?? 0) },
          { l: 'σ̂ (within)',  v: fmt(res.sigma_within ?? 0, 6) },
          { l: 'k (치우침)',   v: fmt(res.k ?? 0) },
          { l: '방식',         v: res.sigma_method_used ?? '—' },
        ] : [
          { l: 'Pp',           v: fmt(res.pp ?? 0) },
          { l: 'Ppu',          v: fmt(res.ppu ?? 0) },
          { l: 'Ppl',          v: fmt(res.ppl ?? 0) },
          { l: 'σ (overall)',  v: fmt(res.sigma_overall ?? 0, 6) },
        ]).map(({ l, v }) => (
          <div key={l} className="flex justify-between text-xs">
            <span className="text-slate-400">{l}</span>
            <span className="font-mono text-slate-700">{v}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

const REF_ROWS: [number, number, number, number, GradeLevel][] = [
  [0.67, 2.0, 4.5500,    45500,  'D'  ],
  [1.00, 3.0, 0.2700,    2700,   'C'  ],
  [1.33, 4.0, 0.00634,   63.4,   'B'  ],
  [1.50, 4.5, 0.000680,  6.8,    'A'  ],
  [1.67, 5.0, 0.0000573, 0.573,  'A+' ],
  [2.00, 6.0, 1.97e-7,   0.002,  'A++'],
]

function RefTable({ currentVal }: { currentVal: number }) {
  // 현재값에 가장 가까운 행 하이라이트
  const closestIdx = REF_ROWS.reduce((best, row, i) =>
    Math.abs(row[0] - currentVal) < Math.abs(REF_ROWS[best][0] - currentVal) ? i : best, 0)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-100 text-slate-500">
            <th className="py-2 text-left">Cpk / Ppk</th>
            <th className="py-2 text-left">Sigma</th>
            <th className="py-2 text-right">불량률 (%)</th>
            <th className="py-2 text-right">DPMO</th>
            <th className="py-2 text-left">등급</th>
          </tr>
        </thead>
        <tbody>
          {REF_ROWS.map(([idx, sig, pct, dpmo, grade], i) => (
            <tr key={idx}
              className={`border-b border-slate-50 ${i === closestIdx ? 'bg-blue-50 font-medium' : ''}`}
            >
              <td className="py-2 font-mono">{idx.toFixed(2)}</td>
              <td className="py-2">{sig}σ</td>
              <td className="py-2 text-right font-mono">{pct.toFixed(7)}%</td>
              <td className={`py-2 text-right font-mono ${getDpmoColor(dpmo)}`}>{fmtDpmo(dpmo)}</td>
              <td className="py-2">
                <Badge color={GRADE_COLOR[grade]}>{grade}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
