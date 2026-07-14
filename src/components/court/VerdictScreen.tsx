'use client';

import { useTranslations, useLocale } from 'next-intl';
import { ChevronDown, Compass, RotateCcw } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { stripLegacyTodayFromTaskTitle } from '@/lib/utils';
import type {
  Verdict,
  UserProfile,
  UiState,
  VerdictSessionSnapshot,
  VerdictTaskSummary,
} from '@/types';
import styles from './VerdictScreen.module.css';

export type VerdictTaskOutcome = {
  taskId: string;
  title: string;
  outcome: 'completed' | 'partial' | 'failed';
};

interface VerdictScreenProps {
  verdict: Verdict;
  xpDelta: number;
  innerCoreDelta: number;
  abyssIndexDelta: number;
  mentorMessage: string;
  debtCreated: boolean;
  debtType?: string;
  recoveryQuest?: {
    title: string;
    description: string;
    xpRestore: number;
    innerCoreReward: number;
    abyssReduction: number;
    status: 'planned';
  } | null;
  stabilizationTriggered: boolean;
  profile: UserProfile | null;
  /** Итог по задачам дня из разбора дня */
  taskOutcomes?: VerdictTaskOutcome[];
  /** Детальный итог дня (3 задачи, факторы, шаги) */
  sessionSnapshot?: VerdictSessionSnapshot;
  /** Локализованная дата дня (например «понедельник, 5 мая») */
  sessionDateLabel?: string;
  /** Главный результат из приказа дня */
  mainResult?: string;
  /** Недельный ориентир — отдельно от дневных карточек задач */
  weeklyTrajectory?: string;
  tomorrowAdjustment?: string;
}

function streakLabel(n: number, locale: string): string {
  if (locale === 'en') return `${n} ${n === 1 ? 'day' : 'days'}`;
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} день`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} дня`;
  return `${n} дней`;
}

function outcomeClass(outcome: VerdictTaskOutcome['outcome']) {
  switch (outcome) {
    case 'completed':
      return 'text-[var(--state-victory)]';
    case 'partial':
      return 'text-[var(--state-risk)]';
    default:
      return 'text-[var(--state-deception)]';
  }
}

