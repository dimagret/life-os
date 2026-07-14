import { describe, expect, it } from 'vitest';
import ru from '../messages/ru.json';
import en from '../messages/en.json';

const GOAL_STATUSES = ['active', 'paused', 'completed', 'failed'] as const;

describe('goal locale coverage', () => {
  it.each([
    ['ru', ru],
    ['en', en],
  ] as const)('%s localizes every goal status without raw enum fallbacks', (_locale, messages) => {
    for (const status of GOAL_STATUSES) {
      const label = messages.goalCard.status[status];
      expect(label).toBeTruthy();
      expect(label.toLowerCase()).not.toBe(status);
    }
  });

  it('keeps the Russian bundle free of truncation artifacts', () => {
    expect(JSON.stringify(ru)).not.toContain('tokens truncated');
    expect(ru.goals).toBeTruthy();
    expect(ru.profile).toBeTruthy();
  });
});
