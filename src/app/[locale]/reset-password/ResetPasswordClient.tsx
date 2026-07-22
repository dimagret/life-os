'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { passwordRecoveryCopy } from '@/lib/passwordRecoveryCopy';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type RecoveryState = 'checking' | 'ready' | 'expired';

export function ResetPasswordClient() {
  const rawLocale = useLocale();
  const locale = rawLocale === 'en' ? 'en' : 'ru';
  const copy = passwordRecoveryCopy[locale];
  const supabase = createSupabaseBrowserClient();
  const [recoveryState, setRecoveryState] = useState<RecoveryState>('checking');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    const checkRecoverySession = async () => {
      if (!supabase) {
        if (active) setRecoveryState('expired');
        return;
      }

      try {
        const { data, error: authError } = await supabase.auth.getUser();
        if (active) setRecoveryState(authError || !data.user ? 'expired' : 'ready');
      } catch {
        if (active) setRecoveryState('expired');
      }
    };

    void checkRecoverySession();
    return () => {
      active = false;
    };
  }, [supabase]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(copy.passwordTooShort);
      return;
    }
    if (password !== passwordConfirmation) {
      setError(copy.passwordsMismatch);
      return;
    }
    if (!supabase || recoveryState !== 'ready') {
      setError(copy.sessionExpired);
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.code === 'weak_password' ? copy.passwordWeak : copy.updateError);
        return;
      }

      await supabase.auth.signOut({ scope: 'local' });
      window.location.assign(`/${locale}/login?reset=success`);
    } catch {
      setError(copy.updateError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 flex items-center">
      <div className="w-full max-w-sm mx-auto">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-2">Life OS</p>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{copy.resetTitle}</h1>
          <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">{copy.resetSubtitle}</p>
        </div>

        <section className="tactile-card space-y-4 p-4" aria-live="polite">
          {recoveryState === 'checking' && (
            <p className="text-sm text-[var(--text-muted)]">{copy.checkingSession}</p>
          )}

          {recoveryState === 'expired' && (
            <>
              <p role="alert" className="rounded-lg border border-[var(--state-deception-border)] bg-[var(--state-deception-soft)] px-3 py-2 text-sm text-[var(--state-deception)] leading-relaxed">
                {copy.sessionExpired}
              </p>
              <a
                className="tactile-button block w-full py-3 text-center text-sm bg-[var(--accent-brand)] text-[var(--text-inverse)] hover:opacity-90"
                href={`/${locale}/forgot-password`}
              >
                {copy.requestNewLink}
              </a>
            </>
          )}

          {recoveryState === 'ready' && (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="lifeos-reset-password"
                  className="text-xs uppercase tracking-wider text-[var(--text-muted)] block mb-1.5"
                >
                  {copy.newPassword}
                </label>
                <input
                  id="lifeos-reset-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="tactile-field w-full px-3 py-3 text-sm placeholder:text-[var(--text-disabled)] focus:outline-none focus:border-[var(--accent-brand)]"
                  placeholder={copy.passwordPlaceholder}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="lifeos-reset-password-confirmation"
                  className="text-xs uppercase tracking-wider text-[var(--text-muted)] block mb-1.5"
                >
                  {copy.confirmPassword}
                </label>
                <input
                  id="lifeos-reset-password-confirmation"
                  type="password"
                  autoComplete="new-password"
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  className="tactile-field w-full px-3 py-3 text-sm placeholder:text-[var(--text-disabled)] focus:outline-none focus:border-[var(--accent-brand)]"
                  placeholder={copy.passwordPlaceholder}
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
                disabled={saving || !password || !passwordConfirmation}
                className={`tactile-button w-full py-3 text-sm transition-all ${
                  saving || !password || !passwordConfirmation
                    ? 'bg-[var(--bg-hover)] text-[var(--text-disabled)] cursor-not-allowed'
                    : 'bg-[var(--accent-brand)] text-[var(--text-inverse)] hover:opacity-90'
                }`}
              >
                {saving ? copy.saving : copy.save}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
