'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { RecoveryQuest, Debt, DayPlan, UserProfile } from '@/types';
import { RecoveryQuestCard } from './RecoveryQuestCard';
import { DebtsList } from './DebtsList';
import { generateMentorMessage } from '@/lib/mockMentor';
import { generateMentorMessageAsync } from '@/lib/aiMentor';
import { buildMentorDayBrief } from '@/lib/mentorBrief';
import { loadActionCourtReviews } from '@/lib/storage';
import { Link } from '@/i18n/navigation';
import { CheckCircle2, Circle } from 'lucide-react';

interface StabilizationModeProps {
  profile: UserProfile;
  dayPlan: DayPlan | null;
  recoveryQuests: RecoveryQuest[];
  debts: Debt[];
  courtCompleted: boolean;
  onCompleteQuest: (questId: string) => void;
  onCloseDebt: (debtId: string) => void;
  onExitStabilization: () => void;
}

export function StabilizationMode({
  profile,
  dayPlan,
  recoveryQuests,
  debts,
  courtCompleted,
  onCompleteQuest,
  onCloseDebt,
  onExitStabilization,
}: StabilizationModeProps) {
  const [showingExitConfirm, setShowingExitConfirm] = useState(false);
  const t = useTranslations('stabilization');

  const openDebts = debts.filter((d) => d.status === 'open');
  const hasCriticalDebts = openDebts.some((d) => d.type === 'critical' || d.type === 'systemic');
  const completedQuests = recoveryQuests.filter((q) => q.status === 'completed');

  const canExit =
    profile.abyssIndex < 40 && !hasCriticalDebts && completedQuests.length >= 1;

  const [mentorMessage, setMentorMessage] = useState(() => {
    const brief = buildMentorDayBrief(dayPlan, []);
    const courts = loadActionCourtReviews().length;
    return generateMentorMessage({
      mode: profile.strictnessMode,
      event: 'stabilization',
      abyssIndex: profile.abyssIndex,
      innerCore: profile.innerCore,
      dayBrief: brief,
      courtHistoryCount: courts,
    });
  });

  useEffect(() => {
    let mounted = true;
    const brief = buildMentorDayBrief(dayPlan, []);
    const courts = loadActionCourtReviews().length;
    generateMentorMessageAsync(
      {
        mode: profile.strictnessMode,
        event: 'stabilization',
        abyssIndex: profile.abyssIndex,
        innerCore: profile.innerCore,
        dayBrief: brief,
        courtHistoryCount: courts,
      },
      profile.voiceTone
    ).then((msg) => {
      if (mounted) setMentorMessage(msg);
    });
    return () => {
      mounted = false;
    };
  }, [
    profile.strictnessMode,
    profile.abyssIndex,
    profile.innerCore,
    profile.voiceTone,
    dayPlan?.mainResult,
    dayPlan?.date,
  ]);

  return (
    <div className="space-y-6">
      <div
        data-state="stabilization"
        className="tactile-card border state-bg state-border-active p-6"
      >
        <div className="flex items-center gap-2 mb-3">
          <span aria-hidden="true" className="w-2 h-2 rounded-full state-dot" />
          <span className="text-sm font-semibold uppercase tracking-wider state-text">
            {t('title')}
          </span>
        </div>
        <p className="text-sm font-medium leading-relaxed state-text">
          {t('subtitle')}
        </p>
        <p className="text-xs text-[var(--text-secondary)] mt-2">
          {mentorMessage}
        </p>
      </div>

      <div className="tactile-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
          {t('mainTaskTitle')}
        </h2>
        <p className="text-base font-medium text-[var(--text-primary)] mb-2">
          {dayPlan?.minimumAction || t('mainTaskFallback')}
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          {t('mainTaskNote')}
        </p>
      </div>

      {recoveryQuests.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            {t('recoveryTitle')}
          </h2>
          {recoveryQuests.map((quest) => (
            <RecoveryQuestCard
              key={quest.id}
              quest={quest}
              onComplete={onCompleteQuest}
            />
          ))}
        </div>
      )}

      <div className="tactile-card p-5">
        <DebtsList debts={debts} onCloseDebt={onCloseDebt} />
      </div>

      {!courtCompleted && dayPlan && (
        <Link
          href="/action-court"
          className="tactile-card block p-4 text-center"
        >
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            {t('goToCourt')}
          </span>
        </Link>
      )}

      {canExit ? (
        <>
          {!showingExitConfirm ? (
            <button
              onClick={() => setShowingExitConfirm(true)}
              className="tactile-button w-full bg-[var(--state-victory)] py-3 text-sm text-[var(--text-inverse)] hover:opacity-90"
            >
              {t('exitBtn')}
            </button>
          ) : (
            <div className="tactile-card border-[var(--state-victory)] bg-[var(--state-victory-soft)] p-5">
              <h3 className="text-sm font-semibold text-[var(--state-victory)] mb-2">
                {t('controlRestored')}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                {t('canReturn')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowingExitConfirm(false)}
                  className="tactile-button tactile-button-secondary flex-1 py-2 text-sm hover:bg-[var(--bg-hover)]"
                >
                  {t('stay')}
                </button>
                <button
                  onClick={onExitStabilization}
                  className="tactile-button flex-1 bg-[var(--state-victory)] py-2 text-sm text-[var(--text-inverse)] hover:opacity-90"
                >
                  {t('returnToGoal')}
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="tactile-card p-4">
          <p className="text-xs text-[var(--text-muted)]">
            {t('exitConditions')}
          </p>
          <ul className="text-xs text-[var(--text-muted)] mt-2 space-y-1">
            <li className={`flex items-center gap-2 ${profile.abyssIndex < 40 ? 'text-[var(--state-victory)]' : ''}`}>
              {profile.abyssIndex < 40 ? (
                <CheckCircle2 aria-hidden="true" size={14} strokeWidth={1.8} />
              ) : (
                <Circle aria-hidden="true" size={14} strokeWidth={1.8} />
              )}
              {t('conditionAbyss')}
            </li>
            <li className={`flex items-center gap-2 ${!hasCriticalDebts ? 'text-[var(--state-victory)]' : ''}`}>
              {!hasCriticalDebts ? (
                <CheckCircle2 aria-hidden="true" size={14} strokeWidth={1.8} />
              ) : (
                <Circle aria-hidden="true" size={14} strokeWidth={1.8} />
              )}
              {t('conditionDebts')}
            </li>
            <li className={`flex items-center gap-2 ${completedQuests.length >= 1 ? 'text-[var(--state-victory)]' : ''}`}>
              {completedQuests.length >= 1 ? (
                <CheckCircle2 aria-hidden="true" size={14} strokeWidth={1.8} />
              ) : (
                <Circle aria-hidden="true" size={14} strokeWidth={1.8} />
              )}
              {t('conditionQuests')}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
