#!/usr/bin/env bash
# Production deployment for the sibooking app.

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

SYSTEMD_DIR="${SYSTEMD_DIR:-/etc/systemd/system}"
SYSTEMD_BACKEND_SERVICE="${SYSTEMD_BACKEND_SERVICE:-${SYSTEMD_DIR}/${APPNAME}-backend.service}"
SYSTEMD_FRONTEND_SERVICE="${SYSTEMD_FRONTEND_SERVICE:-${SYSTEMD_DIR}/${APPNAME}-frontend.service}"

NODE_MAJOR="${NODE_MAJOR:-20}"
SERVICE_USER="${SERVICE_USER:-${APPNAME}}"
SERVICE_GROUP="${SERVICE_GROUP:-www-data}"
GIT_BRANCH="${GIT_BRANCH:-main}"
BACKEND_APP_MODULE="${BACKEND_APP_MODULE:-main:app}"
BACKEND_WORKERS="${BACKEND_WORKERS:-2}"
DOMAIN="${DOMAIN:-}"
SSL_EMAIL="${SSL_EMAIL:-}"

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
        NODE_MAJOR SERVICE_USER SERVICE_GROUP GIT_BRANCH \
        BACKEND_APP_MODULE BACKEND_WORKERS DOMAIN SSL_EMAIL
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

ensure_runtime_dirs() {
    log "Preparing runtime and log directories"
    "${SUDO[@]}" install -d -m 2775 -o "${SERVICE_USER}" -g "${SERVICE_GROUP}" "${RUN_DIR}" "${LOG_DIR}"
}

update_repository() {
    log "Updating repository ${APP_DIR} from ${GIT_BRANCH}"
    require_directory "${APP_DIR}" "APP_DIR tidak ditemukan"

    if [ -d "${APP_DIR}/.git" ]; then
        git -C "${APP_DIR}" fetch origin "${GIT_BRANCH}" --prune
        git -C "${APP_DIR}" checkout "${GIT_BRANCH}"
        git -C "${APP_DIR}" pull --ff-only origin "${GIT_BRANCH}"
    else
        warn "${APP_DIR} is not a git repository; skipping git pull."
    fi
}

install_backend() {
    log "Installing backend dependencies in ${BACKEND_DIR}"
    require_file "${BACKEND_DIR}/requirements.txt" "Backend requirements file tidak ditemukan"

    cd "${BACKEND_DIR}"
    python3 -m venv .venv
    # shellcheck disable=SC1091
    . .venv/bin/activate
    python -m pip install --upgrade pip
    pip install -r requirements.txt
    pip install gunicorn uvicorn
    deactivate
}

run_migrations() {
    if [ ! -f "${BACKEND_DIR}/alembic.ini" ]; then
        log "No Alembic config found; skipping database migrations"
        return
    fi

    log "Running Alembic migrations"
    cd "${BACKEND_DIR}"
    # shellcheck disable=SC1091
    . .venv/bin/activate
    alembic upgrade head
    deactivate
}

build_frontend() {
    log "Building Next.js frontend in ${FRONTEND_DIR}"
    require_file "${FRONTEND_DIR}/package.json" "Frontend package.json tidak ditemukan"

    cd "${FRONTEND_DIR}"
    npm ci
    npm run build
}

restart_services() {
    local backend_unit frontend_unit
    backend_unit="$(basename "${SYSTEMD_BACKEND_SERVICE}")"
    frontend_unit="$(basename "${SYSTEMD_FRONTEND_SERVICE}")"

    log "Restarting application services"
    "${SUDO[@]}" systemctl daemon-reload
    "${SUDO[@]}" systemctl restart "${backend_unit}"
    "${SUDO[@]}" systemctl restart "${frontend_unit}"
}

reload_nginx() {
    log "Testing and reloading Nginx"
    "${SUDO[@]}" nginx -t
    "${SUDO[@]}" systemctl reload nginx
}

main() {
    load_deployment_env
    validate_env_files
    validate_required_env_values
    require_command git
    require_command python3
    require_command npm
    ensure_runtime_dirs
    update_repository
    load_deployment_env
    validate_env_files
    validate_required_env_values
    install_backend
    run_migrations
    build_frontend
    restart_services
    reload_nginx

    log "Deployment completed successfully"
    log "Frontend socket: ${FRONTEND_SOCKET}"
    log "Backend socket: ${BACKEND_SOCKET}"
}

main "$@"
