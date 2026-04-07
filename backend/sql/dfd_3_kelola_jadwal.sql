-- Tambah jadwal baru untuk ruang VIP Jakarta
INSERT INTO jadwal (id_tempat, tanggal, jam_mulai, jam_selesai)
SELECT t.id_tempat, '2026-04-15', '10:00:00', '12:00:00'
FROM tempat t
JOIN cabang c ON c.id_cabang = t.id_cabang
WHERE t.nomor_meja = 'VIP1'
  AND c.nama = 'Cabang Jakarta';

-- Perbarui jadwal B01 di Bandung
UPDATE jadwal
SET tanggal = '2026-04-16',
    jam_mulai = '13:00:00',
    jam_selesai = '15:00:00'
FROM tempat t
JOIN cabang c ON c.id_cabang = t.id_cabang
WHERE jadwal.id_tempat = t.id_tempat
  AND t.nomor_meja = 'B01'
  AND c.nama = 'Cabang Bandung'
  AND tanggal = '2026-04-11'
  AND jam_mulai = '15:00:00';
