"""
POST /api/v1/upload/excel  — 파일 업로드 및 파싱 미리보기
POST /api/v1/upload/extract — 열 선택 후 수치 데이터 추출
"""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status

from app.schemas.upload import (
    UploadPreviewResponse, ParseErrorItem,
    ExtractRequest, ExtractResponse,
)
from app.services.file_security import check_file
from app.services.file_parser import parse_file, extract_column, _get_all_sheets
from app.services import temp_store
from app.core.deps import CurrentUser, get_current_user, require_role, get_client_ip
from app.services.audit_log import log_action

router = APIRouter(prefix="/upload", tags=["upload"])


@router.post(
    "/excel",
    response_model=UploadPreviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Excel / CSV 파일 업로드 및 파싱 미리보기",
    dependencies=[Depends(require_role("admin", "engineer"))],
)
async def upload_excel(
    request: Request,
    current: Annotated[CurrentUser, Depends(get_current_user)],
    file: UploadFile = File(...),
    sheet_name: Optional[str] = Form(default=None),
    has_header: bool = Form(default=True),
) -> UploadPreviewResponse:
    """
    파일을 업로드하고 컬럼 목록 + 10행 미리보기를 반환한다 (사양서 §4.2).

    - 지원 형식: .xlsx, .xls, .csv (최대 10 MB)
    - 보안: MIME 타입 + 매직 바이트 이중 검증, ClamAV 스캔
    - 반환값으로 column_index를 선택 후 /upload/extract 호출
    - 권한: admin 또는 engineer
    """
    content = await file.read()
    declared_mime = file.content_type or "application/octet-stream"
    filename = file.filename or "upload"

    # 1. 보안 검증
    sec = check_file(content, filename, declared_mime)
    if not sec.ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"errors": sec.errors},
        )

    # 2. 파일 파싱 (미리보기)
    try:
        result = parse_file(
            content,
            filename,
            sec.detected_format,
            sheet_name=sheet_name,
            has_header=has_header,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"파일 파싱 실패: {exc}",
        )

    # 3. xlsx/xls 전체 시트 목록 조회
    all_sheets: list[str] = result.sheets
    if sec.detected_format in ("xlsx", "xls"):
        try:
            all_sheets = _get_all_sheets(content)
        except Exception:
            pass

    # 4. 임시 저장
    file_id = temp_store.save(
        content=content,
        filename=filename,
        detected_format=sec.detected_format,
        sha256=sec.sha256,
    )

    log_action(
        user_id=current.user_id,
        action="upload",
        resource=file_id,
        client_ip=get_client_ip(request),
        status_code=200,
    )

    warnings: list[str] = []
    if not sec.clamav_scanned:
        warnings.append("ClamAV 서비스가 기동되지 않아 악성코드 스캔을 건너뛰었습니다.")
    if result.total_rows < 5:
        warnings.append(f"데이터 행 수({result.total_rows})가 최소 권장(5)에 미달합니다.")
    if result.total_rows < 30:
        warnings.append(f"데이터 행 수({result.total_rows})가 30 미만입니다. 분석 신뢰도가 낮을 수 있습니다.")

    return UploadPreviewResponse(
        file_id=file_id,
        filename=filename,
        sha256=sec.sha256,
        detected_format=sec.detected_format,
        sheets=all_sheets,
        columns=result.columns,
        preview=result.preview,
        total_rows=result.total_rows,
        clamav_scanned=sec.clamav_scanned,
        parse_errors=[
            ParseErrorItem(row=e.row, content=e.content, reason=e.reason)
            for e in result.parse_errors
        ],
        warnings=warnings,
    )


@router.post(
    "/extract",
    response_model=ExtractResponse,
    status_code=status.HTTP_200_OK,
    summary="열 선택 후 수치 데이터 추출",
    dependencies=[Depends(require_role("admin", "engineer"))],
)
async def extract_data(
    req: ExtractRequest,
    current: Annotated[CurrentUser, Depends(get_current_user)],
) -> ExtractResponse:
    """
    /upload/excel 로 업로드한 파일에서 특정 열의 수치 데이터를 추출한다.
    반환된 data를 POST /api/v1/analyze 의 data 필드로 그대로 사용한다.
    권한: admin 또는 engineer
    """
    tmp = temp_store.get(req.file_id)
    if tmp is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="파일을 찾을 수 없습니다. 만료되었거나 잘못된 file_id입니다.",
        )

    try:
        result = extract_column(
            tmp.content,
            tmp.detected_format,
            sheet_name=req.sheet_name,
            column_index=req.column_index,
            has_header=req.has_header,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"데이터 추출 실패: {exc}",
        )

    return ExtractResponse(
        data=result.data,
        skipped_count=result.skipped_count,
        parse_errors=[
            ParseErrorItem(row=e.row, content=e.content, reason=e.reason)
            for e in result.parse_errors
        ],
        total_extracted=len(result.data),
    )