export function VerdictScreen({
  verdict,
  xpDelta,
  innerCoreDelta,
  abyssIndexDelta,
  mentorMessage,
  debtCreated,
  debtType,
  recoveryQuest,
  stabilizationTriggered,
  profile,
  taskOutcomes,
  sessionSnapshot,
  sessionDateLabel,
  mainResult,
  weeklyTrajectory,
  tomorrowAdjustment,
}: VerdictScreenProps) {
  const t = useTranslations('verdict');
  const locale = useLocale();

  const verdictState: UiState =
    verdict === 'self_victory' || verdict === 'recovered_victory'
      ? 'victory'
      : verdict === 'self_deception'
        ? 'deception'
        : verdict === 'failure'
          ? 'stabilization'
          : verdict === 'respectful_transfer'
            ? 'hold'
            : 'control';

  const showGoalsLink =
    !!profile && (debtCreated || stabilizationTriggered || profile.abyssIndex >= 41);
  const showProfileDebtsLink = debtCreated;

  const summaries = sessionSnapshot?.taskSummaries;
  const counts = summaries
    ? {
        done: summaries.filter((s) => s.outcome === 'completed').length,
        partial: summaries.filter((s) => s.outcome === 'partial').length,
        failed: summaries.filter((s) => s.outcome === 'failed').length,
      }
    : null;

  const focusRecap = sessionSnapshot?.focusRecap;
  const recapTaskSummary = focusRecap
    ? summaries?.find((s) => s.taskId === focusRecap.taskId)
    : undefined;
  const showFocusRecap =
    !!focusRecap &&
    recapTaskSummary?.outcome === 'completed' &&
    focusRecap.fullDurationHonored &&
    focusRecap.distractionsCount > 2;

  const showFocusCommentOnly =
    !!focusRecap &&
    recapTaskSummary?.outcome === 'completed' &&
    focusRecap.distractionsCount <= 2 &&
    !!focusRecap.sessionComment?.trim();

  const showFocusRecoveryHint =
    !!focusRecap &&
    recapTaskSummary?.outcome === 'completed' &&
    focusRecap.fullDurationHonored &&
    focusRecap.distractionsCount > 2 &&
    !!focusRecap.suggestRecoveryMinutes;


  const taskTotal = summaries?.length ?? taskOutcomes?.length ?? 0;
  const taskDone = counts?.done ?? taskOutcomes?.filter((row) => row.outcome === 'completed').length ?? 0;
  const recoveryState: UiState = debtCreated
    ? 'risk'
    : stabilizationTriggered
      ? 'stabilization'
      : 'hold';
  const showRecoverySystem =
    debtCreated ||
    !!recoveryQuest ||
    stabilizationTriggered ||
    (!!profile && profile.abyssIndex >= 50) ||
    showFocusRecap ||
    showFocusCommentOnly ||
    showFocusRecoveryHint;

  return (
    <div className="app-page">
      <header className={styles.pageHeader}>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          {t('title')}
        </h1>
        {sessionDateLabel && (
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {t('sessionSubtitle', { date: sessionDateLabel })}
          </p>
        )}
      </header>

      <section data-state={verdictState} className={`tactile-card ${styles.summaryCard}`}>
        <div className={styles.summarySection}>
          <div className={styles.summaryTop}>
            <div>
              <p className={styles.eyebrow}>{t('mainVerdictHeading')}</p>
              <h2 className={styles.verdictTitle}>
                {sessionSnapshot
                  ? t(`mainCategory.${sessionSnapshot.mainCategory}` as Parameters<typeof t>[0])
                  : t(`labels.${verdict}`)}
              </h2>
            </div>
            <span className={styles.stateBadge}>{t(`labels.${verdict}`)}</span>
          </div>

          {sessionSnapshot && (
            <p className={styles.verdictBrief}>
              {t(`verdictBrief.${verdict}` as Parameters<typeof t>[0], {
                done: counts?.done ?? 0,
                partial: counts?.partial ?? 0,
                failed: counts?.failed ?? 0,
                total: summaries?.length ?? 3,
              })}
            </p>
          )}

          <div className={styles.summaryNote}>
            <p>{mentorMessage}</p>
          </div>
        </div>

        {(mainResult?.trim() || weeklyTrajectory?.trim()) && (
          <div className={styles.summarySection}>
            {mainResult?.trim() && (
              <div>
                <p className={styles.eyebrow}>{t('mainResultLabel')}</p>
                <p className={styles.mainResult}>{mainResult.trim()}</p>
              </div>
            )}

            {weeklyTrajectory?.trim() && (
              <div className={styles.weeklyOrient}>
                <Compass size={15} strokeWidth={1.8} aria-hidden="true" />
                <p>
                  <span className="font-medium text-[var(--text-secondary)]">{t('weeklyOrientAsideTitle')}:</span>{' '}
                  {weeklyTrajectory.trim()}
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {sessionSnapshot && (
        <section data-state={verdictState} className={`tactile-card ${styles.nextStepCard}`}>
          <p className={styles.eyebrow}>{t('nextStepTitle')}</p>
          <p className={styles.nextStepText}>
            {tomorrowAdjustment?.trim() || t(`nextStep.${sessionSnapshot.nextStepKey}` as Parameters<typeof t>[0])}
          </p>
        </section>
      )}

      <section className={`tactile-card ${styles.metricsCard}`} aria-labelledby="verdict-metrics-title">
        <h2 id="verdict-metrics-title" className="sr-only">{t('changes')}</h2>
        <div className={styles.metricsGrid}>
          <div className={styles.metricCell}>
            <MetricChange
              label={t('metrics.xp')}
              value={xpDelta}
              positiveColor="var(--state-victory)"
              negativeColor="var(--state-deception)"
            />
          </div>
          <div className={styles.metricCell}>
            <MetricChange
              label={t('metrics.core')}
              value={innerCoreDelta}
              suffix="%"
              positiveColor="var(--state-victory)"
              negativeColor="var(--state-deception)"
            />
          </div>
          <div className={styles.metricCell}>
            <MetricChange
              label={t('metrics.abyss')}
              value={abyssIndexDelta}
              suffix="%"
              positiveColor="var(--state-deception)"
              negativeColor="var(--state-victory)"
              invertColors
            />
          </div>
        </div>

        <div className={styles.metricsFoot}>
          <p>
            {abyssIndexDelta > 0
              ? t('riskChange.increased', { value: Math.abs(abyssIndexDelta) })
              : abyssIndexDelta < 0
                ? t('riskChange.decreased', { value: Math.abs(abyssIndexDelta) })
                : t('riskChange.unchanged')}
          </p>
          {profile && (
            <>
              <div className={styles.profileMetric}>
                <span>{t('currentLevel')}</span>
                <strong>{profile.level}</strong>
              </div>
              <div className={styles.profileMetric}>
                <span>{t('streak')}</span>
                <strong>{streakLabel(profile.currentStreak, locale)}</strong>
              </div>
            </>
          )}
        </div>
      </section>

      {sessionSnapshot && (
        <section className={styles.section} aria-labelledby="verdict-factors-title">
          <div className={styles.sectionHeader}>
            <h2 id="verdict-factors-title" className={styles.sectionTitle}>{t('dayFactorsTitle')}</h2>
          </div>
          {sessionSnapshot.dayInfluenceKeys.length > 0 ? (
            <ul className={styles.factorList}>
              {sessionSnapshot.dayInfluenceKeys.map((key) => (
                <li key={key} className={styles.factorChip}>
                  {t(`influence.${key}` as Parameters<typeof t>[0])}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">{t('unspecified')}</p>
          )}
        </section>
      )}

      {(summaries && summaries.length > 0) || (taskOutcomes && taskOutcomes.length > 0) ? (
        <section className={styles.section} aria-labelledby="verdict-tasks-title">
          <div className={styles.sectionHeader}>
            <h2 id="verdict-tasks-title" className={styles.sectionTitle}>
              {summaries ? t('taskSummariesTitle') : t('taskOutcomesTitle')}
            </h2>
            <span className={styles.sectionMeta}>{taskDone}/{taskTotal}</span>
          </div>

          <div className={styles.taskList}>
            {summaries
              ? summaries.map((row, index) => (
                  <TaskSummaryCard key={row.taskId} row={row} defaultOpen={index === 0} />
                ))
              : taskOutcomes?.map((row) => (
                  <div key={row.taskId} className={styles.taskSummary}>
                    <div className={styles.taskSummaryLine}>
                      <span className={styles.taskTitle}>{row.title}</span>
                      <span className={`${styles.taskStatus} ${outcomeClass(row.outcome)}`}>
                        {t(`taskOutcome.${row.outcome}`)}
                      </span>
                    </div>
                  </div>
                ))}
          </div>
        </section>
      ) : null}

      {showRecoverySystem && (
        <section data-state={recoveryState} className={`tactile-card ${styles.recoveryCard}`} aria-labelledby="recovery-system-title">
          <div className={styles.recoveryHeader}>
            <div className={styles.recoveryTitle}>
              <RotateCcw size={17} strokeWidth={1.8} aria-hidden="true" />
              <h2 id="recovery-system-title" className={styles.sectionTitle}>{t('recovery')}</h2>
            </div>
            {debtCreated && debtType ? (
              <span className={styles.stateBadge}>
                {t(`debtTypes.${debtType}` as Parameters<typeof t>[0]) ?? debtType}
              </span>
            ) : null}
          </div>

          <div className={styles.recoveryBody}>
            {debtCreated && debtType && (
              <div className={styles.recoveryItem}>
                <p className={styles.recoveryItemTitle}>{t('debtCreated')}</p>
                <p className={styles.recoveryItemText}>{t('debtNote')}</p>
              </div>
            )}

            {recoveryQuest && (
              <div className={styles.recoveryItem}>
                <p className={styles.recoveryItemTitle}>{recoveryQuest.title}</p>
                <p className={styles.recoveryItemText}>{recoveryQuest.description}</p>
              </div>
            )}

            {stabilizationTriggered && (
              <div className={styles.recoveryItem}>
                <p className={styles.recoveryItemTitle}>{t('stabilizationTitle')}</p>
                <p className={styles.recoveryItemText}>{t('stabilizationNote')}</p>
              </div>
            )}

            {profile && profile.abyssIndex >= 50 && !stabilizationTriggered && (
              <div className={styles.recoveryItem}>
                <p className={styles.recoveryItemTitle}>{t('abyssWarning', { pct: profile.abyssIndex })}</p>
              </div>
            )}

            {(showFocusRecap || showFocusCommentOnly || showFocusRecoveryHint) && focusRecap && (
              <div className={styles.recoveryItem}>
                <p className={styles.recoveryItemTitle}>{t('focusSessionTitle')}</p>
                {showFocusRecap && (
                  <div className={styles.focusReflection}>
                    <ReflectionRow label={t('reflection.whatDistracted')} value={focusRecap.reflection?.whatDistracted} emptyLabel={t('unspecified')} />
                    <ReflectionRow label={t('reflection.whyHappened')} value={focusRecap.reflection?.whyItHappened} emptyLabel={t('unspecified')} />
                    <ReflectionRow label={t('reflection.futureHelp')} value={focusRecap.reflection?.futureHelpFactors} emptyLabel={t('unspecified')} />
                  </div>
                )}
                {showFocusRecoveryHint && (
                  <p className={styles.recoveryItemText}>
                    {t('recoveryHintMinutes', { minutes: focusRecap.suggestRecoveryMinutes ?? 5 })}
                  </p>
                )}
                {showFocusCommentOnly && (
                  <p className={styles.recoveryItemText}>{focusRecap.sessionComment}</p>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      <div className={styles.actions}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Link href="/" className="tactile-button tactile-button-primary block w-full py-3 text-center text-sm hover:opacity-90">
            {t('returnToCenter')}
          </Link>
          <Link href="/action-court/history" className="tactile-button tactile-button-secondary block w-full py-3 text-center text-sm hover:bg-[var(--bg-hover)]">
            {t('historyLink')}
          </Link>
        </div>

        {(showProfileDebtsLink || showGoalsLink) && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {showProfileDebtsLink && (
              <Link href="/profile" className="tactile-button tactile-button-secondary block w-full py-2.5 text-center text-sm hover:bg-[var(--bg-hover)]">
                {t('ctaProfileDebts')}
              </Link>
            )}
            {showGoalsLink && (
              <Link href="/goals" className="tactile-button tactile-button-secondary block w-full py-2.5 text-center text-sm hover:bg-[var(--bg-hover)]">
                {t('ctaGoals')}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
function TaskSummaryCard({ row, defaultOpen }: { row: VerdictTaskSummary; defaultOpen?: boolean }) {
  const t = useTranslations('verdict');
  return (
    <details className={styles.taskSummary} open={defaultOpen}>
      <summary>
        <span className={styles.taskSummaryLine}>
          <span className={styles.taskTitle}>{stripLegacyTodayFromTaskTitle(row.title)}</span>
          <span className={`${styles.taskStatus} ${outcomeClass(row.outcome)}`}>
            <span>{t(`taskOutcome.${row.outcome}`)}</span>
            <ChevronDown size={15} strokeWidth={1.8} aria-hidden="true" />
          </span>
        </span>
      </summary>
      <dl className={styles.taskDetails}>
        <div className={styles.detailRow}>
          <dt>{t('plannedIntent')}</dt>
          <dd>{row.plannedIntent}</dd>
        </div>
        <div className={styles.detailRow}>
          <dt>{t('actualLabel')}</dt>
          <dd>{t(`taskOutcome.${row.outcome}`)}</dd>
        </div>
        <div className={styles.detailRow}>
          <dt>{t('influenceTitle')}</dt>
          <dd>
            {row.unspecifiedInfluence ? (
              t('unspecified')
            ) : (
              <>
                {row.influenceKeys.map((key) => t(`influence.${key}` as Parameters<typeof t>[0])).join(' · ')}
                {row.influenceOtherNote ? ` — ${row.influenceOtherNote}` : ''}
              </>
            )}
          </dd>
        </div>
        <div className={styles.detailRow}>
          <dt>{t('resolutionTitle')}</dt>
          <dd>{t(`resolution.${row.resolutionKey}` as Parameters<typeof t>[0])}</dd>
        </div>
        <div className={styles.detailRow}>
          <dt>{t('taskNextStepTitle')}</dt>
          <dd>{t(`nextStep.${row.nextStepKey}` as Parameters<typeof t>[0])}</dd>
        </div>
      </dl>
    </details>
  );
}
function ReflectionRow({
  label,
  value,
  emptyLabel,
}: {
  label: string;
  value?: string;
  emptyLabel: string;
}) {
  return (
    <div>
      <p className="text-xs text-[var(--text-muted)] mb-0.5">{label}</p>
      <p className="text-[var(--text-secondary)]">{value?.trim() ? value.trim() : emptyLabel}</p>
    </div>
  );
}

function MetricChange({
  label,
  value,
  suffix,
  positiveColor,
  negativeColor,
  invertColors,
}: {
  label: string;
  value: number;
  suffix?: string;
  positiveColor: string;
  negativeColor: string;
  invertColors?: boolean;
}) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const color = invertColors
    ? isPositive
      ? negativeColor
      : isNegative
        ? positiveColor
        : 'var(--text-muted)'
    : isPositive
      ? positiveColor
      : isNegative
        ? negativeColor
        : 'var(--text-muted)';

  return (
    <div className="text-center">
      <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
      <p className="text-lg font-bold" style={{ color }}>
        {isPositive ? '+' : ''}
        {value}
        {suffix}
      </p>
    </div>
  );
}

