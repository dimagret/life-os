'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import {
  getTasksByIds,
  loadActionCourtReviews,
  loadDayPlans,
  loadDebts,
  loadFocusBlocks,
  loadRecoveryQuests,
} from '@/lib/storage';
import { buildVerdictTaskOutcomes, formatVerdictSessionDate } from '@/lib/verdictDisplay';
import { buildVerdictSessionSnapshot, taskStatusesFromVerdictResult } from '@/lib/verdictSession';
import { VerdictScreen } from '@/components/court/VerdictScreen';
import { PageSkeleton } from '@/components/ui/Skeleton';
import type { ActionCourtReview, DayPlan, RecoveryQuest, Task, VerdictSessionSnapshot } from '@/types';
import styles from './ReviewHistoryDetail.module.css';

interface LoadedReview {
  review: ActionCourtReview;
  dayPlan?: DayPlan;
  tasks: Task[];
  sessionSnapshot?: VerdictSessionSnapshot;
  debtType?: string;
  recoveryQuest: {
    title: string;
    description: string;
    xpRestore: number;
    innerCoreReward: number;
    abyssReduction: number;
    status: 'planned';
  } | null;
}

export default function ReviewHistoryDetailClient({ reviewId }: { reviewId: string }) {
  const t = useTranslations('reviewHistory');
  const locale = useLocale();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );

  const loaded = useMemo<LoadedReview | null | undefined>(() => {
    if (!mounted) return undefined;
    const review = loadActionCourtReviews().find((item) => item.id === reviewId);
    if (!review) {
      return null;
    }

    const dayPlan = loadDayPlans().find((plan) => plan.id === review.dayPlanId);
    const tasks = dayPlan ? getTasksByIds(dayPlan.taskIds) : [];
    const failures = (review.failuresDetail ?? []).map((failure) => ({
      taskId: failure.taskId,
      reasonType: failure.reasonType,
      couldDoMinimum: failure.couldDoMinimum,
      comment: failure.comment,
      repairAction: failure.repairAction ?? '',
    }));
    const sessionSnapshot = review.verdictSessionSnapshot ?? (dayPlan
      ? buildVerdictSessionSnapshot({
          verdict: review.verdict,
          dayPlan,
          tasks,
          taskStatuses: taskStatusesFromVerdictResult(
            tasks,
            review.completedTaskIds,
            review.partialTaskIds,
            review.failedTaskIds
          ),
          failures,
          focusBlocks: loadFocusBlocks(),
        })
      : undefined);

    const storedDebt = review.debtIds.length > 0
      ? loadDebts().find((debt) => review.debtIds.includes(debt.id))
      : undefined;
    const storedRecovery: RecoveryQuest | undefined = review.recoveryQuestId
      ? loadRecoveryQuests().find((quest) => quest.id === review.recoveryQuestId)
      : undefined;
    const recoverySnapshot = review.displaySnapshot?.recoveryQuest;

    return {
      review,
      dayPlan,
      tasks,
      sessionSnapshot,
      debtType: review.displaySnapshot?.debtType ?? storedDebt?.type,
      recoveryQuest: recoverySnapshot
        ? { ...recoverySnapshot, status: 'planned' }
        : storedRecovery
          ? {
              title: storedRecovery.title,
              description: storedRecovery.description,
              xpRestore: storedRecovery.xpRestore,
              innerCoreReward: storedRecovery.innerCoreReward,
              abyssReduction: storedRecovery.abyssReduction,
              status: 'planned',
            }
          : null,
    };
  }, [mounted, reviewId]);

  const taskOutcomes = useMemo(() => {
    if (!loaded || loaded.tasks.length === 0) return undefined;
    return buildVerdictTaskOutcomes(
      loaded.tasks,
      loaded.review.completedTaskIds,
      loaded.review.partialTaskIds,
      loaded.review.failedTaskIds
    );
  }, [loaded]);

  if (loaded === undefined) return <PageSkeleton />;

  if (loaded === null) {
    return (
      <div className={`app-page ${styles.page}`}>
        <section className={`tactile-card ${styles.notFound}`}>
          <h1>{t('notFoundTitle')}</h1>
          <p>{t('notFoundText')}</p>
          <Link href="/action-court/history" className="tactile-button tactile-button-primary">
            {t('backToHistory')}
          </Link>
        </section>
      </div>
    );
  }

  const { review, dayPlan, sessionSnapshot, debtType, recoveryQuest } = loaded;
  return (
    <div className={styles.page}>
      <div className={styles.backWrap}>
        <Link href="/action-court/history" className={styles.backLink}>
          <ArrowLeft size={15} aria-hidden="true" />
          {t('backToHistory')}
        </Link>
      </div>
      <VerdictScreen
        verdict={review.verdict}
        xpDelta={review.xpDelta}
        innerCoreDelta={review.innerCoreDelta}
        abyssIndexDelta={review.abyssIndexDelta}
        mentorMessage={review.displaySnapshot?.mentorMessage ?? t('legacyMentorNote')}
        debtCreated={review.debtIds.length > 0}
        debtType={debtType}
        recoveryQuest={recoveryQuest}
        stabilizationTriggered={false}
        profile={null}
        taskOutcomes={taskOutcomes}
        sessionSnapshot={sessionSnapshot}
        sessionDateLabel={formatVerdictSessionDate(review.date, locale)}
        mainResult={review.displaySnapshot?.mainResult ?? dayPlan?.mainResult}
        weeklyTrajectory={review.displaySnapshot?.weeklyTrajectory ?? dayPlan?.weeklyTrajectory}
        tomorrowAdjustment={review.displaySnapshot?.tomorrowAdjustment ?? dayPlan?.tomorrowAdjustment}
      />
    </div>
  );
}
