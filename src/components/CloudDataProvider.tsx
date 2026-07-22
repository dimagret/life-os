'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  LIFEOS_STATE_CHANGED_EVENT,
  restoreSnapshot,
  setStorageAccountScope,
  snapshotAllStorage,
  type StorageSnapshot,
} from '@/lib/storage';

function isStorageSnapshot(value: unknown): value is StorageSnapshot {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function CloudDataProvider({ children }: { children: ReactNode }) {
  const supabase = createSupabaseBrowserClient();
  const [initializing, setInitializing] = useState(Boolean(supabase));
  const userIdRef = useRef<string | null>(null);
  const syncTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!supabase) {
      setStorageAccountScope(null);
      return;
    }

    let active = true;

    const hydrate = async (userId: string | null) => {
      userIdRef.current = userId;
      setStorageAccountScope(userId);
      if (!userId) {
        if (active) setInitializing(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_states')
        .select('payload')
        .eq('user_id', userId)
        .maybeSingle();

      if (!active) return;
      if (!error && isStorageSnapshot(data?.payload)) {
        restoreSnapshot(data.payload, false);
      } else if (!error && !data) {
        await supabase.from('user_states').upsert({
          user_id: userId,
          payload: snapshotAllStorage(),
          updated_at: new Date().toISOString(),
        });
      }
      setInitializing(false);
    };

    supabase.auth.getUser().then(({ data }) => hydrate(data.user?.id ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void hydrate(session?.user.id ?? null);
    });

    const queueSync = () => {
      const userId = userIdRef.current;
      if (!userId) return;
      if (syncTimerRef.current !== null) window.clearTimeout(syncTimerRef.current);
      syncTimerRef.current = window.setTimeout(() => {
        syncTimerRef.current = null;
        void supabase.from('user_states').upsert({
          user_id: userId,
          payload: snapshotAllStorage(),
          updated_at: new Date().toISOString(),
        });
      }, 350);
    };

    window.addEventListener(LIFEOS_STATE_CHANGED_EVENT, queueSync);
    return () => {
      active = false;
      listener.subscription.unsubscribe();
      window.removeEventListener(LIFEOS_STATE_CHANGED_EVENT, queueSync);
      if (syncTimerRef.current !== null) window.clearTimeout(syncTimerRef.current);
    };
  }, [supabase]);

  if (initializing) {
    return (
      <main className="min-h-screen grid place-items-center bg-[var(--bg-primary)] text-[var(--text-muted)]">
        <p className="text-sm">Life OS</p>
      </main>
    );
  }

  return children;
}
