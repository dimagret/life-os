# Life OS VPS Deployment

This project is built as a Next.js standalone server and should be built on the VPS Linux host, not on Windows and copied as a ready `.next` artifact.

## Server Requirements

- Ubuntu 22.04+ or Debian 12+
- A domain with `A`/`AAAA` records pointing to the VPS
- SSH access with a sudo-capable user
- Ports `80` and `443` open

The install script installs Node.js 20, nginx, certbot, and npm dependencies.

## First Deploy From Local Machine

Run from the `life-os/` directory:

```bash
bash deploy/deploy-to-vps.sh user@server-ip your-domain.com
```

On Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File deploy/deploy-to-vps.ps1 -Server user@server-ip -Domain your-domain.com
```

The script:

1. Creates `/var/www/life-os` on the VPS.
2. Uploads source files, excluding local secrets and generated builds.
3. Runs `sudo bash deploy/install.sh your-domain.com` on the VPS.
4. Builds the app on the VPS with `npm ci --include=dev && npm run build`.
5. Installs the systemd unit and nginx config.
6. Requests a Let's Encrypt certificate when DNS is ready.

## Manual Install On VPS

After copying the project to `/var/www/life-os`:

```bash
cd /var/www/life-os
sudo bash deploy/install.sh your-domain.com
```

If DNS is not ready yet:

```bash
sudo bash deploy/install.sh your-domain.com --skip-certbot
```

After DNS is fixed:

```bash
DOMAIN=your-domain.com
sudo certbot --nginx -d "${DOMAIN}" -d "www.${DOMAIN}"
sudo cp deploy/nginx.conf /etc/nginx/sites-available/life-os
sudo sed -i "s/your-domain.com/${DOMAIN}/g" /etc/nginx/sites-available/life-os
sudo nginx -t
sudo systemctl restart nginx
```

## Environment

The installer creates `/var/www/life-os/.env.local` if missing.

Required for production:

```env
OPENROUTER_API_KEY=sk-or-v1-real-key
OPENROUTER_API_URL=https://openrouter.ai/api/v1
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
NEXT_PUBLIC_SITE_URL=https://your-domain.com
TRUSTED_PROXIES=
```

Optional for multi-instance rate limiting:

```env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

`OPENROUTER_API_KEY` may be left unset for a smoke test, but AI responses will fall back to local templates. `ALLOWED_ORIGINS` and `NEXT_PUBLIC_SITE_URL` must be real HTTPS origins.

## Update Existing VPS

After uploading new source files or pulling from git:

```bash
cd /var/www/life-os
sudo bash deploy/update.sh
```

The update script preserves `.env.local`, reinstalls npm dependencies, rebuilds the standalone server, reapplies permissions, and restarts systemd.

## Runtime

Systemd service:

```bash
sudo systemctl status life-os
sudo journalctl -u life-os -f
sudo systemctl restart life-os
```

Nginx:

```bash
sudo nginx -t
sudo systemctl restart nginx
sudo tail -f /var/log/nginx/error.log
```

Smoke checks:

```bash
curl -I https://your-domain.com/ru
curl https://your-domain.com/api/ai/health
curl https://your-domain.com/health
```

The Node server binds to `127.0.0.1:3000`; public traffic must go through nginx on `80/443`.
