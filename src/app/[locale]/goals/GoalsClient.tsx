'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { getTodayPlan, loadGoals } from '@/lib/storage';
import { DayPlan, Goal, GoalHorizon } from '@/types';
import { GoalBuilder } from '@/components/goals/GoalBuilder';
import { GoalCard } from '@/components/goals/GoalCard';
import { PageSkeleton } from '@/components/ui/Skeleton';
import styles from './Goals.module.css';

export default function GoalsClient() {
  const t = useTranslations('goals');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [todayPlan, setTodayPlan] = useState<DayPlan | null>(null);
  const [builderHorizon, setBuilderHorizon] = useState<GoalHorizon | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshGoals = () => {
    setGoals(loadGoals());
    setTodayPlan(getTodayPlan() ?? null);
  };

  useEffect(() => {
    let isActive = true;
    function load() {
      refreshGoals();
      if (isActive) setIsLoading(false);
    }
    load();
    return () => { isActive = false; };
  }, []);

  const activeMonthly = goals.find((g) => g.status === 'active' && (g.horizon ?? 'weekly') === 'monthly');
  const activeWeekly = goals.find((g) => g.status === 'active' && (g.horizon ?? 'weekly') === 'weekly');

  const handleBuilderComplete = () => {
    setBuilderHorizon(null);
    refreshGoals();
  };

  if (builderHorizon) {
    return (
      <GoalBuilder
        defaultHorizon={builderHorizon}
        onComplete={handleBuilderComplete}
        onCancel={() => setBuilderHorizon(null)}
      />
    );
  }

  if (isLoading) {
    return <PageSkeleton />;
  }

  const hasAny = !!activeMonthly || !!activeWeekly;

  return (
    <div className="app-page">
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t('title')}</h1>
        <p className={styles.pageSubtitle}>
          {hasAny ? t('currentGoal') : t('createFirst')}
        </p>
      </header>

      <div className={styles.stack}>
        <section className={styles.goalSection} aria-labelledby="weekly-goal-heading">
          <div className={styles.sectionHeader}>
            <h2
              id="weekly-goal-heading"
              className={styles.sectionLabel}
            >
              {t('weekSection')}
            </h2>
            <span className={styles.recommended}>
              {t('recommended')}
            </span>
          </div>

          {activeWeekly ? (
            <GoalCard goal={activeWeekly} hasTodayPlan={todayPlan?.goalId === activeWeekly.id} />
          ) : (
            <button
              type="button"
              onClick={() => setBuilderHorizon('weekly')}
              className={styles.emptyGoal}
            >
              <span className={styles.emptyGoalTitle}>
                {t('createWeeklyGoal')}
              </span>
              <span className={styles.emptyGoalHint}>
                {t('weekSectionHint')}
              </span>
            </button>
          )}
        </section>

        {activeMonthly ? (
          <section className={styles.goalSection} aria-labelledby="monthly-goal-heading">
            <h2
              id="monthly-goal-heading"
              className={styles.sectionLabel}
            >
              {t('monthSection')}
            </h2>
            <GoalCard goal={activeMonthly} hasTodayPlan={todayPlan?.goalId === activeMonthly.id} />
          </section>
        ) : (
          <details className={styles.secondaryGoal}>
            <summary>
              <span className={styles.secondaryTitle}>
                {t('monthlySecondaryTitle')}
              </span>
              <span className={styles.secondaryHint}>
                {t('monthSectionHint')}
              </span>
            </summary>
            <div className={styles.secondaryBody}>
              <button
                type="button"
                onClick={() => setBuilderHorizon('monthly')}
                className={styles.secondaryAction}
              >
                {t('createMonthlyGoal')}
              </button>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

