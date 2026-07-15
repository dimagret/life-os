'use client';

import {
  UserProfile,
  Goal,
  GoalHorizon,
  Task,
  DayPlan,
  FocusBlock,
  ActiveFocusSession,
  ActionCourtReview,
  Debt,
  RecoveryQuest,
  KnowledgeModule,
  UiState,
  Proof,
} from '@/types';
import { STORAGE_KEYS } from '@/lib/constants';
import { generateId, getTodayDate, safeJsonParse } from '@/lib/utils';
import {
  DEFAULT_YANDEX_MUSIC_EMBED_URL,
  LEGACY_DEFAULT_YANDEX_MUSIC_EMBED_URLS,
  normalizeYandexMusicEmbedUrl,
} from '@/lib/focusMusic';

// ——— SSR safety ———

export function canUseStorage(): boolean {
  return typeof window !== 'undefined';
}

export function getItem(key: string): string | null {
  if (!canUseStorage()) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setItem(key: string, value: string): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // silently fail if storage is unavailable
  }
}

// ——— UserProfile ———

export function createDefaultUserProfile(): UserProfile {
  return {
    id: generateId('user'),
    createdAt: new Date().toISOString(),
    onboardingCompleted: false,
    skippedOnboarding: false,
    contractAccepted: false,
    strictnessMode: 'standard',
    level: 1,
    totalXp: 0,
    innerCore: 0,
    abyssIndex: 0,
    currentStreak: 0,
    activeStabilization: false,
    externalResultsCount: 0,
    voiceTone: 'default',
    soundEnabled: true,
    focusMusicEnabled: false,
    focusMusicSource: 'builtin',
    focusMusicPreset: 'softNoise',
    focusMusicEndBehavior: 'fade',
    focusYandexEmbedUrl: DEFAULT_YANDEX_MUSIC_EMBED_URL,
    focusYandexPlayerOpen: true,
    taskReminderEnabled: false,
    taskReminderMinutes: 60,
  };
}

export function loadUserProfile(): UserProfile {
  const raw = getItem(STORAGE_KEYS.userProfile);
  const profile = safeJsonParse(raw, createDefaultUserProfile());
  return migrateFocusMusicProfile(migrateLegacyAbyssDefault(profile));
}

/** Старый дефолт abyssIndex был 20 без штрафов — при нулевом прогрессе приводим к 0. */
function migrateLegacyAbyssDefault(p: UserProfile): UserProfile {
  const noProgressYet =
    p.totalXp === 0 &&
    p.innerCore === 0 &&
    p.currentStreak === 0 &&
    p.externalResultsCount === 0 &&
    !p.activeStabilization;
  if (p.abyssIndex === 20 && noProgressYet) {
    const next = { ...p, abyssIndex: 0 };
    saveUserProfile(next);
    return next;
  }
  return p;
}

function migrateFocusMusicProfile(p: UserProfile): UserProfile {
  const rawEmbedUrl = p.focusYandexEmbedUrl ?? p.focusMusicUrl;
  const normalizedRawEmbedUrl = normalizeYandexMusicEmbedUrl(rawEmbedUrl);
  const embedUrl =
    normalizedRawEmbedUrl &&
    LEGACY_DEFAULT_YANDEX_MUSIC_EMBED_URLS.some((legacyUrl) => legacyUrl === normalizedRawEmbedUrl)
      ? DEFAULT_YANDEX_MUSIC_EMBED_URL
      : normalizedRawEmbedUrl;
  const yandexPageUrl = normalizeYandexMusicEmbedUrl(p.focusMusicUrl);
  const patch: Partial<UserProfile> = {};

  if (embedUrl && p.focusYandexEmbedUrl !== embedUrl) {
    patch.focusYandexEmbedUrl = embedUrl;
  }

  if (!embedUrl && p.focusMusicSource === 'yandex') {
    patch.focusYandexEmbedUrl = DEFAULT_YANDEX_MUSIC_EMBED_URL;
  }

  if (
    p.focusMusicSource === 'yandex' &&
    p.focusYandexEmbedUrl === undefined &&
    patch.focusYandexEmbedUrl === undefined
  ) {
    patch.focusYandexEmbedUrl = DEFAULT_YANDEX_MUSIC_EMBED_URL;
  }

  if (yandexPageUrl && p.focusMusicSource === 'url') {
    patch.focusMusicSource = 'yandex';
  }

  if ((embedUrl || patch.focusYandexEmbedUrl || p.focusMusicSource === 'yandex') && p.focusYandexPlayerOpen === undefined) {
    patch.focusYandexPlayerOpen = true;
  }

  // Life OS now uses its own controllable soundscape catalog. External providers
  // remain readable for backward compatibility, but active playback is migrated.
  if (p.focusMusicSource !== 'builtin') {
    patch.focusMusicSource = 'builtin';
  }
  if (Object.keys(patch).length === 0) return p;

  const next = { ...p, ...patch };
  saveUserProfile(next);
  return next;
}

