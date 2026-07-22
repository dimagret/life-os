'use client';

import { FormEvent, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { passwordRecoveryCopy } from '@/lib/passwordRecoveryCopy';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

function isSafeNextPath(value: string | null | undefined, locale: string): value is string {
  if (!value) return false;
  if (!value.startsWith(`/${locale}`)) return false;
  if (value.startsWith(`/${locale}/login`)) return false;
  return !/^https?:\/\//i.test(value) && !value.startsWith('//');
}

export function LoginClient({
  requestedNextPath,
  passwordResetSucceeded = false,
}: {
  requestedNextPath?: string | null;
  passwordResetSucceeded?: boolean;
}) {
  const t = useTranslations('login');
  const locale = useLocale();
  const recoveryCopy = passwordRecoveryCopy[locale === 'en' ? 'en' : 'ru'];
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nextPath = isSafeNextPath(requestedNextPath, locale) ? requestedNextPath : `/${locale}`;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      if (supabase) {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: username.trim(),
          password,
        });
        if (authError) {
          setError(t('invalid'));
          return;
        }
        window.location.assign(nextPath);
        return;
      }
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
    <main className="auth-surface-dark min-h-screen px-4 py-8 flex items-center">
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

        {passwordResetSucceeded && (
          <p role="status" className="mb-4 rounded-lg border border-[var(--accent-brand)] bg-[var(--accent-brand-soft)] px-3 py-2 text-sm text-[var(--text-primary)] leading-relaxed">
            {recoveryCopy.passwordResetSuccess}
          </p>
        )}

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
            <p className="mt-2 text-right text-xs">
              <a className="text-[var(--accent-brand)] hover:underline" href={`/${locale}/forgot-password`}>
                {recoveryCopy.forgotPassword}
              </a>
            </p>
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-[var(--state-deception-border)] bg-[var(--state-deception-soft)] px-3 py-2 text-xs text-[var(--state-deception)] leading-relaxed">
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
        <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
          {locale === 'ru' ? '\u041d\u0435\u0442 \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u0430?' : 'No account yet?'}{' '}
          <a className="text-[var(--accent-brand)] hover:underline" href={`/${locale}/register`}>
            {locale === 'ru' ? '\u041f\u0440\u043e\u0439\u0442\u0438 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044e' : 'Create an account'}
          </a>
        </p>
        <nav aria-label={locale === 'ru' ? 'Юридические документы' : 'Legal documents'} className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-[var(--text-muted)]">
          <a className="hover:text-[var(--accent-brand)] hover:underline" href={`/${locale}/legal/privacy`}>{locale === 'ru' ? 'Обработка данных' : 'Privacy'}</a>
          <a className="hover:text-[var(--accent-brand)] hover:underline" href={`/${locale}/legal/consent`}>{locale === 'ru' ? 'Согласие' : 'Consent'}</a>
          <a className="hover:text-[var(--accent-brand)] hover:underline" href={`/${locale}/legal/cookies`}>Cookies</a>
        </nav>
      </div>
    </main>
  );
}
