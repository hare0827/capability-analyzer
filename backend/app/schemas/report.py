"""
보고서 생성 요청/응답 스키마 (사양서 §11)
"""

from typing import Literal, Optional
from pydantic import BaseModel, Field


class CpkPayload(BaseModel):
    cpk:               float
    cp:                float
    cpu:               float
    cpl:               float
    sigma_within:      float
    sigma_method_used: str
    k:                 float
    defect_usl_pct:    float
    defect_lsl_pct:    float
    defect_total_pct:  float
    dpmo:              float
    sigma_level:       float


class PpkPayload(BaseModel):
    ppk:              float
    pp:               float
    ppu:              float
    ppl:              float
    sigma_overall:    float
    defect_usl_pct:   float
    defect_lsl_pct:   float
    defect_total_pct: float
    dpmo:             float
    sigma_level:      float


class StatsPayload(BaseModel):
    n:           int
    mean:        float
    std_overall: float
    min:         float
    max:         float
    median:      float


class ReportRequest(BaseModel):
    """Frontend가 전송하는 보고서 생성 요청."""
    analysis_id:  str
    mode:         Literal["cpk", "ppk", "dual"]
    usl:          float
    lsl:          float
    nominal:      Optional[float] = None
    subgroup_size: int = Field(default=5, ge=2, le=10)
    sigma_method: str = "rbar"
    data:         list[float] = Field(..., min_length=1, max_length=1000)
    cpk:          Optional[CpkPayload] = None
    ppk:          Optional[PpkPayload] = None
    stats:        StatsPayload
    warnings:     list[str] = []
