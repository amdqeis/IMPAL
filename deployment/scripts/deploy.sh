#!/usr/bin/env bash
# Idempotent deployment script for the app hosted at /var/www/app.
# It updates the repository, refreshes backend dependencies, rebuilds Next.js,
# restarts FastAPI via systemd, and manages the frontend with PM2.

set -Eeuo pipefail

APP_DIR="/var/www/app"
FRONTEND_DIR="${APP_DIR}/frontend"
BACKEND_DIR="${APP_DIR}/backend"
VENV_DIR="${BACKEND_DIR}/.venv"
FASTAPI_SERVICE_NAME="fastapi"
PM2_APP_NAME="nextjs-app"
GIT_BRANCH="${GIT_BRANCH:-main}"

log() {
    printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

require_directory() {
    local directory="$1"

    if [ ! -d "${directory}" ]; then
        echo "Required directory not found: ${directory}" >&2
        exit 1
    fi
}

ensure_pm2() {
    if command_exists pm2; then
        return
    fi

    log "PM2 is missing; installing it globally"
    sudo npm install -g pm2@latest
}

update_repository() {
    log "Updating git repository"
    git -C "${APP_DIR}" fetch --all --prune
    git -C "${APP_DIR}" checkout "${GIT_BRANCH}"
    git -C "${APP_DIR}" pull --ff-only origin "${GIT_BRANCH}"
}

deploy_backend() {
    log "Deploying backend"
    require_directory "${BACKEND_DIR}"

    if [ ! -d "${VENV_DIR}" ]; then
        python3 -m venv "${VENV_DIR}"
    fi

    # Reinstall dependencies on every deploy so the environment matches the repo.
    # Gunicorn is installed here even if it is not pinned in requirements.txt yet.
    # shellcheck disable=SC1091
    . "${VENV_DIR}/bin/activate"
    python -m pip install --upgrade pip setuptools wheel
    pip install -r "${BACKEND_DIR}/requirements.txt" gunicorn
    deactivate

    sudo systemctl daemon-reload
    sudo systemctl enable --now "${FASTAPI_SERVICE_NAME}"
    sudo systemctl restart "${FASTAPI_SERVICE_NAME}"
    sudo systemctl is-active --quiet "${FASTAPI_SERVICE_NAME}"
}

deploy_frontend() {
    log "Deploying frontend"
    require_directory "${FRONTEND_DIR}"
    ensure_pm2

    cd "${FRONTEND_DIR}"

    if [ -f package-lock.json ]; then
        npm ci
    else
        npm install
    fi

    npm run build

    export NODE_ENV=production
    export PORT=3000

    if pm2 describe "${PM2_APP_NAME}" >/dev/null 2>&1; then
        pm2 restart "${PM2_APP_NAME}" --update-env
    else
        pm2 start npm --name "${PM2_APP_NAME}" --cwd "${FRONTEND_DIR}" -- start -- --hostname 127.0.0.1 --port 3000
    fi

    pm2 save --force
}

reload_nginx() {
    log "Reloading Nginx"
    sudo nginx -t
    sudo systemctl reload nginx
}

main() {
    require_directory "${APP_DIR}"
    update_repository
    deploy_backend
    deploy_frontend
    reload_nginx
    log "Deployment completed successfully"
}

main "$@"
