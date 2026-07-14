'use client';

import { useState, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Task, DayPlan, UserProfile, Verdict, VerdictSessionSnapshot } from '@/types';
import {
  determineVerdict,
  classifyFailureReason,
  generateRecoveryQuest,
} from '@/lib/mockMentor';
import { generateMentorMessageAsync } from '@/lib/aiMentor';
import { calculateScoring } from '@/lib/scoring';
import { formatVerdictSessionDate, buildVerdictTaskOutcomesFromStatuses } from '@/lib/verdictDisplay';
import { buildVerdictSessionSnapshot } from '@/lib/verdictSession';
import { loadFocusBlocks, loadActionCourtReviews } from '@/lib/storage';
import { buildMentorDayBrief } from '@/lib/mentorBrief';
import { stripLegacyTodayFromTaskTitle } from '@/lib/utils';
import { buildCourtContext, canCompleteTaskForCourt, summarizeCourtTasks } from '@/lib/courtRules';
import { FailureReview, TaskFailure } from './FailureReview';
import { VerdictScreen } from './VerdictScreen';
import styles from './ActionCourt.module.css';

type CourtPhase = 'promise-vs-fact' | 'failure-analysis' | 'verdict';

export interface VerdictResult {
  verdict: Verdict;
  xpDelta: number;
  innerCoreDelta: number;
  abyssIndexDelta: number;
  mentorMessage: string;
  debtCreated: boolean;
  debtType?: string;
  recoveryQuest: {
    title: string;
    description: string;
    xpRestore: number;
    innerCoreReward: number;
    abyssReduction: number;
    status: 'planned';
  } | null;
  stabilizationTriggered: boolean;
  updatedProfile: UserProfile;
  completedTaskIds: string[];
  failedTaskIds: string[];
  partialTaskIds: string[];
  falseRestDetected: boolean;
  failures: TaskFailure[];
  verdictSessionSnapshot: VerdictSessionSnapshot;
  tomorrowAdjustment?: string;
}

interface ActionCourtProps {
  dayPlan: DayPlan;
  tasks: Task[];
  profile: UserProfile;
  existingReview?: boolean;
  onVerdictCalculated: (result: VerdictResult) => void;
}