export function saveUserProfile(profile: UserProfile): void {
  setItem(STORAGE_KEYS.userProfile, JSON.stringify(profile));
}

// ——— Goals ———

/** Старые цели без поля horizon трактуем как weekly. */
export function getGoalHorizon(goal: Goal): GoalHorizon {
  return goal.horizon ?? 'weekly';
}

export function loadGoals(): Goal[] {
  const raw = getItem(STORAGE_KEYS.goals);
  return safeJsonParse(raw, []);
}

export function saveGoals(goals: Goal[]): void {
  setItem(STORAGE_KEYS.goals, JSON.stringify(goals));
}

/**
 * Создаёт цель. На один horizon допускается не более одной active.
 * Бросает Error('active_goal_exists') если active уже есть. UI ловит и предлагает архивировать предыдущую.
 */
export function createGoal(goal: Omit<Goal, 'id' | 'createdAt'>): Goal {
  const goals = loadGoals();
  const horizon: GoalHorizon = goal.horizon ?? 'weekly';
  if (
    goal.status === 'active' &&
    goals.some((g) => g.status === 'active' && getGoalHorizon(g) === horizon)
  ) {
    throw new Error('active_goal_exists');
  }
  const newGoal: Goal = {
    ...goal,
    horizon,
    id: generateId('goal'),
    createdAt: new Date().toISOString(),
  };
  goals.push(newGoal);
  saveGoals(goals);
  return newGoal;
}

/**
 * Активная цель. Для совместимости со старым кодом (handleCreateDayPlan)
 * приоритет — weekly, fallback — любой active (включая monthly).
 */
export function getActiveGoal(): Goal | undefined {
  const goals = loadGoals();
  return (
    goals.find((g) => g.status === 'active' && getGoalHorizon(g) === 'weekly') ??
    goals.find((g) => g.status === 'active')
  );
}

export function getActiveWeeklyGoal(): Goal | undefined {
  return loadGoals().find((g) => g.status === 'active' && getGoalHorizon(g) === 'weekly');
}

export function getActiveMonthlyGoal(): Goal | undefined {
  return loadGoals().find((g) => g.status === 'active' && getGoalHorizon(g) === 'monthly');
}

export function hasActiveGoal(): boolean {
  return loadGoals().some((g) => g.status === 'active');
}

export function archiveGoal(goalId: string): Goal | null {
  return updateGoal(goalId, { status: 'completed' });
}

export function updateGoal(goalId: string, patch: Partial<Goal>): Goal | null {
  const goals = loadGoals();
  const index = goals.findIndex((g) => g.id === goalId);
  if (index === -1) return null;
  goals[index] = { ...goals[index], ...patch };
  saveGoals(goals);
  return goals[index];
}

// ——— Tasks ———

export function loadTasks(): Task[] {
  const raw = getItem(STORAGE_KEYS.tasks);
  return safeJsonParse(raw, []);
}

export function saveTasks(tasks: Task[]): void {
  setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
}

export function createTask(task: Omit<Task, 'id' | 'createdAt'>): Task {
  const newTask: Task = {
    ...task,
    id: generateId('task'),
    createdAt: new Date().toISOString(),
  };
  const tasks = loadTasks();
  tasks.push(newTask);
  saveTasks(tasks);
  return newTask;
}

export function updateTask(taskId: string, patch: Partial<Task>): Task | null {
  const tasks = loadTasks();
  const index = tasks.findIndex((t) => t.id === taskId);
  if (index === -1) return null;
  tasks[index] = { ...tasks[index], ...patch };
  saveTasks(tasks);
  return tasks[index];
}

export function getTasksByIds(taskIds: string[]): Task[] {
  const tasks = loadTasks();
  return tasks.filter((t) => taskIds.includes(t.id));
}

