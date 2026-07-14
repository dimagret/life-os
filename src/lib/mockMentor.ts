import {
  GoalAnalysis,
  StrictnessMode,
  GeneratedDayOrder,
  Task,
  FailureReason,
  CourtContext,
  Verdict,
  RecoveryQuest,
  MentorContext,
  UserProfile,
  ActionCourtReview,
  Debt,
} from '@/types';
import { clamp, getTodayDate } from '@/lib/utils';
import { deadlineForCalendarDuration } from '@/lib/goalCalendar';

// ——— Legacy helpers for backward compatibility ———

export function getMentorMessage(verdict: string): string {
  const messages: Record<string, string> = {
    self_victory: 'Победа. Факт: обязательство выполнено. Контроль подтверждён.',
    partial_victory: 'Частичная победа. Факт: часть результата есть, но цикл дня закрыт не полностью. Следующий шаг — добрать недостающее.',
    respectful_transfer: 'Уважительный перенос. Факт: задача не выполнена по уважительной причине. Незакрытое обещание не создано, обязательство переносится.',
    failure: 'День не закрыт. Факт: задача не выполнена. Минимальное действие было возможно.',
    self_deception: 'Причина не подтверждена. Факт: задача не выполнена, минимальный шаг был возможен.',
    recovered_victory: 'Восстановленная победа. Факт: незакрытое обещание закрыто действием.',
  };
  return messages[verdict] ?? 'Факт: вердикт вынесен. Анализируй. Действуй.';
}

export function getDailyMentorTip(): string {
  const tips = [
    'Не важно, что ты хотел. Важно, что ты сделал.',
    'Минимальное действие — лучше чем ничего.',
    'Обучение полезно, когда за ним следует применение. Выбери один фрагмент и используй его сегодня.',
    'Контроль можно вернуть через действие.',
    'Факт: сегодня у тебя есть шанс.',
  ];
  return tips[Math.floor(Math.random() * tips.length)];
}

// ——— Goal analysis ———

const WEAK_PHRASES = [
  'учиться',
  'изучать',
  'разобраться',
  'стать лучше',
  'быть продуктивнее',
  'прокачать',
  'освоить',
  'понять',
  'почитать',
  'посмотреть',
  'послушать',
];

const MONEY_WORDS = [
  'заработать',
  'деньги',
  'клиент',
  'бизнес',
  'продажи',
  'заказ',
  'доход',
  'прибыль',
  'фриланс',
];

const DISCIPLINE_WORDS = [
  'дисциплина',
  'прокрастинация',
  'режим',
  'привычка',
  'порядок',
  'контроль',
];

function detectWeakLanguage(input: string): boolean {
  const lower = input.toLowerCase();
  return WEAK_PHRASES.some((phrase) => lower.includes(phrase));
}

function detectArea(input: string): 'money' | 'discipline' | 'skill' {
  const lower = input.toLowerCase();
  if (MONEY_WORDS.some((w) => lower.includes(w))) return 'money';
  if (DISCIPLINE_WORDS.some((w) => lower.includes(w))) return 'discipline';
  return 'skill';
}

function estimateDays(userLevel: number, hasWeakLanguage: boolean): number {
  let days = 7;
  if (userLevel <= 1) days += 7;
  if (hasWeakLanguage) days += 3;
  return Math.min(days, 30);
}

type GoalAnalysisLocale = 'ru' | 'en';

const EN_WEAK_PHRASES = [
  'learn',
  'study',
  'understand',
  'get better',
  'be more productive',
  'master',
  'read about',
  'watch tutorials',
  'research',
];

function detectEnglishWeakLanguage(input: string): boolean {
  const lower = input.toLowerCase();
  return EN_WEAK_PHRASES.some((phrase) => lower.includes(phrase));
}

function detectEnglishArea(input: string): 'money' | 'discipline' | 'skill' {
  const lower = input.toLowerCase();
  if (/money|client|customer|business|sales|revenue|profit|freelance|order/.test(lower)) {
    return 'money';
  }
  if (/discipline|procrastination|routine|habit|consistency|self-control/.test(lower)) {
    return 'discipline';
  }
  return 'skill';
}

