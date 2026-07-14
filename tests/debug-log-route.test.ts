import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_ENABLE_DEBUG_LOG_ENDPOINT = process.env.ENABLE_DEBUG_LOG_ENDPOINT;

async function importPost() {
  vi.resetModules();
  const mod = await import('@/app/api/debug-log/route');
  return mod.POST;
}

function restoreEnv() {
  if (ORIGINAL_NODE_ENV === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  }

  if (ORIGINAL_ENABLE_DEBUG_LOG_ENDPOINT === undefined) {
    delete process.env.ENABLE_DEBUG_LOG_ENDPOINT;
  } else {
    process.env.ENABLE_DEBUG_LOG_ENDPOINT = ORIGINAL_ENABLE_DEBUG_LOG_ENDPOINT;
  }
}

describe('debug-log route env gating', () => {
  afterEach(() => {
    restoreEnv();
    vi.restoreAllMocks();
  });

  it('returns 404 in production even when endpoint flag is enabled', async () => {
    process.env.NODE_ENV = 'production';
    process.env.ENABLE_DEBUG_LOG_ENDPOINT = 'true';
    const POST = await importPost();

    const response = await POST(
      new Request('http://localhost/api/debug-log', {
        method: 'POST',
        body: JSON.stringify({ message: 'test' }),
      }) as never,
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Not found' });
  });

  it('returns 404 outside production when endpoint flag is not true', async () => {
    process.env.NODE_ENV = 'development';
    process.env.ENABLE_DEBUG_LOG_ENDPOINT = 'false';
    const POST = await importPost();

    const response = await POST(
      new Request('http://localhost/api/debug-log', {
        method: 'POST',
        body: JSON.stringify({ message: 'test' }),
      }) as never,
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Not found' });
  });

  it('allows requests outside production when endpoint flag is true', async () => {
    process.env.NODE_ENV = 'development';
    process.env.ENABLE_DEBUG_LOG_ENDPOINT = 'true';
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const POST = await importPost();

    const response = await POST(
      new Request('http://localhost/api/debug-log', {
        method: 'POST',
        body: JSON.stringify({ message: 'test' }),
      }) as never,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(debugSpy).toHaveBeenCalled();
  });
});
