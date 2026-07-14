import type { ActionCourtReview, VerdictInfluenceKey } from '@/types';

export type ReviewHistoryPeriod = 7 | 30 | 'all';

export interface ReviewHistorySummary {
  totalReviews: number;
  completedTasks: number;
  totalTasks: number;
  completionRate: number;
  xpDelta: number;
  innerCoreDelta: number;
  abyssIndexDelta: number;
  topInfluence?: VerdictInfluenceKey;
  influenceCounts: Array<{ key: VerdictInfluenceKey; count: number }>;
}

function localDateStart(value: string): number | null {
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
  const [year, month, day] = parts;
  return new Date(year, month - 1, day).setHours(0, 0, 0, 0);
}

export function sortReviewsNewest(reviews: ActionCourtReview[]): ActionCourtReview[] {
  return [...reviews].sort((a, b) => {
    const dateDiff = (localDateStart(b.date) ?? 0) - (localDateStart(a.date) ?? 0);
    if (dateDiff !== 0) return dateDiff;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function filterReviewsByPeriod(
  reviews: ActionCourtReview[],
  period: ReviewHistoryPeriod,
  now = new Date()
): ActionCourtReview[] {
  if (period === 'all') return sortReviewsNewest(reviews);
  const end = new Date(now).setHours(23, 59, 59, 999);
  const cutoff = new Date(now);
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (period - 1));

  return sortReviewsNewest(
    reviews.filter((review) => {
      const timestamp = localDateStart(review.date);
      return timestamp !== null && timestamp >= cutoff.getTime() && timestamp <= end;
    })
  );
}

export function summarizeReviewHistory(reviews: ActionCourtReview[]): ReviewHistorySummary {
  const influenceMap = new Map<VerdictInfluenceKey, number>();
  let completedTasks = 0;
  let totalTasks = 0;
  let xpDelta = 0;
  let innerCoreDelta = 0;
  let abyssIndexDelta = 0;

  reviews.forEach((review) => {
    completedTasks += review.completedTaskIds.length;
    totalTasks +=
      review.completedTaskIds.length +
      review.partialTaskIds.length +
      review.failedTaskIds.length;
    xpDelta += review.xpDelta;
    innerCoreDelta += review.innerCoreDelta;
    abyssIndexDelta += review.abyssIndexDelta;
    review.verdictSessionSnapshot?.dayInfluenceKeys.forEach((key) => {
      influenceMap.set(key, (influenceMap.get(key) ?? 0) + 1);
    });
  });

  const influenceCounts = [...influenceMap.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

  return {
    totalReviews: reviews.length,
    completedTasks,
    totalTasks,
    completionRate: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
    xpDelta,
    innerCoreDelta,
    abyssIndexDelta,
    topInfluence: influenceCounts[0]?.key,
    influenceCounts,
  };
}
