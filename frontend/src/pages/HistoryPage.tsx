/**
 * SCR-09: 분석 이력 관리
 * - 날짜 / 부품번호 / 모드 필터
 * - 재분석 버튼
 * - 이력 삭제 (소유자 전용 — Phase 5에서 권한 제어)
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { historyApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { getGrade, getDpmoColor, fmtDpmo, fmt } from '@/lib/utils'
import type { GradeLevel } from '@/lib/types'

const GRADE_COLOR: Record<GradeLevel, 'red' | 'yellow' | 'green' | 'blue'> = {
  D: 'red', C: 'yellow', B: 'yellow', A: 'green', 'A+': 'green', 'A++': 'blue',
}

const MODE_OPTIONS = ['전체', 'cpk', 'ppk', 'dual'] as const
type ModeFilter = (typeof MODE_OPTIONS)[number]

export default function HistoryPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [modeFilter, setModeFilter] = useState<ModeFilter>('전체')
  const [partFilter, setPartFilter] = useState('')

  const { data: history, isLoading } = useQuery({
    queryKey: ['history', page, modeFilter, partFilter],
    queryFn: () => historyApi.list(page, 20),
    retry: false,
  })

  const deleteMutation = useMutation({
    mutationFn: historyApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['history'] }),
  })

  const items: {
    id: string; mode: string; part_number?: string;
    cpk?: number; ppk?: number; dpmo?: number; created_at: string
  }[] = history?.items ?? []

  const filtered = items.filter((item) => {
    const modeMatch = modeFilter === '전체' || item.mode === modeFilter
    const partMatch = !partFilter || item.part_number?.includes(partFilter)
    return modeMatch && partMatch
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">분석 이력</h1>
        <p className="text-sm text-gray-500">저장된 분석 결과를 조회하고 재분석할 수 있습니다</p>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap items-end gap-3">
        {/* 모드 필터 */}
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {MODE_OPTIONS.map((m) => (
            <button
              key={m}
              onClick={() => setModeFilter(m)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                modeFilter === m
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {m === '전체' ? '전체' : m.toUpperCase()}
            </button>
          ))}
        </div>
        {/* 부품번호 검색 */}
        <Input
          placeholder="부품번호 검색..."
          value={partFilter}
          onChange={(e) => setPartFilter(e.target.value)}
          className="w-48"
        />
        <Button variant="secondary" size="sm" onClick={() => { setModeFilter('전체'); setPartFilter('') }}>
          초기화
        </Button>
      </div>

      {/* 이력 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>분석 이력 {history?.total != null && `(${history.total}건)`}</CardTitle>
        </CardHeader>

        {isLoading ? (
          <div className="py-10 text-center text-sm text-gray-400">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">이력이 없습니다.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-medium text-gray-500">
                    <th className="py-2 text-left">부품번호</th>
                    <th className="py-2 text-left">모드</th>
                    <th className="py-2 text-right">Cpk</th>
                    <th className="py-2 text-right">Ppk</th>
                    <th className="py-2 text-right">DPMO</th>
                    <th className="py-2 text-left">등급</th>
                    <th className="py-2 text-left">분석일</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const val = item.cpk ?? item.ppk ?? 0
                    const grade = getGrade(val)
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-gray-50 hover:bg-gray-50"
                      >
                        <td className="py-3 font-mono text-xs text-gray-600">
                          {item.part_number ?? '—'}
                        </td>
                        <td className="py-3">
                          <Badge color="blue">{item.mode.toUpperCase()}</Badge>
                        </td>
                        <td className="py-3 text-right font-mono">
                          {item.cpk != null ? fmt(item.cpk) : '—'}
                        </td>
                        <td className="py-3 text-right font-mono">
                          {item.ppk != null ? fmt(item.ppk) : '—'}
                        </td>
                        <td className={`py-3 text-right font-mono text-xs ${getDpmoColor(item.dpmo ?? 0)}`}>
                          {fmtDpmo(item.dpmo ?? 0)}
                        </td>
                        <td className="py-3">
                          <Badge color={GRADE_COLOR[grade]}>{grade}</Badge>
                        </td>
                        <td className="py-3 text-xs text-gray-400">
                          {new Date(item.created_at).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="py-3">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/analyze?history=${item.id}`)}
                            >
                              재분석
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:bg-red-50 hover:text-red-600"
                              onClick={() => {
                                if (confirm('이 분석 이력을 삭제할까요?')) {
                                  deleteMutation.mutate(item.id)
                                }
                              }}
                            >
                              삭제
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 */}
            {history && history.total > 20 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  이전
                </Button>
                <span className="text-sm text-gray-500">
                  {page} / {Math.ceil(history.total / 20)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= Math.ceil(history.total / 20)}
                  onClick={() => setPage(page + 1)}
                >
                  다음
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
