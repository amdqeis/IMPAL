from .auth import router as auth_router
from .jadwal import router as jadwal_router
from .laporan import router as laporan_router
from .master_data import router as master_data_router
from .pembayaran import router as pembayaran_router
from .reservasi import router as reservasi_router

__all__ = [
    "auth_router",
    "jadwal_router",
    "laporan_router",
    "master_data_router",
    "pembayaran_router",
    "reservasi_router",
]
