INSERT INTO cabang (id_cabang, nama, lokasi) VALUES
    (1, 'Cabang Jakarta Pusat', 'Menteng, Jakarta'),
    (2, 'Cabang Jakarta Selatan', 'Kemang, Jakarta'),
    (3, 'Cabang Bandung', 'Dago, Bandung'),
    (4, 'Cabang Surabaya', 'Tegalsari, Surabaya'),
    (5, 'Cabang Yogyakarta', 'Malioboro, Yogyakarta'),
    (6, 'Cabang Semarang', 'Simpang Lima, Semarang'),
    (7, 'Cabang Medan', 'Kesawan, Medan'),
    (8, 'Cabang Makassar', 'Panakkukang, Makassar'),
    (9, 'Cabang Denpasar', 'Renon, Denpasar'),
    (10, 'Cabang Balikpapan', 'Klandasan, Balikpapan');

INSERT INTO roles (id_role, nama_role) VALUES
    (1, 'owner'),
    (2, 'admin'),
    (3, 'user');

INSERT INTO users (id_user, nama, email, password, no_hp) VALUES
    (1, 'Ahmad', 'Ahmad@example.com', '12345678', '081200000001'),
    (2, 'Qeis', 'Qeis@example.com', '12345678', '081200000002'),
    (3, 'Ruviera', 'Ruviera@example.com', '12345678', '081200000003'),
    (4, 'Alvaro', 'Alvaro@example.com', '12345678', '081200000004'),
    (5, 'Zalfa', 'Zalfa@example.com', '12345678', '081200000005'),
    (6, 'Ahabadin', 'Ahabadin@example.com', '12345678', '081200000006'),
    (7, 'Salman', 'Salman@example.com', '12345678', '081200000007'),
    (8, 'Newt', 'Newt@example.com', '12345678', '081200000008'),
    (9, 'Thomas', 'Thomas@example.com', '12345678', '081200000009'),
    (10, 'Adinda', 'Adinda@example.com', '12345678', '081200000010');
INSERT INTO tempat (id_tempat, id_cabang, nomor_meja, harga, status) VALUES
    (1, 1, 'A01', 150000.00, 'available'),
    (2, 2, 'A02', 160000.00, 'available'),
    (3, 3, 'A03', 170000.00, 'maintenance'),
    (4, 4, 'B01', 180000.00, 'available'),
    (5, 5, 'B02', 190000.00, 'booked'),
    (6, 6, 'B03', 200000.00, 'available'),
    (7, 7, 'C01', 210000.00, 'available'),
    (8, 8, 'C02', 220000.00, 'booked'),
    (9, 9, 'C03', 230000.00, 'available'),
    (10, 10, 'VIP1', 350000.00, 'available');

INSERT INTO permissions (id_permission, id_role, nama_permission) VALUES
    (1, 1, 'manage_users'),
    (2, 1, 'manage_roles'),
    (3, 1, 'view_reports'),
    (4, 2, 'manage_branches'),
    (5, 2, 'manage_tables'),
    (6, 2, 'manage_schedules'),
    (7, 2, 'manage_payments'),
    (8, 3, 'create_reservations'),
    (9, 3, 'view_reservations'),
    (10, 3, 'request_refunds');

INSERT INTO user_roles (id_user, id_role) VALUES
    (1, 1),
    (2, 2),
    (3, 3),
    (4, 3),
    (5, 2),
    (6, 3),
    (7, 3),
    (8, 2),
    (9, 3),
    (10, 3);

INSERT INTO jadwal (id_jadwal, id_tempat, tanggal, jam_mulai, jam_selesai) VALUES
    (1, 1, '2026-04-10', '09:00:00', '11:00:00'),
    (2, 2, '2026-04-10', '11:00:00', '13:00:00'),
    (3, 3, '2026-04-11', '13:00:00', '15:00:00'),
    (4, 4, '2026-04-11', '15:00:00', '17:00:00'),
    (5, 5, '2026-04-12', '10:00:00', '12:00:00'),
    (6, 6, '2026-04-12', '12:00:00', '14:00:00'),
    (7, 7, '2026-04-13', '14:00:00', '16:00:00'),
    (8, 8, '2026-04-13', '16:00:00', '18:00:00'),
    (9, 9, '2026-04-14', '18:00:00', '20:00:00'),
    (10, 10, '2026-04-14', '20:00:00', '22:00:00');

INSERT INTO laporan (id_laporan, tipe, lampiran, dibuat_oleh) VALUES
    (1, 'harian', 'laporan_harian_01.pdf', 1),
    (2, 'mingguan', 'laporan_mingguan_02.pdf', 2),
    (3, 'bulanan', 'laporan_bulanan_03.pdf', 3),
    (4, 'audit', 'laporan_audit_04.pdf', 4),
    (5, 'operasional', 'laporan_operasional_05.pdf', 5),
    (6, 'keuangan', 'laporan_keuangan_06.pdf', 6),
    (7, 'harian', 'laporan_harian_07.pdf', 7),
    (8, 'mingguan', 'laporan_mingguan_08.pdf', 8),
    (9, 'bulanan', 'laporan_bulanan_09.pdf', 9),
    (10, 'audit', 'laporan_audit_10.pdf', 10);

