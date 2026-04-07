-- Tambah laporan baru oleh admin
INSERT INTO laporan (tipe, lampiran, dibuat_oleh)
VALUES (
    'keuangan',
    'laporan_keuangan_april_2026.pdf',
    (SELECT id_user FROM users WHERE email = 'Qeis@example.com')
);

-- Ubah laporan menjadi versi revisi
UPDATE laporan
SET tipe = 'bulanan',
    lampiran = 'laporan_bulanan_april_2026_revisi.pdf'
WHERE lampiran = 'laporan_keuangan_april_2026.pdf';
