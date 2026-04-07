-- Tambah data pembayaran untuk reservasi Ahmad
INSERT INTO payments (id_reservasi, amount, status)
SELECT r.id_reservasi, 160000.00, 'pending'
FROM reservasi r
JOIN users u ON u.id_user = r.id_user
JOIN jadwal j ON j.id_jadwal = r.id_jadwal
JOIN tempat t ON t.id_tempat = j.id_tempat
JOIN cabang c ON c.id_cabang = t.id_cabang
WHERE u.email = 'Ahmad@example.com'
  AND t.nomor_meja = 'A02'
  AND c.nama = 'Cabang Jakarta'
  AND j.tanggal = '2026-04-10'
  AND j.jam_mulai = '11:00:00'
ORDER BY r.id_reservasi DESC
LIMIT 1;

-- Ubah status pembayaran menjadi paid
UPDATE payments
SET status = 'paid'
FROM reservasi r
JOIN users u ON u.id_user = r.id_user
JOIN jadwal j ON j.id_jadwal = r.id_jadwal
JOIN tempat t ON t.id_tempat = j.id_tempat
JOIN cabang c ON c.id_cabang = t.id_cabang
WHERE payments.id_reservasi = r.id_reservasi
  AND u.email = 'Ahmad@example.com'
  AND t.nomor_meja = 'A02'
  AND c.nama = 'Cabang Jakarta'
  AND j.tanggal = '2026-04-10'
  AND j.jam_mulai = '11:00:00';

-- Simpan log pembayaran
INSERT INTO payment_logs (id_payment, response)
SELECT p.id_payment, '{"gateway":"midtrans","status":"success","reference":"PAY-DFD-001"}'
FROM payments p
JOIN reservasi r ON r.id_reservasi = p.id_reservasi
JOIN users u ON u.id_user = r.id_user
JOIN jadwal j ON j.id_jadwal = r.id_jadwal
JOIN tempat t ON t.id_tempat = j.id_tempat
JOIN cabang c ON c.id_cabang = t.id_cabang
WHERE u.email = 'Ahmad@example.com'
  AND t.nomor_meja = 'A02'
  AND c.nama = 'Cabang Jakarta'
  AND j.tanggal = '2026-04-10'
  AND j.jam_mulai = '11:00:00'
ORDER BY p.id_payment DESC
LIMIT 1;

-- Ubah status pembayaran menjadi refunded
UPDATE payments
SET status = 'refunded'
FROM reservasi r
JOIN users u ON u.id_user = r.id_user
JOIN jadwal j ON j.id_jadwal = r.id_jadwal
JOIN tempat t ON t.id_tempat = j.id_tempat
JOIN cabang c ON c.id_cabang = t.id_cabang
WHERE payments.id_reservasi = r.id_reservasi
  AND u.email = 'Ahmad@example.com'
  AND t.nomor_meja = 'A02'
  AND c.nama = 'Cabang Jakarta'
  AND j.tanggal = '2026-04-10'
  AND j.jam_mulai = '11:00:00';

-- Catat refund
INSERT INTO refunds (id_payment, amount, status)
SELECT p.id_payment, 50000.00, 'pending'
FROM payments p
JOIN reservasi r ON r.id_reservasi = p.id_reservasi
JOIN users u ON u.id_user = r.id_user
JOIN jadwal j ON j.id_jadwal = r.id_jadwal
JOIN tempat t ON t.id_tempat = j.id_tempat
JOIN cabang c ON c.id_cabang = t.id_cabang
WHERE u.email = 'Ahmad@example.com'
  AND t.nomor_meja = 'A02'
  AND c.nama = 'Cabang Jakarta'
  AND j.tanggal = '2026-04-10'
  AND j.jam_mulai = '11:00:00'
ORDER BY p.id_payment DESC
LIMIT 1;

-- Approve refund
UPDATE refunds
SET status = 'approved'
FROM payments p
JOIN reservasi r ON r.id_reservasi = p.id_reservasi
JOIN users u ON u.id_user = r.id_user
JOIN jadwal j ON j.id_jadwal = r.id_jadwal
JOIN tempat t ON t.id_tempat = j.id_tempat
JOIN cabang c ON c.id_cabang = t.id_cabang
WHERE refunds.id_payment = p.id_payment
  AND u.email = 'Ahmad@example.com'
  AND t.nomor_meja = 'A02'
  AND c.nama = 'Cabang Jakarta'
  AND j.tanggal = '2026-04-10'
  AND j.jam_mulai = '11:00:00';
