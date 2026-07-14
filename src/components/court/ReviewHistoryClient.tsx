'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, TrendingUp } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { loadActionCourtReviews } from '@/lib/storage';
import {
  filterReviewsByPeriod,
  summarizeReviewHistory,
  type ReviewHistoryPeriod,
} from '@/lib/reviewHistory';
import { formatVerdictSessionDate } from '@/lib/verdictDisplay';
import type { ActionCourtReview, UiState } from '@/types';
import { PageSkeleton } from '@/components/ui/Skeleton';
import styles from './ReviewHistory.module.css';

function reviewState(review: ActionCourtReview): UiState {
  if (review.verdict === 'self_victory' || review.verdict === 'recovered_victory') return 'victory';
  if (review.verdict === 'self_deception') return 'deception';
  if (review.verdict === 'failure') return 'stabilization';
  if (review.verdict === 'respectful_transfer') return 'hold';
  return 'control';
}

export default function ReviewHistoryClient() {
  const t = useTranslations('reviewHistory');
  const tVerdict = useTranslations('verdict');
  const locale = useLocale();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
  const reviews = useMemo(
    () => (mounted ? loadActionCourtReviews() : null),
    [mounted]
  );
  const [period, setPeriod] = useState<ReviewHistoryPeriod>(30);

  const filtered = useMemo(
    () => filterReviewsByPeriod(reviews ?? [], period),
    [reviews, period]
  );
  const summary = useMemo(() => summarizeReviewHistory(filtered), [filtered]);

  if (reviews === null) return <PageSkeleton />;

  return (
    <div className={`app-page ${styles.page}`}>
      <header className={styles.header}>
        <Link href="/action-court" className={styles.backLink}>
          <ArrowLeft size={15} aria-hidden="true" />
          {t('backToCourt')}
        </Link>
        <div className={styles.headerRow}>
          <div>
            <p className={styles.eyebrow}>{t('eyebrow')}</p>
            <h1>{t('title')}</h1>
            <p className={styles.subtitle}>{t('subtitle')}</p>
          </div>
          <CalendarDays size={24} strokeWidth={1.6} aria-hidden="true" />
        </div>
      </header>

      <section className={styles.periodSection} aria-labelledby="history-period-title">
        <p id="history-period-title" className={styles.label}>{t('periodLabel')}</p>
        <div className={styles.segmented}>
          {([7, 30, 'all'] as ReviewHistoryPeriod[]).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={period === value}
              onClick={() => setPeriod(value)}
            >
              {value === 'all' ? t('periodAll') : t('periodDays', { count: value })}
            </button>
          ))}
        </div>
      </section>

      {filtered.length === 0 ? (
        <section className={`tactile-card ${styles.empty}`}>
          <CalendarDays size={24} strokeWidth={1.5} aria-hidden="true" />
          <h2>{t('emptyTitle')}</h2>
          <p>{reviews.length === 0 ? t('emptyAll') : t('emptyPeriod')}</p>
          <Link href="/action-court" className="tactile-button tactile-button-primary">
            {t('startReview')}
          </Link>
        </section>
      ) : (
        <>
          <section className={`tactile-card ${styles.summary}`} aria-labelledby="history-summary-title">
            <div className={styles.summaryHeader}>
              <div>
                <p className={styles.eyebrow}>{t('summaryEyebrow')}</p>
                <h2 id="history-summary-title">{t('summaryTitle')}</h2>
              </div>
              <TrendingUp size={19} strokeWidth={1.6} aria-hidden="true" />
            </div>
            <div className={styles.summaryGrid}>
              <Metric label={t('reviews')} value={String(summary.totalReviews)} />
              <Metric
                label={t('completion')}
                value={`${summary.completionRate}%`}
                note={t('completionFormula', {
                  done: summary.completedTasks,
                  total: summary.totalTasks,
                })}
              />
              <Metric
                label={t('topFactor')}
                value={summary.topInfluence
                  ? tVerdict(`influence.${summary.topInfluence}` as Parameters<typeof tVerdict>[0])
                  : t('notSpecified')}
              />
              <Metric
                label={t('riskChange')}
                value={`${summary.abyssIndexDelta > 0 ? '+' : ''}${summary.abyssIndexDelta} ${t('points')}`}
              />
            </div>
            <div className={styles.deltaRow}>
              <span>{t('xpTotal')} <strong>{summary.xpDelta > 0 ? '+' : ''}{summary.xpDelta}</strong></span>
              <span>{t('coreTotal')} <strong>{summary.innerCoreDelta > 0 ? '+' : ''}{summary.innerCoreDelta} {t('points')}</strong></span>
            </div>
          </section>

          {summary.influenceCounts.length > 0 && (
            <section className={styles.factors} aria-labelledby="history-factors-title">
              <div className={styles.sectionHeading}>
                <h2 id="history-factors-title">{t('factorsTitle')}</h2>
                <span>{t('mentions')}</span>
              </div>
              <ul>
                {summary.influenceCounts.map(({ key, count }) => (
                  <li key={key}>
                    <span>{tVerdict(`influence.${key}` as Parameters<typeof tVerdict>[0])}</span>
                    <strong>{count}</strong>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className={styles.timeline} aria-labelledby="history-list-title">
            <div className={styles.sectionHeading}>
              <h2 id="history-list-title">{t('listTitle')}</h2>
              <span>{t('recordsCount', { count: filtered.length })}</span>
            </div>
            <div className={styles.reviewList}>
              {filtered.map((review) => {
                const total = review.completedTaskIds.length + review.partialTaskIds.length + review.failedTaskIds.length;
                const influences = review.verdictSessionSnapshot?.dayInfluenceKeys ?? [];
                return (
                  <Link
                    key={review.id}
                    href={`/action-court/history/${encodeURIComponent(review.id)}`}
                    data-state={reviewState(review)}
                    className={styles.reviewRow}
                  >
                    <span className={styles.rowMarker} aria-hidden="true" />
                    <span className={styles.rowContent}>
                      <span className={styles.rowTop}>
                        <span>
                          <span className={styles.rowDate}>{formatVerdictSessionDate(review.date, locale)}</span>
                          <span className={styles.rowVerdict}>{tVerdict(`labels.${review.verdict}`)}</span>
                        </span>
                        <ArrowRight size={17} aria-hidden="true" />
                      </span>
                      <span className={styles.rowMeta}>
                        <span><CheckCircle2 size={14} aria-hidden="true" /> {t('tasksClosed', { done: review.completedTaskIds.length, total })}</span>
                        <span>{t('riskShort')} {review.abyssIndexDelta > 0 ? '+' : ''}{review.abyssIndexDelta}</span>
                      </span>
                      <span className={styles.rowFactors}>
                        {influences.length > 0
                          ? influences.slice(0, 3).map((key) => (
                              <span key={key}>{tVerdict(`influence.${key}` as Parameters<typeof tVerdict>[0])}</span>
                            ))
                          : <span>{t('notSpecified')}</span>}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className={styles.metric}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}
