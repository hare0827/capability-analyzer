"""
분석 이력 API

GET    /api/v1/history              — 이력 목록 (페이지네이션)
GET    /api/v1/history/{id}         — 이력 단건 조회
DELETE /api/v1/history/{id}         — 이력 삭제 (소유자만)
"""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.deps import CurrentUser, get_current_user
from app.services import history_store

router = APIRouter(prefix="/history", tags=["history"])


class HistoryItem(BaseModel):
    id: str
    mode: str
    cpk: float | None = None
    ppk: float | None = None
    dpmo: float | None = None
    part_number: str | None = None
    created_at: str


class HistoryListResponse(BaseModel):
    items: list[HistoryItem]
    total: int
    page: int
    page_size: int


@router.get("", response_model=HistoryListResponse)
async def list_history(
    page: int = 1,
    page_size: int = 20,
    current: Annotated[CurrentUser, Depends(get_current_user)] = ...,
) -> HistoryListResponse:
    records, total = history_store.list_by_user(current.user_id, page, page_size)
    return HistoryListResponse(
        items=[
            HistoryItem(
                id=r.id,
                mode=r.mode,
                cpk=r.cpk,
                ppk=r.ppk,
                dpmo=r.dpmo,
                part_number=r.part_number,
                created_at=r.created_at,
            )
            for r in records
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{record_id}", response_model=HistoryItem)
async def get_history(
    record_id: str,
    current: Annotated[CurrentUser, Depends(get_current_user)] = ...,
) -> HistoryItem:
    record = history_store.get_by_id(record_id)
    if not record or record.user_id != current.user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="이력을 찾을 수 없습니다.")
    return HistoryItem(
        id=record.id,
        mode=record.mode,
        cpk=record.cpk,
        ppk=record.ppk,
        dpmo=record.dpmo,
        part_number=record.part_number,
        created_at=record.created_at,
    )


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_history(
    record_id: str,
    current: Annotated[CurrentUser, Depends(get_current_user)] = ...,
) -> None:
    deleted = history_store.delete_by_id(record_id, current.user_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="이력을 찾을 수 없습니다.")
