import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env.local');

if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

const requiredUrls = ['ALLOWED_ORIGINS', 'NEXT_PUBLIC_SITE_URL'];
const warnings = [];
const errors = [];

function isPlaceholder(value) {
  return !value || /your-|example|localhost|127\.0\.0\.1/i.test(value);
}

function parseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

for (const key of requiredUrls) {
  const value = process.env[key]?.trim();
  if (!value) {
    errors.push(`${key} is required for VPS production deployment.`);
    continue;
  }
  if (isPlaceholder(value)) {
    errors.push(`${key} still looks like a placeholder: ${value}`);
  }
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
if (siteUrl) {
  const parsed = parseUrl(siteUrl);
  if (!parsed || !['https:', 'http:'].includes(parsed.protocol)) {
    errors.push('NEXT_PUBLIC_SITE_URL must be a valid http(s) URL.');
  } else if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
    errors.push('NEXT_PUBLIC_SITE_URL must use https in production.');
  }
}

const rawOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((v) => v.trim()).filter(Boolean) ?? [];
for (const origin of rawOrigins) {
  const parsed = parseUrl(origin);
  if (!parsed || parsed.origin !== origin.replace(/\/$/, '')) {
    errors.push(`ALLOWED_ORIGINS entry must be an exact origin: ${origin}`);
  }
}

const apiKey = process.env.OPENROUTER_API_KEY?.trim();
if (!apiKey || isPlaceholder(apiKey)) {
  warnings.push('OPENROUTER_API_KEY is missing or placeholder. The site can start, but AI will use fallback responses.');
}

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  warnings.push('Upstash Redis is not configured. Rate limiting will be in-memory and single-instance only.');
}

for (const warning of warnings) {
  console.warn(`[check-vps-env] WARN: ${warning}`);
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`[check-vps-env] ERROR: ${error}`);
  }
  process.exit(1);
}

console.log('[check-vps-env] VPS environment looks deployable.');
