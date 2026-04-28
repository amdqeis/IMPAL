from fastapi import APIRouter

from app.api.routes import (
    auth_router,
    jadwal_router,
    laporan_router,
    master_data_router,
    pembayaran_router,
    reservasi_router,
)


api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(master_data_router)
api_router.include_router(jadwal_router)
api_router.include_router(reservasi_router)
api_router.include_router(pembayaran_router)
api_router.include_router(laporan_router)
