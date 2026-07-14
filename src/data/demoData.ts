import {
  UserProfile,
  Goal,
  Task,
  DayPlan,
  FocusBlock,
  Debt,
  RecoveryQuest,
  KnowledgeModule,
  ActionCourtReview,
} from '@/types';
import {
  saveUserProfile,
  saveGoals,
  saveTasks,
  saveDayPlans,
  saveFocusBlocks,
  saveDebts,
  saveRecoveryQuests,
  saveKnowledgeModules,
  saveActionCourtReviews,
} from '@/lib/storage';
import { generateId, getTodayDate } from '@/lib/utils';
import { deadlineForCalendarDuration } from '@/lib/goalCalendar';

export function createDemoData(): void {
  const today = getTodayDate();
  const now = new Date().toISOString();

  // 1. UserProfile
  const profile: UserProfile = {
    id: generateId('user'),
    createdAt: now,
    onboardingCompleted: true,
    skippedOnboarding: false,
    contractAccepted: true,
    strictnessMode: 'standard',
    level: 2,
    totalXp: 180,
    innerCore: 12,
    abyssIndex: 34,
    currentStreak: 3,
    activeStabilization: false,
    externalResultsCount: 1,
  };

  // 2. Active goal
  const goal: Goal = {
    id: generateId('goal'),
    userId: profile.id,
    title: 'За 14 дней собрать первый одностраничный лендинг и показать его одному человеку',
    originalInput: 'Хочу научиться делать сайты',
    area: 'skill',
    level: 1,
    specific: 'Собрать первый лендинг',
    measurable: 'Опубликованный лендинг',
    deadline: deadlineForCalendarDuration(today, 14),
    why: 'Пользователь хочет превратить цель в действие.',
    externalResult: 'Первый одностраничный лендинг, показанный одному человеку или опубликованный.',
    realismScore: 72,
    status: 'active',
    createdAt: now,
  };

  // 3. Tasks
  const learningTask: Task = {
    id: generateId('task'),
    goalId: goal.id,
    title: 'Изучить один короткий материал под задачу',
    description: 'Найти и изучить один референс, урок или пример',
    type: 'learning',
    importance: 'normal',
    status: 'completed',
    xpReward: 10,
    xpPenalty: 5,
    proofRequired: false,
    createdAt: now,
    completedAt: now,
  };

  const practiceTask: Task = {
    id: generateId('task'),
    goalId: goal.id,
    title: 'Применить знание в задаче',
    description: 'Сделать первый практический шаг по цели',
    type: 'practice',
    importance: 'important',
    status: 'partial',
    xpReward: 20,
    xpPenalty: 20,
    proofRequired: true,
    createdAt: now,
  };

  const outputTask: Task = {
    id: generateId('task'),
    goalId: goal.id,
    title: 'Создать видимый результат',
    description: 'Создать что-то, что можно показать или измерить',
    type: 'output',
    importance: 'boss',
    status: 'planned',
    xpReward: 40,
    xpPenalty: 40,
    proofRequired: true,
    createdAt: now,
  };

  const tasks = [learningTask, practiceTask, outputTask];

  // 4. DayPlan
  const dayPlan: DayPlan = {
    id: generateId('day'),
    date: today,
    goalId: goal.id,
    mainResult: 'Собрать первый экран лендинга',
    weeklyTrajectory:
      'Неделя про первый видимый лендинг: сегодня ты задаёшь структуру экрана, чтобы дальше перейти к контенту и публикации.',
    bossTaskId: outputTask.id,
    minimumAction: 'Открыть файл и выписать 5 блоков лендинга',
    deadline: '20:00',
    risk: 'Залипание в обучение вместо сборки экрана',
    protection: 'Один короткий урок, затем сразу практика',
    rewardText: 'XP, рост стержня и движение к внешнему результату',
    consequenceText: 'Если минимум не будет сделан, останется незакрытое обещание',
    taskIds: tasks.map((t) => t.id),
    status: 'active',
  };

  // 5. Focus block
  const focusBlock: FocusBlock = {
    id: generateId('focus'),
    taskId: learningTask.id,
    goal: learningTask.description || learningTask.title,
    durationMinutes: 25,
    startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    endedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    distractions: ['Соцсети'],
    status: 'completed',
    result: 'Прочитал статью о структуре лендингов',
  };

  // 6. Debt
  const debt: Debt = {
    id: generateId('debt'),
    taskId: outputTask.id,
    title: 'Закрыть внешний результат по лендингу',
    type: 'medium',
    status: 'open',
    createdAt: now,
  };

  // 7. Recovery quest
  const recoveryQuest: RecoveryQuest = {
    id: generateId('quest'),
    title: 'Вернуть контроль через 10 минут действия',
    description: 'Открыть файл лендинга и собрать один блок. Не планировать — делать.',
    relatedTaskId: practiceTask.id,
    xpRestore: 15,
    innerCoreReward: 2,
    abyssReduction: 4,
    status: 'planned',
  };

  // 8. Knowledge modules
  const knowledgeModules: KnowledgeModule[] = [
    {
      id: generateId('km'),
      title: 'Почему дисциплина важнее мотивации',
      content: `## Коротко
Мотивация приходит и уходит. Дисциплина остаётся, когда настроения нет.

## Ключевая идея
Если действие зависит только от желания, система развалится в первый слабый день. Дисциплина нужна не для того, чтобы быть идеальным, а чтобы выполнять минимальный шаг даже при сопротивлении.

## Практическое правило
Не спрашивай себя "хочу ли я?". Спрашивай: "какой минимальный шаг я могу сделать сейчас?"

## Пример
Ты не хочешь работать над проектом. Полный план кажется тяжёлым. Значит, задача — не "сделать всё", а открыть файл и 5 минут двигать задачу вперёд.

## Действие
Выбери одну задачу и сделай минимальное действие на 5 минут.`,
      unlockCondition: 'Первый день завершён',
      unlocked: true,
      category: 'discipline',
    },
    {
      id: generateId('km'),
      title: 'Почему обучение без применения не работает',
      content: `## Коротко
Обучение без применения создаёт иллюзию роста.

## Ключевая идея
Знание становится силой только после применения. Если ты смотришь уроки, читаешь книги и собираешь конспекты, но ничего не создаёшь, не публикуешь и не получаешь обратную связь — ты можешь прятаться за обучением.

## Практическое правило
Каждый учебный блок должен закрываться практикой или внешним результатом.

Формула: Обучение → Практика → Внешний результат

## Пример
Плохо: посмотреть 3 урока по лендингам.
Хорошо: посмотреть 1 урок и сразу собрать первый блок своего лендинга.

## Действие
Возьми последнее, что ты изучал, и примени это в маленьком результате сегодня.`,
      unlockCondition: 'Первая цель с внешним результатом',
      unlocked: true,
      category: 'execution',
    },
    {
      id: generateId('km'),
      title: 'Как вернуть контроль после срыва',
      content: `## Коротко
Срыв не конец. Опасен не срыв, а бегство после него.

## Ключевая идея
Незакрытый день становится разрушительным, когда человек закрывает глаза, избегает разбора и переносит всё на "потом". Контроль возвращается не через стыд, а через честный разбор и маленькое действие.

## Практическое правило
После срыва не начинай с большого плана. Начни с восстановительного шага.

## Пример
Ты сорвал задачу и ушёл в соцсети. Не надо обещать "завтра я изменю всю жизнь". Сделай 10 минут по задаче сейчас или закрой минимальную часть обещания.

## Действие
Назови причину срыва и сделай один восстановительный шаг на 5–10 минут.`,
      unlockCondition: 'Первый срыв или recovery quest',
      unlocked: false,
      category: 'recovery',
    },
    {
      id: generateId('km'),
      title: 'Что такое ложный отдых',
      content: `## Коротко
Не каждый отдых восстанавливает.

## Ключевая идея
Ложный отдых выглядит как расслабление, но забирает внимание и энергию. Бесконечный скроллинг, короткие видео, игры без лимита и хаотичный YouTube часто не восстанавливают, а перегружают мозг.

## Практическое правило
Отдых должен возвращать ресурс, а не разрушать внимание.

Полезный отдых:
прогулка, дневной сон, растяжка, тренировка, музыка без экрана, душ, чтение, спокойная еда.

Ложный отдых:
соцсети вместо задачи, короткие видео без цели, игры без лимита, новости без смысла, хаотичные чаты.

## Действие
После следующего фокус-блока выбери один полезный отдых на 10–30 минут.`,
      unlockCondition: 'Первый фокус-блок или обнаружен ложный отдых',
      unlocked: false,
      category: 'focus',
    },
    {
      id: generateId('km'),
      title: 'Почему обещание себе имеет цену',
      content: `## Коротко
Каждое обещание себе либо укрепляет доверие к себе, либо разрушает его.

## Ключевая идея
Искажение фактов начинается не с большого срыва, а с маленьких нарушений, которые человек объясняет красивыми причинами. Если ты мог сделать минимум, но не сделал — это факт. Его нужно увидеть, а не прикрывать объяснениями.

## Практическое правило
Обещай меньше, но закрывай обещанное. Если сорвался — проходи разбор и возвращай контроль действием.

## Пример
Ты обещал сделать главный шаг, но ушёл в соцсети. Фраза "я устал" может быть частичной причиной, но если 5 минут действия были возможны — ответственность остаётся.

## Действие
Выбери одно обещание на завтра. Сделай его маленьким, конкретным и проверяемым.`,
      unlockCondition: 'Первый разбор дня или победа над собой',
      unlocked: false,
      category: 'self_deception',
    },
  ];

  // 9. One review
  const review: ActionCourtReview = {
    id: generateId('review'),
    date: today,
    dayPlanId: dayPlan.id,
    completedTaskIds: [learningTask.id],
    failedTaskIds: [],
    partialTaskIds: [practiceTask.id],
    falseRestDetected: false,
    verdict: 'partial_victory',
    xpDelta: 25,
    innerCoreDelta: 2,
    abyssIndexDelta: -3,
    debtIds: [],
    createdAt: now,
  };

  // Save all
  saveUserProfile(profile);
  saveGoals([goal]);
  saveTasks(tasks);
  saveDayPlans([dayPlan]);
  saveFocusBlocks([focusBlock]);
  saveDebts([debt]);
  saveRecoveryQuests([recoveryQuest]);
  saveKnowledgeModules(knowledgeModules);
  saveActionCourtReviews([review]);
}
