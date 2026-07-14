/**
 * Проверка согласованности CAPACITOR_SERVER_URL и NEXT_PUBLIC_SITE_URL (origin/host).
 * Запуск вручную перед релизом или в CI после загрузки .env.
 */
function normalizeSiteUrl(raw) {
  if (!raw?.trim()) return null;
  try {
    const u = new URL(raw.trim());
    return { host: u.hostname.toLowerCase(), origin: `${u.protocol}//${u.host}` };
  } catch {
    return null;
  }
}

const site = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
const cap = normalizeSiteUrl(process.env.CAPACITOR_SERVER_URL);

let exit = 0;

if (cap && site && cap.host !== site.host) {
  console.warn(
    `[check-capacitor-env] NEXT_PUBLIC_SITE_URL host (${site.host}) ≠ CAPACITOR_SERVER_URL host (${cap.host}). ` +
      'Клиентские /api и WebView могут расходиться.',
  );
  exit = 1;
} else if (cap && site && cap.origin !== site.origin && cap.host === site.host) {
  console.warn(
    `[check-capacitor-env] Origins differ (${site.origin} vs ${cap.origin}) — проверьте схему/порт.`,
  );
}

if (!site) {
  console.warn('[check-capacitor-env] NEXT_PUBLIC_SITE_URL не задан или невалиден.');
}
if (!cap) {
  console.warn('[check-capacitor-env] CAPACITOR_SERVER_URL не задан (нормально для чистого web build).');
}

if (exit === 0 && cap && site && cap.host === site.host) {
  console.log('[check-capacitor-env] Hosts совпадают — ок.');
}

process.exit(exit);
