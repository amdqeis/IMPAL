-- Production migration: indexes for paginated/filterable API list endpoints.
-- Safe to rerun because every index uses IF NOT EXISTS.

CREATE INDEX IF NOT EXISTS ix_reservasi_status
    ON reservasi (status);

CREATE INDEX IF NOT EXISTS ix_reservasi_tanggal
    ON reservasi (tanggal);

CREATE INDEX IF NOT EXISTS ix_reservasi_id_user
    ON reservasi (id_user);

CREATE INDEX IF NOT EXISTS ix_reservasi_id_tempat
    ON reservasi (id_tempat);

CREATE INDEX IF NOT EXISTS ix_reservasi_id_jadwal
    ON reservasi (id_jadwal);

CREATE INDEX IF NOT EXISTS ix_tempat_id_cabang
    ON tempat (id_cabang);

CREATE INDEX IF NOT EXISTS ix_tempat_status
    ON tempat (status);

CREATE INDEX IF NOT EXISTS ix_jadwal_id_tempat
    ON jadwal (id_tempat);

CREATE INDEX IF NOT EXISTS ix_jadwal_id_tempat_jam_mulai
    ON jadwal (id_tempat, jam_mulai);

CREATE INDEX IF NOT EXISTS ix_payments_status
    ON payments (status);

CREATE INDEX IF NOT EXISTS ix_payments_id_reservasi
    ON payments (id_reservasi);

CREATE INDEX IF NOT EXISTS ix_cabang_nama
    ON cabang (nama);

CREATE INDEX IF NOT EXISTS ix_users_nama
    ON users (nama);

CREATE INDEX IF NOT EXISTS ix_users_email
    ON users (email);

CREATE INDEX IF NOT EXISTS ix_laporan_tipe
    ON laporan (tipe);

CREATE INDEX IF NOT EXISTS ix_laporan_dibuat_oleh
    ON laporan (dibuat_oleh);
