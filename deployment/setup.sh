#!/usr/bin/env bash

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${DEPLOYMENT_ENV:-${SCRIPT_DIR}/.env}"
ENV_EXAMPLE="${SCRIPT_DIR}/env.example"

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
BACKEND_PORT_START="8000"
FRONTEND_PORT_START="3000"
BACKEND_APP_MODULE="main:app"
BACKEND_WORKERS="1"
APP_OWNER="deploy"
APP_GROUP="deploy"
DATABASE_HOST="127.0.0.1"
DATABASE_PORT="5432"
DATABASE_NAME="sibooking_db"
DATABASE_USER="sibooking_user"
DATABASE_PASSWORD=""
CLIENT_MAX_BODY_SIZE="20M"
NODE_MAJOR="22"

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
    [ "${EUID}" -eq 0 ] || fail "Jalankan setup.sh dengan sudo atau sebagai root."
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
    if [ ! -f "${ENV_FILE}" ]; then
        [ -f "${ENV_EXAMPLE}" ] || fail "File contoh env tidak ditemukan: ${ENV_EXAMPLE}"
        install -m 0600 "${ENV_EXAMPLE}" "${ENV_FILE}"
        fail "File ${ENV_FILE} sudah dibuat dari env.example. Isi DOMAIN, SSL_EMAIL, dan DATABASE_PASSWORD lalu jalankan setup.sh lagi."
    fi

    local key
    for key in APP_NAME DOMAIN SSL_EMAIL GIT_BRANCH PROJECT_ROOT PROJECT_DIR FRONTEND_DIR BACKEND_DIR DEPLOYMENT_DIR BACKEND_ENV FRONTEND_ENV BACKEND_PORT FRONTEND_PORT BACKEND_PORT_START FRONTEND_PORT_START BACKEND_APP_MODULE BACKEND_WORKERS APP_OWNER APP_GROUP DATABASE_HOST DATABASE_PORT DATABASE_NAME DATABASE_USER DATABASE_PASSWORD CLIENT_MAX_BODY_SIZE NODE_MAJOR; do
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
    [ -n "${value}" ] || fail "${name} wajib diisi di ${ENV_FILE}."
}

validate_config() {
    derive_paths
    require_non_empty APP_NAME
    require_non_empty DOMAIN
    require_non_empty SSL_EMAIL
    require_non_empty PROJECT_ROOT
    require_non_empty PROJECT_DIR
    require_non_empty DATABASE_NAME
    require_non_empty DATABASE_USER
    require_non_empty DATABASE_PASSWORD
    require_non_empty APP_OWNER
    require_non_empty APP_GROUP

    case "${PROJECT_DIR}" in
        /|/var|/var/|/var/www|/var/www/)
            fail "PROJECT_DIR tidak aman: ${PROJECT_DIR}"
            ;;
    esac
    [[ "${PROJECT_DIR}" == "${PROJECT_ROOT}/"* ]] || fail "PROJECT_DIR harus berada di dalam PROJECT_ROOT (${PROJECT_ROOT})."
}

require_command() {
    command -v "$1" >/dev/null 2>&1 || fail "Command wajib belum tersedia: $1"
}

install_packages() {
    log "Update package Ubuntu dan install dependency server"
    apt-get update -y
    DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
        ca-certificates \
        curl \
        gettext-base \
        git \
        gnupg \
        nginx \
        certbot \
        python3-certbot-nginx \
        postgresql \
        postgresql-contrib \
        python3 \
        python3-pip \
        python3-venv \
        ufw
}

install_nodejs() {
    if command -v node >/dev/null 2>&1; then
        local current_major
        current_major="$(node -v | sed -E 's/^v([0-9]+).*/\1/')"
        if [ "${current_major}" -ge "${NODE_MAJOR}" ]; then
            ok "Node.js v${current_major} sudah memenuhi kebutuhan"
            command -v npm >/dev/null 2>&1 || DEBIAN_FRONTEND=noninteractive apt-get install -y npm
            return
        fi
    fi

    log "Install Node.js ${NODE_MAJOR}.x dari NodeSource"
    install -d -m 0755 /etc/apt/keyrings
    rm -f /etc/apt/keyrings/nodesource.gpg
    curl -fsSL "https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key" | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
    printf 'deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_%s.x nodistro main\n' "${NODE_MAJOR}" > /etc/apt/sources.list.d/nodesource.list
    apt-get update -y
    DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
}

ensure_app_user() {
    log "Menyiapkan user aplikasi ${APP_OWNER}"
    if ! id -u "${APP_OWNER}" >/dev/null 2>&1; then
        useradd --create-home --shell /bin/bash "${APP_OWNER}"
    fi
    if ! getent group "${APP_GROUP}" >/dev/null 2>&1; then
        groupadd "${APP_GROUP}"
    fi
    usermod -aG "${APP_GROUP}" "${APP_OWNER}" || true
}

create_directories() {
    log "Menyiapkan struktur folder ${PROJECT_DIR}"
    install -d -m 0755 "${PROJECT_ROOT}"
    install -d -m 0755 "${PROJECT_DIR}"
    install -d -m 0755 "${DEPLOYMENT_DIR}"
    install -d -m 0755 /var/www/certbot
    chown -R "${APP_OWNER}:${APP_GROUP}" "${PROJECT_DIR}"
    chmod 0600 "${ENV_FILE}"
}

