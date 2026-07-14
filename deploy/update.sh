#!/bin/bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

APP_NAME="${APP_NAME:-life-os}"
APP_DIR="${APP_DIR:-/var/www/${APP_NAME}}"
ENV_FILE="${APP_DIR}/.env.local"

echo -e "${GREEN}=== Life OS VPS update ===${NC}"

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root (use sudo).${NC}"
  exit 1
fi

cd "${APP_DIR}"

if [ ! -f "${ENV_FILE}" ]; then
  echo -e "${RED}${ENV_FILE} does not exist. Run deploy/install.sh first.${NC}"
  exit 1
fi

echo -e "${YELLOW}Step 1: Backing up environment...${NC}"
BACKUP_FILE="$(mktemp -p /root .env.local.XXXXXX)"
chmod 600 "${BACKUP_FILE}"
cp "${ENV_FILE}" "${BACKUP_FILE}"
trap 'shred -u "${BACKUP_FILE}" 2>/dev/null || rm -f "${BACKUP_FILE}"' EXIT

echo -e "${YELLOW}Step 2: Installing dependencies...${NC}"
npm ci --include=dev

echo -e "${YELLOW}Step 3: Building production standalone...${NC}"
npm run build

cp "${BACKUP_FILE}" "${ENV_FILE}"
chmod 600 "${ENV_FILE}"

if [ ! -f "${APP_DIR}/.next/standalone/server.js" ]; then
  echo -e "${RED}.next/standalone/server.js was not found after build.${NC}"
  exit 1
fi

echo -e "${YELLOW}Step 4: Applying permissions...${NC}"
chown -R www-data:www-data "${APP_DIR}" "/var/log/${APP_NAME}"
find "${APP_DIR}" -type d -exec chmod 755 {} \;
find "${APP_DIR}" -type f -exec chmod 644 {} \;
chmod 600 "${ENV_FILE}"

echo -e "${YELLOW}Step 5: Restarting application...${NC}"
systemctl restart "${APP_NAME}"

sleep 3
if systemctl is-active --quiet "${APP_NAME}"; then
  echo -e "${GREEN}Update successful.${NC}"
  systemctl status "${APP_NAME}" --no-pager
else
  echo -e "${RED}Update failed.${NC}"
  journalctl -u "${APP_NAME}" -n 50 --no-pager
  exit 1
fi
