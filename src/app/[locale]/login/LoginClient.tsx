'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useShell } from '@/lib/shell-context';

function isSafeNextPath(value: string | null, locale: string): value is string {
  if (!value) return false;
  if (!value.startsWith(`/${locale}`)) return false;
  if (value.startsWith(`/${locale}/login`)) return false;
  return !/^https?:\/\//i.test(value) && !value.startsWith('//');
}

export function LoginClient() {
  const t = useTranslations('login');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { setHideShell } = useShell();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nextPath = useMemo(() => {
    const requested = searchParams.get('next');
    return isSafeNextPath(requested, locale) ? requested : `/${locale}`;
  }, [locale, searchParams]);

  useEffect(() => {
    setHideShell(true);
    return () => setHideShell(false);
  }, [setHideShell]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        window.location.assign(nextPath);
        return;
      }

      if (response.status === 401) {
        setError(t('invalid'));
      } else if (response.status === 429) {
        setError(t('rateLimited'));
      } else if (response.status === 500) {
        setError(t('misconfigured'));
      } else {
        setError(t('genericError'));
      }
    } catch {
      setError(t('networkError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 flex items-center">
      <div className="w-full max-w-sm mx-auto">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-2">
            Life OS
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            {t('title')}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
            {t('subtitle')}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="tactile-card space-y-4 p-4"
        >
          <div>
            <label
              htmlFor="lifeos-login-username"
              className="text-xs uppercase tracking-wider text-[var(--text-muted)] block mb-1.5"
            >
              {t('username')}
            </label>
            <input
              id="lifeos-login-username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="tactile-field w-full px-3 py-3 text-sm placeholder:text-[var(--text-disabled)] focus:outline-none focus:border-[var(--accent-brand)]"
              placeholder={t('usernamePlaceholder')}
            />
          </div>

          <div>
            <label
              htmlFor="lifeos-login-password"
              className="text-xs uppercase tracking-wider text-[var(--text-muted)] block mb-1.5"
            >
              {t('password')}
            </label>
            <input
              id="lifeos-login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="tactile-field w-full px-3 py-3 text-sm placeholder:text-[var(--text-disabled)] focus:outline-none focus:border-[var(--accent-brand)]"
              placeholder={t('passwordPlaceholder')}
            />
          </div>

          {error && (
            <p className="rounded-lg border border-[var(--state-deception-border)] bg-[var(--state-deception-soft)] px-3 py-2 text-xs text-[var(--state-deception)] leading-relaxed">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className={`tactile-button w-full py-3 text-sm transition-all ${
              loading || !username.trim() || !password
                ? 'bg-[var(--bg-hover)] text-[var(--text-disabled)] cursor-not-allowed'
                : 'bg-[var(--accent-brand)] text-[var(--text-inverse)] hover:opacity-90'
            }`}
          >
            {loading ? t('loading') : t('submit')}
          </button>
        </form>
      </div>
    </main>
  );
}
