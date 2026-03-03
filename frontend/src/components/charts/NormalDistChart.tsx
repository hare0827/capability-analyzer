/**
 * 정규분포 곡선 (사양서 §5.2, §6.2)
 * - D3.js SVG 직접 제어
 * - μ, ±3σ, USL/LSL 수직선
 * - 규격 초과 영역 빨간색 음영
 * - USL/LSL 드래그 → onSpecChange 콜백 (실시간 재계산)
 */
import { useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'

interface NormalDistChartProps {
  mean:   number
  sigma:  number   // σ̂ (Cpk) 또는 σ_overall (Ppk)
  usl:    number
  lsl:    number
  label?: string   // 'σ̂ (within)' | 'σ (overall)'
  onSpecChange?: (usl: number, lsl: number) => void
  // Dual Mode: 두 번째 곡선
  sigma2?: number
  label2?: string
}

const W  = 520
const H  = 220
const M  = { top: 20, right: 30, bottom: 40, left: 50 }
const IW = W - M.left - M.right
const IH = H - M.top  - M.bottom

// 정규 PDF
function normPDF(x: number, mu: number, sig: number): number {
  return Math.exp(-0.5 * ((x - mu) / sig) ** 2) / (sig * Math.sqrt(2 * Math.PI))
}

export default function NormalDistChart({
  mean, sigma, usl, lsl,
  label = 'σ', onSpecChange,
  sigma2, label2,
}: NormalDistChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  const draw = useCallback(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const g = svg
      .attr('viewBox', `0 0 ${W} ${H}`)
      .append('g')
      .attr('transform', `translate(${M.left},${M.top})`)

    // X 축 범위: ±4σ 또는 LSL/USL 포함하도록 확장
    const sigMax = Math.max(sigma, sigma2 ?? 0)
    const xMin = Math.min(mean - 4.2 * sigMax, lsl - 0.3 * (usl - lsl))
    const xMax = Math.max(mean + 4.2 * sigMax, usl + 0.3 * (usl - lsl))

    const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, IW])

    // 곡선 포인트 생성
    const points = d3.range(300).map((i) => {
      const x = xMin + (i / 299) * (xMax - xMin)
      return { x, y: normPDF(x, mean, sigma) }
    })
    const maxY = d3.max(points, (d) => d.y) ?? 1
    const yScale = d3.scaleLinear().domain([0, maxY * 1.12]).range([IH, 0])

    const lineGen = d3.line<{ x: number; y: number }>()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y))
      .curve(d3.curveBasis)

    // ── 불량 영역 (빨간색 음영) ──
    const areaGen = d3.area<{ x: number; y: number }>()
      .x((d) => xScale(d.x))
      .y0(IH).y1((d) => yScale(d.y))
      .curve(d3.curveBasis)

    const defectLeft  = points.filter((p) => p.x <= lsl)
    const defectRight = points.filter((p) => p.x >= usl)

    if (defectLeft.length)
      g.append('path').datum(defectLeft).attr('d', areaGen)
       .attr('fill', '#EF4444').attr('opacity', 0.25)
    if (defectRight.length)
      g.append('path').datum(defectRight).attr('d', areaGen)
       .attr('fill', '#EF4444').attr('opacity', 0.25)

    // ── 정상 영역 (파란색 음영) ──
    const normalPts = points.filter((p) => p.x >= lsl && p.x <= usl)
    if (normalPts.length) {
      g.append('path').datum(normalPts).attr('d', areaGen)
       .attr('fill', '#3B82F6').attr('opacity', 0.08)
    }

    // ── 곡선 ──
    g.append('path').datum(points).attr('d', lineGen)
     .attr('fill', 'none').attr('stroke', '#3B82F6').attr('stroke-width', 2)

    // ── 두 번째 곡선 (Dual Mode) ──
    if (sigma2) {
      const pts2 = d3.range(300).map((i) => {
        const x = xMin + (i / 299) * (xMax - xMin)
        return { x, y: normPDF(x, mean, sigma2) }
      })
      g.append('path').datum(pts2).attr('d', lineGen)
       .attr('fill', 'none').attr('stroke', '#F59E0B')
       .attr('stroke-width', 2).attr('stroke-dasharray', '5 3')
    }

    // ── ±3σ 선 ──
    ;[-3, 3].forEach((k) => {
      const xv = mean + k * sigma
      if (xv < xMin || xv > xMax) return
      g.append('line')
       .attr('x1', xScale(xv)).attr('x2', xScale(xv))
       .attr('y1', 0).attr('y2', IH)
       .attr('stroke', '#9CA3AF').attr('stroke-width', 1)
       .attr('stroke-dasharray', '4 3')
      g.append('text')
       .attr('x', xScale(xv)).attr('y', -5)
       .attr('text-anchor', 'middle').attr('font-size', 9).attr('fill', '#9CA3AF')
       .text(k > 0 ? '+3σ' : '-3σ')
    })

    // ── μ 선 ──
    g.append('line')
     .attr('x1', xScale(mean)).attr('x2', xScale(mean))
     .attr('y1', 0).attr('y2', IH)
     .attr('stroke', '#6B7280').attr('stroke-width', 1.5)
    g.append('text')
     .attr('x', xScale(mean)).attr('y', -5)
     .attr('text-anchor', 'middle').attr('font-size', 9).attr('fill', '#6B7280')
     .text('μ')

    // ── USL / LSL 선 (드래그 가능) ──
    const drawSpecLine = (xVal: number, color: string, lbl: string, isUSL: boolean) => {
      const grp = g.append('g').attr('cursor', 'ew-resize')

      const line = grp.append('line')
        .attr('x1', xScale(xVal)).attr('x2', xScale(xVal))
        .attr('y1', 0).attr('y2', IH)
        .attr('stroke', color).attr('stroke-width', 2)

      grp.append('text')
        .attr('x', xScale(xVal) + (isUSL ? 4 : -4))
        .attr('y', 12)
        .attr('text-anchor', isUSL ? 'start' : 'end')
        .attr('font-size', 10).attr('font-weight', 600).attr('fill', color)
        .text(lbl)

      if (onSpecChange) {
        grp.call(
          d3.drag<SVGGElement, unknown>()
            .on('drag', function (event) {
              const newX = Math.max(0, Math.min(IW, event.x))
              const newVal = xScale.invert(newX)
              line.attr('x1', newX).attr('x2', newX)
              grp.select('text').attr('x', newX + (isUSL ? 4 : -4))
              if (isUSL) onSpecChange(newVal, lsl)
              else       onSpecChange(usl, newVal)
            })
        )
      }
    }

    drawSpecLine(usl, '#DC2626', 'USL', true)
    drawSpecLine(lsl, '#DC2626', 'LSL', false)

    // ── X 축 ──
    g.append('g').attr('transform', `translate(0,${IH})`)
     .call(d3.axisBottom(xScale).ticks(7).tickFormat(d3.format('.3g')))
     .selectAll('text').attr('font-size', 9).attr('fill', '#6B7280')

    // ── Y 축 ──
    g.append('g')
     .call(d3.axisLeft(yScale).ticks(4).tickFormat(d3.format('.2e')))
     .selectAll('text').attr('font-size', 8).attr('fill', '#6B7280')

    // ── 범례 ──
    const leg = g.append('g').attr('transform', `translate(${IW - 130}, 0)`)
    ;[
      { color: '#3B82F6', label: label ?? 'σ', dash: '' },
      ...(sigma2 && label2 ? [{ color: '#F59E0B', label: label2, dash: '5 3' }] : []),
    ].forEach(({ color, label: lbl, dash }, i) => {
      leg.append('line')
        .attr('x1', 0).attr('x2', 20)
        .attr('y1', i * 16 + 6).attr('y2', i * 16 + 6)
        .attr('stroke', color).attr('stroke-width', 2)
        .attr('stroke-dasharray', dash)
      leg.append('text')
        .attr('x', 24).attr('y', i * 16 + 10)
        .attr('font-size', 9).attr('fill', '#6B7280').text(lbl)
    })
  }, [mean, sigma, usl, lsl, label, onSpecChange, sigma2, label2])

  useEffect(() => { draw() }, [draw])

  return (
    <svg ref={svgRef} className="w-full" style={{ maxHeight: H }} />
  )
}
