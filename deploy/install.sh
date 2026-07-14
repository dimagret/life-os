#!/bin/bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

APP_NAME="${APP_NAME:-life-os}"
APP_DIR="${APP_DIR:-/var/www/${APP_NAME}}"
NGINX_CONF="/etc/nginx/sites-available/${APP_NAME}"
ACCESS_SNIPPET="/etc/nginx/snippets/${APP_NAME}-access.conf"
ENV_FILE="${APP_DIR}/.env.local"
DOMAIN=""
SKIP_BUILD=0
SKIP_CERTBOT=0
NO_START=0

usage() {
  echo "Usage: sudo ./deploy/install.sh domain.com [--skip-build] [--skip-certbot] [--no-start]"
}

if [ "$#" -lt 1 ]; then
  usage
  exit 1
fi

DOMAIN="$1"
shift

while [ "$#" -gt 0 ]; do
  case "$1" in
    --skip-build) SKIP_BUILD=1 ;;
    --skip-certbot) SKIP_CERTBOT=1 ;;
    --no-start) NO_START=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo -e "${RED}Unknown option: $1${NC}"; usage; exit 1 ;;
  esac
  shift
done

DOMAIN="${DOMAIN#http://}"
DOMAIN="${DOMAIN#https://}"
DOMAIN="${DOMAIN%%/*}"
WWW_DOMAIN="${WWW_DOMAIN:-www.${DOMAIN}}"

if [ -z "${DOMAIN}" ] || [ "${DOMAIN}" = "your-domain.com" ]; then
  echo -e "${RED}A real domain is required.${NC}"
  usage
  exit 1
fi

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root (use sudo).${NC}"
  exit 1
fi

echo -e "${GREEN}=== Life OS VPS install: ${DOMAIN} ===${NC}"

ensure_env_line() {
  local key="$1"
  local value="$2"
  local current=""

  if [ -f "${ENV_FILE}" ] && grep -q "^${key}=" "${ENV_FILE}"; then
    current="$(grep "^${key}=" "${ENV_FILE}" | tail -n 1 | cut -d= -f2-)"
    if [ -z "${current}" ] || echo "${current}" | grep -Eiq 'your-|example|localhost|127\.0\.0\.1'; then
      sed -i "s#^${key}=.*#${key}=${value}#" "${ENV_FILE}"
    fi
  else
    echo "${key}=${value}" >> "${ENV_FILE}"
  fi
}

