import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/rateLimit', () => ({
  getClientIp: () => '127.0.0.1',
  rateLimit: async () => ({
    ok: true,
    limit: 20,
    remaining: 19,
    reset: Date.now() + 60_000,
  }),
}));

const ENV_KEYS = [
  'ALLOWED_ORIGINS',
  'OPENROUTER_API_KEY',
  'LIFEOS_AUTH_ENABLED',
  'LIFEOS_AUTH_USER',
  'LIFEOS_AUTH_PASSWORD',
  'LIFEOS_AUTH_SECRET',
] as const;
const ORIGINAL_ENV = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

function restoreEnv() {
  ENV_KEYS.forEach((key) => {
    const value = ORIGINAL_ENV[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  });
}

function makeRequest(origin: string) {
  return new NextRequest('http://127.0.0.1:3003/api/ai', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      host: '127.0.0.1:3003',
      origin,
    },
    body: JSON.stringify({
      prompt: 'test',
      mode: 'standard',
      context: { voiceTone: 'default' },
    }),
  });
}

async function importPost() {
  vi.resetModules();
  const mod = await import('@/app/api/ai/route');
  return mod.POST;
}

describe('AI route origin validation', () => {
  afterEach(() => {
    restoreEnv();
    vi.restoreAllMocks();
  });

  it('allows the application same-origin request even when the deploy allowlist differs', async () => {
    process.env.ALLOWED_ORIGINS = 'https://deploy.example';
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.LIFEOS_AUTH_ENABLED;
    delete process.env.LIFEOS_AUTH_USER;
    delete process.env.LIFEOS_AUTH_PASSWORD;
    delete process.env.LIFEOS_AUTH_SECRET;

    const POST = await importPost();
    const response = await POST(makeRequest('http://127.0.0.1:3003'));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Service unavailable', fallback: true });
  });

  it('still rejects an origin outside both same-origin and the allowlist', async () => {
    process.env.ALLOWED_ORIGINS = 'https://deploy.example';
    delete process.env.LIFEOS_AUTH_ENABLED;
    delete process.env.LIFEOS_AUTH_USER;
    delete process.env.LIFEOS_AUTH_PASSWORD;
    delete process.env.LIFEOS_AUTH_SECRET;

    const POST = await importPost();
    const response = await POST(makeRequest('https://untrusted.example'));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Forbidden origin', fallback: true });
  });
});