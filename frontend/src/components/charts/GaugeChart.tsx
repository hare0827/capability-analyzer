/**
 * Gauge 차트 (사양서 §5.2)
 * - 범위: 0 ~ 2.0
 * - 4구간 색상: Red(<1.0) / Yellow(1.0~1.33) / Green(1.33~1.67) / Blue(≥1.67)
 * - 포인터 애니메이션
 * - SVG 직접 구현 (외부 라이브러리 불필요)
 */
import { useEffect, useRef } from 'react'

interface GaugeChartProps {
  value: number       // Cpk / Ppk 값
  label?: string      // 'Cpk' | 'Ppk'
  max?: number        // 기본 2.0
}

// 게이지 구간 정의 (사양서 §5.2)
const ZONES = [
  { min: 0,    max: 1.0,  color: '#EF4444', label: 'D/C' },
  { min: 1.0,  max: 1.33, color: '#F59E0B', label: 'B' },
  { min: 1.33, max: 1.67, color: '#22C55E', label: 'A' },
  { min: 1.67, max: 2.0,  color: '#3B82F6', label: 'A+' },
]

const W = 260
const H = 160
const CX = W / 2
const CY = H - 20
const R_OUTER = 110
const R_INNER = 72
const R_TICK  = 118

// 값 → 각도 변환 (180° ~ 0°, left → right)
function valToAngle(val: number, maxVal: number): number {
  const clamped = Math.max(0, Math.min(val, maxVal))
  return 180 - (clamped / maxVal) * 180
}

// 극좌표 → SVG 좌표
function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: cx + r * Math.cos(rad),
    y: cy - r * Math.sin(rad),
  }
}

// 호 SVG path
function arcPath(
  cx: number, cy: number,
  rOuter: number, rInner: number,
  startAngle: number, endAngle: number,
): string {
  const s1 = polar(cx, cy, rOuter, startAngle)
  const e1 = polar(cx, cy, rOuter, endAngle)
  const s2 = polar(cx, cy, rInner, endAngle)
  const e2 = polar(cx, cy, rInner, startAngle)
  const large = Math.abs(startAngle - endAngle) > 180 ? 1 : 0
  return [
    `M ${s1.x} ${s1.y}`,
    `A ${rOuter} ${rOuter} 0 ${large} 0 ${e1.x} ${e1.y}`,
    `L ${s2.x} ${s2.y}`,
    `A ${rInner} ${rInner} 0 ${large} 1 ${e2.x} ${e2.y}`,
    'Z',
  ].join(' ')
}

function getPointerColor(val: number): string {
  if (val < 1.0)  return '#EF4444'
  if (val < 1.33) return '#F59E0B'
  if (val < 1.67) return '#22C55E'
  return '#3B82F6'
}

export default function GaugeChart({ value, label = 'Index', max = 2.0 }: GaugeChartProps) {
  const needleRef = useRef<SVGLineElement>(null)
  const dotRef    = useRef<SVGCircleElement>(null)

  // 포인터 애니메이션
  useEffect(() => {
    const targetAngle = valToAngle(value, max)
    const el = needleRef.current
    if (!el) return

    let start: number | null = null
    const from = parseFloat(el.getAttribute('data-angle') ?? '180')
    const to   = targetAngle
    const dur  = 600  // ms

    function step(ts: number) {
      if (!start) start = ts
      const progress = Math.min((ts - start) / dur, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      const angle = from + (to - from) * ease

      const tip  = polar(CX, CY, R_INNER - 8, angle)
      const base = polar(CX, CY, 14, angle)
      if (!el) return
      el.setAttribute('x1', String(base.x))
      el.setAttribute('y1', String(base.y))
      el.setAttribute('x2', String(tip.x))
      el.setAttribute('y2', String(tip.y))

      if (progress < 1) requestAnimationFrame(step)
      else el.setAttribute('data-angle', String(to))
    }
    requestAnimationFrame(step)
  }, [value, max])

  const pointerAngle = valToAngle(value, max)
  const pointerTip   = polar(CX, CY, R_INNER - 8, pointerAngle)
  const pointerBase  = polar(CX, CY, 14, pointerAngle)
  const color        = getPointerColor(value)

  // 눈금 레이블
  const ticks = [0, 0.5, 1.0, 1.33, 1.67, 2.0]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xs">
      {/* 구간 호 */}
      {ZONES.map((zone) => {
        const startA = valToAngle(zone.min, max)
        const endA   = valToAngle(zone.max, max)
        return (
          <path
            key={zone.label}
            d={arcPath(CX, CY, R_OUTER, R_INNER, startA, endA)}
            fill={zone.color}
            opacity={0.85}
          />
        )
      })}

      {/* 배경 호 (테두리) */}
      <path
        d={arcPath(CX, CY, R_OUTER + 2, R_INNER - 2, 180, 0)}
        fill="none"
        stroke="#E5E7EB"
        strokeWidth="1"
      />

      {/* 눈금 */}
      {ticks.map((t) => {
        const a  = valToAngle(t, max)
        const p1 = polar(CX, CY, R_OUTER + 4, a)
        const p2 = polar(CX, CY, R_TICK, a)
        const pt = polar(CX, CY, R_TICK + 13, a)
        return (
          <g key={t}>
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#9CA3AF" strokeWidth="1.5" />
            <text
              x={pt.x} y={pt.y + 4}
              textAnchor="middle" fontSize="9" fill="#6B7280"
            >
              {t}
            </text>
          </g>
        )
      })}

      {/* 포인터 */}
      <line
        ref={needleRef}
        data-angle={pointerAngle}
        x1={pointerBase.x} y1={pointerBase.y}
        x2={pointerTip.x}  y2={pointerTip.y}
        stroke={color} strokeWidth="3" strokeLinecap="round"
      />
      {/* 포인터 중심 원 */}
      <circle ref={dotRef} cx={CX} cy={CY} r="6" fill={color} />
      <circle cx={CX} cy={CY} r="3" fill="white" />

      {/* 값 표시 */}
      <text x={CX} y={CY - 22} textAnchor="middle" fontSize="22" fontWeight="bold" fill={color}>
        {value.toFixed(4)}
      </text>
      <text x={CX} y={CY - 6} textAnchor="middle" fontSize="11" fill="#6B7280">
        {label}
      </text>

      {/* 판정 텍스트 */}
      <text x={CX} y={H - 4} textAnchor="middle" fontSize="10" fill={color} fontWeight="600">
        {value < 1.0  ? '불합격 (D/C)' :
         value < 1.33 ? '주의 (B)' :
         value < 1.67 ? '합격 (A)' : '우수 (A+/A++)'}
      </text>
    </svg>
  )
}
