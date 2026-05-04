# Deployment VPS Ubuntu

Deployment ini menjalankan aplikasi secara host-native:

- FastAPI berjalan sebagai service systemd di `127.0.0.1:<BACKEND_PORT>`.
- Next.js production server berjalan sebagai service systemd di `127.0.0.1:<FRONTEND_PORT>`.
- Nginx menjadi reverse proxy publik untuk HTTP/HTTPS.
- PostgreSQL berjalan di host VPS.
- SSL dibuat dan direnew oleh Certbot/Let's Encrypt.

Struktur target VPS:

```text
/var/www/app/sibooking
├── backend
│   └── .env
├── frontend
│   └── .env.production
└── deployment
    ├── setup.sh
    ├── deploy.sh
    ├── env.example
    ├── nginx.conf.template
    ├── backend.service.template
    └── frontend.service.template
```

## Setup Awal VPS

Clone repo ke folder target:

```bash
sudo mkdir -p /var/www/app
sudo git clone <repo-url> /var/www/app/sibooking
cd /var/www/app/sibooking
```

Buat konfigurasi deployment:

```bash
sudo cp deployment/env.example deployment/.env
sudo chmod 600 deployment/.env
sudo nano deployment/.env
```

Minimal wajib diisi:

- `DOMAIN`
- `SSL_EMAIL`
- sesuaikan `APP_OWNER` jika user deploy berbeda

Siapkan juga env backend dan frontend. Secret database ada di `backend/.env`, bukan `deployment/.env`:

```bash
sudo cp backend/.env.example backend/.env
sudo cp frontend/.env.production.example frontend/.env.production
sudo chmod 600 backend/.env frontend/.env.production
sudo nano backend/.env
sudo nano frontend/.env.production
```

Minimal wajib diisi di `backend/.env`:

- `DB_HOST=127.0.0.1`
- `DB_PORT=5432`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `SECRET_KEY`
- `FRONTEND_URL=https://<DOMAIN>`

Biarkan `DATABASE_URL` kosong kecuali memang ingin override manual. Jika `DATABASE_URL` diisi, backend akan memakai nilai itu dan mengabaikan komponen `DB_*`.

Jalankan setup server:

```bash
sudo bash deployment/setup.sh
```

`setup.sh` akan install dependency Ubuntu, membuat user aplikasi bila belum ada, membaca konfigurasi database dari `backend/.env`, membuat database PostgreSQL jika belum ada, memilih port internal kosong, menulis konfigurasi Nginx, mengaktifkan UFW, dan membuat SSL bila DNS domain sudah mengarah ke VPS.

Saat berjalan, script akan menampilkan variabel yang berhasil dibaca dari `deployment/.env`, `backend/.env`, dan `frontend/.env.production`. Nilai sensitif seperti password, secret, token, key, dan `DATABASE_URL` akan dimasking. Jika ada variabel wajib yang tidak ada atau kosong, script akan berhenti dengan pesan yang menyebut file env, nama variabel, dan nilai saat itu.

## Deploy / Update Aplikasi

```bash
cd /var/www/app/sibooking
sudo bash deployment/deploy.sh
```

`deploy.sh` akan:

- pull update Git dari `GIT_BRANCH`;
- membuat `backend/.env` dan `frontend/.env.production` dari file example jika belum ada, lalu berhenti jika `backend/.env` masih perlu diisi;
- install dependency backend ke `.venv`;
- menjalankan Alembic jika `backend/alembic.ini` tersedia;
- install dan build frontend Next.js;
- render service systemd backend/frontend;
- restart service dan reload Nginx;
- menampilkan status service.

Seperti `setup.sh`, `deploy.sh` juga mencetak variabel yang terbaca dari tiap file env dan memvalidasi nilai wajib sebelum install dependency, build, atau restart service.

## File Environment

Deployment/server:

```text
deployment/.env
```

Backend secret:

```text
backend/.env
```

Berisi konfigurasi backend dan database seperti `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `SECRET_KEY`, mail config, dan `FRONTEND_URL`.

Frontend public runtime config:

```text
frontend/.env.production
```

Jangan menaruh database password atau secret backend di env frontend. Variable dengan prefix `NEXT_PUBLIC_` akan terlihat di browser.

## Debugging

```bash
sudo systemctl status sibooking-backend sibooking-frontend --no-pager
sudo journalctl -u sibooking-backend -f
sudo journalctl -u sibooking-frontend -f
sudo nginx -t
curl http://127.0.0.1:<BACKEND_PORT>/health
curl -I https://<DOMAIN>
sudo certbot renew --dry-run
```

Port internal disimpan di `deployment/.env` sebagai `BACKEND_PORT` dan `FRONTEND_PORT`. Port ini tidak perlu dibuka di firewall karena hanya Nginx yang menerima traffic publik di port 80/443.