port_in_use() {
    local port="$1"
    python3 - "${port}" <<'PY'
import socket
import sys

port = int(sys.argv[1])
with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
    sock.settimeout(0.2)
    sys.exit(0 if sock.connect_ex(("127.0.0.1", port)) == 0 else 1)
PY
}

find_free_port() {
    local start="$1"
    local port="${start}"
    while [ "${port}" -le 65535 ]; do
        if ! port_in_use "${port}"; then
            printf '%s' "${port}"
            return 0
        fi
        port=$((port + 1))
    done
    return 1
}

select_ports() {
    log "Menentukan port internal backend dan frontend"
    if [ -z "${BACKEND_PORT}" ]; then
        BACKEND_PORT="$(find_free_port "${BACKEND_PORT_START}")" || fail "Tidak ada port backend kosong mulai dari ${BACKEND_PORT_START}."
        set_env_value "${ENV_FILE}" BACKEND_PORT "${BACKEND_PORT}"
    elif port_in_use "${BACKEND_PORT}" && ! systemctl is-active --quiet "${APP_NAME}-backend.service"; then
        warn "BACKEND_PORT ${BACKEND_PORT} sedang digunakan; mencari port kosong berikutnya."
        BACKEND_PORT="$(find_free_port "${BACKEND_PORT}")" || fail "Tidak ada port backend kosong."
        set_env_value "${ENV_FILE}" BACKEND_PORT "${BACKEND_PORT}"
    fi

    if [ -z "${FRONTEND_PORT}" ]; then
        FRONTEND_PORT="$(find_free_port "${FRONTEND_PORT_START}")" || fail "Tidak ada port frontend kosong mulai dari ${FRONTEND_PORT_START}."
        set_env_value "${ENV_FILE}" FRONTEND_PORT "${FRONTEND_PORT}"
    elif port_in_use "${FRONTEND_PORT}" && ! systemctl is-active --quiet "${APP_NAME}-frontend.service"; then
        warn "FRONTEND_PORT ${FRONTEND_PORT} sedang digunakan; mencari port kosong berikutnya."
        FRONTEND_PORT="$(find_free_port "${FRONTEND_PORT}")" || fail "Tidak ada port frontend kosong."
        set_env_value "${ENV_FILE}" FRONTEND_PORT "${FRONTEND_PORT}"
    fi

    ok "Backend port: ${BACKEND_PORT}; frontend port: ${FRONTEND_PORT}"
}

configure_postgresql() {
    log "Menyiapkan PostgreSQL database dan user"
    systemctl enable --now postgresql
    sudo -u postgres psql -v ON_ERROR_STOP=1 \
        -v db_name="${DATABASE_NAME}" \
        -v db_user="${DATABASE_USER}" \
        -v db_password="${DATABASE_PASSWORD}" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'db_user', :'db_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'db_user')\gexec

SELECT format('CREATE DATABASE %I OWNER %I', :'db_name', :'db_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'db_name')\gexec

SELECT format('GRANT ALL PRIVILEGES ON DATABASE %I TO %I', :'db_name', :'db_user')\gexec
SQL
}

configure_firewall() {
    log "Menyiapkan firewall UFW"
    ufw allow OpenSSH >/dev/null || true
    ufw allow 'Nginx HTTP' >/dev/null || true
    ufw allow 'Nginx HTTPS' >/dev/null || true
    if ufw status | grep -q inactive; then
        ufw --force enable >/dev/null || true
    fi
}

render_nginx() {
    local mode="$1"
    local target="/etc/nginx/sites-available/${APP_NAME}"
    local tmp
    tmp="$(mktemp)"

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
    envsubst '${HTTP_SERVER_BLOCK} ${HTTPS_SERVER_BLOCK}' < "${SCRIPT_DIR}/nginx.conf.template" > "${tmp}"
    install -m 0644 "${tmp}" "${target}"
    rm -f "${tmp}"
    ln -sfn "${target}" "/etc/nginx/sites-enabled/${APP_NAME}"
    rm -f /etc/nginx/sites-enabled/default
    nginx -t
    systemctl enable --now nginx
    systemctl reload nginx
}

setup_ssl() {
    log "Menyiapkan SSL Let's Encrypt untuk ${DOMAIN}"
    if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
        ok "SSL untuk ${DOMAIN} sudah ada"
        render_nginx https
    else
        render_nginx http
        certbot certonly --webroot \
            --webroot-path /var/www/certbot \
            --domain "${DOMAIN}" \
            --email "${SSL_EMAIL}" \
            --agree-tos \
            --non-interactive
        render_nginx https
    fi
    systemctl enable --now certbot.timer >/dev/null 2>&1 || true
}

main() {
    require_root
    load_env
    validate_config
    install_packages
    install_nodejs
    require_command python3
    require_command pip3
    require_command node
    require_command npm
    require_command psql
    require_command nginx
    require_command certbot
    ensure_app_user
    create_directories
    select_ports
    configure_postgresql
    configure_firewall
    setup_ssl

    ok "Setup server selesai untuk ${DOMAIN}"
    printf "Project dir: %s\n" "${PROJECT_DIR}"
    printf "Deploy command: sudo bash %s/deploy.sh\n" "${DEPLOYMENT_DIR}"
}

main "$@"
