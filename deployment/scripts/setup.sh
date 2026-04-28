#!/usr/bin/env bash
# Idempotent VPS bootstrap for production deployment.
# Installs server dependencies, prepares Unix-socket runtime directories,
# configures Nginx, PostgreSQL, firewall rules, and optional Let's Encrypt SSL.

set -euo pipefail

APP_NAME="${APP_NAME:-impal}"
PROJECT_DIR="${PROJECT_DIR:-/var/www/app}"
FRONTEND_DIR="${FRONTEND_DIR:-frontend}"
BACKEND_DIR="${BACKEND_DIR:-backend}"
NODE_MAJOR="${NODE_MAJOR:-20}"
SERVICE_USER="${SERVICE_USER:-impal}"
SERVICE_GROUP="${SERVICE_GROUP:-www-data}"
RUN_DIR="${RUN_DIR:-}"
LOG_DIR="${LOG_DIR:-}"
NGINX_SITE_NAME="${NGINX_SITE_NAME:-}"
DOMAIN="${DOMAIN:-}"
CERTBOT_EMAIL="${EMAIL:-${SSL_EMAIL:-}}"
BACKEND_SOCKET="${BACKEND_SOCKET:-}"
FRONTEND_SOCKET="${FRONTEND_SOCKET:-}"

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

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

require_root() {
    [ "${EUID}" -eq 0 ] || fail "Jalankan setup.sh dengan sudo atau sebagai root."
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
    NGINX_SITE_NAME="${NGINX_SITE_NAME:-${APP_NAME}}"
    NGINX_UPSTREAM_PREFIX="$(printf '%s' "${APP_NAME}" | tr -c 'A-Za-z0-9_' '_')"
    NGINX_SITE_AVAILABLE="/etc/nginx/sites-available/${NGINX_SITE_NAME}"
    NGINX_SITE_ENABLED="/etc/nginx/sites-enabled/${NGINX_SITE_NAME}"
    BACKEND_SOCKET="${BACKEND_SOCKET:-${RUN_DIR}/backend.sock}"
    FRONTEND_SOCKET="${FRONTEND_SOCKET:-${RUN_DIR}/frontend.sock}"
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
        fi
    done

    refresh_derived_paths
}

validate_config() {
    [ -n "${APP_NAME}" ] || fail "APP_NAME kosong."
    [[ "${APP_NAME}" =~ ^[A-Za-z0-9_.@-]+$ ]] || fail "APP_NAME hanya boleh berisi huruf, angka, titik, underscore, @, dan tanda minus."
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
    if command_exists node; then
        local major
        major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
        if [ "${major}" -ge "${NODE_MAJOR}" ]; then
            log "Node.js $(node -v) is already installed"
            return
        fi
    fi

    log "Installing Node.js ${NODE_MAJOR}.x"
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
    apt-get install -y nodejs
}

ensure_service_user() {
    if ! getent group "${SERVICE_GROUP}" >/dev/null; then
        log "Creating group ${SERVICE_GROUP}"
        groupadd --system "${SERVICE_GROUP}"
    fi

    if ! id -u "${SERVICE_USER}" >/dev/null 2>&1; then
        log "Creating service user ${SERVICE_USER}"
        useradd --system --home-dir "${PROJECT_DIR}" --shell /usr/sbin/nologin --gid "${SERVICE_GROUP}" "${SERVICE_USER}"
    fi

    # Nginx must be able to read sockets owned by SERVICE_GROUP.
    if id -u www-data >/dev/null 2>&1; then
        usermod -aG "${SERVICE_GROUP}" www-data || true
    fi
}

create_directories() {
    log "Creating project, runtime, and log directories"
    install -d -m 0755 /var/www
    install -d -m 2775 -o "${SERVICE_USER}" -g "${SERVICE_GROUP}" "${PROJECT_DIR}"
    install -d -m 2775 -o "${SERVICE_USER}" -g "${SERVICE_GROUP}" "${RUN_DIR}"
    install -d -m 2775 -o "${SERVICE_USER}" -g "${SERVICE_GROUP}" "${LOG_DIR}"
}

setup_postgresql() {
    log "Enabling PostgreSQL"
    systemctl enable --now postgresql

    # Optional idempotent bootstrap. Keep credentials in env files, not here.
    if [ -z "${POSTGRES_DB:-}" ] || [ -z "${POSTGRES_USER:-}" ]; then
        log "POSTGRES_DB or POSTGRES_USER not set; skipping DB/user creation"
        return
    fi

    [ -n "${POSTGRES_PASSWORD:-}" ] || {
        warn "POSTGRES_PASSWORD is empty; skipping DB/user creation to avoid unsafe credentials."
        return
    }

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
    if ! command_exists ufw; then
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

write_nginx_config() {
    local tmp
    tmp="$(mktemp)"

    if [ -z "${DOMAIN}" ]; then
        warn "DOMAIN belum di-set; Nginx memakai server_name '_' sementara."
    fi

    log "Writing Nginx config for Unix-socket upstreams"
    cat > "${tmp}" <<NGINX
# Managed by deployment scripts.
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
    server_name ${DOMAIN:-_};

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
    install -m 0644 "${tmp}" "${NGINX_SITE_AVAILABLE}"
    rm -f "${tmp}"

    ln -sfn "${NGINX_SITE_AVAILABLE}" "${NGINX_SITE_ENABLED}"
    rm -f /etc/nginx/sites-enabled/default
    nginx -t
    systemctl enable --now nginx
    systemctl reload nginx
}

setup_ssl() {
    if [ -z "${DOMAIN}" ] || [ -z "${CERTBOT_EMAIL}" ]; then
        log "DOMAIN or EMAIL/SSL_EMAIL not set; skipping Certbot SSL setup"
        return
    fi

    if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
        log "SSL certificate for ${DOMAIN} already exists"
        return
    fi

    log "Requesting Let's Encrypt certificate for ${DOMAIN}"
    if ! certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${CERTBOT_EMAIL}" --redirect; then
        warn "Certbot gagal. Periksa DNS, firewall, dan akses HTTP publik lalu jalankan ulang script ini."
        return
    fi

    nginx -t
    systemctl reload nginx
}

main() {
    require_root
    load_env_files
    validate_config
    install_server_packages
    install_nodejs
    ensure_service_user
    create_directories
    setup_postgresql
    configure_firewall
    systemctl enable --now nginx postgresql
    write_nginx_config
    setup_ssl

    log "Setup completed"
    log "Project directory: ${PROJECT_DIR}"
    log "Runtime directory: ${RUN_DIR}"
    log "Nginx site: ${NGINX_SITE_AVAILABLE}"
}

main "$@"