write_http_nginx_config() {
  cat > "${NGINX_CONF}" << EOF
server {
    listen 80;
    server_name ${DOMAIN} ${WWW_DOMAIN};
    server_tokens off;
    client_max_body_size 1m;

    location /health {
        access_log off;
        add_header Content-Type text/plain;
        return 200 "healthy\n";
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Port \$server_port;
        proxy_redirect https://${DOMAIN}:3000/ https://${DOMAIN}/;
        proxy_redirect https://${WWW_DOMAIN}:3000/ https://${WWW_DOMAIN}/;
        proxy_redirect http://${DOMAIN}:3000/ https://${DOMAIN}/;
        proxy_redirect http://${WWW_DOMAIN}:3000/ https://${WWW_DOMAIN}/;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
}

echo -e "${YELLOW}Step 1: Installing OS packages...${NC}"
apt-get update
apt-get install -y nginx certbot python3-certbot-nginx git curl

if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" -lt 20 ]; then
  echo -e "${YELLOW}Installing Node.js 20...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo -e "${GREEN}Node.js: $(node -v)${NC}"
echo -e "${GREEN}npm: $(npm -v)${NC}"

echo -e "${YELLOW}Step 2: Preparing directories and environment...${NC}"
mkdir -p "${APP_DIR}" "/var/log/${APP_NAME}"
touch "/var/log/${APP_NAME}/app.log" "/var/log/${APP_NAME}/error.log"
chmod 755 "/var/log/${APP_NAME}"

if [ ! -f "${ENV_FILE}" ]; then
  cat > "${ENV_FILE}" << EOF
OPENROUTER_API_KEY=your-api-key-here
OPENROUTER_API_URL=https://openrouter.ai/api/v1
ALLOWED_ORIGINS=https://${DOMAIN},https://${WWW_DOMAIN}
NEXT_PUBLIC_SITE_URL=https://${DOMAIN}
TRUSTED_PROXIES=
# UPSTASH_REDIS_REST_URL=
# UPSTASH_REDIS_REST_TOKEN=
EOF
else
  ensure_env_line "OPENROUTER_API_URL" "https://openrouter.ai/api/v1"
  ensure_env_line "ALLOWED_ORIGINS" "https://${DOMAIN},https://${WWW_DOMAIN}"
  ensure_env_line "NEXT_PUBLIC_SITE_URL" "https://${DOMAIN}"
  ensure_env_line "TRUSTED_PROXIES" ""
fi
chmod 600 "${ENV_FILE}"

echo -e "${YELLOW}Step 3: Installing npm dependencies and building...${NC}"
cd "${APP_DIR}"
if [ "${SKIP_BUILD}" -eq 0 ]; then
  if ! npm ci --include=dev; then
    echo -e "${YELLOW}npm ci failed. Retrying with npm install to repair package-lock on this Linux host...${NC}"
    npm install --include=dev
  fi
  npm run build
else
  echo -e "${YELLOW}Build skipped. Expecting an already prepared .next/standalone artifact.${NC}"
fi

if [ ! -f "${APP_DIR}/.next/standalone/server.js" ]; then
  echo -e "${RED}.next/standalone/server.js was not found. Build failed or artifact is incomplete.${NC}"
  exit 1
fi

echo -e "${YELLOW}Step 4: Installing systemd service...${NC}"
cp "${APP_DIR}/deploy/life-os.service" "/etc/systemd/system/${APP_NAME}.service"
systemctl daemon-reload
systemctl enable "${APP_NAME}"

echo -e "${YELLOW}Step 5: Applying permissions...${NC}"
chown -R www-data:www-data "${APP_DIR}" "/var/log/${APP_NAME}"
find "${APP_DIR}" -type d -exec chmod 755 {} \;
find "${APP_DIR}" -type f -exec chmod 644 {} \;
chmod 600 "${ENV_FILE}"

echo -e "${YELLOW}Step 6: Configuring nginx HTTP bootstrap...${NC}"
mkdir -p /etc/nginx/snippets
if [ ! -f "${ACCESS_SNIPPET}" ]; then
  cat > "${ACCESS_SNIPPET}" << EOF
# Optional temporary private access.
# To enable:
#   sudo apt-get install -y apache2-utils
#   sudo htpasswd -c /etc/nginx/.life-os.htpasswd dima
#   sudo sed -i 's/^# auth_basic/auth_basic/' ${ACCESS_SNIPPET}
#   sudo sed -i 's/^# auth_basic_user_file/auth_basic_user_file/' ${ACCESS_SNIPPET}
#   sudo nginx -t && sudo systemctl reload nginx
#
# auth_basic "Life OS private";
# auth_basic_user_file /etc/nginx/.life-os.htpasswd;
EOF
fi
write_http_nginx_config
ln -sf "${NGINX_CONF}" "/etc/nginx/sites-enabled/${APP_NAME}"
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
systemctl enable nginx

if [ "${NO_START}" -eq 0 ]; then
  echo -e "${YELLOW}Step 7: Starting application...${NC}"
  systemctl restart "${APP_NAME}"
else
  echo -e "${YELLOW}Step 7: Application start skipped.${NC}"
fi

if [ "${SKIP_CERTBOT}" -eq 0 ]; then
  echo -e "${YELLOW}Step 8: Requesting SSL certificate...${NC}"
  if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    certbot --nginx -d "${DOMAIN}" -d "${WWW_DOMAIN}" --non-interactive --agree-tos --email "admin@${DOMAIN}" || {
      echo -e "${YELLOW}Certbot failed. DNS may not be ready yet. HTTP nginx config remains active.${NC}"
      echo -e "${YELLOW}After fixing DNS, run: sudo certbot --nginx -d ${DOMAIN} -d ${WWW_DOMAIN}${NC}"
      exit 0
    }
  else
    echo -e "${GREEN}Existing certificate found.${NC}"
  fi

  echo -e "${YELLOW}Step 9: Installing final HTTPS nginx config...${NC}"
  cp "${APP_DIR}/deploy/nginx.conf" "${NGINX_CONF}"
  sed -i "s/your-domain.com/${DOMAIN}/g" "${NGINX_CONF}"
  nginx -t
  systemctl restart nginx
else
  echo -e "${YELLOW}Step 8: Certbot skipped. HTTP nginx config remains active.${NC}"
fi

if [ "${NO_START}" -eq 0 ]; then
  sleep 3
  if systemctl is-active --quiet "${APP_NAME}"; then
    echo -e "${GREEN}Application is running.${NC}"
  else
    echo -e "${RED}Application failed to start.${NC}"
    journalctl -u "${APP_NAME}" -n 50 --no-pager
    exit 1
  fi
fi

echo -e "${GREEN}=== VPS install complete ===${NC}"
echo "Site: https://${DOMAIN}"
echo "Env: ${ENV_FILE}"
echo "Logs: journalctl -u ${APP_NAME} -f"
