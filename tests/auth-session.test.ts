import { afterEach, describe, expect, it } from 'vitest';
import {
  AUTH_MAX_AGE_SECONDS,
  createAuthSessionCookie,
  getAuthConfig,
  verifyAuthCredentials,
  verifyAuthSessionCookie,
} from '@/lib/auth';

const ENV_KEYS = ['LIFEOS_AUTH_ENABLED', 'LIFEOS_AUTH_USER', 'LIFEOS_AUTH_PASSWORD', 'LIFEOS_AUTH_SECRET'] as const;

function clearAuthEnv() {
  ENV_KEYS.forEach((key) => {
    delete process.env[key];
  });
}

function configureAuth() {
  process.env.LIFEOS_AUTH_ENABLED = 'true';
  process.env.LIFEOS_AUTH_USER = 'dima';
  process.env.LIFEOS_AUTH_PASSWORD = 'strong-password';
  process.env.LIFEOS_AUTH_SECRET = '0123456789abcdefghijklmnopqrstuvwxyz-secret';
}

describe('owner auth session', () => {
  afterEach(() => {
    clearAuthEnv();
  });

  it('is disabled when no auth env is present', () => {
    clearAuthEnv();
    expect(getAuthConfig().mode).toBe('disabled');
  });

  it('detects missing required auth env', () => {
    clearAuthEnv();
    process.env.LIFEOS_AUTH_ENABLED = 'true';
    expect(getAuthConfig()).toEqual({
      mode: 'misconfigured',
      missing: ['LIFEOS_AUTH_USER', 'LIFEOS_AUTH_PASSWORD', 'LIFEOS_AUTH_SECRET'],
    });
  });

  it('verifies configured owner credentials', () => {
    configureAuth();
    expect(verifyAuthCredentials('dima', 'strong-password')).toBe(true);
    expect(verifyAuthCredentials('dima', 'wrong')).toBe(false);
    expect(verifyAuthCredentials('other', 'strong-password')).toBe(false);
  });

  it('creates and verifies a signed session cookie', async () => {
    configureAuth();
    const now = Date.UTC(2026, 4, 14);
    const cookie = await createAuthSessionCookie('dima', now);

    await expect(verifyAuthSessionCookie(cookie, now + 1000)).resolves.toBe(true);
  });

  it('rejects tampered and expired session cookies', async () => {
    configureAuth();
    const now = Date.UTC(2026, 4, 14);
    const cookie = await createAuthSessionCookie('dima', now);

    await expect(verifyAuthSessionCookie(`${cookie}x`, now + 1000)).resolves.toBe(false);
    await expect(
      verifyAuthSessionCookie(cookie, now + (AUTH_MAX_AGE_SECONDS + 1) * 1000),
    ).resolves.toBe(false);
  });
});
