export type UiState =
  | 'control'
  | 'hold'
  | 'risk'
  | 'stabilization'
  | 'recovery'
  | 'victory'
  | 'deception';

export type StrictnessMode = 'soft' | 'standard' | 'hard' | 'owner';

export type Verdict =
  | 'self_victory'
  | 'partial_victory'
  | 'respectful_transfer'
  | 'failure'
  | 'self_deception'
  | 'recovered_victory';

export type TaskType =
  | 'learning'
  | 'practice'
  | 'output'
  | 'feedback'
  | 'monetization'
  | 'rest'
  | 'recovery';

export type DayBlockKey = 'morning' | 'day' | 'evening';

export type DayBlockTaskRole = 'main' | 'support';

export type FocusEarlyExitReason =
  | 'bad_estimate'
  | 'external'
  | 'low_energy'
  | 'avoidance'
  | 'distraction';

export interface UserProfile {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  selfPromise?: string;
  createdAt: string;
  onboardingCompleted: boolean;
  /** True if the user pressed «Пропустить» during onboarding instead of finishing it. */
  skippedOnboarding: boolean;
  contractAccepted: boolean;
  strictnessMode: StrictnessMode;
  level: number;
  totalXp: number;
  innerCore: number;
  abyssIndex: number;
  currentStreak: number;
  activeStabilization: boolean;
  externalResultsCount: number;
  voiceTone?: string;
  /** Звук + лёгкая вибрация по окончании фокус-таймера. По умолчанию включено. */
  soundEnabled?: boolean;
  /** Direct audio URL for focus background music. External players cannot be controlled from the app. */
  focusMusicUrl?: string;
  /** Play configured background music while the focus timer is running. */
  focusMusicEnabled?: boolean;
  /** Built-in Web Audio background, a direct external audio file, or external Yandex Music page mode. */
  focusMusicSource?: 'builtin' | 'url' | 'yandex';
  /** Legacy normalized Yandex Music iframe URL kept for migration/backward compatibility. */
  focusYandexEmbedUrl?: string;
  /** Legacy preference kept for migration/backward compatibility; active UI uses external Yandex mode. */
  focusYandexPlayerOpen?: boolean;
  /** Built-in focus background variant. */
  focusMusicPreset?: 'softNoise' | 'deepNoise' | 'lowPulse';
  /** What to do with focus music when the timer reaches zero. */
  focusMusicEndBehavior?: 'fade' | 'continue';
  /** In-app reminders for unfinished daily tasks. */
  taskReminderEnabled?: boolean;
  /** Reminder interval in minutes. */
  taskReminderMinutes?: number;
}

export type GoalHorizon = 'weekly' | 'monthly';

export interface Goal {
  id: string;
  userId: string;
  title: string;
  originalInput: string;
  area:
    | 'money'
    | 'health'
    | 'skill'
    | 'business'
    | 'discipline'
    | 'relationship'
    | 'product'
    | 'other';
  level: 0 | 1 | 2 | 3 | 4 | 5;
  specific: string;
  measurable: string;
  /** Inclusive local calendar deadline stored as YYYY-MM-DD. */
  deadline: string;
  why: string;
  externalResult: string;
  realismScore: number;
  status: 'active' | 'paused' | 'completed' | 'failed';
  createdAt: string;
  /** Горизонт цели. Старые записи без поля считаются 'weekly'. */
  horizon?: GoalHorizon;
  /** Опциональная ссылка weekly → monthly. */
  parentGoalId?: string;
}

export interface Task {
  id: string;
  goalId?: string;
  title: string;
  description?: string;
  /** Микроцель именно этого этапа (обучение / практика / внешний результат) на сегодня. */
  microGoal?: string;
  type: TaskType;
  importance: 'low' | 'normal' | 'important' | 'boss';
  status: 'planned' | 'in_progress' | 'completed' | 'partial' | 'failed';
  dueAt?: string;
  xpReward: number;
  xpPenalty: number;
  proofRequired: boolean;
  proof?: Proof;
  /** Morning / day / evening protocol block. Missing legacy values are resolved from task.type. */
  dayBlock?: DayBlockKey;
  /** MVP rule: one main task plus up to two support tasks per block. */
  blockRole?: DayBlockTaskRole;
  /** Planned focus budget for the task, in minutes. */
  plannedMinutes?: number;
  /** Concrete repair action to prevent a failed task from becoming guilt-only review. */
  repairAction?: string;
  createdAt: string;
  completedAt?: string;
}

export interface Proof {
  id: string;
  taskId: string;
  type: 'text' | 'link' | 'image' | 'file' | 'timer';
  value: string;
  createdAt: string;
}