function calculateEnglishRealismScore(input: string, userLevel: number): number {
  let score = 70;
  const lower = input.toLowerCase();
  if (detectEnglishWeakLanguage(input)) score -= 15;
  if (input.length < 15) score -= 10;
  if (!/\bdays?\b|\bweeks?\b|\bmonths?\b/.test(lower)) score -= 10;
  if (userLevel <= 1 && /million|\b100\b|professional/.test(lower)) score -= 15;
  if (/show|publish|send|deliver/.test(lower)) score += 10;
  if (/\b(?:7|14) days\b/.test(lower)) score += 5;
  if (/one person|feedback|response/.test(lower)) score += 5;
  return clamp(score, 0, 100);
}

function englishExternalResult(input: string): string {
  const lower = input.toLowerCase();
  const area = detectEnglishArea(input);
  if (area === 'money') {
    return /client|customer/.test(lower)
      ? 'A commercial proposal has been sent or feedback has been received from a potential client.'
      : 'A clear offer has been created and shown, or a first market response has been received.';
  }
  if (area === 'discipline') {
    return 'The main task and the day review are completed for seven consecutive days.';
  }
  if (/website|landing page|web page/.test(lower)) {
    return 'A one-page landing page is built and published or shown to one person.';
  }
  if (/design|\bux\b|\bui\b/.test(lower)) {
    return 'A first interface screen is created, compared with three references, and shown to one person.';
  }
  if (/code|program|application|\bapp\b/.test(lower)) {
    return 'A first working prototype is built and run locally or shown to one person.';
  }
  return 'A first external result is created and published or shown to at least one person.';
}

function suggestEnglishFirstAction(input: string): FirstActionHint {
  const lower = input.toLowerCase();
  const area = detectEnglishArea(input);
  if (lower.includes('cursor')) {
    return {
      text: 'Define one deliverable for the next two to three hours and write a clear definition of done.',
      minutes: 15,
    };
  }
  if (area === 'money') {
    return {
      text: 'Write a short offer and send the first ten personalized proposals to potential clients.',
      minutes: 45,
    };
  }
  if (area === 'discipline') {
    return { text: 'Choose one main task for tomorrow and put it into the plan.', minutes: 10 };
  }
  if (/website|landing page/.test(lower)) {
    return { text: 'Collect three references for similar websites.', minutes: 10 };
  }
  if (/design|\bux\b|\bui\b/.test(lower)) {
    return { text: 'Sketch the first interface screen on paper.', minutes: 5 };
  }
  if (/code|program|application|\bapp\b/.test(lower)) {
    return {
      text: 'Define one working artifact for the next two to three hours and write a clear definition of done.',
      minutes: 15,
    };
  }
  return {
    text: 'Write one sentence that defines what a finished, visible result will look like.',
    minutes: 15,
  };
}

function analyzeGoalEnglish(input: string, userLevel: number): GoalAnalysis {
  const hasWeakLanguage = detectEnglishWeakLanguage(input);
  const area = detectEnglishArea(input);
  const days = estimateDays(userLevel, hasWeakLanguage);
  const externalResult = englishExternalResult(input);
  const realismScore = calculateEnglishRealismScore(input, userLevel);
  const hint = suggestEnglishFirstAction(input);
  const lower = input.toLowerCase();

  let rewrittenGoal: string;
  if (area === 'money') {
    rewrittenGoal = `In ${days} days, create a clear offer, send 10-20 personalized proposals, and get at least one response.`;
  } else if (area === 'discipline') {
    rewrittenGoal = `In ${days} days, complete one main task and a factual day review every day.`;
  } else if (/website|landing page/.test(lower)) {
    rewrittenGoal = `In ${days} days, build a one-page landing page and publish it or show it to one person.`;
  } else if (/design|\bux\b|\bui\b/.test(lower)) {
    rewrittenGoal = `In ${days} days, create a first interface screen, compare it with three references, and show it to one person.`;
  } else if (/code|program|application|\bapp\b/.test(lower)) {
    rewrittenGoal = `In ${days} days, build a first working prototype and run it locally or show it to one person.`;
  } else {
    rewrittenGoal = `In ${days} days, create a first external result and get feedback from one person.`;
  }

  const warnings: string[] = [];
  if (hasWeakLanguage) {
    warnings.push('The wording describes a process. The goal was rewritten around an external result.');
  }
  if (realismScore < 50) {
    warnings.push('The goal may be too ambitious for the current level. Increase the time or reduce the result.');
  }
  if (!/\bdays?\b|\bweeks?\b|\bmonths?\b/.test(lower)) {
    warnings.push('A deadline was added because a goal without a time boundary remains an intention.');
  }

  return {
    originalInput: input,
    rewrittenGoal,
    externalResult,
    realismScore,
    warnings,
    suggestedDeadline: deadlineForCalendarDuration(getTodayDate(), days),
    suggestedDeadlineDays: days,
    suggestedFirstAction: hint.text,
    suggestedFirstActionMinutes: hint.minutes,
  };
}

