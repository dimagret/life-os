'use client';

import { useLocale, useTranslations } from 'next-intl';
import { ActivationPrototype, type ActivationSubmission, type RegistrationCredentials, type RegistrationResult } from '@/components/activation/ActivationPrototype';
import { completeActivation } from '@/lib/activationCompletion';
import { LEGAL_DOCUMENT_VERSION } from '@/lib/legal';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { setStorageAccountScope, snapshotAllStorage } from '@/lib/storage';

function registrationErrorMessage(code: string | undefined, locale: 'ru' | 'en'): string {
  const russian = locale === 'ru';

  switch (code) {
    case 'over_email_send_rate_limit':
      return russian ? '\u041f\u0438\u0441\u044c\u043c\u043e \u0443\u0436\u0435 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u043e. \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u043f\u043e\u0447\u0442\u0443 \u0438 \u0441\u043f\u0430\u043c.' : 'The email was already sent. Check your inbox and spam.';
    case 'weak_password':
      return russian ? '\u041f\u0430\u0440\u043e\u043b\u044c \u043d\u0435 \u0441\u043e\u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u0435\u0442 \u0442\u0440\u0435\u0431\u043e\u0432\u0430\u043d\u0438\u044f\u043c \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438.' : 'The password does not meet the security requirements.';
    case 'email_address_invalid':
      return russian ? '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0439 email.' : 'Enter a valid email address.';
    case 'email_address_not_authorized':
      return russian ? '\u042d\u0442\u043e\u0442 \u0430\u0434\u0440\u0435\u0441 \u043d\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0451\u043d \u0434\u043b\u044f \u0432\u0441\u0442\u0440\u043e\u0435\u043d\u043d\u043e\u0439 \u043f\u043e\u0447\u0442\u044b Supabase. \u0414\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u0435\u0433\u043e \u0432 \u043a\u043e\u043c\u0430\u043d\u0434\u0443 \u043f\u0440\u043e\u0435\u043a\u0442\u0430 \u0438\u043b\u0438 \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u0442\u0435 SMTP.' : 'This address is not authorized for Supabase built-in email. Add it to the project team or configure SMTP.';
    default:
      return russian ? '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0430\u043a\u043a\u0430\u0443\u043d\u0442. \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 email \u0438 \u0442\u0440\u0435\u0431\u043e\u0432\u0430\u043d\u0438\u044f \u043a \u043f\u0430\u0440\u043e\u043b\u044e.' : 'Could not create the account. Check the email and password requirements.';
  }
}

export function RegistrationClient() {
  const rawLocale = useLocale();
  const locale = rawLocale === 'en' ? 'en' : 'ru';
  const tToday = useTranslations('today');
  const supabase = createSupabaseBrowserClient();

  const register = async ({ email, password }: RegistrationCredentials): Promise<RegistrationResult> => {
    if (!supabase) {
      throw new Error(locale === 'ru' ? 'Supabase \u043d\u0435 \u043d\u0430\u0441\u0442\u0440\u043e\u0435\u043d.' : 'Supabase is not configured.');
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || window.location.origin;
    const consentAt = new Date().toISOString();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback?next=/${locale}`,
        data: {
          personal_data_consent: true,
          personal_data_consent_version: LEGAL_DOCUMENT_VERSION,
          personal_data_consent_at: consentAt,
        },
      },
    });

    if (error) {
      throw new Error(registrationErrorMessage(error.code, locale));
    }
    if (!data.user) {
      throw new Error(locale === 'ru' ? '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0430\u043a\u043a\u0430\u0443\u043d\u0442.' : 'Could not create the account.');
    }
    if (!data.session) {
      return { status: 'confirmation-required' };
    }

    setStorageAccountScope(data.user.id);
    return { status: 'authenticated' };
  };

  const complete = async (submission: ActivationSubmission) => {
    if (!supabase) throw new Error(locale === 'ru' ? 'Supabase \u043d\u0435 \u043d\u0430\u0441\u0442\u0440\u043e\u0435\u043d.' : 'Supabase is not configured.');

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      throw new Error(locale === 'ru' ? '\u0421\u0435\u0441\u0441\u0438\u044f \u0438\u0441\u0442\u0435\u043a\u043b\u0430. \u0412\u043e\u0439\u0434\u0438\u0442\u0435 \u0441\u043d\u043e\u0432\u0430.' : 'Your session expired. Sign in again.');
    }

    setStorageAccountScope(authData.user.id);
    completeActivation({
      input: submission,
      locale,
      tToday: (key, values) => tToday(key as never, values as never),
    });

    const { error } = await supabase.from('user_states').upsert({
      user_id: authData.user.id,
      payload: snapshotAllStorage(),
      updated_at: new Date().toISOString(),
    });
    if (error) {
      throw new Error(locale === 'ru' ? '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0434\u0430\u043d\u043d\u044b\u0435 \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u0430.' : 'Could not save account data.');
    }

    window.location.assign(`/${locale}`);
  };

  return <ActivationPrototype mode="production" onRegister={register} onComplete={complete} />;
}
