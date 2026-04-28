#!/usr/bin/env bash
# Production deployment for IMPAL.
# Updates the repo, builds Next.js, installs FastAPI dependencies, writes
# systemd units that bind to Unix sockets, reloads Nginx, and requests SSL.

set -euo pipefail

APP_NAME="${APP_NAME:-impal}"
PROJECT_DIR="${PROJECT_DIR:-/var/www/app}"
FRONTEND_DIR="${FRONTEND_DIR:-frontend}"
BACKEND_DIR="${BACKEND_DIR:-backend}"
BACKEND_APP_MODULE="${BACKEND_APP_MODULE:-main:app}"
GIT_BRANCH="${GIT_BRANCH:-main}"
SERVICE_USER="${SERVICE_USER:-impal}"
SERVICE_GROUP="${SERVICE_GROUP:-www-data}"
RUN_DIR="${RUN_DIR:-}"
LOG_DIR="${LOG_DIR:-}"
BACKEND_SOCKET="${BACKEND_SOCKET:-}"
FRONTEND_SOCKET="${FRONTEND_SOCKET:-}"
NGINX_SITE_NAME="${NGINX_SITE_NAME:-}"
DOMAIN="${DOMAIN:-}"
CERTBOT_EMAIL="${EMAIL:-${SSL_EMAIL:-}}"
REQUIRE_DATABASE_URL="${REQUIRE_DATABASE_URL:-true}"
BACKEND_WORKERS="${BACKEND_WORKERS:-2}"

if [ "${EUID}" -eq 0 ]; then
    SUDO=()
else
    SUDO=(sudo)
fi

