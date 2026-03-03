from pydantic import BaseModel, Field, model_validator
from typing import Optional, Literal


class AnalyzeRequest(BaseModel):
    mode:            Literal["cpk", "ppk", "dual"]
    data:            list[float] = Field(..., min_length=5, max_length=1000)
    usl:             float
    lsl:             float
    nominal:         Optional[float] = None
    subgroup_size:   int = Field(default=5, ge=2, le=10)
    sigma_method:    Literal["rbar", "sbar"] = "rbar"
    outlier_removal: bool = False

    @model_validator(mode="after")
    def usl_gt_lsl(self) -> "AnalyzeRequest":
        if self.usl <= self.lsl:
            raise ValueError(f"usl({self.usl}) must be greater than lsl({self.lsl})")
        return self


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


class AnalyzeResponse(BaseModel):
    status:      str
    analysis_id: str
    cpk:         Optional[CpkPayload] = None
    ppk:         Optional[PpkPayload] = None
    stats:       StatsPayload
    warnings:    list[str] = []
