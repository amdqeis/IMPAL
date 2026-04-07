-- Register akun pelanggan baru
INSERT INTO users (nama, email, password, no_hp)
VALUES ('Rahmat', 'rahmat@gmail.com', '12345678', '081234567890');

-- Tetapkan role user
INSERT INTO user_roles (id_user, id_role)
SELECT u.id_user, r.id_role
FROM users u
JOIN roles r ON r.nama_role = 'user'
WHERE u.email = 'rahmat@gmail.com'
;

-- Perbarui data akun setelah verifikasi
UPDATE users
SET nama = 'Rahmat Putra',
    no_hp = '081298765432'
WHERE email = 'rahmat@gmail.com';

-- Tambah permission untuk owner
INSERT INTO permissions (id_role, nama_permission)
SELECT r.id_role, 'approve_refunds'
FROM roles r
WHERE r.nama_role = 'owner'
  AND NOT EXISTS (
      SELECT 1
      FROM permissions p
      WHERE p.nama_permission = 'approve_refunds'
  );

-- Atur manage_schedules untuk admin
UPDATE permissions
SET id_role = (
    SELECT id_role
    FROM roles
    WHERE nama_role = 'admin'
)
WHERE nama_permission = 'manage_schedules';