export function buildExternalResult(input: string, userLevel: number): string {
  const area = detectArea(input);
  const lower = input.toLowerCase();

  if (area === 'money') {
    if (lower.includes('клиент')) {
      return 'Отправлено коммерческое предложение или получена обратная связь от потенциального клиента.';
    }
    return 'Создано и показано коммерческое предложение, или получен первый отклик от рынка.';
  }

  if (area === 'discipline') {
    return '7 дней подряд выполнен главный задача + завершён разбор дня каждый день.';
  }

  // skill default
  if (lower.includes('сайт') || lower.includes('лендинг') || lower.includes('веб')) {
    return 'Собран и опубликован (или показан одному человеку) одностраничный лендинг.';
  }
  if (lower.includes('дизайн') || lower.includes('ux') || lower.includes('ui')) {
    return 'Сделан первый экран + собраны 3 референса + получена обратная связь от одного человека.';
  }
  if (lower.includes('код') || lower.includes('программ') || lower.includes('приложение')) {
    return 'Написан первый рабочий прототип и показан одному человеку или запущен локально.';
  }

  return 'Создан первый внешний результат и показан хотя бы одному человеку или опубликован.';
}

export function calculateRealismScore(input: string, userLevel: number): number {
  let score = 70;
  const lower = input.toLowerCase();

  // Penalties
  if (detectWeakLanguage(input)) {
    score -= 15;
  }
  if (input.length < 15) {
    score -= 10;
  }
  if (!lower.includes('дней') && !lower.includes('недел') && !lower.includes('месяц')) {
    score -= 10;
  }
  if (userLevel <= 1 && (lower.includes('миллион') || lower.includes('100') || lower.includes('профессионал'))) {
    score -= 15;
  }

  // Bonuses
  if (lower.includes('показать') || lower.includes('опубликовать') || lower.includes('отправить')) {
    score += 10;
  }
  if (lower.includes('7 дней') || lower.includes('14 дней')) {
    score += 5;
  }
  if (lower.includes('один человек') || lower.includes('обратная связь')) {
    score += 5;
  }

  return clamp(score, 0, 100);
}

export type FirstActionHint = { text: string; minutes: number };

/** Первый шаг из исходной формулировки (без переписывания цели). */
export function suggestFirstActionForRawGoal(input: string, _userLevel: number): FirstActionHint {
  const lower = input.toLowerCase();
  if (lower.includes('курсор') || lower.includes('cursor')) {
    return {
      text: 'Сформулировать один конкретный поставляемый артефакт на ближайшие 2–3 часа и записать критерий «готово».',
      minutes: 15,
    };
  }

  const area = detectArea(input);

  if (area === 'money') {
    return {
      text: 'Составить короткий оффер и отправить первые 10 персональных предложений потенциальным заказчикам.',
      minutes: 45,
    };
  }
  if (area === 'discipline') {
    return { text: 'Определить одну главную задачу на завтра и записать её в план.', minutes: 10 };
  }

  if (lower.includes('сайт') || lower.includes('лендинг')) {
    return { text: 'Найти 3 референса похожих сайтов за 10 минут.', minutes: 10 };
  }
  if (lower.includes('дизайн') || lower.includes('ux')) {
    return { text: 'Нарисовать набросок первого экрана на бумаге за 5 минут.', minutes: 5 };
  }
  if (lower.includes('код') || lower.includes('программ')) {
    return {
      text: 'Сформулировать один конкретный поставляемый артефакт на ближайшие 2–3 часа и записать критерий «готово».',
      minutes: 15,
    };
  }

  return {
    text: 'Определить, что будет считаться готовым результатом, и записать это одним предложением.',
    minutes: 15,
  };
}

