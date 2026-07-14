import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createGoal,
  getActiveGoal,
  getActiveMonthlyGoal,
  getActiveWeeklyGoal,
  getGoalHorizon,
  loadGoals,
  saveGoals,
} from '@/lib/storage/persistence';
import type { Goal } from '@/types';

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(key: string) { return this.map.has(key) ? this.map.get(key)! : null; }
  key(i: number) { return Array.from(this.map.keys())[i] ?? null; }
  removeItem(key: string) { this.map.delete(key); }
  setItem(key: string, value: string) { this.map.set(key, value); }
}

function makeGoalDraft(overrides: Partial<Omit<Goal, 'id' | 'createdAt'>> = {}): Omit<Goal, 'id' | 'createdAt'> {
  return {
    userId: 'u1',
    title: 'Test goal',
    originalInput: 'Test goal',
    area: 'skill',
    level: 1,
    specific: 'Test',
    measurable: 'done',
    deadline: '2099-01-01',
    why: 'why',
    externalResult: 'result',
    realismScore: 80,
    status: 'active',
    ...overrides,
  };
}

describe('Goal horizon', () => {
  beforeEach(() => {
    const storage = new MemoryStorage();
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', { localStorage: storage } as Window);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('legacy goal without horizon is treated as weekly', () => {
    const legacy = {
      ...makeGoalDraft(),
      id: 'goal_legacy',
      createdAt: new Date().toISOString(),
    } as Goal;
    saveGoals([legacy]);

    const loaded = loadGoals()[0];
    expect(loaded.horizon).toBeUndefined();
    expect(getGoalHorizon(loaded)).toBe('weekly');
    expect(getActiveWeeklyGoal()?.id).toBe('goal_legacy');
    expect(getActiveMonthlyGoal()).toBeUndefined();
  });

  it('createGoal stores horizon explicitly when omitted (defaults to weekly)', () => {
    const created = createGoal(makeGoalDraft());
    expect(created.horizon).toBe('weekly');
  });

  it('allows one active monthly + one active weekly side by side', () => {
    const monthly = createGoal(makeGoalDraft({ horizon: 'monthly', title: 'Month' }));
    const weekly = createGoal(makeGoalDraft({ horizon: 'weekly', title: 'Week' }));
    expect(getActiveMonthlyGoal()?.id).toBe(monthly.id);
    expect(getActiveWeeklyGoal()?.id).toBe(weekly.id);
  });

  it('getActiveGoal prefers weekly over monthly when both exist', () => {
    createGoal(makeGoalDraft({ horizon: 'monthly', title: 'Month' }));
    const weekly = createGoal(makeGoalDraft({ horizon: 'weekly', title: 'Week' }));
    expect(getActiveGoal()?.id).toBe(weekly.id);
  });

  it('getActiveGoal falls back to monthly when no weekly is active', () => {
    const monthly = createGoal(makeGoalDraft({ horizon: 'monthly', title: 'Month' }));
    expect(getActiveGoal()?.id).toBe(monthly.id);
  });

  it('createGoal throws active_goal_exists when a second active is added on the same horizon', () => {
    createGoal(makeGoalDraft({ horizon: 'monthly' }));
    expect(() => createGoal(makeGoalDraft({ horizon: 'monthly' }))).toThrowError('active_goal_exists');
  });

  it('archived goal does not block creating a new active one on the same horizon', () => {
    const first = createGoal(makeGoalDraft({ horizon: 'weekly' }));
    const goals = loadGoals();
    goals[0] = { ...first, status: 'completed' };
    saveGoals(goals);

    expect(() => createGoal(makeGoalDraft({ horizon: 'weekly' }))).not.toThrow();
  });
});
