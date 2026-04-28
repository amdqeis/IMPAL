#!/usr/bin/env bash
# Idempotent VPS bootstrap for the sibooking production deployment.

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/var/www/app}"
APPNAME="${APPNAME:-sibooking}"
APP_DIR="${APP_DIR:-${PROJECT_DIR}/${APPNAME}}"
FRONTEND_DIR="${FRONTEND_DIR:-${APP_DIR}/frontend}"
BACKEND_DIR="${BACKEND_DIR:-${APP_DIR}/backend}"
DEPLOYMENT_DIR="${DEPLOYMENT_DIR:-${APP_DIR}/deployment}"

DEPLOYMENT_ENV="${DEPLOYMENT_ENV:-${DEPLOYMENT_DIR}/.env}"
BACKEND_ENV="${BACKEND_ENV:-${BACKEND_DIR}/.env}"
FRONTEND_ENV="${FRONTEND_ENV:-${FRONTEND_DIR}/.env.production}"

RUN_DIR="${RUN_DIR:-/run/${APPNAME}}"
LOG_DIR="${LOG_DIR:-/var/log/${APPNAME}}"
BACKEND_SOCKET="${BACKEND_SOCKET:-${RUN_DIR}/backend.sock}"
FRONTEND_SOCKET="${FRONTEND_SOCKET:-${RUN_DIR}/frontend.sock}"

NGINX_DIR="${NGINX_DIR:-/etc/nginx}"
NGINX_SITES_AVAILABLE_DIR="${NGINX_SITES_AVAILABLE_DIR:-${NGINX_DIR}/sites-available}"
NGINX_SITES_ENABLED_DIR="${NGINX_SITES_ENABLED_DIR:-${NGINX_DIR}/sites-enabled}"
NGINX_SITE_NAME="${NGINX_SITE_NAME:-${APPNAME}}"
NGINX_SITE_AVAILABLE="${NGINX_SITE_AVAILABLE:-${NGINX_SITES_AVAILABLE_DIR}/${NGINX_SITE_NAME}}"
NGINX_SITE_ENABLED="${NGINX_SITE_ENABLED:-${NGINX_SITES_ENABLED_DIR}/${NGINX_SITE_NAME}}"
NGINX_DEFAULT_SITE="${NGINX_DEFAULT_SITE:-${NGINX_SITES_ENABLED_DIR}/default}"
NGINX_UPSTREAM_PREFIX="$(printf '%s' "${APPNAME}" | tr -c 'A-Za-z0-9_' '_')"

SYSTEMD_DIR="${SYSTEMD_DIR:-/etc/systemd/system}"
SYSTEMD_BACKEND_SERVICE="${SYSTEMD_BACKEND_SERVICE:-${SYSTEMD_DIR}/${APPNAME}-backend.service}"
SYSTEMD_FRONTEND_SERVICE="${SYSTEMD_FRONTEND_SERVICE:-${SYSTEMD_DIR}/${APPNAME}-frontend.service}"

DEPLOYMENT_RUNTIME_DIR="${DEPLOYMENT_RUNTIME_DIR:-${DEPLOYMENT_DIR}/runtime}"
NEXT_WRAPPER="${NEXT_WRAPPER:-${DEPLOYMENT_RUNTIME_DIR}/next-server.mjs}"
LETSENCRYPT_LIVE_DIR="${LETSENCRYPT_LIVE_DIR:-/etc/letsencrypt/live}"
LETSENCRYPT_OPTIONS_CONF="${LETSENCRYPT_OPTIONS_CONF:-/etc/letsencrypt/options-ssl-nginx.conf}"
LETSENCRYPT_SSL_DHPARAM="${LETSENCRYPT_SSL_DHPARAM:-/etc/letsencrypt/ssl-dhparams.pem}"
RM_BIN="${RM_BIN:-/bin/rm}"
NODE_BIN="${NODE_BIN:-/usr/bin/node}"

