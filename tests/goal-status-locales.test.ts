import { describe, expect, it } from 'vitest';
import ru from '../messages/ru.json';
import en from '../messages/en.json';

describe('legacy goal status labels', () => {
  it.each([
    ['ru', ru],
    ['en', en],
  ] as const)('%s provides safe labels for legacy and unknown values', (_locale, messages) => {
    expect(messages.goalCard.status.closed).toBeTruthy();
    expect(messages.goalCard.status.closed.toLowerCase()).not.toBe('closed');
    expect(messages.goalCard.status.unknown).toBeTruthy();
    expect(messages.goalCard.status.unknown.toLowerCase()).not.toBe('unknown');
  });
});
