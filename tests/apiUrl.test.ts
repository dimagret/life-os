import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('resolveApiPath', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('на сервере без window возвращает путь как есть', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://deploy.example');
    const { resolveApiPath } = await import('@/lib/capacitor/apiUrl');
    expect(resolveApiPath('/api/ai')).toBe('/api/ai');
  });

  it('если origin совпадает с NEXT_PUBLIC_SITE_URL — относительный URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://deploy.example');
    vi.stubGlobal('window', {
      location: { origin: 'https://deploy.example' },
    } as Window & typeof globalThis);
    const { resolveApiPath } = await import('@/lib/capacitor/apiUrl');
    expect(resolveApiPath('/api/ai/health')).toBe('/api/ai/health');
  });

  it('если origin другой — абсолютный URL к деплою', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://deploy.example');
    vi.stubGlobal('window', {
      location: { origin: 'capacitor://localhost' },
    } as Window & typeof globalThis);
    const { resolveApiPath } = await import('@/lib/capacitor/apiUrl');
    expect(resolveApiPath('/api/ai')).toBe('https://deploy.example/api/ai');
  });
});