log() {
    printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

warn() {
    printf 'WARNING: %s\n' "$*" >&2
}

fail() {
    printf 'ERROR: %s\n' "$*" >&2
    exit 1
}

require_directory() {
    [ -d "$1" ] || fail "Directory wajib tidak ditemukan: $1"
}

require_file() {
    [ -f "$1" ] || fail "File wajib tidak ditemukan: $1"
}

load_dotenv_file() {
    local file="$1"
    local line key value

    while IFS= read -r line || [ -n "${line}" ]; do
        line="${line#"${line%%[![:space:]]*}"}"
        line="${line%"${line##*[![:space:]]}"}"

        [[ -z "${line}" || "${line}" == \#* ]] && continue
        if [[ "${line}" =~ ^export[[:space:]]+(.+)$ ]]; then
            line="${BASH_REMATCH[1]}"
        fi

        if [[ "${line}" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
            key="${BASH_REMATCH[1]}"
            value="${BASH_REMATCH[2]}"
            value="${value#"${value%%[![:space:]]*}"}"
            value="${value%"${value##*[![:space:]]}"}"

            if [[ "${value}" =~ ^\"(.*)\"$ ]]; then
                value="${BASH_REMATCH[1]}"
            elif [[ "${value}" =~ ^\'(.*)\'$ ]]; then
                value="${BASH_REMATCH[1]}"
            fi

            export "${key}=${value}"
        fi
    done < "${file}"
}

refresh_derived_paths() {
    RUN_DIR="${RUN_DIR:-/run/${APP_NAME}}"
    LOG_DIR="${LOG_DIR:-/var/log/${APP_NAME}}"
    BACKEND_SOCKET="${BACKEND_SOCKET:-${RUN_DIR}/backend.sock}"
    FRONTEND_SOCKET="${FRONTEND_SOCKET:-${RUN_DIR}/frontend.sock}"
    NGINX_SITE_NAME="${NGINX_SITE_NAME:-${APP_NAME}}"
    NGINX_UPSTREAM_PREFIX="$(printf '%s' "${APP_NAME}" | tr -c 'A-Za-z0-9_' '_')"
    NGINX_SITE_AVAILABLE="/etc/nginx/sites-available/${NGINX_SITE_NAME}"
    NGINX_SITE_ENABLED="/etc/nginx/sites-enabled/${NGINX_SITE_NAME}"
    CERTBOT_EMAIL="${EMAIL:-${SSL_EMAIL:-}}"
}

load_env_files() {
    local file
    local candidates=(
        "${ENV_FILE:-}"
        "${PROJECT_DIR}/.env"
        "${PROJECT_DIR}/deployment/.env"
        "${PROJECT_DIR}/deployment/.env.production"
    )

    for file in "${candidates[@]}"; do
        if [ -n "${file}" ] && [ -f "${file}" ]; then
            log "Loading environment from ${file}"
            load_dotenv_file "${file}"
            DEPLOY_ENV_FILE="${file}"
        fi
    done

    refresh_derived_paths
}

validate_config() {
    [ -n "${APP_NAME}" ] || fail "APP_NAME kosong."
    [[ "${APP_NAME}" =~ ^[A-Za-z0-9_.@-]+$ ]] || fail "APP_NAME hanya boleh berisi huruf, angka, titik, underscore, @, dan tanda minus."
    [ -n "${DOMAIN}" ] || fail "DOMAIN wajib di-set untuk Nginx/SSL."
    [ -n "${PROJECT_DIR}" ] || fail "PROJECT_DIR kosong."
    [ -n "${FRONTEND_DIR}" ] || fail "FRONTEND_DIR kosong."
    [ -n "${BACKEND_DIR}" ] || fail "BACKEND_DIR kosong."
    [ -n "${BACKEND_APP_MODULE}" ] || fail "BACKEND_APP_MODULE kosong."

    if [ "${REQUIRE_DATABASE_URL}" = "true" ] && [ -z "${DATABASE_URL:-}" ]; then
        fail "DATABASE_URL wajib untuk backend. Set di env file, atau pakai REQUIRE_DATABASE_URL=false jika aplikasi tidak membutuhkannya."
    fi
}

absolute_path() {
    if [[ "$1" = /* ]]; then
        printf '%s\n' "$1"
    else
        printf '%s/%s\n' "${PROJECT_DIR}" "$1"
    fi
}

ensure_service_user_and_dirs() {
    if ! getent group "${SERVICE_GROUP}" >/dev/null; then
        log "Creating group ${SERVICE_GROUP}"
        "${SUDO[@]}" groupadd --system "${SERVICE_GROUP}"
    fi

    if ! id -u "${SERVICE_USER}" >/dev/null 2>&1; then
        log "Creating service user ${SERVICE_USER}"
        "${SUDO[@]}" useradd --system --home-dir "${PROJECT_DIR}" --shell /usr/sbin/nologin --gid "${SERVICE_GROUP}" "${SERVICE_USER}"
    fi

    if id -u www-data >/dev/null 2>&1; then
        "${SUDO[@]}" usermod -aG "${SERVICE_GROUP}" www-data || true
    fi

    log "Preparing runtime and log directories"
    "${SUDO[@]}" install -d -m 2775 -o "${SERVICE_USER}" -g "${SERVICE_GROUP}" "${RUN_DIR}" "${LOG_DIR}"
}

update_repository() {
    log "Updating repository ${PROJECT_DIR} from ${GIT_BRANCH}"
    require_directory "${PROJECT_DIR}"

    if [ -d "${PROJECT_DIR}/.git" ]; then
        git -C "${PROJECT_DIR}" fetch origin "${GIT_BRANCH}" --prune
        git -C "${PROJECT_DIR}" checkout "${GIT_BRANCH}"
        git -C "${PROJECT_DIR}" pull --ff-only origin "${GIT_BRANCH}"
    else
        warn "${PROJECT_DIR} is not a git repository; skipping git pull."
    fi
}

build_frontend() {
    local frontend_path
    frontend_path="$(absolute_path "${FRONTEND_DIR}")"

    log "Building Next.js frontend in ${frontend_path}"
    require_directory "${frontend_path}"
    require_file "${frontend_path}/package.json"

    cd "${frontend_path}"
    npm ci
    npm run build
}

install_backend() {
    local backend_path
    backend_path="$(absolute_path "${BACKEND_DIR}")"

    log "Installing FastAPI backend in ${backend_path}"
    require_directory "${backend_path}"
    require_file "${backend_path}/requirements.txt"

    cd "${backend_path}"
    python3 -m venv .venv
    # shellcheck disable=SC1091
    . .venv/bin/activate
    python -m pip install --upgrade pip
    pip install -r requirements.txt
    pip install gunicorn uvicorn
    deactivate
}

write_next_wrapper() {
    local runtime_dir wrapper
    runtime_dir="${PROJECT_DIR}/deployment/runtime"
    wrapper="${runtime_dir}/next-server.mjs"

    log "Writing Next.js Unix-socket wrapper to ${wrapper}"
    install -d -m 0755 "${runtime_dir}"
    cat > "${wrapper}" <<'WRAPPER'
import { createServer } from 'node:http';
import { chmodSync, existsSync, unlinkSync } from 'node:fs';
import next from 'next';

const dir = process.env.NEXT_PROJECT_DIR || process.cwd();
const socketPath = process.env.NEXT_SOCKET_PATH;
const hostname = process.env.HOSTNAME || '127.0.0.1';

if (!socketPath) {
  throw new Error('NEXT_SOCKET_PATH is required');
}

if (existsSync(socketPath)) {
  unlinkSync(socketPath);
}

const app = next({ dev: false, dir, hostname });
const handle = app.getRequestHandler();
await app.prepare();

const server = createServer((req, res) => handle(req, res));
server.listen(socketPath, () => {
  chmodSync(socketPath, 0o660);
  console.log(`Next.js listening on unix:${socketPath}`);
});

const shutdown = () => {
  server.close(() => process.exit(0));
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
WRAPPER
}

systemd_env_file() {
    local file
    local candidates=(
        "${DEPLOY_ENV_FILE:-}"
        "${PROJECT_DIR}/deployment/.env.production"
        "${PROJECT_DIR}/deployment/.env"
        "${PROJECT_DIR}/.env"
        "${PROJECT_DIR}/${BACKEND_DIR}/.env"
    )

    for file in "${candidates[@]}"; do
        if [ -n "${file}" ] && [ -f "${file}" ]; then
            printf '%s\n' "${file}"
            return
        fi
    done

    # Optional EnvironmentFile=- keeps the service valid even before the file exists.
    printf '/etc/%s/%s.env\n' "${APP_NAME}" "${APP_NAME}"
}

write_systemd_services() {
    local backend_path frontend_path env_file backend_service frontend_service
    backend_path="$(absolute_path "${BACKEND_DIR}")"
    frontend_path="$(absolute_path "${FRONTEND_DIR}")"
    env_file="$(systemd_env_file)"
    backend_service="/etc/systemd/system/${APP_NAME}-backend.service"
    frontend_service="/etc/systemd/system/${APP_NAME}-frontend.service"

    log "Writing systemd services"
    "${SUDO[@]}" tee "${backend_service}" >/dev/null <<BACKEND_SERVICE
[Unit]
Description=${APP_NAME} FastAPI backend
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=${SERVICE_USER}
Group=${SERVICE_GROUP}
WorkingDirectory=${backend_path}
Environment=PYTHONUNBUFFERED=1
EnvironmentFile=-${env_file}
RuntimeDirectory=${APP_NAME}
RuntimeDirectoryMode=2775
UMask=0007
ExecStartPre=/bin/rm -f ${BACKEND_SOCKET}
ExecStart=${backend_path}/.venv/bin/gunicorn ${BACKEND_APP_MODULE} -k uvicorn.workers.UvicornWorker --bind unix:${BACKEND_SOCKET} --workers ${BACKEND_WORKERS} --umask 007 --access-logfile - --error-logfile -
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
BACKEND_SERVICE

    "${SUDO[@]}" tee "${frontend_service}" >/dev/null <<FRONTEND_SERVICE
[Unit]
Description=${APP_NAME} Next.js frontend
After=network.target

[Service]
Type=simple
User=${SERVICE_USER}
Group=${SERVICE_GROUP}
WorkingDirectory=${frontend_path}
Environment=NODE_ENV=production
Environment=NEXT_PROJECT_DIR=${frontend_path}
Environment=NEXT_SOCKET_PATH=${FRONTEND_SOCKET}
EnvironmentFile=-${env_file}
RuntimeDirectory=${APP_NAME}
RuntimeDirectoryMode=2775
UMask=0007
ExecStart=/usr/bin/node ${PROJECT_DIR}/deployment/runtime/next-server.mjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
FRONTEND_SERVICE
}

backup_file_if_changed() {
    local target="$1"
    local candidate="$2"

    if [ -f "${target}" ] && ! cmp -s "${target}" "${candidate}"; then
        local backup="${target}.bak.$(date '+%Y%m%d%H%M%S')"
        log "Backing up ${target} to ${backup}"
        "${SUDO[@]}" cp -a "${target}" "${backup}"
    fi
}

write_nginx_config() {
    local tmp
    tmp="$(mktemp)"

    log "Writing Nginx reverse proxy config"
    cat > "${tmp}" <<NGINX
# Managed by deployment/scripts/deploy.sh.
map \$http_upgrade \$connection_upgrade {
    default upgrade;
    '' close;
}

upstream ${NGINX_UPSTREAM_PREFIX}_frontend {
    server unix:${FRONTEND_SOCKET};
}

upstream ${NGINX_UPSTREAM_PREFIX}_backend {
    server unix:${BACKEND_SOCKET};
}

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    client_max_body_size 20M;

    location /api/ {
        proxy_pass http://${NGINX_UPSTREAM_PREFIX}_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        proxy_pass http://${NGINX_UPSTREAM_PREFIX}_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX

    backup_file_if_changed "${NGINX_SITE_AVAILABLE}" "${tmp}"
    "${SUDO[@]}" install -m 0644 "${tmp}" "${NGINX_SITE_AVAILABLE}"
    rm -f "${tmp}"
    "${SUDO[@]}" ln -sfn "${NGINX_SITE_AVAILABLE}" "${NGINX_SITE_ENABLED}"
    "${SUDO[@]}" rm -f /etc/nginx/sites-enabled/default
}

restart_services() {
    log "Restarting application services"
    "${SUDO[@]}" systemctl daemon-reload
    "${SUDO[@]}" systemctl enable --now "${APP_NAME}-backend.service"
    "${SUDO[@]}" systemctl enable --now "${APP_NAME}-frontend.service"
    "${SUDO[@]}" systemctl restart "${APP_NAME}-backend.service"
    "${SUDO[@]}" systemctl restart "${APP_NAME}-frontend.service"
}

reload_nginx() {
    log "Testing and reloading Nginx"
    "${SUDO[@]}" nginx -t
    "${SUDO[@]}" systemctl enable --now nginx
    "${SUDO[@]}" systemctl reload nginx
}

setup_ssl_if_needed() {
    if [ -z "${CERTBOT_EMAIL}" ]; then
        log "EMAIL/SSL_EMAIL not set; skipping Certbot SSL setup"
        return
    fi

    if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
        log "SSL certificate for ${DOMAIN} already exists"
        return
    fi

    log "Requesting Let's Encrypt certificate for ${DOMAIN}"
    if ! "${SUDO[@]}" certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${CERTBOT_EMAIL}" --redirect; then
        warn "Certbot gagal. Deploy tetap selesai, tetapi SSL belum aktif. Periksa DNS/firewall lalu jalankan deploy ulang."
        return
    fi

    "${SUDO[@]}" nginx -t
    "${SUDO[@]}" systemctl reload nginx
}

main() {
    load_env_files
    validate_config
    ensure_service_user_and_dirs
    update_repository
    load_env_files
    validate_config
    build_frontend
    install_backend
    write_next_wrapper
    write_systemd_services
    write_nginx_config
    restart_services
    reload_nginx
    setup_ssl_if_needed

    log "Deployment completed successfully"
    log "Frontend socket: ${FRONTEND_SOCKET}"
    log "Backend socket: ${BACKEND_SOCKET}"
}

main "$@"