export function getDerivedFirstAction(
  analysis: GoalAnalysis,
  focus: 'working' | 'original',
  level: number,
  locale: GoalAnalysisLocale = 'ru'
): FirstActionHint {
  if (focus === 'working') {
    return {
      text: analysis.suggestedFirstAction,
      minutes: analysis.suggestedFirstActionMinutes,
    };
  }
  return locale === 'en'
    ? suggestEnglishFirstAction(analysis.originalInput)
    : suggestFirstActionForRawGoal(analysis.originalInput, level);
}

export function analyzeGoal(
  input: string,
  userLevel: number,
  locale: GoalAnalysisLocale = 'ru'
): GoalAnalysis {
  if (locale === 'en') return analyzeGoalEnglish(input, userLevel);
  const hasWeakLanguage = detectWeakLanguage(input);
  const area = detectArea(input);
  const days = estimateDays(userLevel, hasWeakLanguage);
  const externalResult = buildExternalResult(input, userLevel);
  const realismScore = calculateRealismScore(input, userLevel);

  let rewrittenGoal = input;
  const hint = suggestFirstActionForRawGoal(input, userLevel);

  if (area === 'money') {
    rewrittenGoal = `За ${days} дней составить коммерческое предложение, отправить 10–20 качественных предложений потенциальным клиентам и получить хотя бы один отклик.`;
  } else if (area === 'discipline') {
    rewrittenGoal = `За ${days} дней каждый день выполнять главную задачу и проходить разбор дня. Фиксировать результат.`;
  } else {
    if (input.toLowerCase().includes('сайт') || input.toLowerCase().includes('лендинг')) {
      rewrittenGoal = `За ${days} дней собрать первый одностраничный лендинг и показать его одному человеку или опубликовать.`;
    } else if (input.toLowerCase().includes('дизайн') || input.toLowerCase().includes('ux')) {
      rewrittenGoal = `За ${days} дней сделать первый экран приложения, собрать 3 референса и показать результат одному человеку.`;
    } else {
      rewrittenGoal = `За ${days} дней создать первый внешний результат по теме и получить обратную связь от одного человека.`;
    }
  }

  const warnings: string[] = [];
  if (hasWeakLanguage) {
    warnings.push('Обнаружен процессный язык. Цель переписана на внешний результат.');
  }
  if (realismScore < 50) {
    warnings.push('Цель кажется амбициозной для текущего уровня. Увеличен срок или упрощён результат.');
  }
  if (!input.toLowerCase().includes('дней') && !input.toLowerCase().includes('недел')) {
    warnings.push('Добавлен дедлайн: цель без срока — это намерение.');
  }

  return {
    originalInput: input,
    rewrittenGoal,
    externalResult,
    realismScore,
    warnings,
    suggestedDeadline: deadlineForCalendarDuration(getTodayDate(), days),
    suggestedDeadlineDays: days,
    suggestedFirstAction: hint.text,
    suggestedFirstActionMinutes: hint.minutes,
  };
}

// ——— Day order generation ———

export function generateDayOrder(
  goalAnalysis: GoalAnalysis,
  mode: StrictnessMode
): GeneratedDayOrder {
  const isHard = mode === 'hard' || mode === 'owner';

  return {
    mainResult: goalAnalysis.suggestedFirstAction,
    bossTask: `Сделать шаг к результату: ${goalAnalysis.externalResult.split('.')[0]}`,
    minimumAction: '5 минут конкретного действия по задаче (не чтение, не планирование)',
    focusMinutes: isHard ? 50 : 25,
    deadline: '23:59',
    proof: 'Фото, скриншот или ссылка на результат',
    risk: 'Отвлечься на соцсети или видео',
    protection: isHard
      ? 'Телефон в другой комнате. Таймер на 50 минут. Ничего кроме задачи.'
      : 'Поставить таймер на 25 минут. Выключить уведомления.',
    rewardText: mode === 'soft'
      ? 'Честно заслуженный отдых без чувства вины.'
      : 'Контроль сохранён. Следующий шаг будет легче.',
    consequenceText: isHard
      ? 'Незакрытое обещание. Восстановительный квест. Риск растёт.'
      : 'Фиксация причины. План на завтра. Без осуждения.',
  };
}

