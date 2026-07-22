'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ActivationPrototype, type ActivationSubmission } from './ActivationPrototype';
import { completeActivation } from '@/lib/activationCompletion';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { setStorageAccountScope, snapshotAllStorage } from '@/lib/storage';

export function AuthenticatedActivation() {
  const rawLocale = useLocale();
  const locale = rawLocale === 'en' ? 'en' : 'ru';
  const tToday = useTranslations('today');
  const supabase = createSupabaseBrowserClient();
  const [account, setAccount] = useState<{ id: string; email: string } | null>(null);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setStorageAccountScope(data.user.id);
        setAccount({ id: data.user.id, email: data.user.email });
      }
    });
  }, [supabase]);

  if (!supabase || !account) return null;

  const complete = async (submission: ActivationSubmission) => {
    completeActivation({
      input: submission,
      locale,
      tToday: (key, values) => tToday(key as never, values as never),
    });
    const { error } = await supabase.from('user_states').upsert({
      user_id: account.id,
      payload: snapshotAllStorage(),
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(locale === 'ru' ? '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0434\u0430\u043d\u043d\u044b\u0435.' : 'Could not save your data.');
    window.location.assign(`/${locale}`);
  };

  return (
    <ActivationPrototype
      mode="production"
      initialEmail={account.email}
      startAt="commitment"
      onComplete={complete}
    />
  );
}
