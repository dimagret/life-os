import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { safeJsonParse } from '@/lib/utils';
import {
  canUseStorage,
  getItem,
  setItem,
  loadUserProfile,
  saveUserProfile,
  createDefaultUserProfile,
  createDayPlan,
  loadDayPlans,
  saveActionCourtReviews,
  loadActionCourtReviews,
  createGoal,
  loadGoals,
  saveTasks,
  loadTasks,
  saveFocusBlocks,
  loadFocusBlocks,
  saveDebts,
  loadDebts,
  saveRecoveryQuests,
  loadRecoveryQuests,
  saveKnowledgeModules,
  loadKnowledgeModules,
} from '@/lib/storage/persistence';
import type { ActionCourtReview, Debt, FocusBlock, KnowledgeModule, RecoveryQuest, Task } from '@/types';

// ——— MemoryStorage helper (same pattern as migrations.test.ts) ———

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
  key(i: number) {
    return Array.from(this.map.keys())[i] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
}

// ——— safeJsonParse ———

describe('safeJsonParse', () => {
  it('parses a valid JSON string', () => {
    expect(safeJsonParse('{"x":1}', null)).toEqual({ x: 1 });
  });

  it('returns fallback for invalid JSON', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(safeJsonParse('{bad json}', 42)).toBe(42);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('returns fallback for null input', () => {
    expect(safeJsonParse(null, 'default')).toBe('default');
  });

  it('returns fallback for empty string', () => {
    expect(safeJsonParse('', [])).toEqual([]);
  });

  it('parses JSON arrays', () => {
    expect(safeJsonParse('[1,2,3]', [])).toEqual([1, 2, 3]);
  });

  it('returns fallback for whitespace-only string', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = safeJsonParse('   ', 99);
    // empty/whitespace string is falsy-ish but " " is truthy, JSON.parse throws
    // safeJsonParse returns fallback on parse error
    expect(result).toBe(99);
    warn.mockRestore();
  });
});

// ——— canUseStorage / getItem / setItem (requires window) ———

describe('storage primitives with mocked localStorage', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', { localStorage: storage } as Window);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('canUseStorage returns true when window is available', () => {
    expect(canUseStorage()).toBe(true);
  });

  it('getItem returns null for a missing key', () => {
    expect(getItem('no-such-key')).toBeNull();
  });

  it('setItem then getItem round-trips a value', () => {
    setItem('test-key', 'hello');
    expect(getItem('test-key')).toBe('hello');
  });

  it('setItem overwrites an existing value', () => {
    setItem('k', 'v1');
    setItem('k', 'v2');
    expect(getItem('k')).toBe('v2');
  });
});

describe('canUseStorage without window', () => {
  it('returns false when window is not defined', () => {
    // In vitest node environment window is undefined by default
    vi.unstubAllGlobals();
    expect(canUseStorage()).toBe(false);
  });
});

// ——— loadUserProfile / saveUserProfile ———

describe('loadUserProfile / saveUserProfile', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', { localStorage: storage } as Window);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns a default profile when storage is empty', () => {
    const profile = loadUserProfile();
    expect(profile.onboardingCompleted).toBe(false);
    expect(profile.level).toBe(1);
    expect(profile.totalXp).toBe(0);
    expect(profile.abyssIndex).toBe(0);
  });

  it('saves and reloads a profile correctly', () => {
    const original = createDefaultUserProfile();
    const modified = { ...original, totalXp: 500, level: 3 };
    saveUserProfile(modified);
    const loaded = loadUserProfile();
    expect(loaded.totalXp).toBe(500);
    expect(loaded.level).toBe(3);
  });

  it('migrates legacy default abyss 20 to 0 when there is no progress yet', () => {
    const legacy = {
      ...createDefaultUserProfile(),
      abyssIndex: 20,
      onboardingCompleted: true,
    };
    saveUserProfile(legacy);
    const loaded = loadUserProfile();
    expect(loaded.abyssIndex).toBe(0);
  });

  it('does not migrate abyss 20 if the player already has progress', () => {
    const progressed = {
      ...createDefaultUserProfile(),
      abyssIndex: 20,
      totalXp: 50,
      onboardingCompleted: true,
    };
    saveUserProfile(progressed);
    const loaded = loadUserProfile();
    expect(loaded.abyssIndex).toBe(20);
  });

  it('returns default profile when stored JSON is corrupted', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    setItem('lifeos:userProfile', '{corrupted');
    const profile = loadUserProfile();
    expect(profile.level).toBe(1);
    warn.mockRestore();
  });
});

// ——— Cyclic day memory: yesterday persists into today ———