// ——— Task generation ———

export function generateTasksForDay(goalAnalysis: GoalAnalysis): Task[] {
  const now = new Date().toISOString();
  const baseTask = {
    goalId: undefined,
    description: undefined,
    status: 'planned' as const,
    dueAt: undefined,
    proofRequired: true,
    proof: undefined,
    completedAt: undefined,
  };

  return [
    {
      ...baseTask,
      id: 'task_learning_placeholder',
      title: '15 минут: изучить 1 пример или референс по теме',
      type: 'learning' as const,
      importance: 'normal' as const,
      xpReward: 5,
      xpPenalty: 0,
      createdAt: now,
    },
    {
      ...baseTask,
      id: 'task_practice_placeholder',
      title: '30 минут: применить изученное на практике',
      type: 'practice' as const,
      importance: 'important' as const,
      xpReward: 15,
      xpPenalty: 5,
      createdAt: now,
    },
    {
      ...baseTask,
      id: 'task_output_placeholder',
      title: 'Создать первый черновик результата и показать кому-то',
      type: 'output' as const,
      importance: 'boss' as const,
      xpReward: 30,
      xpPenalty: 10,
      createdAt: now,
    },
  ];
}

// ——— Failure reason classification ———

const LEVEL_0_REASONS: FailureReason['type'][] = [
  'serious_illness',
  'work_force_majeure',
  'family_emergency',
];

const LEVEL_1_REASONS: FailureReason['type'][] = [
  'minor_illness',
  'tired',
  'task_too_big',
  'bad_planning',
  'fear',
  'perfectionism',
  'unknown',
];

const LEVEL_2_REASONS: FailureReason['type'][] = [
  'lazy',
  'no_mood',
  'social_media',
  'games',
  'false_rest',
  'forgot',
  'learning_instead_action',
];

export function getBaseLevel(type: FailureReason['type']): 0 | 1 | 2 {
  if (LEVEL_0_REASONS.includes(type)) return 0;
  if (LEVEL_1_REASONS.includes(type)) return 1;
  return 2;
}

export function classifyFailureReason(
  reasonType: FailureReason['type'],
  couldDoMinimum: boolean,
  repeated: boolean
): FailureReason {
  let level: number = getBaseLevel(reasonType);

  // If could do minimum but didn't, raise level
  if (couldDoMinimum) {
    if (level === 0) {
      level = 1;
    } else if (level === 1 && !LEVEL_0_REASONS.includes(reasonType)) {
      level = 2;
    }
  }

  // Repeated pattern is always level 3
  if (repeated) {
    level = 3;
  }

  return {
    type: reasonType,
    level: level as 0 | 1 | 2 | 3,
  };
}

// ——— Verdict determination ———

export function determineVerdict(context: CourtContext): Verdict {
  if (context.recoveryQuestCompletedAfterFailure) {
    return 'recovered_victory';
  }
  if (context.selfDeceptionDetected) {
    return 'self_deception';
  }
  if (context.respectfulReason && !context.selfDeceptionDetected) {
    return 'respectful_transfer';
  }

  const strictMode = context.strictnessMode === 'hard' || context.strictnessMode === 'owner';
  const mainTaskReady = context.mainTaskCompleted && (context.mainTaskProofOk ?? true);
  const bossTaskReady = context.bossTaskCompleted && (context.bossTaskProofOk ?? true);
  const externalResultReady = context.externalResultCreated === true || bossTaskReady;
  const requiredProofReady = context.requiredProofOk ?? context.proofOk;

  if (
    mainTaskReady &&
    externalResultReady &&
    requiredProofReady &&
    context.proofOk &&
    context.courtCompleted &&
    !context.missingRequiredProof &&
    (!strictMode || bossTaskReady)
  ) {
    return 'self_victory';
  }
  if (context.partialCompletion && context.courtCompleted) {
    return 'partial_victory';
  }
  return 'failure';
}

