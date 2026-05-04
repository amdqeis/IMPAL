-- Tambah reservasi baru untuk Ahmad
INSERT INTO reservasi (id_user, id_tempat, id_jadwal, tanggal, status, total_harga)
SELECT u.id_user, t.id_tempat, j.id_jadwal, '2026-04-10', 'pending', 160000.00
FROM users u
JOIN jadwal j ON j.jam_mulai = '11:00:00'
JOIN tempat t ON t.id_tempat = j.id_tempat
JOIN cabang c ON c.id_cabang = t.id_cabang
WHERE u.email = 'Ahmad@example.com'
  AND t.nomor_meja = 'A02'
  AND c.nama = 'Cabang Jakarta';

-- Konfirmasi reservasi
UPDATE reservasi
SET status = 'confirmed'
FROM users u
JOIN jadwal j ON j.id_jadwal = reservasi.id_jadwal
JOIN tempat t ON t.id_tempat = j.id_tempat
JOIN cabang c ON c.id_cabang = t.id_cabang
WHERE reservasi.id_user = u.id_user
  AND u.email = 'Ahmad@example.com'
  AND t.nomor_meja = 'A02'
  AND c.nama = 'Cabang Jakarta'
  AND reservasi.tanggal = '2026-04-10'
  AND j.jam_mulai = '11:00:00';

-- Ubah reservasi menjadi cancelled
UPDATE reservasi
SET status = 'cancelled'
FROM users u
JOIN jadwal j ON j.id_jadwal = reservasi.id_jadwal
JOIN tempat t ON t.id_tempat = j.id_tempat
JOIN cabang c ON c.id_cabang = t.id_cabang
WHERE reservasi.id_user = u.id_user
  AND u.email = 'Ahmad@example.com'
  AND t.nomor_meja = 'A02'
  AND c.nama = 'Cabang Jakarta'
  AND reservasi.tanggal = '2026-04-10'
  AND j.jam_mulai = '11:00:00';
