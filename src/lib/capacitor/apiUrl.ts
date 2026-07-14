/**
 * В WebView с локальными файлами origin не совпадает с деплоем — вызовы к /api/*
 * нужно направлять на NEXT_PUBLIC_SITE_URL.
 */
export function resolveApiPath(path: string): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw || typeof window === 'undefined') return path;
  try {
    const normalized = raw.startsWith('http') ? raw : `https://${raw}`;
    const baseOrigin = new URL(normalized).origin;
    if (window.location.origin === baseOrigin) return path;
    const base = normalized.replace(/\/$/, '');
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${base}${p}`;
  } catch {
    return path;
  }
}
