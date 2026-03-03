/**
 * 히스토그램 + 정규분포 오버레이 (사양서 §6.2)
 * - Recharts ComposedChart
 * - 구간 너비 슬라이더
 * - USL / LSL 레퍼런스 라인
 */
import { useState, useMemo } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Legend,
} from 'recharts'

interface HistogramChartProps {
  data:  number[]
  mean:  number
  sigma: number
  usl:   number
  lsl:   number
}

function normPDF(x: number, mu: number, sig: number): number {
  return Math.exp(-0.5 * ((x - mu) / sig) ** 2) / (sig * Math.sqrt(2 * Math.PI))
}

export default function HistogramChart({ data, mean, sigma, usl, lsl }: HistogramChartProps) {
  const [binCount, setBinCount] = useState(15)

  const chartData = useMemo(() => {
    if (data.length === 0) return []

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const binWidth = range / binCount

    // 빈도 계산
    const bins: { x: number; count: number; density: number; normal: number }[] = []
    for (let i = 0; i < binCount; i++) {
      const lo = min + i * binWidth
      const hi = lo + binWidth
      const mid = (lo + hi) / 2
      const count = data.filter((v) => v >= lo && (i === binCount - 1 ? v <= hi : v < hi)).length
      const density = count / (data.length * binWidth)
      bins.push({ x: parseFloat(mid.toFixed(4)), count, density, normal: normPDF(mid, mean, sigma) })
    }
    return bins
  }, [data, mean, sigma, binCount])

  if (data.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      {/* 구간 너비 슬라이더 */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-gray-500 whitespace-nowrap">구간 수</label>
        <input
          type="range" min={5} max={40} value={binCount}
          onChange={(e) => setBinCount(Number(e.target.value))}
          className="flex-1 accent-blue-600"
        />
        <span className="text-xs font-mono text-gray-600 w-6">{binCount}</span>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis
            dataKey="x" type="number" domain={['auto', 'auto']}
            tickFormatter={(v: number) => v.toFixed(2)}
            tick={{ fontSize: 10, fill: '#6B7280' }}
          />
          <YAxis yAxisId="density" tick={{ fontSize: 10, fill: '#6B7280' }} width={40} />
          <Tooltip
            formatter={(val: number, name: string) => [
              name === '밀도' ? val.toFixed(5) : val.toFixed(5),
              name,
            ]}
            labelFormatter={(v: number) => `x = ${Number(v).toFixed(3)}`}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />

          {/* USL / LSL 기준선 */}
          <ReferenceLine yAxisId="density" x={usl} stroke="#EF4444" strokeWidth={2} label={{ value: 'USL', fill: '#EF4444', fontSize: 10 }} />
          <ReferenceLine yAxisId="density" x={lsl} stroke="#EF4444" strokeWidth={2} label={{ value: 'LSL', fill: '#EF4444', fontSize: 10 }} />
          <ReferenceLine yAxisId="density" x={mean} stroke="#6B7280" strokeDasharray="4 3" label={{ value: 'μ', fill: '#6B7280', fontSize: 10 }} />

          {/* 히스토그램 막대 */}
          <Bar yAxisId="density" dataKey="density" name="밀도" fill="#93C5FD" opacity={0.7} />

          {/* 정규분포 오버레이 */}
          <Line
            yAxisId="density" dataKey="normal" name="정규분포"
            stroke="#2563EB" strokeWidth={2} dot={false} type="monotone"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
