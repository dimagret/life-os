import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { completeActivation } from '@/lib/activationCompletion';
import { loadDayPlans, loadGoals, loadTasks, loadUserProfile } from '@/lib/storage';

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(key: string) { return this.map.get(key) ?? null; }
  key(index: number) { return Array.from(this.map.keys())[index] ?? null; }
  removeItem(key: string) { this.map.delete(key); }
  setItem(key: string, value: string) { this.map.set(key, value); }
}

const input = {
  email: 'owner@example.com',
  cadence: 'sometimes',
  sabotage: ['delay'],
  distractions: ['gadget'],
  focusMinutes: 25,
  dailyMinutes: 90,
  energy: 'variable',
  profileId: 'building',
  selectedMode: 'base' as const,
  program: { focus: 25, blocks: 3, volume: 90, tasks: 4 },
  weeklyGoal: 'Publish a working landing page',
  successCriterion: 'A public link opens without errors',
  goalReason: 'Validate the offer',
  startTime: '09:30',
};

describe('production activation completion', () => {
  beforeEach(() => {
    const storage = new MemoryStorage();
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', { localStorage: storage, dispatchEvent: vi.fn() } as unknown as Window);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('persists the diagnosis and creates the first real day once', () => {
    completeActivation({ input, locale: 'en', tToday: (key) => key });
    completeActivation({ input, locale: 'en', tToday: (key) => key });

    expect(loadUserProfile()).toMatchObject({
      onboardingCompleted: true,
      contractAccepted: true,
      activation: {
        profileId: 'building',
        mode: 'base',
        weeklyGoal: input.weeklyGoal,
        successCriterion: input.successCriterion,
        startTime: '09:30',
      },
    });
    expect(loadGoals()).toHaveLength(1);
    expect(loadTasks()).toHaveLength(3);
    expect(loadDayPlans()).toHaveLength(1);
  });

  it('never stores the registration password', () => {
    completeActivation({ input, locale: 'en', tToday: (key) => key });
    expect(JSON.stringify(loadUserProfile())).not.toContain('password');
  });
});
