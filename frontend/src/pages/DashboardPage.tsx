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

export default function DashboardPage() {
  const navigate = useNavigate()

  const { data: history, isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: () => historyApi.list(1, 5),
    // Phase 5 인증 전까지 오류 무시
    retry: false,
  })

  const items: {
    id: string; mode: string; part_number?: string;
    cpk?: number; ppk?: number; dpmo?: number; created_at: string
  }[] = history?.items ?? []

  return (
    <div className="flex flex-col gap-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
          <p className="text-sm text-gray-500">공정 능력 분석 현황</p>
        </div>
        <Button size="lg" onClick={() => navigate('/analyze')}>
          + 새 분석 시작
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: '총 분석 횟수', value: history?.total ?? '-', unit: '회' },
          { label: '이번 달 분석', value: '-', unit: '회' },
          { label: '평균 Cpk', value: '-', unit: '' },
        ].map(({ label, value, unit }) => (
          <Card key={label} className="flex flex-col gap-1">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-3xl font-bold text-gray-900">
              {value}<span className="text-base font-normal text-gray-400 ml-1">{unit}</span>
            </p>
          </Card>
        ))}
      </div>

      {/* 최근 분석 이력 */}
      <Card>
        <CardHeader>
          <CardTitle>최근 분석 이력</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>
            전체 보기
          </Button>
        </CardHeader>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-gray-400">불러오는 중...</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12">
            <p className="text-sm text-gray-400">아직 분석 이력이 없습니다.</p>
            <Button onClick={() => navigate('/analyze')}>첫 분석 시작하기</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-medium text-gray-500">
                  <th className="py-2 text-left">부품번호</th>
                  <th className="py-2 text-left">모드</th>
                  <th className="py-2 text-right">Cpk / Ppk</th>
                  <th className="py-2 text-right">DPMO</th>
                  <th className="py-2 text-left">등급</th>
                  <th className="py-2 text-left">일시</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const val = item.cpk ?? item.ppk ?? 0
                  const grade = getGrade(val)
                  return (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 font-mono text-xs">{item.part_number ?? '—'}</td>
                      <td className="py-3">
                        <Badge color="blue">{item.mode.toUpperCase()}</Badge>
                      </td>
                      <td className="py-3 text-right font-mono">{fmt(val)}</td>
                      <td className={`py-3 text-right font-mono ${getDpmoColor(item.dpmo ?? 0)}`}>
                        {fmtDpmo(item.dpmo ?? 0)}
                      </td>
                      <td className="py-3">
                        <Badge color={GRADE_COLOR[grade]}>{grade}</Badge>
                      </td>
                      <td className="py-3 text-xs text-gray-400">
                        {new Date(item.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="py-3 text-right">
                        <Button variant="ghost" size="sm"
                          onClick={() => navigate(`/analyze?history=${item.id}`)}>
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
    </div>
  )
}
