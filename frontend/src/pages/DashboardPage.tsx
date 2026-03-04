/**
 * SCR-02: 대시보드
 * - 최근 분석 이력 카드
 * - 신규 분석 버튼
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

const STAT_CARDS = [
  {
    label: '총 분석 횟수',
    icon: '📊',
    key: 'total' as const,
    unit: '회',
    gradient: 'from-indigo-500 to-blue-500',
    bg: 'from-indigo-50 to-blue-50',
    border: 'border-indigo-100',
  },
  {
    label: '이번 달 분석',
    icon: '📅',
    key: 'month' as const,
    unit: '회',
    gradient: 'from-violet-500 to-purple-500',
    bg: 'from-violet-50 to-purple-50',
    border: 'border-violet-100',
  },
  {
    label: '평균 Cpk',
    icon: '⚙️',
    key: 'avgCpk' as const,
    unit: '',
    gradient: 'from-emerald-500 to-teal-500',
    bg: 'from-emerald-50 to-teal-50',
    border: 'border-emerald-100',
  },
]

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

  const statValues: Record<'total' | 'month' | 'avgCpk', string | number> = {
    total: history?.total ?? '—',
    month: '—',
    avgCpk: '—',
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 히어로 배너 */}
      <div
        className="relative overflow-hidden rounded-2xl px-8 py-8"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e293b 100%)',
        }}
      >
        {/* 배경 장식 */}
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }}
        />
        <div
          className="pointer-events-none absolute -bottom-8 left-1/3 h-32 w-32 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }}
        />

        <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
              SPC · Statistical Process Control
            </p>
            <h1 className="mt-1 text-3xl font-black text-white">공정 능력 분석</h1>
            <p className="mt-1 text-sm text-slate-400">
              Cpk / Ppk 분석으로 제조 품질을 정량화하세요
            </p>
          </div>
          <Button size="lg" onClick={() => navigate('/analyze')} className="shrink-0 mt-4 sm:mt-0">
            ＋ 새 분석 시작
          </Button>
        </div>
      </div>

      {/* 통계 카드 3개 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {STAT_CARDS.map(({ label, icon, key, unit, bg, border }) => (
          <div
            key={label}
            className={`rounded-2xl border ${border} bg-gradient-to-br ${bg} p-5 shadow-sm`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <p className="mt-1 text-3xl font-black text-slate-800">
                  {statValues[key]}
                  {unit && (
                    <span className="ml-1 text-base font-normal text-slate-400">{unit}</span>
                  )}
                </p>
              </div>
              <span className="text-2xl">{icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 최근 분석 이력 */}
      <Card>
        <CardHeader>
          <CardTitle>최근 분석 이력</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>
            전체 보기 →
          </Button>
        </CardHeader>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            불러오는 중...
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-14">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
              📋
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-700">아직 분석 이력이 없습니다</p>
              <p className="mt-1 text-sm text-slate-400">첫 번째 분석을 시작해보세요!</p>
            </div>
            <Button onClick={() => navigate('/analyze')}>첫 분석 시작하기</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    부품번호
                  </th>
                  <th className="py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    모드
                  </th>
                  <th className="py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Cpk / Ppk
                  </th>
                  <th className="py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                    DPMO
                  </th>
                  <th className="py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    등급
                  </th>
                  <th className="py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    일시
                  </th>
                  <th className="py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const val = item.cpk ?? item.ppk ?? 0
                  const grade = getGrade(val)
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-slate-50 transition-colors hover:bg-slate-50"
                    >
                      <td className="py-3 font-mono text-xs text-slate-600">
                        {item.part_number ?? '—'}
                      </td>
                      <td className="py-3">
                        <Badge color="blue">{item.mode.toUpperCase()}</Badge>
                      </td>
                      <td className="py-3 text-right font-mono font-semibold text-slate-800">
                        {fmt(val)}
                      </td>
                      <td className={`py-3 text-right font-mono ${getDpmoColor(item.dpmo ?? 0)}`}>
                        {fmtDpmo(item.dpmo ?? 0)}
                      </td>
                      <td className="py-3">
                        <Badge color={GRADE_COLOR[grade]}>{grade}</Badge>
                      </td>
                      <td className="py-3 text-xs text-slate-400">
                        {new Date(item.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/analyze?history=${item.id}`)}
                        >
                          재분석
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

      {/* 분석 가이드 카드 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            icon: '🎯',
            title: 'Cpk (단기 능력)',
            desc: '서브그룹 내 변동(σ̂)으로 측정. 공정이 안정적일 때 단기 능력을 평가합니다.',
            color: 'border-t-indigo-500',
          },
          {
            icon: '📈',
            title: 'Ppk (장기 능력)',
            desc: '전체 변동(σ)으로 측정. 드리프트·계통 오차를 포함한 실제 성능을 반영합니다.',
            color: 'border-t-blue-500',
          },
          {
            icon: '⚖️',
            title: 'Dual 모드',
            desc: 'Cpk와 Ppk를 동시 비교. 두 값의 차이가 0.2 이상이면 공정 불안정 신호입니다.',
            color: 'border-t-violet-500',
          },
        ].map(({ icon, title, desc, color }) => (
          <div
            key={title}
            className={`rounded-2xl border-t-4 ${color} border border-slate-200 bg-white p-5 shadow-sm`}
          >
            <span className="text-2xl">{icon}</span>
            <p className="mt-2 font-semibold text-slate-800">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
