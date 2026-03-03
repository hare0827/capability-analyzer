"""
성능 회귀 테스트 (사양서 §13)

pytest-benchmark 를 사용하여 통계 엔진 함수들의
처리 속도 기준치를 회귀 감시한다.

기준치 (참고값, CI 실패 임계값은 --benchmark-max-time 으로 별도 설정):
  compute_cpk (n=1000)  : < 50 ms
  compute_ppk (n=1000)  : < 50 ms
  analyze(dual, n=1000) : < 100 ms
"""

import numpy as np
import pytest

from app.engine.cpk_engine import compute_cpk
from app.engine.ppk_engine import compute_ppk
from app.engine.analyzer import analyze, AnalyzeInput

np.random.seed(0)
_DATA_100  = list(np.random.normal(10.0, 0.1, 100))
_DATA_1000 = list(np.random.normal(10.0, 0.1, 1000))
USL, LSL = 10.5, 9.5


# ── 엔진 단위 벤치마크 ────────────────────────────────────────────────────────

class TestCpkPerformance:
    def test_cpk_n100(self, benchmark):
        """Cpk 계산 n=100 — 기준 < 10 ms."""
        result = benchmark(compute_cpk, _DATA_100, USL, LSL, subgroup_size=5)
        assert result.cpk is not None

    def test_cpk_n1000(self, benchmark):
        """Cpk 계산 n=1000 — 기준 < 50 ms."""
        result = benchmark(compute_cpk, _DATA_1000, USL, LSL, subgroup_size=5)
        assert result.cpk is not None

    def test_cpk_sbar_n1000(self, benchmark):
        """Cpk (sbar σ̂) n=1000 — 기준 < 50 ms."""
        result = benchmark(compute_cpk, _DATA_1000, USL, LSL,
                           subgroup_size=5, sigma_method="sbar")
        assert result.cpk is not None


class TestPpkPerformance:
    def test_ppk_n100(self, benchmark):
        """Ppk 계산 n=100 — 기준 < 10 ms."""
        result = benchmark(compute_ppk, _DATA_100, USL, LSL)
        assert result.ppk is not None

    def test_ppk_n1000(self, benchmark):
        """Ppk 계산 n=1000 — 기준 < 50 ms."""
        result = benchmark(compute_ppk, _DATA_1000, USL, LSL)
        assert result.ppk is not None


class TestAnalyzerPerformance:
    def _make_input(self, mode: str, data: list) -> AnalyzeInput:
        return AnalyzeInput(
            mode=mode,
            data=data,
            usl=USL,
            lsl=LSL,
            subgroup_size=5,
        )

    def test_analyze_cpk_n1000(self, benchmark):
        """전체 분석 파사드 (Cpk, n=1000) — 기준 < 100 ms."""
        inp = self._make_input("cpk", _DATA_1000)
        result = benchmark(analyze, inp)
        assert result.status == "ok"

    def test_analyze_ppk_n1000(self, benchmark):
        """전체 분석 파사드 (Ppk, n=1000) — 기준 < 100 ms."""
        inp = self._make_input("ppk", _DATA_1000)
        result = benchmark(analyze, inp)
        assert result.status == "ok"

    def test_analyze_dual_n1000(self, benchmark):
        """전체 분석 파사드 (Dual, n=1000) — 기준 < 150 ms."""
        inp = self._make_input("dual", _DATA_1000)
        result = benchmark(analyze, inp)
        assert result.status == "ok"
        assert result.cpk is not None
        assert result.ppk is not None

    def test_analyze_with_outlier_removal_n1000(self, benchmark):
        """이상치 제거 포함 전체 분석 (n=1000) — 기준 < 150 ms."""
        data_with_outliers = _DATA_1000 + [99.0, -99.0]   # 명확한 이상치
        inp = AnalyzeInput(
            mode="dual",
            data=data_with_outliers,
            usl=USL,
            lsl=LSL,
            outlier_removal=True,
        )
        result = benchmark(analyze, inp)
        assert result.status == "ok"