describe('cyclic day memory', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', { localStorage: storage } as Window);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps yesterday DayPlan, Goal and ActionCourtReview after creating a new day', () => {
    const yesterday = createDayPlan({
      date: '2026-05-06',
      mainResult: 'Yesterday result',
      minimumAction: 'min',
      deadline: '2026-05-06T23:59:59',
      risk: 'r',
      protection: 'p',
      rewardText: 'rw',
      consequenceText: 'c',
      taskIds: [],
      status: 'closed',
    });

    const goal = createGoal({
      userId: 'u1',
      title: 'Weekly goal',
      originalInput: 'Weekly goal',
      area: 'skill',
      level: 1,
      specific: 'Weekly goal',
      measurable: 'done',
      deadline: '2099-01-01',
      why: 'why',
      externalResult: 'result',
      realismScore: 80,
      status: 'active',
      horizon: 'weekly',
    });

    const review: ActionCourtReview = {
      id: 'rev_1',
      date: '2026-05-06',
      dayPlanId: yesterday.id,
      completedTaskIds: [],
      failedTaskIds: [],
      partialTaskIds: [],
      falseRestDetected: false,
      verdict: 'partial_victory',
      xpDelta: 10,
      innerCoreDelta: 1,
      abyssIndexDelta: 0,
      debtIds: [],
      createdAt: new Date('2026-05-06T22:00:00').toISOString(),
    };
    saveActionCourtReviews([review]);

    const today = createDayPlan({
      date: '2026-05-07',
      mainResult: 'Today result',
      minimumAction: 'min',
      deadline: '2026-05-07T23:59:59',
      risk: 'r',
      protection: 'p',
      rewardText: 'rw',
      consequenceText: 'c',
      taskIds: [],
      status: 'active',
    });

    const allDays = loadDayPlans();
    expect(allDays.map((d) => d.date)).toContain('2026-05-06');
    expect(allDays.map((d) => d.date)).toContain('2026-05-07');
    expect(allDays.find((d) => d.id === today.id)).toBeDefined();
    expect(allDays.find((d) => d.id === yesterday.id)).toBeDefined();

    const goals = loadGoals();
    expect(goals.find((g) => g.id === goal.id)?.status).toBe('active');

    const reviews = loadActionCourtReviews();
    expect(reviews.find((r) => r.id === 'rev_1')).toBeDefined();
  });
});

describe('main collection persistence', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', { localStorage: storage } as Window);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('round-trips and updates tasks, focus blocks, debts, recovery quests and knowledge modules', () => {
    const task: Task = {
      id: 'task_1',
      title: 'Initial task',
      type: 'practice',
      importance: 'normal',
      status: 'planned',
      xpReward: 10,
      xpPenalty: 5,
      proofRequired: false,
      createdAt: '2026-05-14T08:00:00.000Z',
    };
    saveTasks([task]);
    saveTasks([{ ...loadTasks()[0], title: 'Updated task', status: 'completed' }]);
    expect(loadTasks()).toMatchObject([{ id: 'task_1', title: 'Updated task', status: 'completed' }]);

    const focusBlock: FocusBlock = {
      id: 'focus_1',
      taskId: 'task_1',
      goal: 'Work block',
      durationMinutes: 25,
      distractions: [],
      status: 'completed',
      result: 'Done',
    };
    saveFocusBlocks([focusBlock]);
    saveFocusBlocks([{ ...loadFocusBlocks()[0], result: 'Updated result' }]);
    expect(loadFocusBlocks()).toMatchObject([{ id: 'focus_1', result: 'Updated result' }]);

    const debt: Debt = {
      id: 'debt_1',
      title: 'Small debt',
      type: 'small',
      status: 'open',
      createdAt: '2026-05-14T08:00:00.000Z',
    };
    saveDebts([debt]);
    saveDebts([{ ...loadDebts()[0], status: 'closed', closedAt: '2026-05-14T09:00:00.000Z' }]);
    expect(loadDebts()).toMatchObject([{ id: 'debt_1', status: 'closed' }]);

    const quest: RecoveryQuest = {
      id: 'quest_1',
      title: 'Recovery',
      description: 'Walk',
      xpRestore: 5,
      innerCoreReward: 1,
      abyssReduction: 1,
      status: 'planned',
    };
    saveRecoveryQuests([quest]);
    saveRecoveryQuests([{ ...loadRecoveryQuests()[0], status: 'completed' }]);
    expect(loadRecoveryQuests()).toMatchObject([{ id: 'quest_1', status: 'completed' }]);

    const knowledgeModule: KnowledgeModule = {
      id: 'km_1',
      title: 'Module',
      content: 'Content',
      unlockCondition: 'Condition',
      unlocked: false,
      category: 'focus',
    };
    saveKnowledgeModules([knowledgeModule]);
    saveKnowledgeModules([{ ...loadKnowledgeModules()[0], unlocked: true }]);
    expect(loadKnowledgeModules()).toMatchObject([{ id: 'km_1', unlocked: true }]);
  });
});
