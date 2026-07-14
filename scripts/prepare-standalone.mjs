import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const standaloneDir = path.join(root, '.next', 'standalone');
const standaloneNextDir = path.join(standaloneDir, '.next');
const sourceStaticDir = path.join(root, '.next', 'static');
const targetStaticDir = path.join(standaloneNextDir, 'static');
const sourcePublicDir = path.join(root, 'public');
const targetPublicDir = path.join(standaloneDir, 'public');
const standaloneServerFile = path.join(standaloneDir, 'server.js');

function exists(target) {
  try {
    fs.accessSync(target);
    return true;
  } catch {
    return false;
  }
}

function copyDirectory(source, target) {
  fs.rmSync(target, { recursive: true, force: true });
  copyDirectoryContents(source, target);
}

function copyDirectoryContents(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDirectoryContents(from, to);
    } else if (entry.isFile()) {
      fs.copyFileSync(from, to);
    }
  }
}

if (process.env.CAPACITOR_STATIC_EXPORT === 'true') {
  console.log('[prepare-standalone] Skipped for Capacitor static export.');
  process.exit(0);
}

if (!exists(standaloneDir)) {
  console.warn('[prepare-standalone] .next/standalone not found. Check next.config.mjs output.');
  process.exit(0);
}

if (!exists(sourceStaticDir)) {
  console.error('[prepare-standalone] .next/static not found. Run next build first.');
  process.exit(1);
}

copyDirectory(sourceStaticDir, targetStaticDir);

if (exists(sourcePublicDir)) {
  copyDirectory(sourcePublicDir, targetPublicDir);
} else {
  fs.rmSync(targetPublicDir, { recursive: true, force: true });
}

if (exists(standaloneServerFile)) {
  const serverSource = fs.readFileSync(standaloneServerFile, 'utf8');
  const patchedSource = serverSource.replace('"trustHostHeader":false', '"trustHostHeader":true');
  if (patchedSource !== serverSource) {
    fs.writeFileSync(standaloneServerFile, patchedSource);
    console.log('[prepare-standalone] Enabled trustHostHeader for nginx reverse proxy.');
  }
}

console.log('[prepare-standalone] Standalone assets are ready.');