NODE_MAJOR="${NODE_MAJOR:-20}"
SERVICE_USER="${SERVICE_USER:-${APPNAME}}"
SERVICE_GROUP="${SERVICE_GROUP:-www-data}"
GIT_BRANCH="${GIT_BRANCH:-main}"
BACKEND_APP_MODULE="${BACKEND_APP_MODULE:-main:app}"
BACKEND_WORKERS="${BACKEND_WORKERS:-2}"
DOMAIN="${DOMAIN:-}"
SSL_EMAIL="${SSL_EMAIL:-}"

POSTGRES_DB="${POSTGRES_DB:-}"
POSTGRES_USER="${POSTGRES_USER:-}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"

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

    while IFS= read -r line || [ -n "${line}" ]; do
        line="$(trim "${line}")"
        [[ -z "${line}" || "${line}" == \#* ]] && continue

        if [[ "${line}" =~ ^export[[:space:]]+(.+)$ ]]; then
            line="$(trim "${BASH_REMATCH[1]}")"
        fi

        if [[ "${line}" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
            key="${BASH_REMATCH[1]}"
            [ "${key}" = "${wanted}" ] || continue

            value="$(trim "${BASH_REMATCH[2]}")"
            if [[ "${value}" =~ ^\"(.*)\"$ ]]; then
                value="${BASH_REMATCH[1]}"
            elif [[ "${value}" =~ ^\'(.*)\'$ ]]; then
                value="${BASH_REMATCH[1]}"
            fi

            printf '%s' "${value}"
            return 0
        fi
    done < "${file}"

    return 1
}

set_from_env_file() {
    local file="$1"
    local key="$2"
    local value

    if value="$(read_env_var "${file}" "${key}")"; then
        printf -v "${key}" '%s' "${value}"
    fi
}

env_file_has_key() {
    read_env_var "$1" "$2" >/dev/null
}

require_root() {
    [ "${EUID}" -eq 0 ] || fail "Jalankan setup.sh dengan sudo atau sebagai root."
}

require_command() {
    command -v "$1" >/dev/null 2>&1 || fail "Dependency tidak ditemukan: $1"
}

require_file() {
    [ -f "$1" ] || fail "$2: $1"
}

require_directory() {
    [ -d "$1" ] || fail "$2: $1"
}

require_non_empty() {
    local name="$1"
    local value="${!name:-}"
    [ -n "${value}" ] || fail "${name} wajib di-set."
}

assert_safe_app_dir() {
    [ -n "${APP_DIR}" ] || fail "APP_DIR kosong."
    case "${APP_DIR}" in
        /|/var|/var/|/var/www|/var/www/)
            fail "APP_DIR tidak aman: ${APP_DIR}"
            ;;
    esac
    [[ "${APP_DIR}" == "${PROJECT_DIR}/"* ]] || fail "APP_DIR harus berada di dalam PROJECT_DIR (${PROJECT_DIR})."
}

validate_app_name() {
    [[ "${APPNAME}" =~ ^[A-Za-z0-9_.@-]+$ ]] || fail "APPNAME hanya boleh berisi huruf, angka, titik, underscore, @, dan tanda minus."
}

load_deployment_env() {
    require_file "${DEPLOYMENT_ENV}" "Missing deployment env file"

    local key
    local has_app_dir=false
    local has_frontend_dir=false
    local has_backend_dir=false
    local has_deployment_dir=false
    local has_deployment_env=false
    local has_backend_env=false
    local has_frontend_env=false
    local has_run_dir=false
    local has_log_dir=false
    local has_backend_socket=false
    local has_frontend_socket=false
    local has_nginx_site_name=false

    env_file_has_key "${DEPLOYMENT_ENV}" "APP_DIR" && has_app_dir=true
    env_file_has_key "${DEPLOYMENT_ENV}" "FRONTEND_DIR" && has_frontend_dir=true
    env_file_has_key "${DEPLOYMENT_ENV}" "BACKEND_DIR" && has_backend_dir=true
    env_file_has_key "${DEPLOYMENT_ENV}" "DEPLOYMENT_DIR" && has_deployment_dir=true
    env_file_has_key "${DEPLOYMENT_ENV}" "DEPLOYMENT_ENV" && has_deployment_env=true
    env_file_has_key "${DEPLOYMENT_ENV}" "BACKEND_ENV" && has_backend_env=true
    env_file_has_key "${DEPLOYMENT_ENV}" "FRONTEND_ENV" && has_frontend_env=true
    env_file_has_key "${DEPLOYMENT_ENV}" "RUN_DIR" && has_run_dir=true
    env_file_has_key "${DEPLOYMENT_ENV}" "LOG_DIR" && has_log_dir=true
    env_file_has_key "${DEPLOYMENT_ENV}" "BACKEND_SOCKET" && has_backend_socket=true
    env_file_has_key "${DEPLOYMENT_ENV}" "FRONTEND_SOCKET" && has_frontend_socket=true
    env_file_has_key "${DEPLOYMENT_ENV}" "NGINX_SITE_NAME" && has_nginx_site_name=true

    for key in \
        PROJECT_DIR APPNAME APP_DIR FRONTEND_DIR BACKEND_DIR DEPLOYMENT_DIR \
        DEPLOYMENT_ENV BACKEND_ENV FRONTEND_ENV RUN_DIR LOG_DIR \
        BACKEND_SOCKET FRONTEND_SOCKET NGINX_SITE_NAME \
        LETSENCRYPT_LIVE_DIR LETSENCRYPT_OPTIONS_CONF LETSENCRYPT_SSL_DHPARAM \
        RM_BIN NODE_BIN \
        NODE_MAJOR SERVICE_USER SERVICE_GROUP GIT_BRANCH \
        BACKEND_APP_MODULE BACKEND_WORKERS DOMAIN SSL_EMAIL \
        POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD
    do
        set_from_env_file "${DEPLOYMENT_ENV}" "${key}"
    done

    [ "${has_app_dir}" = true ] || APP_DIR="${PROJECT_DIR}/${APPNAME}"
    [ "${has_frontend_dir}" = true ] || FRONTEND_DIR="${APP_DIR}/frontend"
    [ "${has_backend_dir}" = true ] || BACKEND_DIR="${APP_DIR}/backend"
    [ "${has_deployment_dir}" = true ] || DEPLOYMENT_DIR="${APP_DIR}/deployment"
    [ "${has_deployment_env}" = true ] || DEPLOYMENT_ENV="${DEPLOYMENT_DIR}/.env"
    [ "${has_backend_env}" = true ] || BACKEND_ENV="${BACKEND_DIR}/.env"
    [ "${has_frontend_env}" = true ] || FRONTEND_ENV="${FRONTEND_DIR}/.env.production"
    [ "${has_run_dir}" = true ] || RUN_DIR="/run/${APPNAME}"
    [ "${has_log_dir}" = true ] || LOG_DIR="/var/log/${APPNAME}"
    [ "${has_backend_socket}" = true ] || BACKEND_SOCKET="${RUN_DIR}/backend.sock"
    [ "${has_frontend_socket}" = true ] || FRONTEND_SOCKET="${RUN_DIR}/frontend.sock"
    [ "${has_nginx_site_name}" = true ] || NGINX_SITE_NAME="${APPNAME}"

    NGINX_SITE_AVAILABLE="${NGINX_SITES_AVAILABLE_DIR}/${NGINX_SITE_NAME}"
    NGINX_SITE_ENABLED="${NGINX_SITES_ENABLED_DIR}/${NGINX_SITE_NAME}"
    SYSTEMD_BACKEND_SERVICE="${SYSTEMD_DIR}/${APPNAME}-backend.service"
    SYSTEMD_FRONTEND_SERVICE="${SYSTEMD_DIR}/${APPNAME}-frontend.service"
    DEPLOYMENT_RUNTIME_DIR="${DEPLOYMENT_DIR}/runtime"
    NEXT_WRAPPER="${DEPLOYMENT_RUNTIME_DIR}/next-server.mjs"
    NGINX_UPSTREAM_PREFIX="$(printf '%s' "${APPNAME}" | tr -c 'A-Za-z0-9_' '_')"
}

validate_env_files() {
    require_file "${BACKEND_ENV}" "Missing backend env file"
    require_file "${FRONTEND_ENV}" "Missing frontend env file"
}

validate_required_env_values() {
    local value

    for value in PROJECT_DIR APPNAME APP_DIR FRONTEND_DIR BACKEND_DIR DEPLOYMENT_DIR DOMAIN SSL_EMAIL SERVICE_USER SERVICE_GROUP NODE_MAJOR BACKEND_APP_MODULE BACKEND_WORKERS; do
        require_non_empty "${value}"
    done

    validate_app_name
    assert_safe_app_dir
    require_directory "${APP_DIR}" "APP_DIR tidak ditemukan"
    require_directory "${FRONTEND_DIR}" "FRONTEND_DIR tidak ditemukan"
    require_directory "${BACKEND_DIR}" "BACKEND_DIR tidak ditemukan"
    require_directory "${DEPLOYMENT_DIR}" "DEPLOYMENT_DIR tidak ditemukan"

    [ -n "$(read_env_var "${BACKEND_ENV}" "DATABASE_URL" || true)" ] || fail "DATABASE_URL wajib di-set di ${BACKEND_ENV}."
    [ -n "$(read_env_var "${BACKEND_ENV}" "SECRET_KEY" || true)" ] || fail "SECRET_KEY wajib di-set di ${BACKEND_ENV}."
    [ -n "$(read_env_var "${BACKEND_ENV}" "APP_ENV" || true)" ] || fail "APP_ENV wajib di-set di ${BACKEND_ENV}."
    [ -n "$(read_env_var "${FRONTEND_ENV}" "NEXT_PUBLIC_API_BASE_URL" || true)" ] || fail "NEXT_PUBLIC_API_BASE_URL wajib di-set di ${FRONTEND_ENV}."
}

install_server_packages() {
    log "Installing server packages"
    apt-get update -y
    apt-get install -y \
        nginx \
        certbot \
        python3-certbot-nginx \
        postgresql \
        postgresql-contrib \
        python3 \
        python3-venv \
        python3-pip \
        curl \
        git \
        build-essential \
        ca-certificates \
        gnupg
}

install_nodejs() {
    if command -v node >/dev/null 2>&1; then
        local major
        NODE_BIN="$(command -v node)"
        major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
        if [ "${major}" -ge "${NODE_MAJOR}" ]; then
            log "Node.js $(node -v) is already installed"
            return
        fi
    fi

    log "Installing Node.js ${NODE_MAJOR}.x"
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
    apt-get install -y nodejs
    NODE_BIN="$(command -v node)"
}

ensure_service_user() {
    if ! getent group "${SERVICE_GROUP}" >/dev/null; then
        log "Creating group ${SERVICE_GROUP}"
        groupadd --system "${SERVICE_GROUP}"
    fi

    if ! id -u "${SERVICE_USER}" >/dev/null 2>&1; then
        log "Creating service user ${SERVICE_USER}"
        useradd --system --home-dir "${APP_DIR}" --shell /usr/sbin/nologin --gid "${SERVICE_GROUP}" "${SERVICE_USER}"
    fi

    if id -u www-data >/dev/null 2>&1; then
        usermod -aG "${SERVICE_GROUP}" www-data || true
    fi
}

create_directories() {
    log "Creating app, runtime, and log directories"
    install -d -m 0755 "${PROJECT_DIR}"
    install -d -m 2775 -o "${SERVICE_USER}" -g "${SERVICE_GROUP}" "${APP_DIR}"
    install -d -m 2775 -o "${SERVICE_USER}" -g "${SERVICE_GROUP}" "${RUN_DIR}"
    install -d -m 2775 -o "${SERVICE_USER}" -g "${SERVICE_GROUP}" "${LOG_DIR}"
    install -d -m 0755 -o "${SERVICE_USER}" -g "${SERVICE_GROUP}" "${DEPLOYMENT_RUNTIME_DIR}"
}

setup_postgresql() {
    log "Enabling PostgreSQL"
    systemctl enable --now postgresql

    if [ -z "${POSTGRES_DB}" ] || [ -z "${POSTGRES_USER}" ]; then
        log "POSTGRES_DB or POSTGRES_USER not set in deployment env; skipping DB/user creation"
        return
    fi

    if [ -z "${POSTGRES_PASSWORD}" ]; then
        warn "POSTGRES_PASSWORD is empty; skipping DB/user creation to avoid unsafe credentials."
        return
    fi

    log "Creating/updating PostgreSQL role and database"
    sudo -u postgres psql -v ON_ERROR_STOP=1 \
        -v db="${POSTGRES_DB}" \
        -v user="${POSTGRES_USER}" \
        -v pass="${POSTGRES_PASSWORD}" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'user', :'pass')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'user')\gexec
SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'user', :'pass')\gexec
SELECT format('CREATE DATABASE %I OWNER %I', :'db', :'user')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'db')\gexec
SELECT format('GRANT ALL PRIVILEGES ON DATABASE %I TO %I', :'db', :'user')\gexec
SQL
}

configure_firewall() {
    if ! command -v ufw >/dev/null 2>&1; then
        log "ufw is not installed; skipping firewall setup"
        return
    fi

    log "Allowing OpenSSH and Nginx Full in ufw"
    ufw allow OpenSSH >/dev/null || true
    ufw allow 'Nginx Full' >/dev/null || true
}

backup_file_if_changed() {
    local target="$1"
    local candidate="$2"

    if [ -f "${target}" ] && ! cmp -s "${target}" "${candidate}"; then
        local backup="${target}.bak.$(date '+%Y%m%d%H%M%S')"
        log "Backing up ${target} to ${backup}"
        cp -a "${target}" "${backup}"
    fi
}

write_next_wrapper() {
    log "Writing Next.js Unix-socket wrapper"
    install -d -m 0755 -o "${SERVICE_USER}" -g "${SERVICE_GROUP}" "${DEPLOYMENT_RUNTIME_DIR}"
    cat > "${NEXT_WRAPPER}" <<'WRAPPER'
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
    chown "${SERVICE_USER}:${SERVICE_GROUP}" "${NEXT_WRAPPER}"
    chmod 0644 "${NEXT_WRAPPER}"
}

write_systemd_services() {
    local backend_tmp frontend_tmp
    backend_tmp="$(mktemp)"
    frontend_tmp="$(mktemp)"

    log "Writing systemd services"
    cat > "${backend_tmp}" <<BACKEND_SERVICE
[Unit]
Description=${APPNAME} FastAPI backend
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=${SERVICE_USER}
Group=${SERVICE_GROUP}
WorkingDirectory=${BACKEND_DIR}
Environment=PYTHONUNBUFFERED=1
EnvironmentFile=${BACKEND_ENV}
RuntimeDirectory=${APPNAME}
RuntimeDirectoryMode=2775
UMask=0007
ExecStartPre=${RM_BIN} -f ${BACKEND_SOCKET}
ExecStart=${BACKEND_DIR}/.venv/bin/gunicorn ${BACKEND_APP_MODULE} -k uvicorn.workers.UvicornWorker --bind unix:${BACKEND_SOCKET} --workers ${BACKEND_WORKERS} --umask 007 --access-logfile - --error-logfile -
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
BACKEND_SERVICE

    cat > "${frontend_tmp}" <<FRONTEND_SERVICE
[Unit]
Description=${APPNAME} Next.js frontend
After=network.target

[Service]
Type=simple
User=${SERVICE_USER}
Group=${SERVICE_GROUP}
WorkingDirectory=${FRONTEND_DIR}
Environment=NODE_ENV=production
Environment=NEXT_PROJECT_DIR=${FRONTEND_DIR}
Environment=NEXT_SOCKET_PATH=${FRONTEND_SOCKET}
EnvironmentFile=${FRONTEND_ENV}
RuntimeDirectory=${APPNAME}
RuntimeDirectoryMode=2775
UMask=0007
ExecStart=${NODE_BIN} ${NEXT_WRAPPER}
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
FRONTEND_SERVICE

    backup_file_if_changed "${SYSTEMD_BACKEND_SERVICE}" "${backend_tmp}"
    backup_file_if_changed "${SYSTEMD_FRONTEND_SERVICE}" "${frontend_tmp}"
    install -m 0644 "${backend_tmp}" "${SYSTEMD_BACKEND_SERVICE}"
    install -m 0644 "${frontend_tmp}" "${SYSTEMD_FRONTEND_SERVICE}"
    rm -f "${backend_tmp}" "${frontend_tmp}"
    systemctl daemon-reload
}

write_nginx_config() {
    local tmp
    local ssl_cert
    local ssl_key
    tmp="$(mktemp)"
    ssl_cert="${LETSENCRYPT_LIVE_DIR}/${DOMAIN}/fullchain.pem"
    ssl_key="${LETSENCRYPT_LIVE_DIR}/${DOMAIN}/privkey.pem"

    log "Writing Nginx reverse proxy config"
    if [ -f "${ssl_cert}" ]; then
        require_file "${ssl_key}" "SSL private key tidak ditemukan"
        require_file "${LETSENCRYPT_OPTIONS_CONF}" "Certbot Nginx SSL options tidak ditemukan"
        require_file "${LETSENCRYPT_SSL_DHPARAM}" "Certbot SSL dhparam tidak ditemukan"

        cat > "${tmp}" <<NGINX
# Managed by deployment/scripts/setup.sh.
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
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate ${ssl_cert};
    ssl_certificate_key ${ssl_key};
    include ${LETSENCRYPT_OPTIONS_CONF};
    ssl_dhparam ${LETSENCRYPT_SSL_DHPARAM};

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
    else
        cat > "${tmp}" <<NGINX
# Managed by deployment/scripts/setup.sh.
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
    fi

    backup_file_if_changed "${NGINX_SITE_AVAILABLE}" "${tmp}"
    install -m 0644 "${tmp}" "${NGINX_SITE_AVAILABLE}"
    rm -f "${tmp}"

    ln -sfn "${NGINX_SITE_AVAILABLE}" "${NGINX_SITE_ENABLED}"
    rm -f "${NGINX_DEFAULT_SITE}"
    nginx -t
    systemctl enable --now nginx
    systemctl reload nginx
}

setup_ssl() {
    if [ -f "${LETSENCRYPT_LIVE_DIR}/${DOMAIN}/fullchain.pem" ]; then
        log "SSL certificate for ${DOMAIN} already exists"
        return
    fi

    log "Requesting Let's Encrypt certificate for ${DOMAIN}"
    if ! certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${SSL_EMAIL}" --redirect; then
        warn "Certbot gagal. Periksa DNS, firewall, dan akses HTTP publik lalu jalankan ulang script ini."
        return
    fi

    nginx -t
    systemctl reload nginx
}

main() {
    require_root
    load_deployment_env
    validate_env_files
    validate_required_env_values
    install_server_packages
    require_command curl
    require_command git
    install_nodejs
    ensure_service_user
    create_directories
    setup_postgresql
    configure_firewall
    write_next_wrapper
    write_systemd_services
    write_nginx_config
    setup_ssl

    log "Setup completed"
    log "App directory: ${APP_DIR}"
    log "Runtime directory: ${RUN_DIR}"
    log "Nginx site: ${NGINX_SITE_AVAILABLE}"
}

main "$@"
