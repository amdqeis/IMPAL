from pydantic import BaseModel, Field


class ErrorResponse(BaseModel):
    detail: str = Field(..., examples=["Resource tidak ditemukan"])


COMMON_ERROR_RESPONSES = {
    400: {"model": ErrorResponse, "description": "Request tidak valid."},
    401: {"model": ErrorResponse, "description": "Token tidak ada, invalid, atau expired."},
    403: {"model": ErrorResponse, "description": "User tidak memiliki permission yang diperlukan."},
    404: {"model": ErrorResponse, "description": "Resource tidak ditemukan."},
    409: {"model": ErrorResponse, "description": "Request bertabrakan dengan data yang sudah ada."},
    422: {"description": "Validasi request gagal."},
}
