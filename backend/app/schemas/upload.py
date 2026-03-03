from pydantic import BaseModel
from typing import Optional


class ParseErrorItem(BaseModel):
    row: int
    content: str
    reason: str


class UploadPreviewResponse(BaseModel):
    """POST /api/v1/upload/excel 응답 (사양서 §4.2)"""
    file_id: str                     # 임시 파일 식별자 (UUID)
    filename: str
    sha256: str
    detected_format: str             # 'xlsx' | 'xls' | 'csv'
    sheets: list[str]                # 시트 목록
    columns: list[str]               # 컬럼명 목록
    preview: list[list[str]]         # 최대 10행 미리보기
    total_rows: int                  # 헤더 제외 전체 행 수
    clamav_scanned: bool
    parse_errors: list[ParseErrorItem]
    warnings: list[str]


class ExtractRequest(BaseModel):
    """POST /api/v1/upload/extract 요청 — 열 선택 후 수치 추출"""
    file_id: str
    sheet_name: Optional[str] = None
    column_index: int = 0
    has_header: bool = True


class ExtractResponse(BaseModel):
    data: list[float]
    skipped_count: int
    parse_errors: list[ParseErrorItem]
    total_extracted: int
