/**
 * SPC 관리도 계수 (AIAG SPC Manual 2nd Edition)
 * 서브그룹 크기 n = 2 ~ 10
 */
export const D2_VALUES: Record<number, number> = {
  2: 1.128, 3: 1.693, 4: 2.059, 5: 2.326,
  6: 2.534, 7: 2.704, 8: 2.847, 9: 2.970, 10: 3.078,
}

// D3: LCL_R = D3 * R̄  (n≤6 이면 LCL=0)
export const D3_VALUES: Record<number, number> = {
  2: 0,    3: 0,    4: 0,    5: 0,
  6: 0,    7: 0.076, 8: 0.136, 9: 0.184, 10: 0.223,
}

// D4: UCL_R = D4 * R̄
export const D4_VALUES: Record<number, number> = {
  2: 3.267, 3: 2.574, 4: 2.282, 5: 2.114,
  6: 2.004, 7: 1.924, 8: 1.864, 9: 1.816, 10: 1.777,
}

// c4 계수 (s 차트용)
export const C4_VALUES: Record<number, number> = {
  2: 0.7979, 3: 0.8862, 4: 0.9213, 5: 0.9400,
  6: 0.9515, 7: 0.9594, 8: 0.9650, 9: 0.9693, 10: 0.9727,
}
