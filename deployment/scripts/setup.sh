#!/usr/bin/env bash
# Idempotent VPS bootstrap script for Ubuntu.
# It installs the required runtime packages, prepares /var/www/app,
# configures systemd + Nginx, and optionally provisions SSL with Certbot.

set -Eeuo pipefail

APP_DIR="/var/www/app"
CERTBOT_WEBROOT="/var/www/certbot"
NGINX_SITE_NAME="app.conf"
FASTAPI_SERVICE_NAME="fastapi"
NODE_MAJOR="${NODE_MAJOR:-20}"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYMENT_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
SOURCE_NGINX_CONF="${DEPLOYMENT_DIR}/nginx/app.conf"
SOURCE_SYSTEMD_SERVICE="${DEPLOYMENT_DIR}/systemd/fastapi.service"

APP_OWNER="${APP_OWNER:-${SUDO_USER:-$USER}}"
APP_GROUP="${APP_GROUP:-www-data}"
ENV_FILE="${ENV_FILE:-${APP_DIR}/backend/.env}"

log() {
    printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

require_root() {
    if [ "${EUID}" -ne 0 ]; then
        echo "Please run this script with sudo or as root." >&2
        exit 1
    fi
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

load_env_file() {
    # Load deployment values from the backend .env file when available.
    if [ -f "${ENV_FILE}" ]; then
        log "Loading environment values from ${ENV_FILE}"
        set -a
        # shellcheck disable=SC1090
        . "${ENV_FILE}"
        set +a
    fi

    DOMAIN="${DOMAIN:-}"
    SSL_EMAIL="${SSL_EMAIL:-}"

    # Allow the caller to disable the www alias by explicitly exporting WWW_DOMAIN="".
    if [ -n "${DOMAIN}" ] && [ -z "${WWW_DOMAIN+x}" ]; then
        WWW_DOMAIN="www.${DOMAIN}"
    fi
    WWW_DOMAIN="${WWW_DOMAIN:-}"
}

install_apt_packages() {
    log "Installing Ubuntu packages"
    apt-get update -y
    apt-get install -y \
        build-essential \
        ca-certificates \
        certbot \
        curl \
        git \
        gnupg \
        libpq-dev \
        nginx \
        postgresql \
        postgresql-contrib \
        python3 \
        python3-dev \
        python3-pip \
        python3-venv \
        python3-certbot-nginx \
        software-properties-common
}

install_nodejs() {
    # Install Node.js LTS from NodeSource when the expected major version is missing.
    if command_exists node && node -v | grep -Eq "^v${NODE_MAJOR}\."; then
        log "Node.js $(node -v) is already installed"
        return
    fi

    log "Installing Node.js ${NODE_MAJOR}.x"
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
    apt-get install -y nodejs
}

install_pm2() {
    log "Installing or updating PM2"
    npm install -g pm2@latest
}

create_project_directories() {
    log "Creating application directories"
    install -d -m 0755 /var/www
    install -d -m 0755 "${CERTBOT_WEBROOT}"
    install -d -m 2775 -o "${APP_OWNER}" -g "${APP_GROUP}" "${APP_DIR}"
    install -d -m 2775 -o "${APP_OWNER}" -g "${APP_GROUP}" "${APP_DIR}/shared"
    install -d -m 2775 -o "${APP_OWNER}" -g "${APP_GROUP}" "${APP_DIR}/shared/logs"
}

install_systemd_service() {
    if [ ! -f "${SOURCE_SYSTEMD_SERVICE}" ]; then
        log "Skipping systemd service install because ${SOURCE_SYSTEMD_SERVICE} was not found"
        return
    fi

    log "Installing systemd service"
    install -m 0644 "${SOURCE_SYSTEMD_SERVICE}" "/etc/systemd/system/${FASTAPI_SERVICE_NAME}.service"
    systemctl daemon-reload
    systemctl enable "${FASTAPI_SERVICE_NAME}.service" >/dev/null 2>&1 || true
}

render_nginx_template() {
    local target_file="$1"
    local effective_domain="${DOMAIN:-example.com}"

    # The repository template uses example.com placeholders on purpose.
    sed "s/example\\.com/${effective_domain//\//\\/}/g" "${SOURCE_NGINX_CONF}" > "${target_file}"
}

write_bootstrap_nginx_config() {
    # Use a temporary HTTP-only config until the certificate exists.
    local effective_domain="${DOMAIN:-example.com}"
    local effective_www_domain="${WWW_DOMAIN:-www.example.com}"

    cat > "/etc/nginx/sites-available/${NGINX_SITE_NAME}" <<EOF
# Temporary HTTP-only Nginx config used before Let's Encrypt certificates are present.
map \$http_upgrade \$connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    listen [::]:80;
    server_name ${effective_domain} ${effective_www_domain};

    location ^~ /.well-known/acme-challenge/ {
        root ${CERTBOT_WEBROOT};
        default_type "text/plain";
        try_files \$uri =404;
    }

    location = /api {
        proxy_pass http://127.0.0.1:8000/api;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
}

enable_nginx_site() {
    log "Enabling Nginx site"
    ln -sfn "/etc/nginx/sites-available/${NGINX_SITE_NAME}" "/etc/nginx/sites-enabled/${NGINX_SITE_NAME}"
    rm -f /etc/nginx/sites-enabled/default
}

reload_nginx() {
    log "Reloading Nginx"
    nginx -t
    systemctl enable --now nginx
    systemctl reload nginx
}

obtain_ssl_certificate() {
    if [ -z "${DOMAIN:-}" ] || [ -z "${SSL_EMAIL:-}" ]; then
        log "DOMAIN or SSL_EMAIL is not set; skipping automatic SSL provisioning"
        return
    fi

    if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" ]; then
        log "Existing certificate found for ${DOMAIN}"
        return
    fi

    log "Requesting Let's Encrypt certificate for ${DOMAIN}"

    local certbot_args=(
        certonly
        --webroot
        --webroot-path "${CERTBOT_WEBROOT}"
        --non-interactive
        --agree-tos
        --keep-until-expiring
        --email "${SSL_EMAIL}"
        -d "${DOMAIN}"
    )

    if [ -n "${WWW_DOMAIN:-}" ]; then
        certbot_args+=(-d "${WWW_DOMAIN}")
    fi

    certbot "${certbot_args[@]}"
}

install_final_nginx_config() {
    if [ ! -f "${SOURCE_NGINX_CONF}" ]; then
        log "Skipping final HTTPS config because ${SOURCE_NGINX_CONF} was not found"
        return
    fi

    if [ -z "${DOMAIN:-}" ]; then
        log "DOMAIN is not set; leaving the bootstrap Nginx config in place"
        return
    fi

    if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
        log "Certificate for ${DOMAIN} is not present yet; leaving the bootstrap Nginx config in place"
        return
    fi

    log "Installing final HTTPS Nginx config"
    local rendered_file
    rendered_file="$(mktemp)"
    render_nginx_template "${rendered_file}"
    install -m 0644 "${rendered_file}" "/etc/nginx/sites-available/${NGINX_SITE_NAME}"
    rm -f "${rendered_file}"
}

enable_base_services() {
    log "Ensuring PostgreSQL and Nginx are enabled"
    systemctl enable --now postgresql
    systemctl enable --now nginx
}

configure_pm2_startup() {
    if ! command_exists pm2; then
        return
    fi

    local user_home
    user_home="$(getent passwd "${APP_OWNER}" | cut -d: -f6)"

    if [ -n "${user_home}" ]; then
        log "Configuring PM2 startup for ${APP_OWNER}"
        env PATH="${PATH}" pm2 startup systemd -u "${APP_OWNER}" --hp "${user_home}" >/dev/null 2>&1 || true
    fi
}

main() {
    require_root
    load_env_file
    install_apt_packages
    install_nodejs
    install_pm2
    create_project_directories
    install_systemd_service
    enable_base_services
    write_bootstrap_nginx_config
    enable_nginx_site
    reload_nginx
    obtain_ssl_certificate
    install_final_nginx_config
    reload_nginx
    configure_pm2_startup

    log "Setup completed"
    log "Application directory: ${APP_DIR}"
    log "Nginx site: /etc/nginx/sites-available/${NGINX_SITE_NAME}"
    log "Systemd service: /etc/systemd/system/${FASTAPI_SERVICE_NAME}.service"
}

main "$@"
