import { describe, it, expect } from 'vitest';
import nextConfig from '../next.config.mjs';

type HeaderRule = {
  source: string;
  headers: Array<{ key: string; value: string }>;
};

describe('next.config security headers', () => {
  it('returns baseline security headers for the catch-all route', async () => {
    expect(nextConfig.headers).toBeTypeOf('function');

    const rules = (await nextConfig.headers()) as HeaderRule[];
    const catchAllRule = rules.find((rule) => rule.source === '/(.*)');

    expect(catchAllRule).toBeDefined();

    const headersMap = new Map(
      (catchAllRule?.headers ?? []).map((header) => [header.key, header.value]),
    );

    expect(headersMap.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headersMap.get('X-Frame-Options')).toBe('DENY');
    expect(headersMap.get('X-XSS-Protection')).toBe('1; mode=block');
    expect(headersMap.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(headersMap.get('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=()');
    expect(headersMap.get('Content-Security-Policy-Report-Only')).toBe(
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https: wss:; frame-src 'self' https://music.yandex.ru; frame-ancestors 'none'",
    );
    expect(headersMap.get('Strict-Transport-Security')).toBe(
      'max-age=31536000; includeSubDomains',
    );
  });
});