export function getTasksByGoal(goalId: string): Task[] {
  return loadTasks().filter((t) => t.goalId === goalId);
}

export function addProofToTask(
  taskId: string,
  proof: Omit<Proof, 'id' | 'taskId' | 'createdAt'>
): Task | null {
  const tasks = loadTasks();
  const index = tasks.findIndex((t) => t.id === taskId);
  if (index === -1) return null;

  const newProof: Proof = {
    ...proof,
    id: generateId('proof'),
    taskId,
    createdAt: new Date().toISOString(),
  };

  tasks[index] = {
    ...tasks[index],
    proof: newProof,
  };
  saveTasks(tasks);
  return tasks[index];
}

// ——— DayPlans ———

export function loadDayPlans(): DayPlan[] {
  const raw = getItem(STORAGE_KEYS.dayPlans);
  return safeJsonParse(raw, []);
}

export function saveDayPlans(dayPlans: DayPlan[]): void {
  setItem(STORAGE_KEYS.dayPlans, JSON.stringify(dayPlans));
}

export function createDayPlan(dayPlan: Omit<DayPlan, 'id'>): DayPlan {
  const newDayPlan: DayPlan = {
    ...dayPlan,
    id: generateId('day'),
  };
  const dayPlans = loadDayPlans();
  dayPlans.push(newDayPlan);
  saveDayPlans(dayPlans);
  return newDayPlan;
}

export function updateDayPlan(
  dayPlanId: string,
  patch: Partial<DayPlan>
): DayPlan | null {
  const dayPlans = loadDayPlans();
  const index = dayPlans.findIndex((d) => d.id === dayPlanId);
  if (index === -1) return null;
  dayPlans[index] = { ...dayPlans[index], ...patch };
  saveDayPlans(dayPlans);
  return dayPlans[index];
}

export function getTodayPlan(): DayPlan | undefined {
  const today = getTodayDate();
  return loadDayPlans().find((d) => d.date === today);
}

// ——— FocusBlocks ———

export function loadFocusBlocks(): FocusBlock[] {
  const raw = getItem(STORAGE_KEYS.focusBlocks);
  return safeJsonParse(raw, []);
}

export function saveFocusBlocks(focusBlocks: FocusBlock[]): void {
  setItem(STORAGE_KEYS.focusBlocks, JSON.stringify(focusBlocks));
}

export function createFocusBlock(focusBlock: Omit<FocusBlock, 'id'>): FocusBlock {
  const newBlock: FocusBlock = {
    ...focusBlock,
    id: generateId('focus'),
  };
  const blocks = loadFocusBlocks();
  blocks.push(newBlock);
  saveFocusBlocks(blocks);
  return newBlock;
}

export function updateFocusBlock(
  blockId: string,
  patch: Partial<FocusBlock>
): FocusBlock | null {
  const blocks = loadFocusBlocks();
  const index = blocks.findIndex((b) => b.id === blockId);
  if (index === -1) return null;
  blocks[index] = { ...blocks[index], ...patch };
  saveFocusBlocks(blocks);
  return blocks[index];
}

export function getActiveFocusBlock(): FocusBlock | undefined {
  return loadFocusBlocks().find((b) => b.status === 'running');
}

export function getFocusBlocksByTask(taskId: string): FocusBlock[] {
  return loadFocusBlocks().filter((b) => b.taskId === taskId);
}

// ——— ActiveFocusSession ———

export function loadActiveFocusSession(): ActiveFocusSession | null {
  const raw = getItem(STORAGE_KEYS.activeFocusSession);
  return safeJsonParse<ActiveFocusSession | null>(raw, null);
}

export function saveActiveFocusSession(session: ActiveFocusSession): void {
  setItem(STORAGE_KEYS.activeFocusSession, JSON.stringify(session));
}

export function clearActiveFocusSession(): void {
  if (!canUseStorage()) return;
  try {
    localStorage.removeItem(STORAGE_KEYS.activeFocusSession);
  } catch {
    // silently fail if storage is unavailable
  }
}

// ——— ActionCourtReviews ———

export function loadActionCourtReviews(): ActionCourtReview[] {
  const raw = getItem(STORAGE_KEYS.actionCourtReviews);
  return safeJsonParse(raw, []);
}

