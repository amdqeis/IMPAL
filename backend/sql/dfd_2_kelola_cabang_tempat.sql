-- Perbarui lokasi cabang Jakarta
UPDATE cabang
SET lokasi = 'Jakarta Pusat'
WHERE nama = 'Cabang Jakarta';

-- Tambah tempat baru di Jakarta
INSERT INTO tempat (id_cabang, nomor_meja, harga, status)
VALUES (
    (SELECT id_cabang FROM cabang WHERE nama = 'Cabang Jakarta'),
    'J01',
    250000.00,
    'available'
);

-- Ubah status tempat di Bandung
UPDATE tempat
SET harga = 275000.00,
    status = 'maintenance'
WHERE nomor_meja = 'B01'
  AND id_cabang = (
      SELECT id_cabang
      FROM cabang
      WHERE nama = 'Cabang Bandung'
  );

-- Ubah status tempat di Malang
UPDATE tempat
SET status = 'booked'
WHERE nomor_meja = 'C01'
  AND id_cabang = (
      SELECT id_cabang
      FROM cabang
      WHERE nama = 'Cabang Malang'
  );
