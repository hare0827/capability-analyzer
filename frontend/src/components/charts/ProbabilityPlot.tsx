/**
 * Normal Probability Plot (사양서 §6.2, Ppk 모드)
 * - 데이터가 정규분포를 따르는지 시각적으로 확인
 * - 점이 직선에 가까울수록 정규성 ↑
 * - D3.js SVG 직접 구현
 */
import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface ProbabilityPlotProps {
  data: number[]
}

// 표준정규 역CDF (Abramowitz & Stegun 근사)
function normInvCDF(p: number): number {
  if (p <= 0) return -4
  if (p >= 1) return  4
  // rational approximation
  const a = [0, -3.969683028665376e1, 2.209460984245205e2,
    -2.759285104469687e2, 1.383577518672690e2,
    -3.066479806614716e1, 2.506628277459239]
  const b = [0, -5.447609879822406e1, 1.615858368580409e2,
    -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1]
  const c = [-7.784894002430293e-3, -3.223964580411365e-1,
    -2.400758277161838, -2.549732539343734,
    4.374664141464968, 2.938163982698783]
  const d = [7.784695709041462e-3, 3.224671290700398e-1,
    2.445134137142996, 3.754408661907416]
  const pLow  = 0.02425
  const pHigh = 1 - pLow

  let q: number, r: number
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p))
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
           ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)
  } else if (p <= pHigh) {
    q = p - 0.5; r = q * q
    return (((((a[1]*r+a[2])*r+a[3])*r+a[4])*r+a[5])*r+a[6])*q /
           (((((b[1]*r+b[2])*r+b[3])*r+b[4])*r+b[5])*r+1)
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p))
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
             ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)
  }
}

const W = 400, H = 260
const M = { top: 20, right: 30, bottom: 45, left: 55 }
const IW = W - M.left - M.right
const IH = H - M.top  - M.bottom

export default function ProbabilityPlot({ data }: ProbabilityPlotProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (data.length < 3) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const sorted = [...data].sort((a, b) => a - b)
    const n = sorted.length

    // 플로팅 위치 공식: (i - 0.375) / (n + 0.25)
    const points = sorted.map((val, i) => ({
      x: val,
      y: normInvCDF((i + 1 - 0.375) / (n + 0.25)),
    }))

    const xScale = d3.scaleLinear()
      .domain([d3.min(points, (p) => p.x)! * 0.995, d3.max(points, (p) => p.x)! * 1.005])
      .range([0, IW])

    const yScale = d3.scaleLinear()
      .domain([-3.5, 3.5])
      .range([IH, 0])

    const g = svg.attr('viewBox', `0 0 ${W} ${H}`)
      .append('g').attr('transform', `translate(${M.left},${M.top})`)

    // 격자
    g.append('g').call(d3.axisLeft(yScale).ticks(7).tickFormat(d3.format('.1f')))
     .selectAll('text').attr('font-size', 9).attr('fill', '#6B7280')

    g.append('g').attr('transform', `translate(0,${IH})`)
     .call(d3.axisBottom(xScale).ticks(6).tickFormat(d3.format('.3g')))
     .selectAll('text').attr('font-size', 9).attr('fill', '#6B7280')

    // 축 레이블
    g.append('text')
     .attr('x', IW / 2).attr('y', IH + 38)
     .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#6B7280')
     .text('측정값')

    g.append('text')
     .attr('transform', 'rotate(-90)')
     .attr('x', -IH / 2).attr('y', -42)
     .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#6B7280')
     .text('이론 분위수 (z)')

    // 기준선 (z = 0)
    g.append('line')
     .attr('x1', 0).attr('x2', IW)
     .attr('y1', yScale(0)).attr('y2', yScale(0))
     .attr('stroke', '#E5E7EB').attr('stroke-dasharray', '4 3')

    // 이론 정규분포 직선 (최소제곱 회귀)
    const meanX = d3.mean(points, (p) => p.x)!
    const meanY = d3.mean(points, (p) => p.y)!
    const slope = d3.sum(points, (p) => (p.x - meanX) * (p.y - meanY)) /
                  d3.sum(points, (p) => (p.x - meanX) ** 2)
    const intercept = meanY - slope * meanX

    const xMin = xScale.domain()[0]
    const xMax = xScale.domain()[1]
    g.append('line')
     .attr('x1', xScale(xMin)).attr('y1', yScale(slope * xMin + intercept))
     .attr('x2', xScale(xMax)).attr('y2', yScale(slope * xMax + intercept))
     .attr('stroke', '#6B7280').attr('stroke-width', 1.5).attr('stroke-dasharray', '6 3')

    // 데이터 포인트 + 툴팁
    const tooltip = d3.select('body').append('div')
      .attr('class', 'pca-tooltip')
      .style('position', 'absolute').style('background', 'white')
      .style('border', '1px solid #E5E7EB').style('border-radius', '6px')
      .style('padding', '4px 8px').style('font-size', '11px').style('pointer-events', 'none')
      .style('opacity', 0)

    g.selectAll('circle')
     .data(points)
     .join('circle')
     .attr('cx', (p) => xScale(p.x))
     .attr('cy', (p) => yScale(p.y))
     .attr('r', 3)
     .attr('fill', '#3B82F6')
     .attr('opacity', 0.7)
     .on('mouseover', (event, p) => {
       tooltip.style('opacity', 1)
         .html(`x: ${p.x.toFixed(4)}<br/>z: ${p.y.toFixed(3)}`)
         .style('left', (event.pageX + 10) + 'px')
         .style('top',  (event.pageY - 20) + 'px')
     })
     .on('mouseout', () => tooltip.style('opacity', 0))

    return () => { tooltip.remove() }
  }, [data])

  if (data.length < 3) {
    return <p className="text-xs text-gray-400 py-4 text-center">데이터 3개 이상 필요</p>
  }

  return <svg ref={svgRef} className="w-full" style={{ maxHeight: H }} />
}
