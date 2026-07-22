import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '@/lib/constants';
import {
  loadWeeklyGrowthReviews,
  saveWeeklyGrowthReview,
  snapshotAllStorage,
} from '@/lib/storage';

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(key: string) { return this.map.get(key) ?? null; }
  key(index: number) { return Array.from(this.map.keys())[index] ?? null; }
  removeItem(key: string) { this.map.delete(key); }
  setItem(key: string, value: string) { this.map.set(key, value); }
}

describe('weekly growth persistence', () => {
  beforeEach(() => {
    const storage = new MemoryStorage();
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', {
      localStorage: storage,
      dispatchEvent: vi.fn(),
    } as unknown as Window);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('upserts one review per goal and week and includes it in cloud snapshots', () => {
    saveWeeklyGrowthReview({
      id: 'weekly-1',
      goalId: 'goal-1',
      weekStart: '2026-07-20',
      constraint: 'No verified demand',
      experiment: 'Send ten focused offers',
      experimentMetric: 'Replies received',
      commercialAction: 'Send the offer to ten prospects',
      createdAt: '2026-07-21T08:00:00.000Z',
      updatedAt: '2026-07-21T08:00:00.000Z',
    });
    saveWeeklyGrowthReview({
      id: 'weekly-2',
      goalId: 'goal-1',
      weekStart: '2026-07-20',
      constraint: 'Offer is unclear',
      experiment: 'Rewrite and resend',
      experimentMetric: 'Qualified replies',
      createdAt: '2026-07-21T09:00:00.000Z',
      updatedAt: '2026-07-21T09:00:00.000Z',
    });

    const reviews = loadWeeklyGrowthReviews();
    expect(reviews).toHaveLength(1);
    expect(reviews[0].constraint).toBe('Offer is unclear');
    expect(snapshotAllStorage()[STORAGE_KEYS.weeklyGrowthReviews]).toBeTruthy();
  });
});