export function saveActionCourtReviews(reviews: ActionCourtReview[]): void {
  setItem(STORAGE_KEYS.actionCourtReviews, JSON.stringify(reviews));
}

// ——— Debts ———

export function loadDebts(): Debt[] {
  const raw = getItem(STORAGE_KEYS.debts);
  return safeJsonParse(raw, []);
}

export function saveDebts(debts: Debt[]): void {
  setItem(STORAGE_KEYS.debts, JSON.stringify(debts));
}

export function createDebt(debt: Omit<Debt, 'id' | 'createdAt'>): Debt {
  const newDebt: Debt = {
    ...debt,
    id: generateId('debt'),
    createdAt: new Date().toISOString(),
  };
  const debts = loadDebts();
  debts.push(newDebt);
  saveDebts(debts);
  return newDebt;
}

export function closeDebt(debtId: string): Debt | null {
  const debts = loadDebts();
  const index = debts.findIndex((d) => d.id === debtId);
  if (index === -1) return null;
  debts[index] = {
    ...debts[index],
    status: 'closed',
    closedAt: new Date().toISOString(),
  };
  saveDebts(debts);
  return debts[index];
}

// ——— RecoveryQuests ———

export function loadRecoveryQuests(): RecoveryQuest[] {
  const raw = getItem(STORAGE_KEYS.recoveryQuests);
  return safeJsonParse(raw, []);
}

export function saveRecoveryQuests(quests: RecoveryQuest[]): void {
  setItem(STORAGE_KEYS.recoveryQuests, JSON.stringify(quests));
}

export function createRecoveryQuest(quest: Omit<RecoveryQuest, 'id'>): RecoveryQuest {
  const newQuest: RecoveryQuest = {
    ...quest,
    id: generateId('quest'),
  };
  const quests = loadRecoveryQuests();
  quests.push(newQuest);
  saveRecoveryQuests(quests);
  return newQuest;
}

// ——— KnowledgeModules ———

export const defaultKnowledgeModules: KnowledgeModule[] = [
  {
    id: 'km-discipline-vs-motivation',
    title: 'Почему дисциплина важнее мотивации',
    content:
      'Мотивация — это эмоция. Эмоции временны. Дисциплина — это система, которая работает независимо от настроения.',
    unlockCondition: 'Первый день завершён',
    unlocked: false,
    category: 'discipline',
  },
  {
    id: 'km-learning-without-action',
    title: 'Почему обучение без применения не работает',
    content:
      'Пассивное потребление информации создаёт иллюзию прогресса. Настоящее обучение начинается только с действием.',
    unlockCondition: '3 задачи обучения подряд',
    unlocked: false,
    category: 'execution',
  },
  {
    id: 'km-recovery-after-failure',
    title: 'Как вернуть контроль после срыва',
    content:
      'Срыв — не конец. Это точка, где начинается восстановление. Минимальное действие возвращает контроль.',
    unlockCondition: 'Первый Recovery Quest выполнен',
    unlocked: false,
    category: 'recovery',
  },
  {
    id: 'km-false-rest',
    title: 'Что такое ложный отдых',
    content:
      'Соцсети, видео, бессмысленный скроллинг — это не отдых. Это побег. Настоящий отдых восстанавливает, а не истощает.',
    unlockCondition: 'Обнаружен ложный отдых',
    unlocked: false,
    category: 'focus',
  },
  {
    id: 'km-self-promise',
    title: 'Почему обещание себе имеет цену',
    content:
      'Каждый раз, когда ты даёшь обещание и нарушаешь его, ты разрушаешь доверие к себе. Так появляется самое дорогое незакрытое обещание.',
    unlockCondition: 'Первое незакрытое обещание закрыто',
    unlocked: false,
    category: 'self_deception',
  },
  {
    id: 'km-goal-map-resource-action',
    title: 'Карта цели: ресурс, действие, отклик',
    content:
      'Карта цели нужна, чтобы цель перестала быть красивой фразой и стала рабочей схемой дня.\n\n' +
      '## Контур\n' +
      'Сначала зафиксируй внешний результат: что должно стать видно снаружи. Затем назови ресурс: время, навык, контакт, инструмент или энергия, которые уже доступны. После этого выбери одно действие, которое можно выполнить сегодня, и один признак отклика: ответ, заявка, черновик, опубликованный блок, обратная связь.\n\n' +
      '## Почему это важно\n' +
      'Цель без ресурса превращается в давление. Ресурс без действия превращается в ожидание. Действие без отклика не обучает систему. Life OS связывает эти части в один контур: цель недели → микроцель дня → действие → факт.\n\n' +
      '## Практика\n' +
      'Перед сборкой дня запиши одну строку: «Результат: ... Ресурс: ... Действие: ... Отклик: ...». Если строка не собирается, цель ещё не готова к выполнению.',
    unlockCondition: 'Первый день собран',
    unlocked: false,
    category: 'execution',
  },
  {
    id: 'km-feedback-loop-action-correction',
    title: 'Петля действия: сделал, увидел, исправил',
    content:
      'После карты цели результат проверяется не размышлением, а контактом с реальностью.\n\n' +
      '## Контур\n' +
      'Сделал маленький внешний шаг. Получил отклик или его отсутствие. Записал факт без оправданий. Исправил следующий шаг. Повторил. Так появляется не мотивация, а управляемость.\n\n' +
      '## Пример\n' +
      'Не «изучить создание сайтов», а собрать коммерческое предложение, отправить 10-20 качественных сообщений потенциальным заказчикам, отметить ответы и переписать оффер по фактам. Даже отсутствие ответа становится данными, если оно меняет следующий шаг.\n\n' +
      '## Практика\n' +
      'В конце дня ответь на три вопроса: что сделал, какой отклик получил, что меняю завтра. Если нет отклика, следующая сборка дня должна выводить действие наружу, а не добавлять ещё подготовки.',
    unlockCondition: 'Первый внешний отклик или разбор дня',
    unlocked: false,
    category: 'execution',
  },
];