INSERT INTO reservasi (id_reservasi, id_user, id_jadwal, status, total_harga) VALUES
    (1, 1, 1, 'confirmed', 150000.00),
    (2, 2, 2, 'pending', 160000.00),
    (3, 3, 3, 'cancelled', 170000.00),
    (4, 4, 4, 'confirmed', 180000.00),
    (5, 5, 5, 'completed', 190000.00),
    (6, 6, 6, 'pending', 200000.00),
    (7, 7, 7, 'confirmed', 210000.00),
    (8, 8, 8, 'completed', 220000.00),
    (9, 9, 9, 'confirmed', 230000.00),
    (10, 10, 10, 'pending', 350000.00);

INSERT INTO payments (id_payment, id_reservasi, amount, status, paid_at) VALUES
    (1, 1, 150000.00, 'paid', '2026-04-09 09:00:00+07'),
    (2, 2, 160000.00, 'unpaid', NULL),
    (3, 3, 170000.00, 'refunded', '2026-04-09 10:00:00+07'),
    (4, 4, 180000.00, 'paid', '2026-04-09 11:00:00+07'),
    (5, 5, 190000.00, 'paid', '2026-04-09 12:00:00+07'),
    (6, 6, 200000.00, 'pending', NULL),
    (7, 7, 210000.00, 'paid', '2026-04-09 13:00:00+07'),
    (8, 8, 220000.00, 'paid', '2026-04-09 14:00:00+07'),
    (9, 9, 230000.00, 'paid', '2026-04-09 15:00:00+07'),
    (10, 10, 350000.00, 'pending', NULL);

INSERT INTO payment_logs (id_log, id_payment, response) VALUES
    (1, 1, '{"gateway":"midtrans","status":"success","reference":"PAY-001"}'),
    (2, 2, '{"gateway":"midtrans","status":"waiting","reference":"PAY-002"}'),
    (3, 3, '{"gateway":"midtrans","status":"refund","reference":"PAY-003"}'),
    (4, 4, '{"gateway":"xendit","status":"success","reference":"PAY-004"}'),
    (5, 5, '{"gateway":"xendit","status":"success","reference":"PAY-005"}'),
    (6, 6, '{"gateway":"xendit","status":"pending","reference":"PAY-006"}'),
    (7, 7, '{"gateway":"midtrans","status":"success","reference":"PAY-007"}'),
    (8, 8, '{"gateway":"midtrans","status":"success","reference":"PAY-008"}'),
    (9, 9, '{"gateway":"xendit","status":"success","reference":"PAY-009"}'),
    (10, 10, '{"gateway":"xendit","status":"pending","reference":"PAY-010"}');

INSERT INTO refunds (id_refund, id_payment, amount, status) VALUES
    (1, 1, 50000.00, 'rejected'),
    (2, 2, 80000.00, 'pending'),
    (3, 3, 170000.00, 'approved'),
    (4, 4, 25000.00, 'rejected'),
    (5, 5, 40000.00, 'pending'),
    (6, 6, 100000.00, 'pending'),
    (7, 7, 30000.00, 'rejected'),
    (8, 8, 50000.00, 'approved'),
    (9, 9, 60000.00, 'pending'),
    (10, 10, 120000.00, 'pending');

SELECT setval(pg_get_serial_sequence('cabang', 'id_cabang'), COALESCE((SELECT MAX(id_cabang) FROM cabang), 1), true);
SELECT setval(pg_get_serial_sequence('roles', 'id_role'), COALESCE((SELECT MAX(id_role) FROM roles), 1), true);
SELECT setval(pg_get_serial_sequence('users', 'id_user'), COALESCE((SELECT MAX(id_user) FROM users), 1), true);
SELECT setval(pg_get_serial_sequence('tempat', 'id_tempat'), COALESCE((SELECT MAX(id_tempat) FROM tempat), 1), true);
SELECT setval(pg_get_serial_sequence('permissions', 'id_permission'), COALESCE((SELECT MAX(id_permission) FROM permissions), 1), true);
SELECT setval(pg_get_serial_sequence('jadwal', 'id_jadwal'), COALESCE((SELECT MAX(id_jadwal) FROM jadwal), 1), true);
SELECT setval(pg_get_serial_sequence('laporan', 'id_laporan'), COALESCE((SELECT MAX(id_laporan) FROM laporan), 1), true);
SELECT setval(pg_get_serial_sequence('reservasi', 'id_reservasi'), COALESCE((SELECT MAX(id_reservasi) FROM reservasi), 1), true);
SELECT setval(pg_get_serial_sequence('payments', 'id_payment'), COALESCE((SELECT MAX(id_payment) FROM payments), 1), true);
SELECT setval(pg_get_serial_sequence('payment_logs', 'id_log'), COALESCE((SELECT MAX(id_log) FROM payment_logs), 1), true);
SELECT setval(pg_get_serial_sequence('refunds', 'id_refund'), COALESCE((SELECT MAX(id_refund) FROM refunds), 1), true);
