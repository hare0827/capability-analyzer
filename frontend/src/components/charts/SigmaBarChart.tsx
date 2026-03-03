/**
 * Sigma Level 바 차트 (사양서 §7.3)
 * - 0 ~ 6σ 범위
 * - 현재값 포인터 강조
 * - 목표선 표시
 */
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts'

interface SigmaBarChartProps {
  sigmaLevel: number
  targetSigma?: number   // 목표 sigma level (default 4.0 = Cpk 1.33)
}

const SIGMA_DATA = [
  { sigma: 2.0, dpmo: 45500,  grade: 'D',   color: '#EF4444' },
  { sigma: 3.0, dpmo: 2700,   grade: 'C',   color: '#F97316' },
  { sigma: 4.0, dpmo: 63.4,   grade: 'B',   color: '#F59E0B' },
  { sigma: 4.5, dpmo: 6.8,    grade: 'A',   color: '#22C55E' },
  { sigma: 5.0, dpmo: 0.573,  grade: 'A+',  color: '#10B981' },
  { sigma: 6.0, dpmo: 0.002,  grade: 'A++', color: '#3B82F6' },
]

export default function SigmaBarChart({ sigmaLevel, targetSigma = 4.0 }: SigmaBarChartProps) {
  const data = SIGMA_DATA.map((d) => ({
    ...d,
    height: d.sigma,                          // 막대 높이 = sigma 값
    isCurrent: Math.abs(d.sigma - sigmaLevel) === Math.min(
      ...SIGMA_DATA.map((s) => Math.abs(s.sigma - sigmaLevel))
    ),
  }))

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-800 font-mono">
          {sigmaLevel.toFixed(2)}σ
        </span>
        <span className="text-sm text-gray-400">현재 Sigma Level</span>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis
            dataKey="grade" tick={{ fontSize: 11, fill: '#6B7280' }}
          />
          <YAxis
            domain={[0, 6.5]} ticks={[0, 1, 2, 3, 4, 5, 6]}
            tick={{ fontSize: 10, fill: '#6B7280' }}
            label={{ value: 'σ', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#6B7280' }}
          />
          <Tooltip
            formatter={(val: number) => [`${val}σ`, 'Sigma Level']}
            labelFormatter={(label: string) => `등급: ${label}`}
          />

          {/* 현재 sigma level 기준선 */}
          <ReferenceLine
            y={sigmaLevel}
            stroke="#2563EB" strokeWidth={2} strokeDasharray="6 3"
            label={{ value: `현재 ${sigmaLevel.toFixed(1)}σ`, fill: '#2563EB', fontSize: 10, position: 'right' }}
          />

          {/* 목표 기준선 */}
          <ReferenceLine
            y={targetSigma}
            stroke="#10B981" strokeWidth={1.5} strokeDasharray="4 4"
            label={{ value: `목표 ${targetSigma}σ`, fill: '#10B981', fontSize: 10, position: 'right' }}
          />

          <Bar dataKey="height" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.color}
                opacity={entry.isCurrent ? 1.0 : 0.45}
                stroke={entry.isCurrent ? entry.color : 'none'}
                strokeWidth={entry.isCurrent ? 2 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
