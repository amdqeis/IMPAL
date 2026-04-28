from pydantic import BaseModel, ConfigDict, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class LaporanCreate(BaseModel):
    tipe: str = Field(..., min_length=1, max_length=100)
    lampiran: str = Field(..., min_length=1, max_length=255)
    dibuat_oleh: int


class LaporanUpdate(BaseModel):
    tipe: str | None = Field(default=None, min_length=1, max_length=100)
    lampiran: str | None = Field(default=None, min_length=1, max_length=255)
    dibuat_oleh: int | None = None


class LaporanRead(ORMModel):
    id_laporan: int
    tipe: str
    lampiran: str
    dibuat_oleh: int
