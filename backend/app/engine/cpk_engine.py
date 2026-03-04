"""
Cpk 계산 엔진 (사양서 §5.1)

- σ̂ 산출 우선순위: R̄/d₂ → (서브그룹 미설정 시) s̄/c₄
- 계산 항목: σ̂, Cpu, Cpl, Cpk, Cp, k
- 불량률: σ̂ 기준 CDF 적분
"""

from __future__ import annotations

import numpy as np
from dataclasses import dataclass

from .constants import D2, C4, SUBGROUP_SIZE_MIN, SUBGROUP_SIZE_MAX
from .stats_utils import DescriptiveStats, DefectMetrics, calc_defect_metrics


@dataclass(frozen=True)
class CpkResult:
    # 주 지수
    cpk: float
    # 보조 지수
    cp: float
    cpu: float
    cpl: float
    # 표준편차
    sigma_within: float
    sigma_method_used: str  # 'rbar' | 'sbar' | 'overall_fallback'
    # 치우침
    k: float
    # 불량률
    defect_usl_pct: float
    defect_lsl_pct: float
    defect_total_pct: float
    dpmo: float
    sigma_level: float


def _sigma_rbar(data: np.ndarray, subgroup_size: int) -> float:
    """
    R̄/d₂ 방식 군내 표준편차 추정 (사양서 §5.1).
    data를 subgroup_size 크기 서브그룹으로 분할 → 각 R 계산 → 평균 R̄.
    """
    if subgroup_size not in D2:
        raise ValueError(
            f"subgroup_size {subgroup_size} out of range "
            f"[{SUBGROUP_SIZE_MIN}, {SUBGROUP_SIZE_MAX}]"
        )
    d2 = D2[subgroup_size]

    # 불완전한 마지막 서브그룹은 버림
    n_complete = (len(data) // subgroup_size) * subgroup_size
    if n_complete < subgroup_size:
        raise ValueError("데이터가 서브그룹 1개 분량에 미달합니다.")

    groups = data[:n_complete].reshape(-1, subgroup_size)
    ranges = groups.max(axis=1) - groups.min(axis=1)   # 각 서브그룹의 Range (np.ptp는 NumPy 2.0에서 제거됨)
    r_bar = float(np.mean(ranges))
    return r_bar / d2


def _sigma_sbar(data: np.ndarray, subgroup_size: int) -> float:
    """
    s̄/c₄ 방식 군내 표준편차 추정 (사양서 §5.1).
    """
    if subgroup_size not in C4:
        raise ValueError(
            f"subgroup_size {subgroup_size} out of range "
            f"[{SUBGROUP_SIZE_MIN}, {SUBGROUP_SIZE_MAX}]"
        )
    c4 = C4[subgroup_size]

    n_complete = (len(data) // subgroup_size) * subgroup_size
    if n_complete < subgroup_size:
        raise ValueError("데이터가 서브그룹 1개 분량에 미달합니다.")

    groups = data[:n_complete].reshape(-1, subgroup_size)
    # 각 서브그룹 내 표준편차 (ddof=1)
    s_values = np.std(groups, axis=1, ddof=1)
    s_bar = float(np.mean(s_values))
    return s_bar / c4


def compute_cpk(
    data: np.ndarray,
    usl: float,
    lsl: float,
    subgroup_size: int = 5,
    sigma_method: str = "rbar",
) -> CpkResult:
    """
    Cpk 전체 계산 (사양서 §5.1).

    Args:
        data:          측정값 배열 (이상치 제거 완료)
        usl:           상한 규격
        lsl:           하한 규격
        subgroup_size: 서브그룹 크기 (2~10, default 5)
        sigma_method:  'rbar' 또는 'sbar'

    Returns:
        CpkResult dataclass
    """
    if usl <= lsl:
        raise ValueError(f"USL({usl}) must be greater than LSL({lsl})")
    if len(data) < subgroup_size:
        raise ValueError(f"데이터 수({len(data)})가 서브그룹 크기({subgroup_size})보다 적습니다.")

    mean = float(np.mean(data))
    spec_center = (usl + lsl) / 2.0   # 규격 중심 M
    tol = usl - lsl                    # 공차폭

    # σ̂ 산출 — 우선순위: rbar → sbar → overall 폴백
    method_used: str
    try:
        if sigma_method == "rbar":
            sigma_hat = _sigma_rbar(data, subgroup_size)
            method_used = "rbar"
        else:
            sigma_hat = _sigma_sbar(data, subgroup_size)
            method_used = "sbar"
    except ValueError:
        # 서브그룹 구성 불가 → 전체 σ 폴백 (사양서 §4.1 서브그룹 미설정 시)
        sigma_hat = float(np.std(data, ddof=1))
        method_used = "overall_fallback"

    if sigma_hat <= 0:
        raise ValueError("σ̂ 계산 결과가 0 이하입니다. 데이터를 확인하세요.")

    # 편측 지수 (사양서 §5.1)
    cpu = (usl - mean) / (3.0 * sigma_hat)
    cpl = (mean - lsl) / (3.0 * sigma_hat)
    cpk = min(cpu, cpl)

    # 잠재 지수 Cp
    cp = tol / (6.0 * sigma_hat)

    # 치우침 계수 k (사양서 §5.1)
    k = abs(mean - spec_center) / (tol / 2.0)

    # 불량률 (사양서 §7.1, σ̂ 사용)
    dm: DefectMetrics = calc_defect_metrics(mean, sigma_hat, usl, lsl)

    return CpkResult(
        cpk=round(cpk, 6),
        cp=round(cp, 6),
        cpu=round(cpu, 6),
        cpl=round(cpl, 6),
        sigma_within=round(sigma_hat, 6),
        sigma_method_used=method_used,
        k=round(k, 6),
        defect_usl_pct=dm.defect_usl_pct,
        defect_lsl_pct=dm.defect_lsl_pct,
        defect_total_pct=dm.defect_total_pct,
        dpmo=dm.dpmo,
        sigma_level=round(dm.sigma_level, 4),
    )
