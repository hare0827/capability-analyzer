"""
공통 통계 유틸리티
- 이상치 제거 (IQR 방식)
- 기술통계 산출
- 불량률 / DPMO / Sigma Level 계산
"""

from __future__ import annotations

import numpy as np
from scipy import stats
from dataclasses import dataclass

from .constants import IQR_MULTIPLIER


# ── 기술통계 ─────────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class DescriptiveStats:
    n: int
    mean: float
    std_overall: float   # Bessel 보정 (ddof=1)
    minimum: float
    maximum: float
    median: float


def descriptive_stats(data: np.ndarray) -> DescriptiveStats:
    """기술통계 산출. data는 이상치 제거 완료 후 전달."""
    return DescriptiveStats(
        n=int(len(data)),
        mean=float(np.mean(data)),
        std_overall=float(np.std(data, ddof=1)),
        minimum=float(np.min(data)),
        maximum=float(np.max(data)),
        median=float(np.median(data)),
    )


# ── 이상치 제거 ───────────────────────────────────────────────────────────────

def remove_outliers_iqr(data: np.ndarray, multiplier: float = IQR_MULTIPLIER) -> np.ndarray:
    """
    IQR 방식 이상치 제거 (사양서 §4.1).
    Q1 - multiplier*IQR ~ Q3 + multiplier*IQR 범위 이탈 값 제거.
    """
    q1, q3 = np.percentile(data, [25, 75])
    iqr = q3 - q1
    lower = q1 - multiplier * iqr
    upper = q3 + multiplier * iqr
    mask = (data >= lower) & (data <= upper)
    return data[mask]


# ── 불량률 / DPMO / Sigma Level ───────────────────────────────────────────────

@dataclass(frozen=True)
class DefectMetrics:
    defect_usl_pct: float    # USL 초과 불량률 (%)
    defect_lsl_pct: float    # LSL 미달 불량률 (%)
    defect_total_pct: float  # 총 불량률 (%)
    dpmo: float              # Parts Per Million
    sigma_level: float       # Z 값 (단측 기준)


def calc_defect_metrics(mean: float, sigma: float, usl: float, lsl: float) -> DefectMetrics:
    """
    정규분포 CDF 기반 불량률 계산 (사양서 §7.1).

    P(X > USL) = 1 - Φ[(USL - μ) / σ]
    P(X < LSL) = Φ[(LSL - μ) / σ]
    DPMO = P_total × 1,000,000
    Sigma Level = Φ⁻¹(1 - P_total/2)   [단측 기준]
    """
    if sigma <= 0:
        raise ValueError(f"sigma must be positive, got {sigma}")

    p_usl = float(1.0 - stats.norm.cdf((usl - mean) / sigma))
    p_lsl = float(stats.norm.cdf((lsl - mean) / sigma))
    p_total = p_usl + p_lsl

    dpmo = p_total * 1_000_000

    # Sigma Level: worst-tail Z 값 = -Φ⁻¹(max(p_usl, p_lsl))
    # 대칭 공정: = 3×Cpk (UI 참조 테이블과 일치)
    # 비대칭 공정: 지배적인 불량 쪽 꼬리의 Z 값 (실질 리스크 반영)
    # 구 구현 Φ⁻¹(1-p_total/2)는 대칭 공정에서만 우연히 올바르며,
    # 비대칭 공정에서는 sigma level을 과대추정한다.
    p_worst = max(p_usl, p_lsl)
    if p_worst <= 0:
        sigma_level = 8.0
    elif p_worst >= 0.5:
        sigma_level = 0.0
    else:
        sigma_level = float(-stats.norm.ppf(max(p_worst, 1e-15)))

    return DefectMetrics(
        defect_usl_pct=p_usl * 100,
        defect_lsl_pct=p_lsl * 100,
        defect_total_pct=p_total * 100,
        dpmo=dpmo,
        sigma_level=sigma_level,
    )
