import { describe, expect, it } from 'vitest';
import type { VerdictSessionSnapshot } from '@/types';
import {
  buildTomorrowAdjustment,
  pickLatestTomorrowAdjustmentBefore,
} from '@/lib/tomorrowAdjustment';

const snapshot = (nextStepKey: VerdictSessionSnapshot['nextStepKey']): VerdictSessionSnapshot => ({
  mainCategory: 'defeat',
  taskSummaries: [],
  dayInfluenceKeys: [],
  focusRecap: null,
  nextStepKey,
});

describe('tomorrowAdjustment', () => {
  it('uses the explicit repair action before generic verdict guidance', () => {
    expect(
      buildTomorrowAdjustment({
        failures: [
          {
            taskId: 'task-1',
            reasonType: 'bad_planning',
            repairAction: 'Start with a 10-minute version before noon.',
          },
        ],
        sessionSnapshot: snapshot('split'),
        messages: {
          split: 'Split the task tomorrow.',
        },
      })
    ).toBe('Start with a 10-minute version before noon.');
  });

  it('falls back to the saved verdict next step when there is no repair action', () => {
    expect(
      buildTomorrowAdjustment({
        failures: [],
        sessionSnapshot: snapshot('capture_reason'),
        messages: {
          capture_reason: 'Name the first avoidance trigger before focus.',
        },
      })
    ).toBe('Name the first avoidance trigger before focus.');
  });

  it('does not create a tomorrow adjustment for a continue verdict', () => {
    expect(
      buildTomorrowAdjustment({
        failures: [],
        sessionSnapshot: snapshot('continue'),
        messages: {
          continue: 'Keep going.',
        },
      })
    ).toBeUndefined();
  });

  it('picks the latest prior adjustment and ignores current or future dates', () => {
    expect(
      pickLatestTomorrowAdjustmentBefore(
        [
          { date: '2026-07-03', tomorrowAdjustment: 'Too old' },
          { date: '2026-07-04', tomorrowAdjustment: 'Use this' },
          { date: '2026-07-05', tomorrowAdjustment: 'Current day' },
          { date: '2026-07-06', tomorrowAdjustment: 'Future' },
        ],
        '2026-07-05'
      )
    ).toBe('Use this');
  });
});
