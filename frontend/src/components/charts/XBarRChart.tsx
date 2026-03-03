/**
 * X̄-R 관리도 (사양서 §5.2, Cpk 모드 전용)
 * - 서브그룹 평균(X̄) 차트
 * - 서브그룹 범위(R) 차트
 * - 관리 한계선(UCL / LCL / CL) 자동 계산
 * - Recharts LineChart
 */
import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { D2_VALUES, D3_VALUES, D4_VALUES } from '@/lib/controlChartConstants'

interface XBarRChartProps {
  data:          number[]
  subgroupSize:  number
  usl?:          number
  lsl?:          number
}

export default function XBarRChart({ data, subgroupSize, usl, lsl }: XBarRChartProps) {
  const { xbarData, rData, xbarLimits, rLimits } = useMemo(() => {
    const n = subgroupSize
    const nGroups = Math.floor(data.length / n)
    if (nGroups < 2) return { xbarData: [], rData: [], xbarLimits: null, rLimits: null }

    const groups = Array.from({ length: nGroups }, (_, i) =>
      data.slice(i * n, (i + 1) * n)
    )

    const xbars = groups.map((g) => g.reduce((a, b) => a + b, 0) / n)
    const ranges = groups.map((g) => Math.max(...g) - Math.min(...g))

    const xbarBar = xbars.reduce((a, b) => a + b, 0) / nGroups
    const rBar    = ranges.reduce((a, b) => a + b, 0) / nGroups

    const d2 = D2_VALUES[n] ?? 2.326
    const d3 = D3_VALUES[n] ?? 0
    const d4 = D4_VALUES[n] ?? 2.114

    const A2 = 3 / (d2 * Math.sqrt(n))
    const xbarUCL = xbarBar + A2 * rBar
    const xbarLCL = xbarBar - A2 * rBar
    const rUCL = d4 * rBar
    const rLCL = d3 * rBar

    const xbarData = xbars.map((v, i) => ({
      group: i + 1,
      xbar: parseFloat(v.toFixed(5)),
      outOfControl: v > xbarUCL || v < xbarLCL,
    }))

    const rData = ranges.map((v, i) => ({
      group: i + 1,
      range: parseFloat(v.toFixed(5)),
      outOfControl: v > rUCL,
    }))

    return {
      xbarData,
      rData,
      xbarLimits: { ucl: xbarUCL, lcl: xbarLCL, cl: xbarBar },
      rLimits: { ucl: rUCL, lcl: rLCL, cl: rBar },
    }
  }, [data, subgroupSize])

  if (xbarData.length === 0) {
    return (
      <p className="text-xs text-gray-400 text-center py-4">
        서브그룹 2개 이상 필요 (현재 데이터: {data.length}개, 서브그룹 크기: {subgroupSize})
      </p>
    )
  }

  const dotColor = (entry: { outOfControl: boolean }) =>
    entry.outOfControl ? '#EF4444' : '#3B82F6'

  return (
    <div className="flex flex-col gap-6">
      {/* X̄ 차트 */}
      <div>
        <p className="mb-2 text-xs font-semibold text-gray-600">X̄ 차트 (서브그룹 평균)</p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={xbarData} margin={{ top: 8, right: 20, bottom: 8, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="group" tick={{ fontSize: 10, fill: '#6B7280' }} label={{ value: '서브그룹', position: 'insideBottom', fontSize: 10, fill: '#9CA3AF', offset: -4 }} />
            <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} />
            <Tooltip formatter={(v: number) => v.toFixed(4)} labelFormatter={(l: number) => `서브그룹 #${l}`} />

            {xbarLimits && <>
              <ReferenceLine y={xbarLimits.ucl} stroke="#EF4444" strokeDasharray="4 3" label={{ value: `UCL=${xbarLimits.ucl.toFixed(3)}`, fill: '#EF4444', fontSize: 9 }} />
              <ReferenceLine y={xbarLimits.cl}  stroke="#6B7280" strokeDasharray="6 2" label={{ value: `X̄=${xbarLimits.cl.toFixed(3)}`, fill: '#6B7280', fontSize: 9 }} />
              <ReferenceLine y={xbarLimits.lcl} stroke="#EF4444" strokeDasharray="4 3" label={{ value: `LCL=${xbarLimits.lcl.toFixed(3)}`, fill: '#EF4444', fontSize: 9 }} />
            </>}
            {usl && <ReferenceLine y={usl} stroke="#DC2626" strokeWidth={1.5} label={{ value: 'USL', fill: '#DC2626', fontSize: 9 }} />}
            {lsl && <ReferenceLine y={lsl} stroke="#DC2626" strokeWidth={1.5} label={{ value: 'LSL', fill: '#DC2626', fontSize: 9 }} />}

            <Line
              dataKey="xbar" name="X̄" stroke="#3B82F6" strokeWidth={1.5}
              dot={(props) => {
                const { cx, cy, payload } = props
                return <circle key={props.key} cx={cx} cy={cy} r={3} fill={dotColor(payload)} />
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* R 차트 */}
      <div>
        <p className="mb-2 text-xs font-semibold text-gray-600">R 차트 (서브그룹 범위)</p>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={rData} margin={{ top: 8, right: 20, bottom: 8, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="group" tick={{ fontSize: 10, fill: '#6B7280' }} />
            <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} />
            <Tooltip formatter={(v: number) => v.toFixed(4)} labelFormatter={(l: number) => `서브그룹 #${l}`} />

            {rLimits && <>
              <ReferenceLine y={rLimits.ucl} stroke="#EF4444" strokeDasharray="4 3" label={{ value: `UCL=${rLimits.ucl.toFixed(3)}`, fill: '#EF4444', fontSize: 9 }} />
              <ReferenceLine y={rLimits.cl}  stroke="#6B7280" strokeDasharray="6 2" label={{ value: `R̄=${rLimits.cl.toFixed(3)}`, fill: '#6B7280', fontSize: 9 }} />
            </>}

            <Line
              dataKey="range" name="R" stroke="#8B5CF6" strokeWidth={1.5}
              dot={(props) => {
                const { cx, cy, payload } = props
                return <circle key={props.key} cx={cx} cy={cy} r={3} fill={payload.outOfControl ? '#EF4444' : '#8B5CF6'} />
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
