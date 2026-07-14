import { LRUCache } from 'lru-cache';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

type Bucket = { count: number; reset: number };

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

type ClientIpRequest = {
  headers: Headers;
  ip?: string | null;
  socket?: { remoteAddress?: string | null } | null;
};

function parseTrustedProxies(): Set<string> {
  return new Set(
    (process.env.TRUSTED_PROXIES ?? '')
      .split(',')
      .map((entry) => normalizeIp(entry))
      .filter((entry): entry is string => Boolean(entry))
  );
}

function normalizeIp(value: string | null | undefined): string | null {
  if (!value) return null;
  let ip = value.trim();
  if (!ip) return null;

  if (ip.startsWith('[') && ip.includes(']')) {
    const end = ip.indexOf(']');
    ip = ip.slice(1, end);
  } else {
    const colonCount = (ip.match(/:/g) ?? []).length;
    const dotCount = (ip.match(/\./g) ?? []).length;
    if (dotCount === 3 && colonCount === 1) {
      ip = ip.slice(0, ip.lastIndexOf(':'));
    }
  }

  const mappedPrefix = '::ffff:';
  if (ip.toLowerCase().startsWith(mappedPrefix)) {
    ip = ip.slice(mappedPrefix.length);
  }

  const zoneIndex = ip.indexOf('%');
  if (zoneIndex >= 0) {
    ip = ip.slice(0, zoneIndex);
  }

  return ip || null;
}

function parseForwardedFor(headerValue: string | null): string[] {
  if (!headerValue) return [];
  return headerValue
    .split(',')
    .map((part) => normalizeIp(part))
    .filter((ip): ip is string => Boolean(ip && ip.toLowerCase() !== 'unknown'));
}

function parseForwardedHeader(headerValue: string | null): string[] {
  if (!headerValue) return [];
  const entries: string[] = [];
  const matches = headerValue.matchAll(/for=(?:"?\[?)([^;\],"]+)/gi);
  for (const match of matches) {
    const normalized = normalizeIp(match[1]);
    if (normalized) entries.push(normalized);
  }
  return entries;
}

function rightmostUntrusted(chain: string[], trustedProxies: Set<string>): string | null {
  for (let i = chain.length - 1; i >= 0; i -= 1) {
    const ip = chain[i];
    if (!trustedProxies.has(ip)) return ip;
  }
  return null;
}

export function getClientIp(req: ClientIpRequest): string {
  const sourceIp = normalizeIp(req.ip ?? req.socket?.remoteAddress ?? null);
  const trustedProxies = parseTrustedProxies();
  const xffChain = parseForwardedFor(req.headers.get('x-forwarded-for'));
  const forwardedChain = parseForwardedHeader(req.headers.get('forwarded'));
  const mergedProxyChain = [...xffChain, ...forwardedChain.filter((ip) => !xffChain.includes(ip))];

  if (sourceIp) {
    if (trustedProxies.has(sourceIp)) {
      const clientFromChain = rightmostUntrusted(mergedProxyChain, trustedProxies);
      if (clientFromChain) return clientFromChain;
    }
    return sourceIp;
  }

  const headerIpCandidates = [
    req.headers.get('x-real-ip'),
    req.headers.get('cf-connecting-ip'),
    req.headers.get('true-client-ip'),
    req.headers.get('x-client-ip'),
  ]
    .map((value) => normalizeIp(value))
    .filter((ip): ip is string => Boolean(ip));
  if (headerIpCandidates.length > 0) return headerIpCandidates[0];

  const clientFromChain = rightmostUntrusted(mergedProxyChain, trustedProxies);
  if (clientFromChain) return clientFromChain;

  const firstForwarded = mergedProxyChain[0];
  return firstForwarded ?? 'unknown';
}

function makeLimiter(windowMs: number, max: number, maxEntries = 5000) {
  const cache = new LRUCache<string, Bucket>({ max: maxEntries, ttl: windowMs });
  return (key: string): RateLimitResult => {
    const now = Date.now();
    const existing = cache.get(key);
    if (!existing || existing.reset <= now) {
      const fresh: Bucket = { count: 1, reset: now + windowMs };
      cache.set(key, fresh);
      return { ok: true, limit: max, remaining: max - 1, reset: fresh.reset };
    }
    existing.count += 1;
    return {
      ok: existing.count <= max,
      limit: max,
      remaining: Math.max(0, max - existing.count),
      reset: existing.reset,
    };
  };
}

const minuteLimiter = makeLimiter(60_000, 10);
const hourLimiter = makeLimiter(3_600_000, 100);

function localRateLimit(key: string): RateLimitResult {
  const minute = minuteLimiter(key);
  if (!minute.ok) return minute;
  const hour = hourLimiter(key);
  if (!hour.ok) return hour;
  return {
    ok: true,
    limit: minute.limit,
    remaining: Math.min(minute.remaining, hour.remaining),
    reset: Math.min(minute.reset, hour.reset),
  };
}

type UpstashPair = { minute: Ratelimit; hour: Ratelimit };
let upstashLimiters: UpstashPair | null | undefined;

function getUpstashLimiters(): UpstashPair | null {
  if (upstashLimiters !== undefined) {
    return upstashLimiters;
  }
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    upstashLimiters = null;
    return null;
  }
  const redis = new Redis({ url, token });
  upstashLimiters = {
    minute: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      prefix: 'lifeos:ratelimit:1m',
    }),
    hour: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '3600 s'),
      prefix: 'lifeos:ratelimit:1h',
    }),
  };
  return upstashLimiters;
}

/**
 * 10 req/min and 100 req/hour per key. Uses Upstash Redis when
 * `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set (shared across
 * instances); otherwise falls back to in-memory LRU (single-process only).
 */
export async function rateLimit(key: string): Promise<RateLimitResult> {
  const upstash = getUpstashLimiters();
  if (!upstash) {
    return localRateLimit(key);
  }

  const m = await upstash.minute.limit(key);
  if (m.pending) await m.pending;
  if (!m.success) {
    return {
      ok: false,
      limit: m.limit,
      remaining: m.remaining,
      reset: m.reset,
    };
  }

  const h = await upstash.hour.limit(key);
  if (h.pending) await h.pending;
  if (!h.success) {
    return {
      ok: false,
      limit: h.limit,
      remaining: h.remaining,
      reset: h.reset,
    };
  }

  return {
    ok: true,
    limit: m.limit,
    remaining: Math.min(m.remaining, h.remaining),
    reset: Math.min(m.reset, h.reset),
  };
}
