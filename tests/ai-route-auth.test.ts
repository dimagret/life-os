import { afterEach, describe, expect, it, vi } from 'vitest';

const ENV_KEYS = ['LIFEOS_AUTH_ENABLED', 'LIFEOS_AUTH_USER', 'LIFEOS_AUTH_PASSWORD', 'LIFEOS_AUTH_SECRET'] as const;
const ORIGINAL_ENV = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

async function importPost() {
  vi.resetModules();
  const mod = await import('@/app/api/ai/route');
  return mod.POST;
}

function restoreEnv() {
  ENV_KEYS.forEach((key) => {
    const value = ORIGINAL_ENV[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  });
}

function requestWithoutSession() {
  return {
    headers: new Headers({ origin: 'http://localhost:3003' }),
    cookies: {
      get: () => undefined,
    },
    json: async () => ({ prompt: 'test', mode: 'standard', context: { voiceTone: 'default' } }),
  };
}

describe('AI route private access', () => {
  afterEach(() => {
    restoreEnv();
    vi.restoreAllMocks();
  });

  it('rejects unauthenticated requests when owner login is enabled', async () => {
    process.env.LIFEOS_AUTH_ENABLED = 'true';
    process.env.LIFEOS_AUTH_USER = 'dima';
    process.env.LIFEOS_AUTH_PASSWORD = 'strong-password';
    process.env.LIFEOS_AUTH_SECRET = '0123456789abcdefghijklmnopqrstuvwxyz-secret';

    const POST = await importPost();
    const response = await POST(requestWithoutSession() as never);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized', fallback: true });
  });

  it('fails closed when owner login is enabled but misconfigured', async () => {
    process.env.LIFEOS_AUTH_ENABLED = 'true';
    delete process.env.LIFEOS_AUTH_USER;
    delete process.env.LIFEOS_AUTH_PASSWORD;
    delete process.env.LIFEOS_AUTH_SECRET;

    const POST = await importPost();
    const response = await POST(requestWithoutSession() as never);

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Auth misconfigured', fallback: true });
  });
});
