from datetime import date, time

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class JadwalBase(BaseModel):
    id_tempat: int | None = None
    tanggal: date | None = None
    jam_mulai: time | None = None
    jam_selesai: time | None = None

    @model_validator(mode="after")
    def validate_time_range(self):
        if self.jam_mulai and self.jam_selesai and self.jam_selesai <= self.jam_mulai:
            raise ValueError("jam_selesai harus lebih besar dari jam_mulai")
        return self


class JadwalCreate(JadwalBase):
    id_tempat: int
    tanggal: date
    jam_mulai: time
    jam_selesai: time


class JadwalUpdate(JadwalBase):
    id_tempat: int | None = Field(default=None)


class JadwalRead(ORMModel):
    id_jadwal: int
    id_tempat: int
    tanggal: date
    jam_mulai: time
    jam_selesai: time