export function mergeDefaultKnowledgeModules(existing: KnowledgeModule[]): KnowledgeModule[] {
  const existingById = new Map(existing.map((module) => [module.id, module]));
  const defaultIds = new Set(defaultKnowledgeModules.map((module) => module.id));
  const normalizeTitle = (title: string) => title.trim().toLowerCase().replace(/\s+/g, ' ');
  const usedTitles = new Set(defaultKnowledgeModules.map((module) => normalizeTitle(module.title)));

  const mergedDefaults = defaultKnowledgeModules.map((defaultModule) => {
    const current = existingById.get(defaultModule.id);
    if (!current) return defaultModule;
    return {
      ...defaultModule,
      unlocked: current.unlocked,
    };
  });

  const customModules: KnowledgeModule[] = [];
  for (const customModule of existing) {
    if (defaultIds.has(customModule.id)) continue;
    const title = normalizeTitle(customModule.title);
    if (usedTitles.has(title)) continue;
    usedTitles.add(title);
    customModules.push(customModule);
  }

  return [...mergedDefaults, ...customModules];
}

export function loadKnowledgeModules(): KnowledgeModule[] {
  const raw = getItem(STORAGE_KEYS.knowledgeModules);
  return safeJsonParse(raw, []);
}

export function saveKnowledgeModules(modules: KnowledgeModule[]): void {
  setItem(STORAGE_KEYS.knowledgeModules, JSON.stringify(modules));
}

// ——— AppState ———

export function loadAppState(): { currentState: UiState } {
  const raw = getItem(STORAGE_KEYS.appState);
  return safeJsonParse(raw, { currentState: 'control' as UiState });
}

export function saveAppState(state: { currentState: UiState }): void {
  setItem(STORAGE_KEYS.appState, JSON.stringify(state));
}

// ——— Snapshot / Reset ———

export type StorageSnapshot = Partial<Record<string, string>>;

/** Captures the current value of all `lifeos:*` keys in memory.
 *  Pair with `restoreSnapshot(...)` to support Undo of destructive actions. */
export function snapshotAllStorage(): StorageSnapshot {
  if (!canUseStorage()) return {};
  const snap: StorageSnapshot = {};
  Object.values(STORAGE_KEYS).forEach((key) => {
    const value = localStorage.getItem(key);
    if (value !== null) snap[key] = value;
  });
  return snap;
}

export function restoreSnapshot(snap: StorageSnapshot): void {
  if (!canUseStorage()) return;
  Object.values(STORAGE_KEYS).forEach((key) => {
    const v = snap[key];
    if (v === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, v);
    }
  });
}

export function resetAllData(): void {
  if (!canUseStorage()) return;
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}

