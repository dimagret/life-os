import { describe, expect, it } from 'vitest';
import { filterReviewsByPeriod, summarizeReviewHistory } from '@/lib/reviewHistory';
import type { ActionCourtReview } from '@/types';

function review(
  id: string,
  date: string,
  values: Partial<ActionCourtReview> = {}
): ActionCourtReview {
  return {
    id,
    date,
    dayPlanId: `plan-${id}`,
    completedTaskIds: ['done'],
    partialTaskIds: [],
    failedTaskIds: [],
    falseRestDetected: false,
    verdict: 'self_victory',
    xpDelta: 10,
    innerCoreDelta: 2,
    abyssIndexDelta: -1,
    debtIds: [],
    createdAt: `${date}T20:00:00.000Z`,
    ...values,
  };
}

describe('review history calculations', () => {
  it('filters an inclusive seven-day local calendar window and sorts newest first', () => {
    const result = filterReviewsByPeriod(
      [review('old', '2026-07-07'), review('start', '2026-07-08'), review('today', '2026-07-14')],
      7,
      new Date(2026, 6, 14, 12)
    );

    expect(result.map((item) => item.id)).toEqual(['today', 'start']);
  });

  it('calculates completion rate from completed divided by all reviewed task outcomes', () => {
    const result = summarizeReviewHistory([
      review('a', '2026-07-14', {
        completedTaskIds: ['1', '2'],
        partialTaskIds: ['3'],
        failedTaskIds: ['4'],
        xpDelta: 12,
        innerCoreDelta: 3,
        abyssIndexDelta: -2,
        verdictSessionSnapshot: {
          mainCategory: 'partial_victory',
          taskSummaries: [],
          dayInfluenceKeys: ['time', 'distractions'],
          nextStepKey: 'split',
        },
      }),
      review('b', '2026-07-13', {
        completedTaskIds: ['5'],
        partialTaskIds: [],
        failedTaskIds: ['6'],
        xpDelta: -3,
        innerCoreDelta: -1,
        abyssIndexDelta: 4,
        verdictSessionSnapshot: {
          mainCategory: 'defeat',
          taskSummaries: [],
          dayInfluenceKeys: ['time'],
          nextStepKey: 'tomorrow',
        },
      }),
    ]);

    // 3 completed / 6 reviewed outcomes * 100 = 50%.
    expect(result.completionRate).toBe(50);
    expect(result.completedTasks).toBe(3);
    expect(result.totalTasks).toBe(6);
    expect(result.xpDelta).toBe(9);
    expect(result.innerCoreDelta).toBe(2);
    expect(result.abyssIndexDelta).toBe(2);
    expect(result.topInfluence).toBe('time');
    expect(result.influenceCounts[0]).toEqual({ key: 'time', count: 2 });
  });
});
