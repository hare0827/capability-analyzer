"""
분석 파사드 (Facade)
- 입력 검증 → 이상치 처리 → Cpk/Ppk/Dual 엔진 호출 → 결과 통합
"""

from __future__ import annotations

import uuid
import numpy as np
from dataclasses import dataclass, field, asdict
from typing import Optional

from .constants import DATA_MIN, DATA_MAX_SINGLE
from .stats_utils import descriptive_stats, remove_outliers_iqr, DescriptiveStats
from .cpk_engine import CpkResult, compute_cpk
from .ppk_engine import PpkResult, compute_ppk


# ── 입력 / 출력 스키마 ────────────────────────────────────────────────────────

@dataclass
class AnalyzeInput:
    mode: str                          # 'cpk' | 'ppk' | 'dual'
    data: list[float]
    usl: float
    lsl: float
    nominal: Optional[float] = None
    subgroup_size: int = 5
    sigma_method: str = "rbar"         # 'rbar' | 'sbar'
    outlier_removal: bool = False


@dataclass
class AnalyzeOutput:
    status: str = "ok"
    analysis_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    cpk: Optional[dict] = None
    ppk: Optional[dict] = None
    stats: Optional[dict] = None
    warnings: list[str] = field(default_factory=list)


# ── 메인 분석 함수 ────────────────────────────────────────────────────────────

def analyze(inp: AnalyzeInput) -> AnalyzeOutput:
    """
    통합 분석 진입점.
    1. 입력 검증
    2. 이상치 처리 (선택)
    3. 모드별 엔진 호출
    4. 결과 통합 반환
    """
    out = AnalyzeOutput()
    warnings: list[str] = []

    # 1. 기본 검증
    _validate_input(inp)

    arr = np.array(inp.data, dtype=float)

    # 2. 이상치 제거
    if inp.outlier_removal:
        before = len(arr)
        arr = remove_outliers_iqr(arr)
        removed = before - len(arr)
        if removed > 0:
            warnings.append(f"IQR 기준으로 {removed}개 이상치 제거됨 (n: {before} → {len(arr)})")

    # 제거 후 최소 개수 재확인
    if len(arr) < DATA_MIN:
        raise ValueError(f"이상치 제거 후 데이터 수({len(arr)})가 최소({DATA_MIN})에 미달합니다.")

    # 권장 개수 경고
    if len(arr) < 30:
        warnings.append(f"데이터 수({len(arr)})가 30 미만입니다. 분석 신뢰도가 낮을 수 있습니다.")

    # 3. 기술통계
    ds: DescriptiveStats = descriptive_stats(arr)

    out.stats = {
        "n": ds.n,
        "mean": round(ds.mean, 6),
        "std_overall": round(ds.std_overall, 6),
        "min": round(ds.minimum, 6),
        "max": round(ds.maximum, 6),
        "median": round(ds.median, 6),
    }

    # 4. 모드별 계산
    if inp.mode in ("cpk", "dual"):
        cpk_res: CpkResult = compute_cpk(
            arr, inp.usl, inp.lsl,
            subgroup_size=inp.subgroup_size,
            sigma_method=inp.sigma_method,
        )
        out.cpk = _cpk_to_dict(cpk_res)
        if cpk_res.sigma_method_used == "overall_fallback":
            warnings.append(
                "서브그룹 구성이 불가하여 전체 σ로 Cpk를 계산했습니다. "
                "데이터 수와 서브그룹 크기를 확인하세요."
            )
        else:
            n_subgroups = len(arr) // inp.subgroup_size
            n_discarded = len(arr) % inp.subgroup_size
            if n_subgroups < 25:
                warnings.append(
                    f"서브그룹 수({n_subgroups}개)가 AIAG 권장 최솟값(25개)에 미달합니다. "
                    f"Cpk 추정값의 불확실성이 높습니다. 데이터를 더 수집하세요."
                )
            if n_discarded > 0:
                warnings.append(
                    f"불완전한 마지막 서브그룹({n_discarded}개)은 Cpk 계산에서 제외되었습니다."
                )

    if inp.mode in ("ppk", "dual"):
        ppk_res: PpkResult = compute_ppk(arr, inp.usl, inp.lsl)
        out.ppk = _ppk_to_dict(ppk_res)

    # 5. Dual Mode 추가 분석
    if inp.mode == "dual" and out.cpk and out.ppk:
        cpk_val = out.cpk["cpk"]
        ppk_val = out.ppk["ppk"]
        diff = abs(cpk_val - ppk_val)
        if diff > 0.2:
            warnings.append(
                f"Cpk({cpk_val:.4f}) - Ppk({ppk_val:.4f}) 차이가 {diff:.4f}로 0.2를 초과합니다. "
                "공정 불안정 신호입니다."
            )

    out.warnings = warnings
    return out


# ── 내부 헬퍼 ────────────────────────────────────────────────────────────────

def _validate_input(inp: AnalyzeInput) -> None:
    if inp.mode not in ("cpk", "ppk", "dual"):
        raise ValueError(f"mode must be 'cpk', 'ppk', or 'dual'. got: {inp.mode}")
    if not inp.data:
        raise ValueError("data가 비어 있습니다.")
    if len(inp.data) < DATA_MIN:
        raise ValueError(f"최소 {DATA_MIN}개의 데이터가 필요합니다. 현재: {len(inp.data)}")
    if len(inp.data) > DATA_MAX_SINGLE:
        raise ValueError(f"단일 분석 최대 {DATA_MAX_SINGLE}개. 현재: {len(inp.data)}")
    if inp.usl <= inp.lsl:
        raise ValueError(f"USL({inp.usl}) > LSL({inp.lsl}) 이어야 합니다.")
    if inp.sigma_method not in ("rbar", "sbar"):
        raise ValueError(f"sigma_method는 'rbar' 또는 'sbar'여야 합니다. got: {inp.sigma_method}")
    if not (2 <= inp.subgroup_size <= 10):
        raise ValueError(f"subgroup_size는 2~10 범위여야 합니다. got: {inp.subgroup_size}")


def _cpk_to_dict(r: CpkResult) -> dict:
    return {
        "cpk":               r.cpk,
        "cp":                r.cp,
        "cpu":               r.cpu,
        "cpl":               r.cpl,
        "sigma_within":      r.sigma_within,
        "sigma_method_used": r.sigma_method_used,
        "k":                 r.k,
        "defect_usl_pct":    round(r.defect_usl_pct, 8),
        "defect_lsl_pct":    round(r.defect_lsl_pct, 8),
        "defect_total_pct":  round(r.defect_total_pct, 8),
        "dpmo":              round(r.dpmo, 4),
        "sigma_level":       r.sigma_level,
    }


def _ppk_to_dict(r: PpkResult) -> dict:
    return {
        "ppk":              r.ppk,
        "pp":               r.pp,
        "ppu":              r.ppu,
        "ppl":              r.ppl,
        "sigma_overall":    r.sigma_overall,
        "defect_usl_pct":   round(r.defect_usl_pct, 8),
        "defect_lsl_pct":   round(r.defect_lsl_pct, 8),
        "defect_total_pct": round(r.defect_total_pct, 8),
        "dpmo":             round(r.dpmo, 4),
        "sigma_level":      r.sigma_level,
    }
