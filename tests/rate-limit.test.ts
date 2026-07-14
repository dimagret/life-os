import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import { getClientIp, rateLimit } from '@/lib/rateLimit';

// Each test uses a unique key to avoid LRU cross-contamination.
function uid() {
  return `test:rl:${Math.random().toString(36).slice(2)}`;
}

describe('rateLimit (local LRU fallback)', () => {
  it('allows the first request', async () => {
    const result = await rateLimit(uid());
    expect(result.ok).toBe(true);
  });

  it('returns limit=10 and remaining=9 on first call', async () => {
    const result = await rateLimit(uid());
    expect(result.limit).toBe(10);
    expect(result.remaining).toBe(9);
  });

  it('decrements remaining on subsequent calls', async () => {
    const key = uid();
    const first = await rateLimit(key);
    const second = await rateLimit(key);
    expect(second.remaining).toBeLessThan(first.remaining);
  });

  it('blocks after 10 requests within the minute window', async () => {
    const key = uid();
    for (let i = 0; i < 10; i++) {
      await rateLimit(key);
    }
    const over = await rateLimit(key);
    expect(over.ok).toBe(false);
    expect(over.remaining).toBe(0);
  });

  it('returns a reset timestamp after the current time', async () => {
    const before = Date.now();
    const result = await rateLimit(uid());
    expect(result.reset).toBeGreaterThan(before);
  });

  it('isolated keys do not interfere with each other', async () => {
    const a = uid();
    const b = uid();
    for (let i = 0; i < 10; i++) await rateLimit(a);
    const blockedA = await rateLimit(a);
    const freshB = await rateLimit(b);
    expect(blockedA.ok).toBe(false);
    expect(freshB.ok).toBe(true);
  });
});

describe('getClientIp (trusted proxy)', () => {
  const prevTrustedProxies = process.env.TRUSTED_PROXIES;

  beforeEach(() => {
    delete process.env.TRUSTED_PROXIES;
  });

  afterEach(() => {
    if (prevTrustedProxies === undefined) {
      delete process.env.TRUSTED_PROXIES;
      return;
    }
    process.env.TRUSTED_PROXIES = prevTrustedProxies;
  });

  it('uses source ip when proxy is not trusted', () => {
    process.env.TRUSTED_PROXIES = '10.0.0.1';
    const req = {
      ip: '203.0.113.9',
      headers: new Headers({ 'x-forwarded-for': '198.51.100.77, 10.0.0.1' }),
    };
    expect(getClientIp(req)).toBe('203.0.113.9');
  });

  it('returns rightmost untrusted ip when source proxy is trusted', () => {
    process.env.TRUSTED_PROXIES = '10.0.0.1';
    const req = {
      ip: '10.0.0.1',
      headers: new Headers({ 'x-forwarded-for': '198.51.100.77, 10.0.0.1' }),
    };
    expect(getClientIp(req)).toBe('198.51.100.77');
  });

  it('walks from right in multi-hop x-forwarded-for chain', () => {
    process.env.TRUSTED_PROXIES = '10.0.0.1,10.0.0.2';
    const req = {
      ip: '10.0.0.2',
      headers: new Headers({ 'x-forwarded-for': '198.51.100.77, 10.0.0.1, 10.0.0.2' }),
    };
    expect(getClientIp(req)).toBe('198.51.100.77');
  });

  it('returns nearest untrusted hop when chain has intermediary', () => {
    process.env.TRUSTED_PROXIES = '10.0.0.2';
    const req = {
      ip: '10.0.0.2',
      headers: new Headers({ 'x-forwarded-for': '198.51.100.77, 203.0.113.5, 10.0.0.2' }),
    };
    expect(getClientIp(req)).toBe('203.0.113.5');
  });

  it('falls back to trusted source ip when x-forwarded-for is missing', () => {
    process.env.TRUSTED_PROXIES = '10.0.0.1';
    const req = {
      ip: '10.0.0.1',
      headers: new Headers(),
    };
    expect(getClientIp(req)).toBe('10.0.0.1');
  });

  it('normalizes trusted ipv4-mapped ipv6 and forwarded ip with port', () => {
    process.env.TRUSTED_PROXIES = '10.0.0.1';
    const req = {
      ip: '::ffff:10.0.0.1',
      headers: new Headers({ 'x-forwarded-for': '198.51.100.77:443, 10.0.0.1' }),
    };
    expect(getClientIp(req)).toBe('198.51.100.77');
  });

  it('supports NextRequest-like headers-only input via x-real-ip', () => {
    process.env.TRUSTED_PROXIES = '10.0.0.1';
    const req = {
      headers: new Headers({ 'x-real-ip': '198.51.100.88' }),
    };
    expect(getClientIp(req)).toBe('198.51.100.88');
  });
});
