import { resolveApiPath } from '@/lib/capacitor/apiUrl';

/** Клиентская проверка доступности AI (ключ на сервере и ответ /api/ai/health). */

export type AIHealthReason =
  | 'missing_api_key'
  | 'http_error'
  | 'network'
  | 'bad_response';

export type AIHealthResult = {
  ok: boolean;
  reason?: AIHealthReason;
  httpStatus?: number;
};

const CACHE_KEY = 'lifeos:ai-health-v2';
const TTL_MS = 60 * 60 * 1000;

type CachePayload = { result: AIHealthResult; expiresAt: number };

function readCache(): AIHealthResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachePayload;
    if (Date.now() < parsed.expiresAt) return parsed.result;
  } catch {
    /* ignore */
  }
  return null;
}

function writeCache(result: AIHealthResult): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: CachePayload = { result, expiresAt: Date.now() + TTL_MS };
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* private mode / quota */
  }
}

/** Сброс кэша (после смены .env или «Проверить снова»). */
export function clearAIHealthCache(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

export async function fetchAIHealth(): Promise<AIHealthResult> {
  const cached = readCache();
  if (cached) return cached;

  try {
    const res = await fetch(resolveApiPath('/api/ai/health'), { cache: 'no-store' });
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      const result: AIHealthResult = { ok: false, reason: 'bad_response', httpStatus: res.status };
      writeCache(result);
      return result;
    }

    const data = body as {
      ok?: boolean;
      reason?: AIHealthReason;
      status?: string;
    };

    let result: AIHealthResult;

    if (!res.ok) {
      result = { ok: false, reason: 'http_error', httpStatus: res.status };
    } else if (typeof data.ok === 'boolean') {
      result = {
        ok: data.ok,
        reason: data.ok ? undefined : data.reason ?? 'missing_api_key',
      };
    } else if (data.status === 'ok') {
      result = { ok: true };
    } else {
      result = { ok: false, reason: 'missing_api_key' };
    }

    writeCache(result);
    return result;
  } catch {
    const result: AIHealthResult = { ok: false, reason: 'network' };
    writeCache(result);
    return result;
  }
}

export async function isAIAvailable(): Promise<boolean> {
  return (await fetchAIHealth()).ok;
}
