from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.schemas.analyze import AnalyzeRequest, AnalyzeResponse
from app.engine.analyzer import analyze, AnalyzeInput
from app.core.deps import CurrentUser, get_current_user, get_client_ip
from app.core.rate_limit import analyze_limiter
from app.services.audit_log import log_action
from app.services import history_store
from app.services.history_store import HistoryRecord

router = APIRouter(prefix="/analyze", tags=["analyze"])


@router.post("", response_model=AnalyzeResponse, status_code=status.HTTP_200_OK)
async def analyze_endpoint(
    req: AnalyzeRequest,
    request: Request,
    current: Annotated[CurrentUser, Depends(get_current_user)],
) -> AnalyzeResponse:
    """
    공정 능력 지수 분석 (사양서 §9.2)

    - mode: 'cpk' | 'ppk' | 'dual'
    - data: 측정값 배열 (5 ~ 1,000개)
    - usl / lsl: 규격
    - subgroup_size: Cpk 전용 서브그룹 크기 (2~10, default 5)
    - sigma_method: Cpk 전용 σ̂ 방식 ('rbar' | 'sbar')
    - outlier_removal: IQR 1.5× 기준 이상치 제거 여부

    Rate Limit: 60회/분/IP (사양서 §10)
    """
    ip = get_client_ip(request)
    analyze_limiter.check(ip)   # 429 자동 발생

    try:
        inp = AnalyzeInput(
            mode=req.mode,
            data=req.data,
            usl=req.usl,
            lsl=req.lsl,
            nominal=req.nominal,
            subgroup_size=req.subgroup_size,
            sigma_method=req.sigma_method,
            outlier_removal=req.outlier_removal,
        )
        result = analyze(inp)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    log_action(
        user_id=current.user_id,
        action="analyze",
        resource=result.analysis_id,
        client_ip=ip,
        status_code=200,
    )

    # 이력 기록
    dpmo = (result.cpk.dpmo if result.cpk else None) or (result.ppk.dpmo if result.ppk else None)
    history_store.add(HistoryRecord(
        id=result.analysis_id,
        user_id=current.user_id,
        mode=req.mode,
        cpk=result.cpk.cpk if result.cpk else None,
        ppk=result.ppk.ppk if result.ppk else None,
        dpmo=dpmo,
        part_number=None,
        created_at=datetime.now(timezone.utc).isoformat(),
    ))

    return AnalyzeResponse(
        status=result.status,
        analysis_id=result.analysis_id,
        cpk=result.cpk,
        ppk=result.ppk,
        stats=result.stats,
        warnings=result.warnings,
    )
