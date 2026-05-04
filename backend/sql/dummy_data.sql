INSERT INTO cabang (id_cabang, nama, lokasi) VALUES
    (1, 'Cabang Jakarta', 'Jakarta'),
    (2, 'Cabang Bandung', 'Bandung'),
    (3, 'Cabang Malang', 'Malang');

INSERT INTO roles (id_role, nama_role) VALUES
    (1, 'owner'),
    (2, 'admin'),
    (3, 'user');

INSERT INTO users (id_user, nama, email, password, no_hp) VALUES
    (1, 'Ahmad', 'ahmad@example.com', '$2b$12$5AgT2FmeNZSE3K5FyY.NROU1qImksEXuTZ0p/Tln./pIRmO1pPwTq', '081200000001'),
    (2, 'Qeis', 'qeis@example.com', '$2b$12$THR/Xe6WRec9At9LLG0whuKPSNd/VahmOS7bS0ASeWivMCLEbXlaq', '081200000002'),
    (3, 'Ruviera', 'ruviera@example.com', '$2b$12$l3DNWPJSK80cLwHAz6QK3u656pn1Kp7Hbo5.zwLDF27rS6DwQLXwO', '081200000003'),
    (4, 'Alvaro', 'alvaro@example.com', '$2b$12$muRNUHEOhNhe4VYWwaQXO../IL9iarp8E3AolJJX8vjJlz61KiM/i', '081200000004'),
    (5, 'Zalfa', 'zalfa@example.com', '$2b$12$pm9apBBT7AC2FN1r30vUXe0bkmZaMgMaz9KeTfdbEahn0AFJy/Kk2', '081200000005'),
    (6, 'Ahabadin', 'ahabadin@example.com', '$2b$12$VYj.LHL79FpCu1fBrY/Zw.Lh7WjkTzQhZSkwWXPD5C4EVe27WREfe', '081200000006'),
    (7, 'Salman', 'salman@example.com', '$2b$12$LWGnnsWhi1PvZUk4XwPBjuzfw4LZrh.s0jXAwoWKzpE9qQ17Cr9uu', '081200000007'),
    (8, 'Newt', 'newt@example.com', '$2b$12$3bemNSfVDTu75qWjg8t57e5KUjD42KhbJfKpiabCgrh21UVYdE0D2', '081200000008'),
    (9, 'Thomas', 'thomas@example.com', '$2b$12$ExEPSMI82oopGYOMewdP0uU5OGFxxr3JvbF4MfI5xqfwQ8xmZGIAu', '081200000009'),
    (10, 'Adinda', 'adinda@example.com', '$2b$12$GMnTPYzdtmbwVog4fVSVWuYAnB7wvoJCo3Ny58AmLXVAvWcgEP0da', '081200000010');
INSERT INTO tempat (id_tempat, id_cabang, nomor_meja, harga, status) VALUES
    (1, 1, 'A01', 150000.00, 'available'),
    (2, 1, 'A02', 160000.00, 'available'),
    (3, 1, 'VIP1', 350000.00, 'available'),
    (4, 2, 'B01', 180000.00, 'available'),
    (5, 2, 'B02', 190000.00, 'booked'),
    (6, 2, 'B03', 200000.00, 'available'),
    (7, 3, 'C01', 210000.00, 'available'),
    (8, 3, 'C02', 220000.00, 'booked'),
    (9, 3, 'C03', 230000.00, 'available'),
    (10, 3, 'V01', 300000.00, 'available');

INSERT INTO permissions (id_permission, id_role, nama_permission) VALUES
    (1, 1, 'manage_users'),
    (2, 1, 'manage_roles'),
    (3, 1, 'approve_refunds'),
    (4, 1, 'view_reports'),
    (5, 1, 'manage_reports'),
    (6, 2, 'manage_branches'),
    (7, 2, 'manage_tables'),
    (8, 2, 'manage_schedules'),
    (9, 2, 'manage_reservations'),
    (10, 2, 'manage_payments'),
    (11, 3, 'view_locations'),
    (12, 3, 'view_schedules'),
    (13, 3, 'create_reservations'),
    (14, 3, 'view_reservations'),
    (15, 3, 'create_payments'),
    (16, 3, 'view_payments'),
    (17, 3, 'request_refunds');

INSERT INTO user_roles (id_user, id_role) VALUES
    (1, 1),
    (1, 2),
    (1, 3),
    (2, 2),
    (2, 3),
    (3, 3),
    (4, 3),
    (5, 2),
    (5, 3),
    (6, 3),
    (7, 3),
    (8, 2),
    (8, 3),
    (9, 3),
    (10, 3);

INSERT INTO jadwal (id_jadwal, id_tempat, jam_mulai, jam_selesai) VALUES
    (1, 1, '09:00:00', '11:00:00'),
    (2, 2, '11:00:00', '13:00:00'),
    (3, 3, '13:00:00', '15:00:00'),
    (4, 4, '15:00:00', '17:00:00'),
    (5, 5, '10:00:00', '12:00:00'),
    (6, 6, '12:00:00', '14:00:00'),
    (7, 7, '14:00:00', '16:00:00'),
    (8, 8, '16:00:00', '18:00:00'),
    (9, 9, '18:00:00', '20:00:00'),
    (10, 10, '20:00:00', '22:00:00');

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

INSERT INTO reservasi (id_reservasi, id_user, id_tempat, id_jadwal, tanggal, status, total_harga) VALUES
    (1, 1, 1, 1, '2026-04-10', 'confirmed', 150000.00),
    (2, 2, 2, 2, '2026-04-10', 'pending', 160000.00),
    (3, 3, 3, 3, '2026-04-11', 'cancelled', 170000.00),
    (4, 4, 4, 4, '2026-04-11', 'confirmed', 180000.00),
    (5, 5, 5, 5, '2026-04-12', 'completed', 190000.00),
    (6, 6, 6, 6, '2026-04-12', 'pending', 200000.00),
    (7, 7, 7, 7, '2026-04-13', 'confirmed', 210000.00),
    (8, 8, 8, 8, '2026-04-13', 'completed', 220000.00),
    (9, 9, 9, 9, '2026-04-14', 'confirmed', 230000.00),
    (10, 10, 10, 10, '2026-04-14', 'pending', 350000.00);

INSERT INTO payments (id_payment, id_reservasi, amount, status) VALUES
    (1, 1, 150000.00, 'paid'),
    (2, 2, 160000.00, 'unpaid'),
    (3, 3, 170000.00, 'refunded'),
    (4, 4, 180000.00, 'paid'),
    (5, 5, 190000.00, 'paid'),
    (6, 6, 200000.00, 'pending'),
    (7, 7, 210000.00, 'paid'),
    (8, 8, 220000.00, 'paid'),
    (9, 9, 230000.00, 'paid'),
    (10, 10, 350000.00, 'pending');

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