export interface DayPlan {
  id: string;
  date: string;
  goalId?: string;
  mainResult: string;
  /** Как сегодняшний шаг приближает к недельной цели (1–2 предложения). */
  weeklyTrajectory?: string;
  bossTaskId?: string;
  minimumAction: string;
  focusBlockId?: string;
  deadline: string;
  risk: string;
  protection: string;
  rewardText: string;
  consequenceText: string;
  taskIds: string[];
  status: 'planned' | 'active' | 'court_pending' | 'closed';
  /** Marks plans created with the 3-block discipline protocol. */
  dailyProtocolVersion?: 1;
  /** One adjustment carried into tomorrow from today's review. */
  tomorrowAdjustment?: string;
}

export interface FocusSessionReflection {
  /** What distracted (free text, complements distraction tags). */
  whatDistracted?: string;
  /** Why it happened. */
  whyItHappened?: string;
  /** Factors that will help avoid this in the future. */
  futureHelpFactors?: string;
}

/** Ответы расширенного блока ответственности (задача не выполнена). */
export interface FocusAccountabilityAnswers {
  whyNot?: string;
  whatBlocked?: string;
  objectiveOrSabotage?: string;
  tomorrowPlan?: string;
  minimalStep?: string;
}

export type ActiveFocusPhase = 'idle' | 'running' | 'paused' | 'completed' | 'result';

export interface ActiveFocusSession {
  taskId: string;
  phase: ActiveFocusPhase;
  selectedDuration: number;
  customMinutes: string;
  customOpen: boolean;
  timeLeft: number;
  segmentTotalSeconds: number;
  sessionTargetMinutes: number;
  fullDurationHonored: boolean;
  distractions: string[];
  result: string;
  earlyExitReason?: FocusEarlyExitReason;
  salvageAction?: string;
  startedAt?: string;
  segmentEndsAt?: string;
  updatedAt: string;
}

export interface FocusBlock {
  id: string;
  taskId?: string;
  goal: string;
  durationMinutes: number;
  startedAt?: string;
  endedAt?: string;
  distractions: string[];
  status: 'planned' | 'running' | 'completed' | 'failed';
  result?: string;
  /** User stayed until the timer reached zero before opening the result screen. */
  fullDurationHonored?: boolean;
  /** Saved after reflective conversation when distractions > 2. */
  sessionReflection?: FocusSessionReflection;
  /** Optional comment when distractions ≤ 2 (hard / resisted / smooth). */
  sessionComment?: string;
  /** Интерпретация поля result для сценария чек-ина. */
  resultOutcome?: 'negative' | 'partial' | 'positive';
  /** Заполнено после блока ответственности при негативном результате / срыве. */
  accountabilityAnswers?: FocusAccountabilityAnswers;
  /** Why the user left the timer before the planned duration. */
  earlyExitReason?: FocusEarlyExitReason;
  /** Small repair step chosen after ending the timer early. */
  salvageAction?: string;
}

export interface FailureReason {
  type:
    | 'serious_illness'
    | 'minor_illness'
    | 'work_force_majeure'
    | 'family_emergency'
    | 'tired'
    | 'lazy'
    | 'no_mood'
    | 'social_media'
    | 'games'
    | 'false_rest'
    | 'forgot'
    | 'task_too_big'
    | 'bad_planning'
    | 'fear'
    | 'perfectionism'
    | 'learning_instead_action'
    | 'unknown';
  level: 0 | 1 | 2 | 3;
  userComment?: string;
}

/** Запись разбора срыва для истории разбора (на задачу). */
export interface CourtFailureRecord {
  taskId: string;
  reasonType: FailureReason['type'];
  couldDoMinimum: boolean;
  comment: string;
  repairAction?: string;
}

export type VerdictMainCategory = 'victory' | 'partial_victory' | 'defeat' | 'day_void';

export type VerdictInfluenceKey =
  | 'distractions'
  | 'external'
  | 'internal'
  | 'time'
  | 'volume'
  | 'resistance'
  | 'other';

export type VerdictResolutionKey =
  | 'count_full'
  | 'count_partial'
  | 'count_none'
  | 'defer'
  | 'rebuild'
  | 'assign_accountability';

export type VerdictNextStepKey =
  | 'continue'
  | 'tomorrow'
  | 'split'
  | 'recovery'
  | 'capture_reason';

export interface VerdictTaskSummary {
  taskId: string;
  title: string;
  plannedIntent: string;
  outcome: 'completed' | 'partial' | 'failed';
  influenceKeys: VerdictInfluenceKey[];
  influenceOtherNote?: string;
  resolutionKey: VerdictResolutionKey;
  nextStepKey: VerdictNextStepKey;
  /** Нет данных о факторах — не выдумывать, показать «не указано». */
  unspecifiedInfluence?: boolean;
}

export interface VerdictFocusRecap {
  taskId: string;
  fullDurationHonored: boolean;
  distractionsCount: number;
  reflection?: FocusSessionReflection;
  sessionComment?: string;
  suggestRecoveryMinutes?: 5 | 10;
}