// ——— Recovery quest generation ———

export function generateRecoveryQuest(context: CourtContext): {
  title: string;
  description: string;
  xpRestore: number;
  innerCoreReward: number;
  abyssReduction: number;
  status: 'planned';
} {
  const isHard = context.strictnessMode === 'hard' || context.strictnessMode === 'owner';

  if (context.selfDeceptionDetected) {
    return {
      title: 'Честный разбор',
      description:
        'Записать, что именно помешало. Признать, что минимальное действие было возможно. Сделать это минимальное действие сейчас.',
      xpRestore: isHard ? 30 : 15,
      innerCoreReward: 3,
      abyssReduction: 5,
      status: 'planned',
    };
  }

  if (context.falseRestDetected) {
    return {
      title: 'Вернуть контроль',
      description:
        '25 минут фокус-блока без телефона. Доказать себе, что контроль можно вернуть через действие.',
      xpRestore: isHard ? 40 : 20,
      innerCoreReward: 4,
      abyssReduction: 6,
      status: 'planned',
    };
  }

  if (context.repeatedPattern) {
    return {
      title: 'Прервать паттерн',
      description:
        'Сделать то, что ты обычно откладываешь, в течение 5 минут. Здесь и сейчас. Без подготовки.',
      xpRestore: isHard ? 50 : 25,
      innerCoreReward: 5,
      abyssReduction: 8,
      status: 'planned',
    };
  }

  return {
    title: '5 минут действия',
    description:
      'Минимальное действие по невыполненной задаче. Не планирование — реальное действие.',
    xpRestore: isHard ? 25 : 15,
    innerCoreReward: 2,
    abyssReduction: 4,
    status: 'planned',
  };
}

// ——— Stabilization detection ———

export function shouldEnterStabilization(
  profile: UserProfile,
  debts: { status: string }[],
  reviews: ActionCourtReview[]
): boolean {
  const openDebts = debts.filter((d) => d.status === 'open').length;

  if (profile.abyssIndex >= 61) return true;
  if (profile.abyssIndex >= 50 && openDebts >= 3) return true;
  if (openDebts >= 5) return true;

  if (reviews.length >= 3) {
    const lastThree = reviews.slice(-3);
    const allFailed = lastThree.every(
      (r) =>
        r.verdict === 'failure' ||
        r.verdict === 'self_deception' ||
        r.failedTaskIds.length > 0
    );
    if (allFailed) return true;
  }

  return false;
}

// ——— Stabilization exit check ———

export function checkStabilizationExit(
  profile: UserProfile,
  debts: Debt[],
  recoveryQuests: RecoveryQuest[]
): boolean {
  const openDebts = debts.filter((d) => d.status === 'open');
  const hasCriticalDebts = openDebts.some(
    (d) => d.type === 'critical' || d.type === 'systemic'
  );
  const completedQuests = recoveryQuests.filter(
    (q) => q.status === 'completed'
  );

  if (profile.abyssIndex >= 40) return false;
  if (hasCriticalDebts) return false;
  if (completedQuests.length < 1) return false;

  return true;
}

function mentorDayOrderAppendix(ctx: MentorContext, base: string): string {
  if (ctx.event !== 'day_order' || !ctx.dayBrief?.trim()) return base;
  const raw = ctx.dayBrief.trim();
  const s = raw.slice(0, 320);
  return `${base}\n\n${s}${raw.length > 320 ? '…' : ''}`;
}

// ——— Mentor message generation ———

