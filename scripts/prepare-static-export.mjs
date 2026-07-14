/**
 * Перед `CAPACITOR_STATIC_EXPORT=true npm run build` переносит API routes и middleware
 * вне роутера Next (static export их не поддерживает).
 * После сборки запустите scripts/restore-static-export.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const stash = path.join(root, '.lifeos-export-stash');
const apiSrc = path.join(root, 'src', 'app', 'api');
const apiDest = path.join(stash, 'app-api');
const mwSrc = path.join(root, 'src', 'middleware.ts');
const mwDest = path.join(stash, 'middleware.ts');

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

if (exists(stash)) {
  console.error('[prepare-static-export] Уже есть .lifeos-export-stash — сначала restore-static-export.mjs');
  process.exit(1);
}

fs.mkdirSync(stash, { recursive: true });

if (exists(apiSrc)) {
  fs.renameSync(apiSrc, apiDest);
  console.log('[prepare-static-export] src/app/api → stash/app-api');
} else {
  console.warn('[prepare-static-export] src/app/api не найден, пропуск');
}

if (exists(mwSrc)) {
  fs.renameSync(mwSrc, mwDest);
  console.log('[prepare-static-export] middleware.ts → stash');
} else {
  console.warn('[prepare-static-export] middleware.ts не найден, пропуск');
}

console.log('[prepare-static-export] Готово. Сборка: CAPACITOR_STATIC_EXPORT=true npm run build');