export interface VerdictSessionSnapshot {
  mainCategory: VerdictMainCategory;
  taskSummaries: VerdictTaskSummary[];
  dayInfluenceKeys: VerdictInfluenceKey[];
  focusRecap?: VerdictFocusRecap | null;
  nextStepKey: VerdictNextStepKey;
}

export interface ActionCourtDisplaySnapshot {
  mentorMessage?: string;
  mainResult?: string;
  weeklyTrajectory?: string;
  tomorrowAdjustment?: string;
  debtType?: Debt['type'];
  recoveryQuest?: Pick<
    RecoveryQuest,
    'title' | 'description' | 'xpRestore' | 'innerCoreReward' | 'abyssReduction'
  > | null;
}

export interface ActionCourtReview {
  id: string;
  date: string;
  dayPlanId: string;
  completedTaskIds: string[];
  failedTaskIds: string[];
  partialTaskIds: string[];
  reason?: FailureReason;
  couldDoMinimum?: boolean;
  falseRestDetected: boolean;
  verdict: Verdict;
  xpDelta: number;
  innerCoreDelta: number;
  abyssIndexDelta: number;
  debtIds: string[];
  recoveryQuestId?: string;
  createdAt: string;
  failuresDetail?: CourtFailureRecord[];
  verdictSessionSnapshot?: VerdictSessionSnapshot;
  /** Immutable display data for historical review pages. Optional for legacy records. */
  displaySnapshot?: ActionCourtDisplaySnapshot;
}

export interface Debt {
  id: string;
  taskId?: string;
  title: string;
  type: 'small' | 'medium' | 'critical' | 'systemic';
  status: 'open' | 'partially_closed' | 'closed';
  createdAt: string;
  closedAt?: string;
}

export interface RecoveryQuest {
  id: string;
  title: string;
  description: string;
  relatedTaskId?: string;
  xpRestore: number;
  innerCoreReward: number;
  abyssReduction: number;
  deadline?: string;
  status: 'planned' | 'completed' | 'failed';
}

export interface KnowledgeModule {
  id: string;
  title: string;
  content: string;
  unlockCondition: string;
  unlocked: boolean;
  category: 'discipline' | 'execution' | 'recovery' | 'focus' | 'self_deception';
}

export interface GoalAnalysis {
  originalInput: string;
  rewrittenGoal: string;
  externalResult: string;
  realismScore: number;
  warnings: string[];
  suggestedDeadline: string;            // inclusive local deadline, YYYY-MM-DD
  suggestedDeadlineDays: number;        // inclusive calendar duration (today is day 1)
  suggestedFirstAction: string;
  suggestedFirstActionMinutes: number;  // typical first-action time budget
}

export interface CourtContext {
  strictnessMode: StrictnessMode;
  mainTaskCompleted: boolean;
  bossTaskCompleted: boolean;
  mainTaskProofOk?: boolean;
  bossTaskProofOk?: boolean;
  requiredProofOk?: boolean;
  missingRequiredProof?: boolean;
  proofOk: boolean;
  courtCompleted: boolean;
  respectfulReason: boolean;
  partialCompletion: boolean;
  selfDeceptionDetected: boolean;
  recoveryQuestCompletedAfterFailure: boolean;
  couldDoMinimum?: boolean;
  falseRestDetected?: boolean;
  repeatedPattern?: boolean;
  failedMainTask?: boolean;
  failedBossTask?: boolean;
  skippedCourt?: boolean;
  externalResultCreated?: boolean;
  learningWithoutPractice?: boolean;
}

export interface MentorContext {
  mode: StrictnessMode;
  event:
    | 'goal_analyzed'
    | 'day_order'
    | 'task_completed'
    | 'task_failed'
    | 'self_deception'
    | 'recovery'
    | 'stabilization'
    | 'victory'
    | 'learning_trap';
  verdict?: Verdict;
  reason?: FailureReason;
  abyssIndex?: number;
  innerCore?: number;
  /** Сжатый контекст дня для подсказки наставника (микроцель, задачи). */
  dayBrief?: string;
  /** Сколько записей разбора дня есть в истории (орієнтир континуальності). */
  courtHistoryCount?: number;
}

export interface ScoringResult {
  xpDelta: number;
  innerCoreDelta: number;
  abyssIndexDelta: number;
  shouldCreateDebt: boolean;
  debtType?: 'small' | 'medium' | 'critical' | 'systemic';
}

export interface GeneratedDayOrder {
  mainResult: string;
  bossTask: string;
  minimumAction: string;
  focusMinutes: number;
  deadline: string;
  proof: string;
  risk: string;
  protection: string;
  rewardText: string;
  consequenceText: string;
}

// Legacy types for backward compatibility during migration
export type UIState = UiState;
export type Mode = StrictnessMode;
export interface AppState {
  profile: UserProfile;
  currentState: UiState;
}