export function generateMentorMessage(context: MentorContext): string {
  const { mode, event } = context;
  const messages: Record<StrictnessMode, Partial<Record<MentorContext['event'], string>>> = {
    soft: {
      goal_analyzed: 'Цель уточнена до видимого результата. Выбери один небольшой шаг, который можно сделать без перегруза.',
      day_order: 'День собран. Начни с самого маленького действия, которое приближает результат.',
      task_completed: 'Задача выполнена. Зафиксируй результат и выбери следующий посильный шаг.',
      task_failed: 'Задача не закрыта. Назови причину без самооценки и уменьши следующий шаг.',
      self_deception: 'Причина пока не подтверждена фактами. Отдели факт от объяснения и выбери один проверяемый шаг.',
      recovery: 'Восстановление началось. Закрой один небольшой шаг и только потом увеличивай нагрузку.',
      stabilization: 'Сейчас важен не объём, а опора. Оставь одну задачу и выполни её минимальную версию.',
      victory: 'Запланированное действие выполнено. Сохрани рабочий темп без увеличения нагрузки.',
      learning_trap: 'Обучение само по себе не ошибка. Проверь, появился ли артефакт; если нет, примени один фрагмент знания сейчас.',
    },
    standard: {
      goal_analyzed: 'Цель переведена в проверяемый результат. Следующий шаг — назначить срок и первое действие.',
      day_order: 'День собран: результат, три шага и доказательство. Начни с текущего шага.',
      task_completed: 'Факт: задача выполнена. Зафиксируй результат и переходи к следующему шагу.',
      task_failed: 'Факт: задача не выполнена. Укажи причину и выбери одну корректировку на следующий запуск.',
      self_deception: 'Факт и объяснение пока не совпадают. Проверь причину и зафиксируй один шаг, который можно подтвердить.',
      recovery: 'Факт: восстановление начато. Выполни назначенный шаг и после этого пересобери план.',
      stabilization: 'Факт: активна стабилизация. Сократи план до одной задачи и закрой её проверяемым действием.',
      victory: 'Факт: обязательство закрыто действием. Зафиксируй доказательство и сохрани следующий шаг конкретным.',
      learning_trap: 'Пока подтверждено обучение, но не применение. Создай один артефакт на основе изученного.',
    },
    hard: {
      goal_analyzed: 'Цель должна завершаться проверяемым результатом. Установи срок и начни первое действие.',
      day_order: 'План принят. Ответственность сейчас — выполнить текущий шаг и сохранить доказательство.',
      task_completed: 'Выполнено. Работа засчитана; зафиксируй доказательство и переходи дальше.',
      task_failed: 'Задача не закрыта. Без самооправданий: назови рабочую причину и назначь меньший шаг.',
      self_deception: 'Причина не подтверждена фактами. Перепроверь объяснение и выбери действие, которое можно проверить.',
      recovery: 'Восстановление требует действия. Выполни назначенный минимум до расширения плана.',
      stabilization: 'Стабилизация активна. Убери второстепенное и закрой одну задачу с доказательством.',
      victory: 'Обязательство выполнено. Результат засчитан; сохрани темп и не добавляй лишних задач.',
      learning_trap: 'Обучение не подтвердило применение. Создай артефакт сейчас; паттерн оценивай только по повторяющимся фактам.',
    },
    owner: {
      goal_analyzed: 'Результат и срок должны быть проверяемыми. Прими конкретное обязательство и начни действие.',
      day_order: 'Ресурсы распределены. Выполни текущий шаг, сохрани артефакт и сверяйся только с фактом.',
      task_completed: 'Результат выполнен и засчитан. Зафиксируй доказательство и назначь следующий конкретный результат.',
      task_failed: 'Обязательство не закрыто. Назови системную причину и измени одно условие следующего запуска.',
      self_deception: 'Объяснение не подтверждено. Отдели наблюдаемый факт от интерпретации и назначь проверяемое действие.',
      recovery: 'Возврат начинается с действия. Закрой назначенный минимум, затем принимай новое обязательство.',
      stabilization: 'Система перегружена. Оставь один приоритет и восстанови управляемость проверяемым результатом.',
      victory: 'Обязательство закрыто результатом. Сохрани доказательство и выбери следующий приоритет без распыления.',
      learning_trap: 'Подтверждено обучение, но не применение. Выпусти один артефакт; вывод о паттерне делай только после повторения.',
    },
  };

  const base = messages[mode][event] ?? 'Событие зафиксировано. Проверь факт и выбери одно следующее действие.';
  return mentorDayOrderAppendix(context, base);
}
