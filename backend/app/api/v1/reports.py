"""
보고서 내보내기 API (사양서 §11)

POST /api/v1/reports/excel — Excel (.xlsx) 보고서 다운로드
POST /api/v1/reports/pdf   — PDF 보고서 다운로드

인증 필수: engineer 이상 (viewer는 내보내기 불가)
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import Response

from app.schemas.report import ReportRequest
from app.services.report_excel import generate_excel
from app.services.report_pdf import generate_pdf
from app.core.deps import CurrentUser, get_current_user, require_role, get_client_ip
from app.services.audit_log import log_action

router = APIRouter(prefix="/reports", tags=["reports"])

_EXPORT_ROLES = ["admin", "engineer"]


@router.post(
    "/excel",
    summary="Excel 보고서 다운로드",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role(*_EXPORT_ROLES))],
)
async def export_excel(
    req: ReportRequest,
    request: Request,
    current: Annotated[CurrentUser, Depends(get_current_user)],
) -> Response:
    """
    분석 결과를 포함한 Excel(.xlsx) 파일을 반환한다.

    - Sheet 1 "데이터"    — 측정값 원본
    - Sheet 2 "분석 결과" — Cpk/Ppk 지수, 기술통계, 불량률, 규격
    """
    try:
        xlsx_bytes = generate_excel(req)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Excel 생성 실패: {exc}",
        )

    filename = f"pca_report_{req.analysis_id[:8]}.xlsx"
    log_action(
        user_id=current.user_id,
        action="export_excel",
        resource=req.analysis_id,
        client_ip=get_client_ip(request),
        status_code=200,
    )

    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post(
    "/pdf",
    summary="PDF 보고서 다운로드",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role(*_EXPORT_ROLES))],
)
async def export_pdf(
    req: ReportRequest,
    request: Request,
    current: Annotated[CurrentUser, Depends(get_current_user)],
) -> Response:
    """
    분석 결과를 포함한 PDF 파일을 반환한다.
    weasyprint 가 설치된 환경(Docker)에서만 정상 작동한다.
    """
    try:
        pdf_bytes = generate_pdf(req)
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="PDF 생성 라이브러리(weasyprint)가 설치되지 않았습니다.",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PDF 생성 실패: {exc}",
        )

    filename = f"pca_report_{req.analysis_id[:8]}.pdf"
    log_action(
        user_id=current.user_id,
        action="export_pdf",
        resource=req.analysis_id,
        client_ip=get_client_ip(request),
        status_code=200,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
