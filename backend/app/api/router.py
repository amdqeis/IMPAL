from fastapi import APIRouter

from .Authentication import router as auth_router
from .KelolaCabangTempat import router as master_data_router
from .KelolaJadwal import router as jadwal_router
from .Reservasi import router as reservasi_router
from .Pembayaran import router as pembayaran_router
from .Laporan import router as laporan_router


api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(master_data_router)
api_router.include_router(jadwal_router)
api_router.include_router(reservasi_router)
api_router.include_router(pembayaran_router)
api_router.include_router(laporan_router)