export function ActionCourt({
  dayPlan,
  tasks,
  profile,
  existingReview,
  onVerdictCalculated,
}: ActionCourtProps) {
  const t = useTranslations('court');
  const locale = useLocale();
  const [phase, setPhase] = useState<CourtPhase>(
    existingReview ? 'verdict' : 'promise-vs-fact'
  );
  const [taskStatuses, setTaskStatuses] = useState<Record<string, Task['status']>>(() => {
    const map: Record<string, Task['status']> = {};
    tasks.forEach((t) => {
      map[t.id] = t.status;
    });
    return map;
  });

  // Verdict state
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [scoring, setScoring] = useState<{
    xpDelta: number;
    innerCoreDelta: number;
    abyssIndexDelta: number;
  } | null>(null);
  const [mentorMessage, setMentorMessage] = useState('');
  const [debtCreated, setDebtCreated] = useState(false);
  const [debtType, setDebtType] = useState<string | undefined>(undefined);
  const [recoveryQuest, setRecoveryQuest] = useState<{
    title: string;
    description: string;
    xpRestore: number;
    innerCoreReward: number;
    abyssReduction: number;
    status: 'planned';
  } | null>(null);
  const [stabilizationTriggered, setStabilizationTriggered] = useState(false);
  const [updatedProfile, setUpdatedProfile] = useState<UserProfile | null>(null);
  const [verdictSessionSnapshot, setVerdictSessionSnapshot] = useState<VerdictSessionSnapshot | null>(null);

  const handleStatusChange = useCallback((taskId: string, status: Task['status']) => {
    setTaskStatuses((prev) => ({ ...prev, [taskId]: status }));
  }, []);

  const handleContinueToAnalysis = () => {
    const taskSummary = summarizeCourtTasks(dayPlan, tasks, taskStatuses);
    const needsReason =
      taskSummary.partialTaskIds.length > 0 || taskSummary.failedTaskIds.length > 0;
    if (needsReason) {
      setPhase('failure-analysis');
    } else {
      handleCalculateVerdict([]);
    }
  };

  const handleCalculateVerdict = async (failures: TaskFailure[], falseRest = false) => {
      const taskSummary = summarizeCourtTasks(dayPlan, tasks, taskStatuses);
      const { completedTaskIds, failedTaskIds, partialTaskIds } = taskSummary;
      const context = buildCourtContext({
        dayPlan,
        tasks,
        taskStatuses,
        profile,
        failures,
        falseRest,
        previousReviews: loadActionCourtReviews(),
      });

      const calculatedVerdict = determineVerdict(context);
      const scoringResult = calculateScoring(context);

      // Update profile
      const newProfile = { ...profile };
      newProfile.totalXp = Math.max(0, newProfile.totalXp + scoringResult.xpDelta);
      newProfile.innerCore = Math.max(
        0,
        Math.min(100, newProfile.innerCore + scoringResult.innerCoreDelta)
      );
      newProfile.abyssIndex = Math.max(
        0,
        Math.min(100, newProfile.abyssIndex + scoringResult.abyssIndexDelta)
      );

      // Level up
      const newLevel = Math.floor(newProfile.totalXp / 200) + 1;
      if (newLevel > newProfile.level) {
        newProfile.level = newLevel;
      }

      // Streak tracks honest daily review continuity, not moral perfection.
      newProfile.currentStreak += 1;

      // External results
      if (context.externalResultCreated) {
        newProfile.externalResultsCount += 1;
      }

      setUpdatedProfile(newProfile);

      // Generate recovery quest
      let quest = null;
      if (
        calculatedVerdict === 'failure' ||
        calculatedVerdict === 'self_deception'
      ) {
        quest = generateRecoveryQuest(context);
        setRecoveryQuest(quest);
      }

      setVerdict(calculatedVerdict);
      setScoring({
        xpDelta: scoringResult.xpDelta,
        innerCoreDelta: scoringResult.innerCoreDelta,
        abyssIndexDelta: scoringResult.abyssIndexDelta,
      });
      setDebtCreated(scoringResult.shouldCreateDebt);
      setDebtType(scoringResult.debtType);

      // Mentor message
      const eventType =
        calculatedVerdict === 'self_victory' ||
        calculatedVerdict === 'recovered_victory'
          ? 'victory'
          : calculatedVerdict === 'self_deception'
            ? 'self_deception'
            : 'task_failed';

      const msg = await generateMentorMessageAsync({
        mode: profile.strictnessMode,
        event: eventType,
        verdict: calculatedVerdict,
        reason: failures[0]
          ? classifyFailureReason(
              failures[0].reasonType,
              failures[0].couldDoMinimum,
              !!context.repeatedPattern
            )
          : undefined,
        abyssIndex: newProfile.abyssIndex,
        innerCore: newProfile.innerCore,
        dayBrief: buildMentorDayBrief(dayPlan, tasks),
        courtHistoryCount: loadActionCourtReviews().length,
      }, profile.voiceTone);
      setMentorMessage(msg);

      // Stabilization check (simplified, will be done in parent)
      setStabilizationTriggered(false);

      const sessionSnap = buildVerdictSessionSnapshot({
        verdict: calculatedVerdict,
        dayPlan,
        tasks,
        taskStatuses,
        failures,
        focusBlocks: loadFocusBlocks(),
      });
      setVerdictSessionSnapshot(sessionSnap);

      const result: VerdictResult = {
        verdict: calculatedVerdict,
        xpDelta: scoringResult.xpDelta,
        innerCoreDelta: scoringResult.innerCoreDelta,
        abyssIndexDelta: scoringResult.abyssIndexDelta,
        mentorMessage: msg,
        debtCreated: scoringResult.shouldCreateDebt,
        debtType: scoringResult.debtType,
        recoveryQuest: quest,
        stabilizationTriggered: false,
        updatedProfile: newProfile,
        completedTaskIds,
        failedTaskIds,
        partialTaskIds,
        falseRestDetected: falseRest,
        failures,
        verdictSessionSnapshot: sessionSnap,
      };

      setPhase('verdict');
      onVerdictCalculated(result);
  };

  if (phase === 'verdict' && verdict && scoring && verdictSessionSnapshot) {
    return (
      <VerdictScreen
        verdict={verdict}
        xpDelta={scoring.xpDelta}
        innerCoreDelta={scoring.innerCoreDelta}
        abyssIndexDelta={scoring.abyssIndexDelta}
        mentorMessage={mentorMessage}
        debtCreated={debtCreated}
        debtType={debtType}
        recoveryQuest={recoveryQuest}
        stabilizationTriggered={stabilizationTriggered}
        profile={updatedProfile || profile}
        taskOutcomes={buildVerdictTaskOutcomesFromStatuses(tasks, taskStatuses)}
        sessionSnapshot={verdictSessionSnapshot}
        sessionDateLabel={formatVerdictSessionDate(dayPlan.date, locale)}
        mainResult={dayPlan.mainResult}
        weeklyTrajectory={dayPlan.weeklyTrajectory}
      />
    );
  }

  return (
    <div className="app-page">
      <header className={styles.pageHeader}>
        <div className={styles.pageHeaderRow}>
          <div>
            <h1 className={styles.pageTitle}>
              {t('title')}
            </h1>
            <p className={styles.pageDate}>
              {new Date(dayPlan.date).toLocaleDateString(locale === 'en' ? 'en-US' : 'ru-RU', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <Link href="/action-court/history" className={styles.historyLink}>
            {t('historyLink')}
          </Link>
        </div>
      </header>

      {phase === 'promise-vs-fact' && (
        <PromiseVsFact
          dayPlan={dayPlan}
          tasks={tasks}
          taskStatuses={taskStatuses}
          onStatusChange={handleStatusChange}
          onContinue={handleContinueToAnalysis}
        />
      )}

      {phase === 'failure-analysis' && (
        <FailureReview
          tasks={tasks}
          failedTaskIds={tasks
            .filter((task) => {
              const summary = summarizeCourtTasks(dayPlan, tasks, taskStatuses);
              return (
                summary.partialTaskIds.includes(task.id) ||
                summary.failedTaskIds.includes(task.id)
              );
            })
            .map((task) => task.id)}
          onSubmit={handleCalculateVerdict}
          onBack={() => setPhase('promise-vs-fact')}
        />
      )}
    </div>
  );
}

// ——— Sub-components ———

function PromiseVsFact({
  dayPlan,
  tasks,
  taskStatuses,
  onStatusChange,
  onContinue,
}: {
  dayPlan: DayPlan;
  tasks: Task[];
  taskStatuses: Record<string, Task['status']>;
  onStatusChange: (taskId: string, status: Task['status']) => void;
  onContinue: () => void;
}) {
  const t = useTranslations('court');

  const bossTask = dayPlan.bossTaskId
    ? tasks.find((tsk) => tsk.id === dayPlan.bossTaskId)
    : undefined;

  const statusOptions: {
    value: Task['status'];
    labelKey: 'statusCompleted' | 'statusPartial' | 'statusFailed';
  }[] = [
    { value: 'completed', labelKey: 'statusCompleted' },
    { value: 'partial', labelKey: 'statusPartial' },
    { value: 'failed', labelKey: 'statusFailed' },
  ];

  return (
    <section className={styles.reviewCard} aria-labelledby="court-stage-title">
      <div className={styles.topline}>
        <p id="court-stage-title" className={styles.kicker}>{t('factStepLabel')}</p>
        <span className={styles.stageValue} aria-hidden="true">1/2</span>
      </div>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-label={t('factStepLabel')}
        aria-valuemin={0}
        aria-valuemax={2}
        aria-valuenow={1}
      >
        <span className={styles.progressFill} />
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionLabel}>{t('promised')}</h2>
        <div className={styles.promiseList}>
          <div className={styles.promiseItem}>
            <p className={styles.promiseLabel}>{t('mainResult')}</p>
            <p className={styles.promiseCopy} title={dayPlan.mainResult}>{dayPlan.mainResult}</p>
          </div>
          {dayPlan.bossTaskId && (
            <div className={styles.promiseItem}>
              <p className={styles.promiseLabel}>{t('bossTask')}</p>
              <p className={styles.promiseCopy}>
                {bossTask?.microGoal || (bossTask ? stripLegacyTodayFromTaskTitle(bossTask.title) : t('bossNotSet'))}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionLabel}>{t('taskReview')}</h2>
        <div className={styles.taskList}>
          {tasks.map((task) => {
            const completedBlocked = !canCompleteTaskForCourt(task);
            return (
              <article key={task.id} className={styles.taskRow}>
                <div className={styles.taskHeader}>
                  <h3 className={styles.taskTitle}>{stripLegacyTodayFromTaskTitle(task.title)}</h3>
                  {task.id === dayPlan.bossTaskId && (
                    <span className={styles.bossChip}>{t('bossTask')}</span>
                  )}
                </div>
                {completedBlocked && (
                  <p className={styles.proofNote}>{t('proofRequiredBeforeCompleted')}</p>
                )}
                <div className={styles.statusGrid} role="radiogroup" aria-label={t('taskStatusLabel', { task: stripLegacyTodayFromTaskTitle(task.title) })}>
                  {statusOptions.map((opt) => {
                    const isCompletedBlocked = opt.value === 'completed' && completedBlocked;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={(taskStatuses[task.id] || task.status) === opt.value}
                        disabled={isCompletedBlocked}
                        aria-disabled={isCompletedBlocked}
                        onClick={() => {
                          if (!isCompletedBlocked) onStatusChange(task.id, opt.value);
                        }}
                        data-selection-tone={opt.value}
                        className="selection-control"
                      >
                        {t(opt.labelKey)}
                      </button>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <button type="button" onClick={onContinue} className={styles.primaryAction}>
        <strong>{t('proceed')}</strong>
        <span className={styles.actionIcon} aria-hidden="true">→</span>
      </button>
    </section>
  );
}
