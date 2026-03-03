"""
Ppk 엔진 단위 테스트
검수 기준: Minitab 결과 대비 오차 ≤ 0.001 (사양서 §13.1)
"""

import pytest
import numpy as np
from scipy import stats as scipy_stats
from app.engine.ppk_engine import compute_ppk

USL = 10.5
LSL = 9.5

np.random.seed(42)
_DATA = np.random.normal(loc=10.0, scale=0.1, size=100)


class TestComputePpk:
    def test_usl_lsl_validation(self):
        with pytest.raises(ValueError, match="greater than"):
            compute_ppk(_DATA, usl=9.0, lsl=10.0)

    def test_insufficient_data_raises(self):
        with pytest.raises(ValueError):
            compute_ppk(np.array([1.0]), usl=2.0, lsl=0.0)

    def test_ppk_positive_for_capable_process(self):
        r = compute_ppk(_DATA, usl=USL, lsl=LSL)
        assert r.ppk > 0

    def test_ppk_is_min_of_ppu_ppl(self):
        """Ppk = min(Ppu, Ppl)"""
        r = compute_ppk(_DATA, usl=USL, lsl=LSL)
        assert abs(r.ppk - min(r.ppu, r.ppl)) < 1e-9

    def test_pp_ge_ppk(self):
        """Pp ≥ |Ppk|"""
        np.random.seed(7)
        shifted = np.random.normal(10.3, 0.1, 100)
        r = compute_ppk(shifted, usl=USL, lsl=LSL)
        assert r.pp >= r.ppk - 1e-9

    def test_sigma_overall_bessel_corrected(self):
        """σ_overall = std(data, ddof=1) Bessel 보정"""
        r = compute_ppk(_DATA, usl=USL, lsl=LSL)
        expected_sigma = float(np.std(_DATA, ddof=1))
        assert abs(r.sigma_overall - expected_sigma) < 1e-9

    def test_defect_rate_matches_scipy(self):
        """
        불량률 계산이 scipy.stats.norm.cdf 결과와 일치하는지 확인.
        오차 ≤ 1 ppm (사양서 §13.1)
        """
        r = compute_ppk(_DATA, usl=USL, lsl=LSL)
        mean = float(np.mean(_DATA))
        sigma = float(np.std(_DATA, ddof=1))

        p_usl = 1.0 - scipy_stats.norm.cdf((USL - mean) / sigma)
        p_lsl = scipy_stats.norm.cdf((LSL - mean) / sigma)
        p_total_pct = (p_usl + p_lsl) * 100

        # 오차 ≤ 1 ppm = 1e-4 %
        assert abs(r.defect_total_pct - p_total_pct) < 1e-4

    def test_dpmo_equals_defect_rate_times_million(self):
        """DPMO = defect_total_pct/100 × 1,000,000"""
        r = compute_ppk(_DATA, usl=USL, lsl=LSL)
        expected_dpmo = (r.defect_total_pct / 100) * 1_000_000
        assert abs(r.dpmo - expected_dpmo) < 1e-3

    def test_sigma_level_inverse_cdf(self):
        """Sigma Level = Φ⁻¹(1 - P_total/2)"""
        r = compute_ppk(_DATA, usl=USL, lsl=LSL)
        p_total = r.defect_total_pct / 100
        if p_total > 0:
            expected_sigma_level = scipy_stats.norm.ppf(1.0 - p_total / 2.0)
            assert abs(r.sigma_level - expected_sigma_level) < 0.01

    def test_identical_data_raises(self):
        """모든 값이 동일 → σ=0 → ValueError"""
        data = np.full(20, 10.0)
        with pytest.raises(ValueError, match="0 이하"):
            compute_ppk(data, usl=USL, lsl=LSL)

    def test_ppk_greater_than_133_for_good_process(self):
        """σ가 작은 공정 → Ppk ≥ 1.33 (B등급)"""
        tight = np.random.normal(10.0, 0.05, 100)
        r = compute_ppk(tight, usl=USL, lsl=LSL)
        assert r.ppk >= 1.33
