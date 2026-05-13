-- Recommended PostgreSQL indexes for heavy admin list/search endpoints.
-- This file is documentation/ops guidance only; it is not applied automatically.
-- Use CONCURRENTLY outside a transaction in production.

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_reservasi_tempat_tanggal_status
    ON reservasi (id_tempat, tanggal, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_reservasi_tanggal_status
    ON reservasi (tanggal, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_reservasi_user_tanggal
    ON reservasi (id_user, tanggal);

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_payments_reservasi_payment
    ON payments (id_reservasi, id_payment DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_jadwal_jam_mulai
    ON jadwal (jam_mulai);

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_tempat_nomor_meja
    ON tempat (nomor_meja);

-- Optional trigram indexes for ILIKE '%keyword%' search.
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_users_nama_trgm ON users USING gin (nama gin_trgm_ops);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_users_email_trgm ON users USING gin (email gin_trgm_ops);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_tempat_nomor_meja_trgm ON tempat USING gin (nomor_meja gin_trgm_ops);
