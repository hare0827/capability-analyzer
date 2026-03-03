"""
Ppk 계산 엔진 (사양서 §6.1)

- 전체 σ = std(data, ddof=1)  ← Bessel 보정
- 계산 항목: σ, Ppu, Ppl, Ppk, Pp
- 불량률: σ 기준 CDF 적분
- 서브그룹 개념 없음 (장기 공정 성능)
"""

from __future__ import annotations

import numpy as np
from dataclasses import dataclass

from .stats_utils import DefectMetrics, calc_defect_metrics


@dataclass(frozen=True)
class PpkResult:
    # 주 지수
    ppk: float
    # 보조 지수
    pp: float
    ppu: float
    ppl: float
    # 표준편차
    sigma_overall: float
    # 불량률
    defect_usl_pct: float
    defect_lsl_pct: float
    defect_total_pct: float
    dpmo: float
    sigma_level: float


def compute_ppk(
    data: np.ndarray,
    usl: float,
    lsl: float,
) -> PpkResult:
    """
    Ppk 전체 계산 (사양서 §6.1).

    Args:
        data: 측정값 배열 (이상치 제거 완료)
        usl:  상한 규격
        lsl:  하한 규격

    Returns:
        PpkResult dataclass
    """
    if usl <= lsl:
        raise ValueError(f"USL({usl}) must be greater than LSL({lsl})")
    if len(data) < 2:
        raise ValueError("Ppk 계산을 위해 최소 2개의 데이터가 필요합니다.")

    mean = float(np.mean(data))
    tol = usl - lsl

    # 전체 σ — Bessel 보정 (ddof=1) (사양서 §6.1)
    sigma = float(np.std(data, ddof=1))

    if sigma <= 0:
        raise ValueError("σ 계산 결과가 0 이하입니다. 모든 측정값이 동일합니다.")

    # 편측 지수 (사양서 §6.1)
    ppu = (usl - mean) / (3.0 * sigma)
    ppl = (mean - lsl) / (3.0 * sigma)
    ppk = min(ppu, ppl)

    # 잠재 지수 Pp
    pp = tol / (6.0 * sigma)

    # 불량률 (사양서 §7.1, σ_overall 사용)
    dm: DefectMetrics = calc_defect_metrics(mean, sigma, usl, lsl)

    return PpkResult(
        ppk=round(ppk, 6),
        pp=round(pp, 6),
        ppu=round(ppu, 6),
        ppl=round(ppl, 6),
        sigma_overall=round(sigma, 6),
        defect_usl_pct=dm.defect_usl_pct,
        defect_lsl_pct=dm.defect_lsl_pct,
        defect_total_pct=dm.defect_total_pct,
        dpmo=dm.dpmo,
        sigma_level=round(dm.sigma_level, 4),
    )
