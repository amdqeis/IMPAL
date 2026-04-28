# Deployment Guide

This folder contains a production-ready deployment baseline for the current stack:

- Frontend: Next.js served by PM2 on `127.0.0.1:3000`
- Backend: FastAPI served by Gunicorn on `127.0.0.1:8000`
- Database: PostgreSQL on the VPS
- Reverse proxy: Nginx with Let's Encrypt SSL
- CI/CD: GitHub Actions deploying over SSH

## Directory Layout

```text
deployment/
├── nginx/app.conf
├── systemd/fastapi.service
├── scripts/setup.sh
├── scripts/deploy.sh
├── github-actions/deploy.yml
├── .env.example
└── README.md
```

## 1. Initial VPS Setup

Run the setup script on Ubuntu after the repository is present on the server.

```bash
# Clone or place the project in the standard deployment path.
sudo mkdir -p /var/www/app
sudo chown -R "$USER":"$USER" /var/www/app
git clone <your-repository-url> /var/www/app

# Prepare the backend environment file used by FastAPI and the setup script.
cp /var/www/app/deployment/.env.example /var/www/app/backend/.env
nano /var/www/app/backend/.env

# Run the idempotent bootstrap script.
cd /var/www/app
sudo APP_OWNER="$USER" bash deployment/scripts/setup.sh
```

What `setup.sh` does:

- Installs Node.js, Python, `venv`, Nginx, PostgreSQL, PM2, and Certbot
- Creates `/var/www/app` and `/var/www/certbot`
- Installs the FastAPI `systemd` service
- Installs and enables the Nginx site
- Requests a Let's Encrypt certificate when `DOMAIN` and `SSL_EMAIL` are set
- Leaves the server safe to reconfigure by running the same script again

## 2. Domain and SSL Configuration

Before running SSL provisioning, point your DNS records to the VPS:

- `A` record: `example.com` -> your server IP
- `A` record: `www.example.com` -> your server IP

Then update these values inside `/var/www/app/backend/.env`:

```env
DOMAIN=example.com
SSL_EMAIL=admin@example.com
WWW_DOMAIN=www.example.com
FRONTEND_URL=https://example.com
```

Notes:

- `deployment/nginx/app.conf` is the final HTTPS configuration used after the certificate exists.
- `setup.sh` first writes a temporary HTTP-only Nginx config so Certbot can complete HTTP-01 validation.
- After the certificate is issued, the script swaps Nginx to the final HTTPS config and reloads the service.
- If you do not use a `www` subdomain, set `WWW_DOMAIN=` in the environment file before running `setup.sh`.

## 3. Manual Deployment

Use the deploy script any time you want to update the server manually.

```bash
cd /var/www/app
bash deployment/scripts/deploy.sh
```

What `deploy.sh` does:

- Pulls the latest code from the `main` branch
- Creates the backend virtual environment if it does not exist
- Installs backend requirements and Gunicorn
- Restarts the FastAPI `systemd` service
- Installs frontend packages, builds Next.js, and restarts PM2
- Reloads Nginx after the application restarts

## 4. GitHub Actions CI/CD

The workflow file is stored at `deployment/github-actions/deploy.yml`.

Recommended setup:

1. Copy `deployment/github-actions/deploy.yml` to `.github/workflows/deploy.yml`
2. Add the following repository secrets in GitHub:
   - `VPS_HOST`
   - `VPS_USER`
   - `VPS_SSH_KEY`
3. Ensure the server user can:
   - SSH into the VPS
   - Run `sudo systemctl ...`
   - Pull the repository from `/var/www/app`

How the pipeline works:

1. On every push to `main`, GitHub Actions checks out the repository.
2. The workflow builds the Next.js frontend.
3. The workflow installs backend dependencies and validates the FastAPI app import.
4. If the build succeeds, the workflow connects to the VPS over SSH.
5. The workflow runs `/var/www/app/deployment/scripts/deploy.sh` on the server.

## 5. Operational Notes

- FastAPI is exposed only on `127.0.0.1:8000`; Nginx handles public traffic.
- Next.js is exposed only on `127.0.0.1:3000`; PM2 keeps it alive across restarts.
- The backend currently reads `SECRET_KEY`; keep `JWT_SECRET` for deployment bookkeeping, but set `SECRET_KEY` to the real JWT signing value.
- The server must already have Git access to the repository for `git pull` to work during deployments.
