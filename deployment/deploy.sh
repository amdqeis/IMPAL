#!/usr/bin/env bash

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${DEPLOYMENT_ENV:-${SCRIPT_DIR}/.env}"

APP_NAME="sibooking"
DOMAIN=""
SSL_EMAIL=""
GIT_BRANCH="main"
PROJECT_ROOT="/var/www/app"
PROJECT_DIR="/var/www/app/sibooking"
FRONTEND_DIR="/var/www/app/sibooking/frontend"
BACKEND_DIR="/var/www/app/sibooking/backend"
DEPLOYMENT_DIR="/var/www/app/sibooking/deployment"
BACKEND_ENV="/var/www/app/sibooking/backend/.env"
FRONTEND_ENV="/var/www/app/sibooking/frontend/.env.production"
BACKEND_PORT=""
FRONTEND_PORT=""
BACKEND_APP_MODULE="main:app"
BACKEND_WORKERS="1"
APP_OWNER="deploy"
APP_GROUP="deploy"
DB_HOST="127.0.0.1"
DB_PORT="5432"
DB_NAME="sibooking_db"
DB_USER="sibooking_user"
DB_PASSWORD=""
DATABASE_URL=""
CLIENT_MAX_BODY_SIZE="20M"

log() {
    printf "\n${BLUE}[%s]${NC} %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

ok() {
    printf "${GREEN}OK:${NC} %s\n" "$*"
}

warn() {
    printf "${YELLOW}WARNING:${NC} %s\n" "$*" >&2
}

fail() {
    printf "${RED}ERROR:${NC} %s\n" "$*" >&2
    exit 1
}

require_root() {
    [ "${EUID}" -eq 0 ] || fail "Jalankan deploy.sh dengan sudo atau sebagai root agar bisa menulis systemd dan reload Nginx."
}

trim() {
    local value="$1"
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"
    printf '%s' "${value}"
}

read_env_var() {
    local file="$1"
    local wanted="$2"
    local line key value

    [ -f "${file}" ] || return 1
    while IFS= read -r line || [ -n "${line}" ]; do
        line="$(trim "${line}")"
        [[ -z "${line}" || "${line}" == \#* ]] && continue
        [[ "${line}" =~ ^export[[:space:]]+(.+)$ ]] && line="$(trim "${BASH_REMATCH[1]}")"

        if [[ "${line}" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
            key="${BASH_REMATCH[1]}"
            [ "${key}" = "${wanted}" ] || continue
            value="$(trim "${BASH_REMATCH[2]}")"
            [[ "${value}" =~ ^\"(.*)\"$ ]] && value="${BASH_REMATCH[1]}"
            [[ "${value}" =~ ^\'(.*)\'$ ]] && value="${BASH_REMATCH[1]}"
            printf '%s' "${value}"
            return 0
        fi
    done < "${file}"
    return 1
}

set_from_env_file() {
    local key="$1"
    local value
    if value="$(read_env_var "${ENV_FILE}" "${key}")"; then
        printf -v "${key}" '%s' "${value}"
    fi
}

quote_env_value() {
    local value="$1"
    if [[ "${value}" =~ [[:space:]#\"\'\\$] ]]; then
        value="${value//\\/\\\\}"
        value="${value//\"/\\\"}"
        printf '"%s"' "${value}"
    else
        printf '%s' "${value}"
    fi
}

set_env_value() {
    local file="$1"
    local key="$2"
    local value="$3"
    local tmp
    tmp="$(mktemp)"

    [ -f "${file}" ] && grep -Ev "^${key}=" "${file}" > "${tmp}" || true
    printf '%s=%s\n' "${key}" "$(quote_env_value "${value}")" >> "${tmp}"

    install -m 0600 "${tmp}" "${file}"
    rm -f "${tmp}"
}

load_env() {
    [ -f "${ENV_FILE}" ] || fail "Deployment env tidak ditemukan: ${ENV_FILE}. Jalankan setup.sh terlebih dahulu."
    local key
    for key in APP_NAME DOMAIN SSL_EMAIL GIT_BRANCH PROJECT_ROOT PROJECT_DIR FRONTEND_DIR BACKEND_DIR DEPLOYMENT_DIR BACKEND_ENV FRONTEND_ENV BACKEND_PORT FRONTEND_PORT BACKEND_APP_MODULE BACKEND_WORKERS APP_OWNER APP_GROUP CLIENT_MAX_BODY_SIZE; do
        set_from_env_file "${key}"
    done
}

derive_paths() {
    PROJECT_ROOT="${PROJECT_ROOT:-/var/www/app}"
    PROJECT_DIR="${PROJECT_DIR:-${PROJECT_ROOT}/${APP_NAME}}"
    FRONTEND_DIR="${FRONTEND_DIR:-${PROJECT_DIR}/frontend}"
    BACKEND_DIR="${BACKEND_DIR:-${PROJECT_DIR}/backend}"
    DEPLOYMENT_DIR="${DEPLOYMENT_DIR:-${PROJECT_DIR}/deployment}"
    BACKEND_ENV="${BACKEND_ENV:-${BACKEND_DIR}/.env}"
    FRONTEND_ENV="${FRONTEND_ENV:-${FRONTEND_DIR}/.env.production}"
}

require_non_empty() {
    local name="$1"
    local value="${!name:-}"
    [ -n "${value}" ] || fail "${name} wajib diisi."
}

require_command() {
    command -v "$1" >/dev/null 2>&1 || fail "Command wajib belum tersedia: $1"
}

validate_config() {
    derive_paths
    require_non_empty APP_NAME
    require_non_empty DOMAIN
    require_non_empty PROJECT_DIR
    require_non_empty BACKEND_DIR
    require_non_empty FRONTEND_DIR
    require_non_empty DEPLOYMENT_DIR
    require_non_empty BACKEND_ENV
    require_non_empty FRONTEND_ENV
    require_non_empty BACKEND_PORT
    require_non_empty FRONTEND_PORT
    require_non_empty BACKEND_APP_MODULE
    require_non_empty APP_OWNER
    require_non_empty APP_GROUP

    [ -d "${PROJECT_DIR}" ] || fail "PROJECT_DIR tidak ditemukan: ${PROJECT_DIR}"
    [ -d "${BACKEND_DIR}" ] || fail "Folder backend tidak ditemukan: ${BACKEND_DIR}"
    [ -d "${FRONTEND_DIR}" ] || fail "Folder frontend tidak ditemukan: ${FRONTEND_DIR}"
    [ -f "${BACKEND_DIR}/requirements.txt" ] || fail "requirements.txt backend tidak ditemukan."
    [ -f "${FRONTEND_DIR}/package.json" ] || fail "package.json frontend tidak ditemukan."
    id -u "${APP_OWNER}" >/dev/null 2>&1 || fail "APP_OWNER tidak ditemukan: ${APP_OWNER}"
    getent group "${APP_GROUP}" >/dev/null 2>&1 || fail "APP_GROUP tidak ditemukan: ${APP_GROUP}"
}

run_as_app() {
    local command="$1"
    sudo -u "${APP_OWNER}" -H bash -lc "${command}"
}

update_repository() {
    log "Mengambil update Git terbaru"
    if [ -d "${PROJECT_DIR}/.git" ]; then
        run_as_app "cd '${PROJECT_DIR}' && git fetch origin '${GIT_BRANCH}' --prune && git checkout '${GIT_BRANCH}' && git pull --ff-only origin '${GIT_BRANCH}'"
    else
        warn "${PROJECT_DIR} bukan Git repository; skip git pull."
    fi
}

prepare_env_files() {
    log "Menyiapkan environment backend dan frontend"
    if [ ! -f "${BACKEND_ENV}" ]; then
        [ -f "${BACKEND_DIR}/.env.example" ] || fail "Backend env example tidak ditemukan: ${BACKEND_DIR}/.env.example"
        install -m 0600 -o "${APP_OWNER}" -g "${APP_GROUP}" "${BACKEND_DIR}/.env.example" "${BACKEND_ENV}"
        chown "${APP_OWNER}:${APP_GROUP}" "${BACKEND_ENV}"
        fail "Backend env dibuat: ${BACKEND_ENV}. Isi DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, SECRET_KEY, dan FRONTEND_URL lalu jalankan deploy.sh lagi."
    else
        chmod 0600 "${BACKEND_ENV}"
        chown "${APP_OWNER}:${APP_GROUP}" "${BACKEND_ENV}"
        ok "Backend env sudah ada; tidak dioverwrite."
    fi

    if [ ! -f "${FRONTEND_ENV}" ]; then
        [ -f "${FRONTEND_DIR}/.env.production.example" ] || fail "Frontend env example tidak ditemukan: ${FRONTEND_DIR}/.env.production.example"
        install -m 0600 -o "${APP_OWNER}" -g "${APP_GROUP}" "${FRONTEND_DIR}/.env.production.example" "${FRONTEND_ENV}"
        ok "Frontend env dibuat: ${FRONTEND_ENV}"
    else
        chmod 0600 "${FRONTEND_ENV}"
        chown "${APP_OWNER}:${APP_GROUP}" "${FRONTEND_ENV}"
        ok "Frontend env sudah ada; tidak dioverwrite."
    fi
}

set_from_backend_env() {
    local key="$1"
    local value
    if value="$(read_env_var "${BACKEND_ENV}" "${key}")"; then
        printf -v "${key}" '%s' "${value}"
    fi
}

validate_backend_database_env() {
    log "Memvalidasi konfigurasi database dari ${BACKEND_ENV}"
    set_from_backend_env DB_HOST
    set_from_backend_env DB_PORT
    set_from_backend_env DB_NAME
    set_from_backend_env DB_USER
    set_from_backend_env DB_PASSWORD
    set_from_backend_env DATABASE_URL

    require_non_empty DB_HOST
    require_non_empty DB_PORT
    require_non_empty DB_NAME
    require_non_empty DB_USER
    require_non_empty DB_PASSWORD
    [ "${DB_PASSWORD}" != "change-me" ] || fail "DB_PASSWORD di ${BACKEND_ENV} masih bernilai contoh."
    [[ "${DATABASE_URL}" != *change-me* ]] || fail "DATABASE_URL di ${BACKEND_ENV} masih berisi password contoh. Kosongkan DATABASE_URL atau sesuaikan dengan DB_*."
}

install_backend() {
    log "Install dependency backend FastAPI"
    run_as_app "cd '${BACKEND_DIR}' && python3 -m venv .venv && .venv/bin/python -m pip install --upgrade pip && .venv/bin/pip install -r requirements.txt"

    if [ -f "${BACKEND_DIR}/alembic.ini" ]; then
        log "Menjalankan migration Alembic"
        run_as_app "cd '${BACKEND_DIR}' && .venv/bin/alembic upgrade head"
    else
        ok "Alembic tidak ditemukan; skip migration."
    fi
}

install_frontend() {
    log "Install dependency dan build frontend Next.js"
    if [ -f "${FRONTEND_DIR}/package-lock.json" ]; then
        run_as_app "cd '${FRONTEND_DIR}' && npm ci && npm run build"
    else
        run_as_app "cd '${FRONTEND_DIR}' && npm install && npm run build"
    fi
}

render_template() {
    local template="$1"
    local target="$2"
    local mode="$3"
    local tmp
    tmp="$(mktemp)"

    export APP_NAME APP_OWNER APP_GROUP BACKEND_DIR FRONTEND_DIR BACKEND_ENV FRONTEND_ENV BACKEND_APP_MODULE BACKEND_PORT FRONTEND_PORT BACKEND_WORKERS
    envsubst < "${template}" > "${tmp}"
    install -m "${mode}" "${tmp}" "${target}"
    rm -f "${tmp}"
}

render_systemd_services() {
    log "Menulis systemd service backend dan frontend"
    render_template "${DEPLOYMENT_DIR}/backend.service.template" "/etc/systemd/system/${APP_NAME}-backend.service" 0644
    render_template "${DEPLOYMENT_DIR}/frontend.service.template" "/etc/systemd/system/${APP_NAME}-frontend.service" 0644
    systemctl daemon-reload
    systemctl enable "${APP_NAME}-backend.service" "${APP_NAME}-frontend.service"
}

render_nginx() {
    local mode="http"
    local target="/etc/nginx/sites-available/${APP_NAME}"
    local tmp
    tmp="$(mktemp)"

    if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
        mode="https"
    fi

    if [ "${mode}" = "https" ]; then
        HTTP_SERVER_BLOCK="$(cat <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}
NGINX
)"
        HTTPS_SERVER_BLOCK="$(cat <<NGINX
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size ${CLIENT_MAX_BODY_SIZE};

    location /api/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:${FRONTEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX
)"
    else
        HTTP_SERVER_BLOCK="$(cat <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    client_max_body_size ${CLIENT_MAX_BODY_SIZE};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:${FRONTEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX
)"
        HTTPS_SERVER_BLOCK=""
    fi

    export HTTP_SERVER_BLOCK HTTPS_SERVER_BLOCK
    envsubst '${HTTP_SERVER_BLOCK} ${HTTPS_SERVER_BLOCK}' < "${DEPLOYMENT_DIR}/nginx.conf.template" > "${tmp}"
    install -m 0644 "${tmp}" "${target}"
    rm -f "${tmp}"
    ln -sfn "${target}" "/etc/nginx/sites-enabled/${APP_NAME}"
    nginx -t
}

restart_services() {
    log "Restart service aplikasi"
    systemctl restart "${APP_NAME}-backend.service"
    systemctl restart "${APP_NAME}-frontend.service"
    systemctl reload nginx
}

show_status() {
    log "Status service"
    systemctl --no-pager --full status "${APP_NAME}-backend.service" || true
    systemctl --no-pager --full status "${APP_NAME}-frontend.service" || true
}

main() {
    require_root
    load_env
    validate_config
    require_command git
    require_command python3
    require_command npm
    require_command nginx
    require_command envsubst
    update_repository
    load_env
    validate_config
    chown -R "${APP_OWNER}:${APP_GROUP}" "${PROJECT_DIR}"
    prepare_env_files
    validate_backend_database_env
    install_backend
    install_frontend
    render_systemd_services
    render_nginx
    restart_services
    show_status
    ok "Deployment selesai untuk https://${DOMAIN}"
}

main "$@"
