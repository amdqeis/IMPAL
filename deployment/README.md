# Deployment Guide

Production layout:

```text
/var/www/app/
└── sibooking/
    ├── backend/
    │   └── .env
    ├── frontend/
    │   └── .env.production
    └── deployment/
        ├── .env
        └── scripts/
            ├── setup.sh
            └── deploy.sh
```

Runtime stack:

- Frontend: Next.js served by systemd through a Unix socket.
- Backend: FastAPI served by Gunicorn/Uvicorn through a Unix socket.
- Reverse proxy: Nginx.
- SSL: Certbot/Let's Encrypt.
- Database: PostgreSQL on the VPS.

## 1. Initial VPS Setup

Clone or place the repository at the app path:

```bash
sudo mkdir -p /var/www/app
sudo chown -R "$USER":"$USER" /var/www/app
git clone <your-repository-url> /var/www/app/sibooking
```

Create separate env files:

```bash
cp /var/www/app/sibooking/deployment/.env.example /var/www/app/sibooking/deployment/.env
cp /var/www/app/sibooking/backend/.env.example /var/www/app/sibooking/backend/.env
cp /var/www/app/sibooking/frontend/.env.production.example /var/www/app/sibooking/frontend/.env.production
```

Edit each file on the VPS:

- `deployment/.env`: server/deployment values such as `DOMAIN`, `SSL_EMAIL`, `APPNAME`, service user, branch, and optional PostgreSQL bootstrap settings.
- `backend/.env`: backend-only secrets such as `DATABASE_URL`, `SECRET_KEY`, JWT/session/mail config, and `FRONTEND_URL`.
- `frontend/.env.production`: public Next.js values such as `NEXT_PUBLIC_API_BASE_URL`.

Run setup once, and safely rerun it when server configuration changes:

```bash
cd /var/www/app/sibooking
sudo bash deployment/scripts/setup.sh
```

`setup.sh` installs server dependencies, creates folders/users, configures PostgreSQL when requested, writes Nginx and systemd config, and provisions SSL when the domain is ready.

## 2. Manual Deploy

Run deploy after pushing code:

```bash
cd /var/www/app/sibooking
bash deployment/scripts/deploy.sh
```

`deploy.sh` updates the repository, installs backend dependencies, runs Alembic migrations when `backend/alembic.ini` exists, builds the Next.js frontend, restarts the backend/frontend services, and reloads Nginx after `nginx -t`.

## 3. Important Env Rules

- Do not combine all env values into one file.
- Do not put `DATABASE_URL`, `SECRET_KEY`, mail passwords, or other backend secrets in the frontend env file.
- Frontend public values must use the Next.js `NEXT_PUBLIC_` prefix.
- Shell-readable env values with spaces must be quoted, for example `APP_NAME="Sibooking Backend"`.

## 4. Checks

```bash
bash -n deployment/scripts/setup.sh
bash -n deployment/scripts/deploy.sh
systemctl status sibooking-backend.service
systemctl status sibooking-frontend.service
nginx -t
```
