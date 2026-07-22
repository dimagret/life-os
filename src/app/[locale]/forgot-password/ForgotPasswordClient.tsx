'use client';

import { FormEvent, useState } from 'react';
import { useLocale } from 'next-intl';
import { passwordRecoveryCopy } from '@/lib/passwordRecoveryCopy';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function ForgotPasswordClient() {
  const rawLocale = useLocale();
  const locale = rawLocale === 'en' ? 'en' : 'ru';
  const copy = passwordRecoveryCopy[locale];
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim();

    if (!isValidEmail(normalizedEmail)) {
      setError(copy.emailInvalid);
      return;
    }
    if (!supabase) {
      setError(copy.unavailable);
      return;
    }

    setError(null);
    setSending(true);

    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || window.location.origin;
      const { error: requestError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${siteUrl}/auth/callback?next=/${locale}/reset-password`,
      });

      if (requestError) {
        setError(requestError.code === 'over_email_send_rate_limit' ? copy.requestRateLimited : copy.requestError);
        return;
      }

      setSent(true);
    } catch {
      setError(copy.requestError);
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 flex items-center">
      <div className="w-full max-w-sm mx-auto">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-2">Life OS</p>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{copy.requestTitle}</h1>
          <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">{copy.requestSubtitle}</p>
        </div>

        <section className="tactile-card space-y-4 p-4" aria-live="polite">
          {sent ? (
            <>
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">{copy.sentTitle}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{copy.sentMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="tactile-button w-full py-3 text-sm bg-[var(--bg-hover)] text-[var(--text-primary)] hover:opacity-90"
              >
                {copy.requestNewLink}
              </button>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="lifeos-forgot-password-email"
                  className="text-xs uppercase tracking-wider text-[var(--text-muted)] block mb-1.5"
                >
                  {copy.email}
                </label>
                <input
                  id="lifeos-forgot-password-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="tactile-field w-full px-3 py-3 text-sm placeholder:text-[var(--text-disabled)] focus:outline-none focus:border-[var(--accent-brand)]"
                  placeholder={copy.emailPlaceholder}
                  required
                />
              </div>

              {error && (
                <p role="alert" className="rounded-lg border border-[var(--state-deception-border)] bg-[var(--state-deception-soft)] px-3 py-2 text-xs text-[var(--state-deception)] leading-relaxed">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={sending || !email.trim()}
                className={`tactile-button w-full py-3 text-sm transition-all ${
                  sending || !email.trim()
                    ? 'bg-[var(--bg-hover)] text-[var(--text-disabled)] cursor-not-allowed'
                    : 'bg-[var(--accent-brand)] text-[var(--text-inverse)] hover:opacity-90'
                }`}
              >
                {sending ? copy.sending : copy.send}
              </button>
            </form>
          )}
        </section>

        <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
          <a className="text-[var(--accent-brand)] hover:underline" href={`/${locale}/login`}>
            {copy.backToLogin}
          </a>
        </p>
      </div>
    </main>
  );
}
