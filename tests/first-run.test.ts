import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildFirstRunDraft, completeFirstRun } from '@/lib/firstRun';
import {
  loadDayPlans,
  loadGoals,
  loadTasks,
  loadUserProfile,
} from '@/lib/storage';
import { getGoalTimeline } from '@/lib/goalCalendar';

class MemoryStorage implements Storage {
  private map = new Map<string, string>();

  get length() {
    return this.map.size;
  }

  clear() {
    this.map.clear();
  }

  getItem(key: string) {
    return this.map.has(key) ? this.map.get(key)! : null;
  }

  key(index: number) {
    return Array.from(this.map.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.map.delete(key);
  }

  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
}

const tToday = (key: string, values?: Record<string, string | number>) =>
  values?.adjustment ? `${key}: ${values.adjustment}` : key;

describe('fast first run', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 12, 12));
    storage = new MemoryStorage();
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', { localStorage: storage } as Window);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('turns one result into a localized weekly goal and exactly three steps', () => {
    const ru = buildFirstRunDraft('  Подготовить   черновик предложения  ', 'ru');
    const en = buildFirstRunDraft('Send the first proposal', 'en');

    expect(ru.result).toBe('Подготовить черновик предложения');
    expect(ru.weeklyGoal).toContain(ru.result);
    expect([
      ru.trajectory.learningTitle,
      ru.trajectory.practiceTitle,
      ru.trajectory.outputTitle,
    ]).toHaveLength(3);
    expect(en.weeklyGoal).toContain('Send the first proposal');
    expect(en.trajectory.learningTitle).toBe('Define what “done” looks like');
  });

  it('does not persist agreement or onboarding when the contract was not accepted', () => {
    const draft = buildFirstRunDraft('Подготовить черновик предложения', 'ru');

    expect(() =>
      completeFirstRun({
        draft,
        locale: 'ru',
        contractAccepted: false,
        tToday,
      })
    ).toThrowError('contract_required');

    expect(loadGoals()).toEqual([]);
    expect(loadTasks()).toEqual([]);
    expect(loadDayPlans()).toEqual([]);
    expect(loadUserProfile().contractAccepted).toBe(false);
    expect(loadUserProfile().onboardingCompleted).toBe(false);
  });

  it('creates one weekly goal, three protocol tasks, and today before completing onboarding', () => {
    const result = 'Подготовить и отправить клиенту черновик предложения';
    const draft = buildFirstRunDraft(result, 'ru');

    const completed = completeFirstRun({
      draft,
      locale: 'ru',
      contractAccepted: true,
      tToday,
    });

    const profile = loadUserProfile();
    const goals = loadGoals();
    const tasks = loadTasks();
    const plans = loadDayPlans();

    expect(profile.onboardingCompleted).toBe(true);
    expect(profile.contractAccepted).toBe(true);
    expect(profile.firstName).toBeUndefined();
    expect(profile.lastName).toBeUndefined();
    expect(profile.strictnessMode).toBe('standard');
    expect(goals).toHaveLength(1);
    expect(goals[0]).toMatchObject({
      horizon: 'weekly',
      originalInput: result,
      deadline: '2026-07-18',
    });
    expect(getGoalTimeline(goals[0].createdAt, goals[0].deadline, '2026-07-12')).toMatchObject({
      totalCalendarDays: 7,
      currentCalendarDay: 1,
      daysUntilDeadline: 6,
    });
    expect(tasks).toHaveLength(3);
    expect(tasks.map((task) => task.dayBlock)).toEqual(['morning', 'day', 'evening']);
    expect(tasks.map((task) => task.status)).toEqual(['planned', 'planned', 'planned']);
    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({
      mainResult: result,
      taskIds: tasks.map((task) => task.id),
      dailyProtocolVersion: 1,
      status: 'active',
    });
    expect(completed.firstTask.id).toBe(tasks[0].id);
  });

  it('is idempotent after completion and does not duplicate the first day', () => {
    const draft = buildFirstRunDraft('Send the first proposal', 'en');
    const input = {
      draft,
      locale: 'en' as const,
      contractAccepted: true,
      tToday,
    };

    const first = completeFirstRun(input);
    const second = completeFirstRun(input);

    expect(second.dayPlan.id).toBe(first.dayPlan.id);
    expect(second.goal.id).toBe(first.goal.id);
    expect(loadGoals()).toHaveLength(1);
    expect(loadTasks()).toHaveLength(3);
    expect(loadDayPlans()).toHaveLength(1);
  });
});
