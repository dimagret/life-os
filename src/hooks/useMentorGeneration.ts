import { useState, useEffect } from 'react';
import type { UserProfile } from '@/types';
import { generateMentorMessage } from '@/lib/mockMentor';
import { generateMentorMessageAsync } from '@/lib/aiMentor';
import { getMentorOfflineOnly, subscribeMentorOfflineOnly } from '@/lib/aiPreferences';

export type MentorTipSource = 'mock' | 'ai' | 'offline_pref';

export function useMentorGeneration(
  profile: UserProfile | null,
  options?: { dayBrief?: string; courtHistoryCount?: number }
) {
  const [mentorTip, setMentorTip] = useState('');
  const [source, setSource] = useState<MentorTipSource>('mock');

  const dayBrief = options?.dayBrief;
  const courtHistoryCount = options?.courtHistoryCount;

  useEffect(() => {
    if (!profile) return;

    let mounted = true;
    let debounceId: number | undefined;

    const run = () => {
      const p = profile;
      const ctx = {
        mode: p.strictnessMode,
        event: 'day_order' as const,
        abyssIndex: p.abyssIndex,
        innerCore: p.innerCore,
        dayBrief,
        courtHistoryCount,
      };

      const syncMsg = generateMentorMessage(ctx);
      if (mounted) {
        setMentorTip(syncMsg);
        setSource('mock');
      }

      void (async () => {
        const msg = await generateMentorMessageAsync(ctx, p.voiceTone);
        if (!mounted) return;
        setMentorTip(msg);
        setSource(getMentorOfflineOnly() ? 'offline_pref' : 'ai');
      })();
    };

    const schedule = () => {
      if (debounceId !== undefined) window.clearTimeout(debounceId);
      debounceId = window.setTimeout(run, 380);
    };

    schedule();
    const unsub = subscribeMentorOfflineOnly(schedule);

    return () => {
      mounted = false;
      unsub();
      if (debounceId !== undefined) window.clearTimeout(debounceId);
    };
  }, [
    profile,
    profile?.strictnessMode,
    profile?.voiceTone,
    profile?.abyssIndex,
    profile?.innerCore,
    dayBrief,
    courtHistoryCount,
  ]);

  return { mentorTip, mentorTipSource: source };
}
