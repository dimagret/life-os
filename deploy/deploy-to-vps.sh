#!/bin/bash
# Deploy Life OS source to a VPS and build it on the VPS.
# Usage: ./deploy/deploy-to-vps.sh user@server domain.com

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ "$#" -lt 2 ]; then
  echo -e "${RED}Usage: $0 user@server domain.com${NC}"
  echo -e "${YELLOW}Example: $0 root@203.0.113.10 life-os.example${NC}"
  exit 1
fi

SERVER="$1"
DOMAIN="$2"
APP_NAME="${APP_NAME:-life-os}"
APP_DIR="${APP_DIR:-/var/www/${APP_NAME}}"

if [ ! -f "package.json" ] || [ ! -d "deploy" ]; then
  echo -e "${RED}Run this script from the life-os project directory.${NC}"
  exit 1
fi

echo -e "${GREEN}=== Deploying Life OS to ${SERVER} ===${NC}"
echo -e "${YELLOW}Domain: ${DOMAIN}${NC}"
echo -e "${YELLOW}Remote app dir: ${APP_DIR}${NC}"

echo -e "${YELLOW}Step 1: Preparing clean remote directory...${NC}"
ssh "${SERVER}" "sudo mkdir -p '${APP_DIR}' && if [ -f '${APP_DIR}/.env.local' ]; then sudo cp '${APP_DIR}/.env.local' '/tmp/${APP_NAME}.env.local'; fi && sudo find '${APP_DIR}' -mindepth 1 -maxdepth 1 ! -name '.env.local' -exec rm -rf {} + && if [ -f '/tmp/${APP_NAME}.env.local' ]; then sudo mv '/tmp/${APP_NAME}.env.local' '${APP_DIR}/.env.local'; fi && sudo chown -R \$(id -u):\$(id -g) '${APP_DIR}'"

echo -e "${YELLOW}Step 2: Uploading source files...${NC}"
rsync -az --delete \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='dist' \
  --exclude='out' \
  --exclude='.git' \
  --exclude='*.log' \
  --include='.env.example' \
  --exclude='.env*' \
  ./ "${SERVER}:${APP_DIR}/"

echo -e "${YELLOW}Step 3: Installing and building on VPS...${NC}"
ssh "${SERVER}" "cd '${APP_DIR}' && sudo bash deploy/install.sh '${DOMAIN}'"

echo -e "${GREEN}=== Deployment command completed ===${NC}"
echo "Site: https://${DOMAIN}"
echo "Logs: ssh ${SERVER} 'sudo journalctl -u ${APP_NAME} -f'"
