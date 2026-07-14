import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const stash = path.join(root, '.lifeos-export-stash');
const apiDest = path.join(root, 'src', 'app', 'api');
const apiSrc = path.join(stash, 'app-api');
const mwDest = path.join(root, 'src', 'middleware.ts');
const mwSrc = path.join(stash, 'middleware.ts');

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

if (!exists(stash)) {
  console.log('[restore-static-export] Нечего восстанавливать.');
  process.exit(0);
}

if (exists(apiSrc)) {
  if (exists(apiDest)) {
    console.error('[restore-static-export] Целевой src/app/api уже существует. Удалите вручную.');
    process.exit(1);
  }
  fs.renameSync(apiSrc, apiDest);
  console.log('[restore-static-export] stash/app-api → src/app/api');
}

if (exists(mwSrc)) {
  if (exists(mwDest)) {
    console.error('[restore-static-export] middleware.ts уже на месте.');
    process.exit(1);
  }
  fs.renameSync(mwSrc, mwDest);
  console.log('[restore-static-export] middleware восстановлен');
}

fs.rmSync(stash, { recursive: true, force: true });
console.log('[restore-static-export] Готово.');
