import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

const SITE_URL_KEY = 'NEXT_PUBLIC_SITE_URL';
const originalSiteUrl = process.env[SITE_URL_KEY];

async function importGetWithSupabase(supabase: unknown) {
  vi.resetModules();
  const { createSupabaseServerClient } = await import('@/lib/supabase/server');
  vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never);
  return (await import('@/app/auth/callback/route')).GET;
}

describe('Supabase callback route', () => {
  afterEach(() => {
    if (originalSiteUrl === undefined) delete process.env[SITE_URL_KEY];
    else process.env[SITE_URL_KEY] = originalSiteUrl;
    vi.clearAllMocks();
  });

  it('redirects callback failures through the configured public origin', async () => {
    process.env[SITE_URL_KEY] = 'https://lifeosclub.ru/';
    const GET = await importGetWithSupabase(null);

    const response = await GET(new NextRequest('https://localhost:3000/auth/callback?next=/ru'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://lifeosclub.ru/ru/login?error=confirmation');
  });

  it('redirects completed callbacks through the configured public origin', async () => {
    process.env[SITE_URL_KEY] = 'https://lifeosclub.ru/';
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
    const GET = await importGetWithSupabase({
      auth: { exchangeCodeForSession },
    });

    const response = await GET(new NextRequest('https://localhost:3000/auth/callback?code=code&next=/ru'));

    expect(exchangeCodeForSession).toHaveBeenCalledWith('code');
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://lifeosclub.ru/ru');
  });

  it('keeps the password-recovery callback on the protected reset screen', async () => {
    process.env[SITE_URL_KEY] = 'https://lifeosclub.ru/';
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
    const GET = await importGetWithSupabase({
      auth: { exchangeCodeForSession },
    });

    const response = await GET(
      new NextRequest('https://localhost:3000/auth/callback?code=code&next=/ru/reset-password'),
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith('code');
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://lifeosclub.ru/ru/reset-password');
  });
});
