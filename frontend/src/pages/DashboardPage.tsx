/**
 * SCR-02: 대시보드 — Minitab 스타일
 */
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { historyApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { getGrade, getDpmoColor, fmtDpmo, fmt } from '@/lib/utils'
import type { GradeLevel } from '@/lib/types'

const GRADE_COLOR: Record<GradeLevel, 'red' | 'yellow' | 'green' | 'blue'> = {
  D: 'red', C: 'yellow', B: 'yellow', A: 'green', 'A+': 'green', 'A++': 'blue',
}

export default function DashboardPage() {
  const navigate = useNavigate()

  const { data: history, isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: () => historyApi.list(1, 5),
    retry: false,
  })

  const items: {
    id: string; mode: string; part_number?: string;
    cpk?: number; ppk?: number; dpmo?: number; created_at: string
  }[] = history?.items ?? []

  return (
    <div className="flex flex-col gap-5">
      {/* 페이지 타이틀 바 */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>
          <p className="text-[12px] text-gray-500 mt-0.5">Process Capability Analysis Overview</p>
        </div>
        <Button size="md" onClick={() => navigate('/analyze')}>
          New Analysis
        </Button>
      </div>

      {/* 통계 요약 카드 3개 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Total Analyses', value: history?.total ?? '—', unit: '' },
          { label: 'This Month',     value: '—',                   unit: '' },
          { label: 'Average Cpk',    value: '—',                   unit: '' },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-sm border border-gray-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
            <p className="mt-1 text-3xl font-bold text-gray-800">{value}</p>
          </div>
        ))}
      </div>

      {/* 최근 분석 이력 */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Analyses</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>
            View All →
          </Button>
        </CardHeader>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-gray-400">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading...
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-gray-200 bg-gray-50">
              <svg className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-medium text-gray-600">No analyses yet</p>
              <p className="text-[12px] text-gray-400 mt-0.5">Start your first capability analysis</p>
            </div>
            <Button size="sm" onClick={() => navigate('/analyze')}>New Analysis</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  {['Part Number', 'Mode', 'Cpk / Ppk', 'DPMO', 'Grade', 'Date', ''].map((h) => (
                    <th
                      key={h}
                      className="py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400 first:pl-0 last:text-right"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const val = item.cpk ?? item.ppk ?? 0
                  const grade = getGrade(val)
                  return (
                    <tr key={item.id}
                      className="border-b border-gray-50 transition-colors hover:bg-[#f0f7fc]">
                      <td className="py-2.5 font-mono text-[12px] text-gray-600">
                        {item.part_number ?? '—'}
                      </td>
                      <td className="py-2.5">
                        <Badge color="blue">{item.mode.toUpperCase()}</Badge>
                      </td>
                      <td className="py-2.5 font-mono font-semibold text-gray-800">{fmt(val)}</td>
                      <td className={`py-2.5 font-mono ${getDpmoColor(item.dpmo ?? 0)}`}>
                        {fmtDpmo(item.dpmo ?? 0)}
                      </td>
                      <td className="py-2.5">
                        <Badge color={GRADE_COLOR[grade]}>{grade}</Badge>
                      </td>
                      <td className="py-2.5 text-[12px] text-gray-400">
                        {new Date(item.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="py-2.5 text-right">
                        <Button variant="ghost" size="sm"
                          onClick={() => navigate(`/analyze?history=${item.id}`)}>
                          Reanalyze
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 분석 유형 안내 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            title: 'Cpk — Short-term Capability',
            desc: 'Measures process capability using within-subgroup variation (σ̂). Use when the process is in statistical control.',
            color: 'border-t-[#0083CA]',
          },
          {
            title: 'Ppk — Long-term Performance',
            desc: 'Measures overall process performance using total variation (σ). Includes drift and systematic error.',
            color: 'border-t-[#22C55E]',
          },
          {
            title: 'Dual — Side-by-Side',
            desc: 'Compare Cpk and Ppk simultaneously. A gap > 0.2 signals process instability or special causes.',
            color: 'border-t-[#F59E0B]',
          },
        ].map(({ title, desc, color }) => (
          <div
            key={title}
            className={`rounded-sm border border-gray-200 border-t-4 ${color} bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]`}
          >
            <p className="text-[13px] font-semibold text-gray-800">{title}</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-gray-500">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
