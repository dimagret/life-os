'use client';

import { useEffect, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Goal, WeeklyGrowthReview, WeeklyGrowthSnapshot } from '@/types';
import {
  loadActionCourtReviews,
  loadDayPlans,
  loadFocusBlocks,
  loadTasks,
  loadWeeklyGrowthReviews,
  saveWeeklyGrowthReview,
} from '@/lib/storage';
import { buildWeeklyGrowthSnapshot, getWeekStart } from '@/lib/weeklyGrowth';
import styles from './WeeklyGrowthCard.module.css';

interface WeeklyGrowthCardProps {
  goal: Goal;
}

const EMPTY_SNAPSHOT: WeeklyGrowthSnapshot = {
  plannedMinutes: 0,
  focusedMinutes: 0,
  externalResults: 0,
  commercialActions: 0,
  reviewedDays: 0,
  evidenceStatus: 'hypothesis',
};

export function WeeklyGrowthCard({ goal }: WeeklyGrowthCardProps) {
  const t = useTranslations('goals.weeklyGrowth');
  const tf = useTranslations('focus');
  const fieldId = useId();
  const [review, setReview] = useState<WeeklyGrowthReview | null>(null);
  const [snapshot, setSnapshot] = useState<WeeklyGrowthSnapshot>(EMPTY_SNAPSHOT);
  const [constraint, setConstraint] = useState('');
  const [experiment, setExperiment] = useState('');
  const [experimentMetric, setExperimentMetric] = useState('');
  const [commercialAction, setCommercialAction] = useState('');
  const [stopDoing, setStopDoing] = useState('');
  const [continueDoing, setContinueDoing] = useState('');
  const [nextWeekResult, setNextWeekResult] = useState('');
  const [saved, setSaved] = useState(false);
  const hasCommercialStep = goal.area === 'money' || goal.area === 'business';

  useEffect(() => {
    let isActive = true;
    function load() {
      const weekStart = getWeekStart();
      const stored = loadWeeklyGrowthReviews().find(
        (item) => item.goalId === goal.id && item.weekStart === weekStart,
      ) ?? null;
      const nextSnapshot = buildWeeklyGrowthSnapshot({
        goalId: goal.id,
        weekStart,
        dayPlans: loadDayPlans(),
        tasks: loadTasks(),
        focusBlocks: loadFocusBlocks(),
        reviews: loadActionCourtReviews(),
      });

      if (!isActive) return;
      setReview(stored);
      setSnapshot(nextSnapshot);
      setConstraint(stored?.constraint ?? '');
      setExperiment(stored?.experiment ?? '');
      setExperimentMetric(stored?.experimentMetric ?? '');
      setCommercialAction(stored?.commercialAction ?? '');
      setStopDoing(stored?.stopDoing ?? '');
      setContinueDoing(stored?.continueDoing ?? '');
      setNextWeekResult(stored?.nextWeekResult ?? '');
    }
    load();
    return () => {
      isActive = false;
    };
  }, [goal.id]);

  const save = () => {
    const now = new Date().toISOString();
    const weekStart = getWeekStart();
    const next: WeeklyGrowthReview = {
      id: review?.id ?? `weekly_${goal.id}_${weekStart}`,
      goalId: goal.id,
      weekStart,
      constraint: constraint.trim(),
      experiment: experiment.trim(),
      experimentMetric: experimentMetric.trim(),
      ...(hasCommercialStep && commercialAction.trim()
        ? { commercialAction: commercialAction.trim() }
        : {}),
      ...(stopDoing.trim() ? { stopDoing: stopDoing.trim() } : {}),
      ...(continueDoing.trim() ? { continueDoing: continueDoing.trim() } : {}),
      ...(nextWeekResult.trim() ? { nextWeekResult: nextWeekResult.trim() } : {}),
      createdAt: review?.createdAt ?? now,
      updatedAt: now,
    };
    saveWeeklyGrowthReview(next);
    setReview(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const canSave = Boolean(
    constraint.trim() && experiment.trim() && experimentMetric.trim(),
  );
  const distractionLabel = snapshot.dominantDistraction
    ? tf(`distractions.${snapshot.dominantDistraction}`)
    : t('noDistraction');

  return (
    <section className={styles.card} aria-labelledby={`${fieldId}-title`}>
      <div className={styles.headingRow}>
        <div>
          <span className={styles.kicker}>{t('kicker')}</span>
          <h3 id={`${fieldId}-title`} className={styles.title}>{t('title')}</h3>
        </div>
        <span className={`${styles.evidence} ${styles[snapshot.evidenceStatus]}`}>
          {t(`evidence.${snapshot.evidenceStatus}`)}
        </span>
      </div>

      <p className={styles.summary}>{t('summary')}</p>

      <dl className={styles.metrics}>
        <div>
          <dt>{t('focusMetric')}</dt>
          <dd>{snapshot.focusedMinutes}/{snapshot.plannedMinutes} {t('minutesShort')}</dd>
        </div>
        <div>
          <dt>{t('resultMetric')}</dt>
          <dd>{snapshot.externalResults}</dd>
        </div>
        <div>
          <dt>{t('reviewMetric')}</dt>
          <dd>{snapshot.reviewedDays}</dd>
        </div>
        <div>
          <dt>{t('distractionMetric')}</dt>
          <dd>{distractionLabel}</dd>
        </div>
      </dl>

      <details className={styles.editor} open={!review}>
        <summary>{review ? t('editDecision') : t('setDecision')}</summary>
        <div className={styles.form}>
          <label htmlFor={`${fieldId}-constraint`}>
            <span>{t('constraint')}</span>
            <input
              id={`${fieldId}-constraint`}
              value={constraint}
              onChange={(event) => setConstraint(event.target.value)}
              placeholder={t('constraintPlaceholder')}
            />
          </label>
          <label htmlFor={`${fieldId}-experiment`}>
            <span>{t('experiment')}</span>
            <input
              id={`${fieldId}-experiment`}
              value={experiment}
              onChange={(event) => setExperiment(event.target.value)}
              placeholder={t('experimentPlaceholder')}
            />
          </label>
          <label htmlFor={`${fieldId}-metric`}>
            <span>{t('experimentMetric')}</span>
            <input
              id={`${fieldId}-metric`}
              value={experimentMetric}
              onChange={(event) => setExperimentMetric(event.target.value)}
              placeholder={t('metricPlaceholder')}
            />
          </label>

          {hasCommercialStep ? (
            <label htmlFor={`${fieldId}-commercial`}>
              <span>{t('commercialAction')}</span>
              <input
                id={`${fieldId}-commercial`}
                value={commercialAction}
                onChange={(event) => setCommercialAction(event.target.value)}
                placeholder={t('commercialPlaceholder')}
              />
            </label>
          ) : null}

          <details className={styles.reflection}>
            <summary>{t('weekResult')}</summary>
            <div className={styles.reflectionFields}>
              <label htmlFor={`${fieldId}-stop`}>
                <span>{t('stopDoing')}</span>
                <input
                  id={`${fieldId}-stop`}
                  value={stopDoing}
                  onChange={(event) => setStopDoing(event.target.value)}
                />
              </label>
              <label htmlFor={`${fieldId}-continue`}>
                <span>{t('continueDoing')}</span>
                <input
                  id={`${fieldId}-continue`}
                  value={continueDoing}
                  onChange={(event) => setContinueDoing(event.target.value)}
                />
              </label>
              <label htmlFor={`${fieldId}-next`}>
                <span>{t('nextWeekResult')}</span>
                <input
                  id={`${fieldId}-next`}
                  value={nextWeekResult}
                  onChange={(event) => setNextWeekResult(event.target.value)}
                />
              </label>
            </div>
          </details>

          <button type="button" onClick={save} disabled={!canSave}>
            {saved ? t('saved') : t('save')}
          </button>
        </div>
      </details>
    </section>
  );
}
