import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { GradeLevel } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** 데이터 문자열 파싱 — 쉼표 또는 줄바꿈 구분 */
export function parseDataInput(raw: string): { values: number[]; errors: string[] } {
  const errors: string[] = []
  const values: number[] = []

  const tokens = raw
    .split(/[\s,;\n]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)

  tokens.forEach((token, i) => {
    const num = Number(token)
    if (isNaN(num)) {
      errors.push(`[${i + 1}번째] "${token}" — 숫자가 아닙니다`)
    } else {
      values.push(num)
    }
  })

  return { values, errors }
}

/** DPMO 등급 색상 반환 (사양서 §7.3) */
export function getDpmoColor(dpmo: number): string {
  if (dpmo > 1000) return 'text-red-500'
  if (dpmo > 63)   return 'text-yellow-500'
  if (dpmo > 1)    return 'text-green-500'
  return 'text-blue-500'
}

/** Cpk/Ppk 등급 반환 (사양서 §7.2) */
export function getGrade(value: number): GradeLevel {
  if (value >= 2.0) return 'A++'
  if (value >= 1.67) return 'A+'
  if (value >= 1.5) return 'A'
  if (value >= 1.33) return 'B'
  if (value >= 1.0) return 'C'
  return 'D'
}

/** 숫자 포맷 — 소수 N자리, 지수 표기 방지 */
export function fmt(value: number, decimals = 4): string {
  return value.toFixed(decimals)
}

/** DPMO 포맷 — 천단위 구분 */
export function fmtDpmo(dpmo: number): string {
  if (dpmo < 0.001) return dpmo.toExponential(3)
  return dpmo.toLocaleString('ko-KR', { maximumFractionDigits: 3 })
}

/** debounce */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((...args: any[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }) as T
}
