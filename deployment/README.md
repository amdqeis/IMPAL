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
- `DATABASE_PASSWORD`
- sesuaikan `APP_OWNER` jika user deploy berbeda

Jalankan setup server:

```bash
sudo bash deployment/setup.sh
```

`setup.sh` akan install dependency Ubuntu, membuat user aplikasi bila belum ada, membuat database PostgreSQL jika belum ada, memilih port internal kosong, menulis konfigurasi Nginx, mengaktifkan UFW, dan membuat SSL bila DNS domain sudah mengarah ke VPS.

## Deploy / Update Aplikasi

```bash
cd /var/www/app/sibooking
sudo bash deployment/deploy.sh
```

`deploy.sh` akan:

- pull update Git dari `GIT_BRANCH`;
- membuat `backend/.env` dan `frontend/.env.production` dari file example jika belum ada;
- install dependency backend ke `.venv`;
- menjalankan Alembic jika `backend/alembic.ini` tersedia;
- install dan build frontend Next.js;
- render service systemd backend/frontend;
- restart service dan reload Nginx;
- menampilkan status service.

## File Environment

Deployment/server:

```text
deployment/.env
```

Backend secret:

```text
backend/.env
```

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
