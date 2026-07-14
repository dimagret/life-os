# Life OS - VPS Deployment Guide

Current maintained VPS flow is documented in [`VPS.md`](./VPS.md).

Important current rules:

- Build on the VPS Linux host. Do not copy a Windows-built `.next/standalone` artifact to Linux.
- Run the app through systemd with `node .next/standalone/server.js`, not `next start`.
- Keep Node bound to `127.0.0.1:3000`; public traffic should go through nginx.
- Set `ALLOWED_ORIGINS` and `NEXT_PUBLIC_SITE_URL` to the real HTTPS domain before production use.
- `npm run build` now runs `scripts/prepare-standalone.mjs` after `next build`, so `.next/static` and `public` are copied into `.next/standalone`.

## Prerequisites

- Ubuntu 22.04+ (or Debian 12+)
- Domain name pointed to your VPS
- Root or sudo access

## Quick Start

### 1. Upload Files to VPS

```bash
# From your local machine, upload the project
rsync -avz --exclude='node_modules' --exclude='.next' --exclude='.git' \
  ./ root@your-server-ip:/var/www/life-os/
```

### 2. Run Installation

SSH into your server and run:

```bash
cd /var/www/life-os
chmod +x deploy/install.sh
sudo ./deploy/install.sh
```

### 3. Configure Environment

Edit `/var/www/life-os/.env.local`:

```bash
sudo nano /var/www/life-os/.env.local
```

Add your OpenRouter API key:

```env
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_API_URL=https://openrouter.ai/api/v1
```

### 4. Update Domain

Edit the install script before running, or update nginx config:

```bash
sudo nano /etc/nginx/sites-available/life-os
# Replace "your-domain.com" with your actual domain
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Setup SSL

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## Manual Deployment (Step by Step)

If you prefer manual setup:

### Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install nginx and certbot
sudo apt install -y nginx certbot python3-certbot-nginx git
```

### Setup Application

```bash
# Create directory
sudo mkdir -p /var/www/life-os
sudo chown -R $USER:$USER /var/www/life-os

# Copy files (from local machine)
rsync -avz ./ root@your-server-ip:/var/www/life-os/

# Install dependencies
cd /var/www/life-os
npm install

# Create environment file
cp .env.example .env.local
nano .env.local  # Add your API keys

# Build application
npm run build
```

### Setup Nginx

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/life-os
sudo ln -sf /etc/nginx/sites-available/life-os /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Update domain name
sudo sed -i 's/your-domain.com/your-actual-domain.com/g' /etc/nginx/sites-available/life-os

# Test and restart
sudo nginx -t
sudo systemctl restart nginx
```

### Setup SSL

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### Setup Systemd Service

```bash
sudo cp deploy/life-os.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable life-os
sudo systemctl start life-os
```

## Updating Application

### Method 1: Using Update Script

```bash
cd /var/www/life-os
sudo ./deploy/update.sh
```

### Method 2: Manual Update

```bash
cd /var/www/life-os

# Backup env
cp .env.local /tmp/.env.local.backup

# Pull changes (if using git)
git pull origin main

# Restore env
cp /tmp/.env.local.backup .env.local

# Rebuild
npm install
npm run build

# Restart
sudo systemctl restart life-os
```

## Monitoring & Logs

### View Application Logs

```bash
# Real-time logs
sudo journalctl -u life-os -f

# Last 50 lines
sudo journalctl -u life-os -n 50

# Logs from last hour
sudo journalctl -u life-os --since "1 hour ago"
```

### View Nginx Logs

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Check Application Status

```bash
sudo systemctl status life-os
sudo systemctl status nginx
```

### Restart Services

```bash
sudo systemctl restart life-os
sudo systemctl restart nginx
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | Your OpenRouter API key |
| `OPENROUTER_API_URL` | No | API endpoint (default: https://openrouter.ai/api/v1) |
| `NODE_ENV` | Yes | Set to `production` |
| `PORT` | No | Port number (default: 3000) |

## Troubleshooting

### Application won't start

```bash
# Check logs
sudo journalctl -u life-os -n 100

# Check if port 3000 is in use
sudo lsof -i :3000

# Test manually
cd /var/www/life-os
sudo -u www-data npm start
```

### Nginx errors

```bash
# Test config
sudo nginx -t

# Check nginx logs
sudo tail -f /var/log/nginx/error.log
```

### SSL certificate issues

```bash
# Renew certificates manually
sudo certbot renew --dry-run

# Force renew
sudo certbot renew --force-renewal
```

### Permission issues

```bash
# Fix permissions
sudo chown -R www-data:www-data /var/www/life-os
sudo chmod -R 755 /var/www/life-os
```

## Security Recommendations

1. **UFW Firewall** (recommended):
   ```bash
   sudo apt install ufw
   sudo ufw default deny incoming
   sudo ufw default allow outgoing
   sudo ufw allow ssh
   sudo ufw allow http
   sudo ufw allow https
   sudo ufw enable
   ```

2. **Fail2Ban** (recommended):
   ```bash
   sudo apt install fail2ban
   sudo systemctl enable fail2ban
   sudo systemctl start fail2ban
   ```

3. **Regular Updates**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

## Backup

### Backup Application Data

```bash
# Backup script
#!/bin/bash
BACKUP_DIR="/backups/life-os"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p ${BACKUP_DIR}

# Backup application files
tar -czf ${BACKUP_DIR}/app_${DATE}.tar.gz -C /var/www/life-os .

# Keep only last 7 backups
ls -t ${BACKUP_DIR}/app_*.tar.gz | tail -n +8 | xargs -r rm

echo "Backup completed: ${BACKUP_DIR}/app_${DATE}.tar.gz"
```

### Restore from Backup

```bash
sudo systemctl stop life-os
sudo rm -rf /var/www/life-os/*
sudo tar -xzf /backups/life-os/app_YYYYMMDD_HHMMSS.tar.gz -C /var/www/life-os/
sudo chown -R www-data:www-data /var/www/life-os
sudo systemctl start life-os
```

## Architecture

```
User → Cloudflare (optional) → Nginx (443/80) → Next.js (3000)
                                    ↓
                              SSL (Certbot)
                                    ↓
                              Static Files
                                    ↓
                              API Routes (/api/ai)
                                    ↓
                              OpenRouter API
```

## Performance Optimization

1. **Enable Gzip**: Already enabled in nginx config
2. **Static file caching**: Configured for `/_next/static`
3. **PM2 Alternative** (if preferred over systemd):
   ```bash
   npm install -g pm2
   pm2 start npm --name "life-os" -- start
   pm2 startup
   pm2 save
   ```

## Support

- GitHub Issues: https://github.com/anomalyco/opencode/issues
- Logs: `sudo journalctl -u life-os -f`
- Config: `/var/www/life-os/.env.local`
