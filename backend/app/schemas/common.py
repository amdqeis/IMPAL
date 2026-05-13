from math import ceil
from typing import Generic, TypeVar

from pydantic import BaseModel, Field


class ErrorResponse(BaseModel):
    detail: str = Field(..., examples=["Resource tidak ditemukan"])


class PaginationMeta(BaseModel):
    page: int
    limit: int
    total_items: int
    total_pages: int
    has_next: bool
    has_prev: bool


T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    data: list[T]
    pagination: PaginationMeta


def build_pagination_meta(*, page: int, limit: int, total_items: int) -> PaginationMeta:
    total_pages = ceil(total_items / limit) if total_items else 0
    return PaginationMeta(
        page=page,
        limit=limit,
        total_items=total_items,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1 and total_pages > 0,
    )


def build_paginated_response(data: list[T], *, page: int, limit: int, total_items: int) -> PaginatedResponse[T]:
    return PaginatedResponse(
        data=data,
        pagination=build_pagination_meta(page=page, limit=limit, total_items=total_items),
    )


COMMON_ERROR_RESPONSES = {
    400: {"model": ErrorResponse, "description": "Request tidak valid."},
    401: {"model": ErrorResponse, "description": "Token tidak ada, invalid, atau expired."},
    403: {"model": ErrorResponse, "description": "User tidak memiliki permission yang diperlukan."},
    404: {"model": ErrorResponse, "description": "Resource tidak ditemukan."},
    409: {"model": ErrorResponse, "description": "Request bertabrakan dengan data yang sudah ada."},
    422: {"description": "Validasi request gagal."},
}
