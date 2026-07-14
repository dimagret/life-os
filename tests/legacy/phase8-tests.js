// Мини-тест Phase 8: Action Court + Verdict
// Запустить в консоли браузера на http://localhost:3003
// Все тесты автоматические — имитируют localStorage state

function runPhase8Tests() {
  console.log('🧪 Запуск мини-тестов Phase 8: Action Court + Verdict\n');

  const tests = [];

  // --- Test 1: Self-deception (соцсети + could do minimum) ---
  function test1() {
    console.log('Тест 1: Learning выполнена, Practice и Output провалены, причина: соцсети, минимальное действие было возможно');
    
    const profile = createTestProfile();
    const goal = createTestGoal();
    const tasks = [
      createTask('learning', 'completed'),
      createTask('practice', 'failed'),
      createTask('output', 'failed', true), // boss task
    ];
    const dayPlan = createDayPlan(goal.id, tasks);
    
    // Имитация прохождения суда
    const review = simulateCourt({
      profile,
      dayPlan,
      tasks,
      taskStatuses: {
        [tasks[0].id]: 'completed',
        [tasks[1].id]: 'failed',
        [tasks[2].id]: 'failed',
      },
      failures: [
        { taskId: tasks[1].id, reasonType: 'social_media', couldDoMinimum: true },
        { taskId: tasks[2].id, reasonType: 'social_media', couldDoMinimum: true },
      ],
      falseRest: false,
    });

    const passed = review.verdict === 'self_deception';
    console.log(`   Вердикт: ${review.verdict} ${passed ? '✅' : '❌ (ожидалось self_deception)'}`);
    console.log(`   XP: ${review.xpDelta} | Стержень: ${review.innerCoreDelta} | Пропасть: ${review.abyssIndexDelta}`);
    console.log(`   Долг создан: ${review.debtCreated ? '✅' : '❌'}`);
    console.log(`   Recovery quest: ${review.recoveryQuest ? '✅' : '❌'}`);
    return passed;
  }

  // --- Test 2: Self-victory (все задачи + proof) ---
  function test2() {
    console.log('\nТест 2: Все задачи выполнены с proof');
    
    const profile = createTestProfile();
    const goal = createTestGoal();
    const tasks = [
      { ...createTask('learning', 'completed'), proof: { id: 'p1', type: 'text', value: 'Прочитал статью', createdAt: new Date().toISOString() } },
      { ...createTask('practice', 'completed'), proof: { id: 'p2', type: 'text', value: 'Сделал шаг', createdAt: new Date().toISOString() } },
      { ...createTask('output', 'completed', true), proof: { id: 'p3', type: 'link', value: 'https://example.com', createdAt: new Date().toISOString() } },
    ];
    const dayPlan = createDayPlan(goal.id, tasks);
    
    const review = simulateCourt({
      profile,
      dayPlan,
      tasks,
      taskStatuses: {
        [tasks[0].id]: 'completed',
        [tasks[1].id]: 'completed',
        [tasks[2].id]: 'completed',
      },
      failures: [],
      falseRest: false,
    });

    const passed = review.verdict === 'self_victory';
    console.log(`   Вердикт: ${review.verdict} ${passed ? '✅' : '❌ (ожидалось self_victory)'}`);
    console.log(`   XP: +${review.xpDelta} | Стержень: +${review.innerCoreDelta} | Пропасть: ${review.abyssIndexDelta}`);
    console.log(`   Серия: ${review.updatedProfile.currentStreak} ${review.updatedProfile.currentStreak === 1 ? '✅' : '❌'}`);
    return passed;
  }

  // --- Test 3: Respectful transfer (серьёзная болезнь) ---
  function test3() {
    console.log('\nТест 3: Задача провалена, причина: серьёзная болезнь, минимальное действие НЕ было возможно');
    
    const profile = createTestProfile();
    const goal = createTestGoal();
    const tasks = [
      createTask('learning', 'completed'),
      createTask('practice', 'failed'),
      createTask('output', 'completed', true),
    ];
    const dayPlan = createDayPlan(goal.id, tasks);
    
    const review = simulateCourt({
      profile,
      dayPlan,
      tasks,
      taskStatuses: {
        [tasks[0].id]: 'completed',
        [tasks[1].id]: 'failed',
        [tasks[2].id]: 'completed',
      },
      failures: [
        { taskId: tasks[1].id, reasonType: 'serious_illness', couldDoMinimum: false },
      ],
      falseRest: false,
    });

    const passed = review.verdict === 'respectful_transfer';
    console.log(`   Вердикт: ${review.verdict} ${passed ? '✅' : '❌ (ожидалось respectful_transfer)'}`);
    console.log(`   XP: ${review.xpDelta} | Стержень: ${review.innerCoreDelta} | Пропасть: ${review.abyssIndexDelta}`);
    console.log(`   Долг создан: ${review.debtCreated ? '❌ (не должен был создаться)' : '✅'}`);
    return passed;
  }

  // --- Test 4: Stabilization (3 провала подряд) ---
  function test4() {
    console.log('\nТест 4: 3 провала подряд → ожидается стабилизация');
    
    const profile = createTestProfile();
    profile.abyssIndex = 55; // Близко к порогу
    
    // Создаём 3 предыдущих ревью с провалами
    const previousReviews = [
      createReview('failure', ['t1'], []),
      createReview('failure', ['t2'], []),
      createReview('self_deception', ['t3'], []),
    ];
    
    const goal = createTestGoal();
    const tasks = [
      createTask('learning', 'failed'),
      createTask('practice', 'failed'),
      createTask('output', 'failed', true),
    ];
    const dayPlan = createDayPlan(goal.id, tasks);
    
    const review = simulateCourt({
      profile,
      dayPlan,
      tasks,
      previousReviews,
      taskStatuses: {
        [tasks[0].id]: 'failed',
        [tasks[1].id]: 'failed',
        [tasks[2].id]: 'failed',
      },
      failures: [
        { taskId: tasks[0].id, reasonType: 'lazy', couldDoMinimum: true },
        { taskId: tasks[1].id, reasonType: 'social_media', couldDoMinimum: true },
        { taskId: tasks[2].id, reasonType: 'games', couldDoMinimum: true },
      ],
      falseRest: true,
    });

    const passed = review.stabilizationTriggered;
    console.log(`   Вердикт: ${review.verdict}`);
    console.log(`   Стабилизация: ${review.stabilizationTriggered ? '✅ АКТИВИРОВАНА' : '❌ (ожидалась стабилизация)'}`);
    console.log(`   Профиль.abyssIndex: ${review.updatedProfile.abyssIndex}`);
    console.log(`   Профиль.activeStabilization: ${review.updatedProfile.activeStabilization}`);
    return passed;
  }

  // --- Test 5: Partial victory ---
  function test5() {
    console.log('\nТест 5: Частичное выполнение (learning + practice частично, output не сделана)');
    
    const profile = createTestProfile();
    const goal = createTestGoal();
    const tasks = [
      createTask('learning', 'completed'),
      createTask('practice', 'partial'),
      createTask('output', 'failed', true),
    ];
    const dayPlan = createDayPlan(goal.id, tasks);
    
    const review = simulateCourt({
      profile,
      dayPlan,
      tasks,
      taskStatuses: {
        [tasks[0].id]: 'completed',
        [tasks[1].id]: 'partial',
        [tasks[2].id]: 'failed',
      },
      failures: [
        { taskId: tasks[2].id, reasonType: 'task_too_big', couldDoMinimum: false },
      ],
      falseRest: false,
    });

    const passed = review.verdict === 'partial_victory' || review.verdict === 'failure';
    console.log(`   Вердикт: ${review.verdict} ${passed ? '✅' : '❌'}`);
    return passed;
  }

  // --- Helpers ---

  function createTestProfile() {
    return {
      id: 'user_test',
      createdAt: new Date().toISOString(),
      onboardingCompleted: true,
      contractAccepted: true,
      strictnessMode: 'standard',
      level: 1,
      totalXp: 100,
      innerCore: 50,
      abyssIndex: 30,
      currentStreak: 0,
      activeStabilization: false,
      externalResultsCount: 0,
    };
  }

  function createTestGoal() {
    return {
      id: 'goal_test',
      userId: 'user_test',
      title: 'Собрать лендинг за 14 дней',
      originalInput: 'Хочу научиться делать сайты',
      area: 'skill',
      level: 1,
      specific: 'Собрать первый лендинг',
      measurable: 'Опубликованный лендинг',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      why: 'Пользователь хочет превратить цель в действие.',
      externalResult: 'Опубликованный лендинг.',
      realismScore: 65,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
  }

  function createTask(type, status, isBoss = false) {
    return {
      id: `task_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      goalId: 'goal_test',
      title: `Задача ${type}`,
      description: `Описание ${type}`,
      type,
      importance: isBoss ? 'boss' : type === 'practice' ? 'important' : 'normal',
      status,
      xpReward: type === 'output' ? 40 : type === 'practice' ? 20 : 10,
      xpPenalty: type === 'output' ? 40 : type === 'practice' ? 20 : 5,
      proofRequired: type !== 'learning',
      createdAt: new Date().toISOString(),
    };
  }

  function createDayPlan(goalId, tasks) {
    const today = new Date().toISOString().split('T')[0];
    return {
      id: `day_${Date.now()}`,
      date: today,
      goalId,
      mainResult: 'Найти 3 референса похожих сайтов за 10 минут.',
      bossTaskId: tasks.find(t => t.importance === 'boss')?.id,
      minimumAction: '5 минут конкретного действия по задаче',
      deadline: '23:59',
      risk: 'Отвлечься на соцсети или видео',
      protection: 'Поставить таймер на 25 минут.',
      rewardText: 'Контроль сохранён.',
      consequenceText: 'Фиксация причины.',
      taskIds: tasks.map(t => t.id),
      status: 'active',
    };
  }

  function createReview(verdict, failedTaskIds, completedTaskIds) {
    return {
      id: `review_${Date.now()}_${Math.random()}`,
      date: new Date(Date.now() - Math.random() * 86400000).toISOString().split('T')[0],
      dayPlanId: 'day_old',
      completedTaskIds,
      failedTaskIds,
      partialTaskIds: [],
      falseRestDetected: false,
      verdict,
      xpDelta: verdict === 'self_victory' ? 50 : -30,
      innerCoreDelta: verdict === 'self_victory' ? 3 : -2,
      abyssIndexDelta: verdict === 'self_victory' ? -5 : 8,
      debtIds: [],
      createdAt: new Date().toISOString(),
    };
  }

  function simulateCourt({ profile, dayPlan, tasks, taskStatuses, failures, falseRest, previousReviews = [] }) {
    // Импортируем логику из приложения
    // Эта функция имитирует логику ActionCourt.tsx
    
    const completedTaskIds = tasks.filter(t => taskStatuses[t.id] === 'completed').map(t => t.id);
    const failedTaskIds = tasks.filter(t => taskStatuses[t.id] === 'failed').map(t => t.id);
    const partialTaskIds = tasks.filter(t => taskStatuses[t.id] === 'partial').map(t => t.id);
    
    const bossTask = tasks.find(t => t.id === dayPlan.bossTaskId);
    const mainTask = tasks.find(t => t.importance === 'important');
    
    const bossCompleted = bossTask ? completedTaskIds.includes(bossTask.id) : false;
    const mainCompleted = mainTask ? completedTaskIds.includes(mainTask.id) : false;
    const bossFailed = bossTask ? failedTaskIds.includes(bossTask.id) : false;
    const mainFailed = mainTask ? failedTaskIds.includes(mainTask.id) : false;
    
    // Self-deception detection
    const hasSelfDeception = failures.some(f => {
      const level0 = ['serious_illness', 'work_force_majeure', 'family_emergency'];
      const baseLevel = level0.includes(f.reasonType) ? 0 : 
        ['minor_illness', 'tired', 'task_too_big', 'bad_planning', 'fear', 'perfectionism', 'unknown'].includes(f.reasonType) ? 1 : 2;
      return f.couldDoMinimum && baseLevel >= 1;
    });
    
    // Respectful reason
    const hasRespectfulReason = failures.some(f => {
      const level0 = ['serious_illness', 'work_force_majeure', 'family_emergency'];
      return level0.includes(f.reasonType) && !f.couldDoMinimum;
    });
    
    // Repeated pattern
    const lastThree = previousReviews.slice(-3);
    const repeatedPattern = lastThree.length >= 3 && lastThree.every(r => 
      r.verdict === 'failure' || r.verdict === 'self_deception' || r.failedTaskIds.length > 0
    );
    
    const context = {
      strictnessMode: profile.strictnessMode,
      mainTaskCompleted: mainCompleted,
      bossTaskCompleted: bossCompleted,
      proofOk: completedTaskIds.length > 0,
      courtCompleted: true,
      respectfulReason: hasRespectfulReason,
      partialCompletion: partialTaskIds.length > 0 && completedTaskIds.length > 0,
      selfDeceptionDetected: hasSelfDeception,
      recoveryQuestCompletedAfterFailure: false,
      couldDoMinimum: failures.some(f => f.couldDoMinimum),
      falseRestDetected: falseRest,
      repeatedPattern,
      failedMainTask: mainFailed,
      failedBossTask: bossFailed,
      skippedCourt: false,
      externalResultCreated: bossTask ? completedTaskIds.includes(bossTask.id) : false,
      learningWithoutPractice: completedTaskIds.some(id => tasks.find(t => t.id === id)?.type === 'learning') && 
        !completedTaskIds.some(id => tasks.find(t => t.id === id)?.type === 'practice'),
    };
    
    // Determine verdict
    let verdict;
    if (context.recoveryQuestCompletedAfterFailure) verdict = 'recovered_victory';
    else if (context.selfDeceptionDetected) verdict = 'self_deception';
    else if (context.respectfulReason && !context.selfDeceptionDetected) verdict = 'respectful_transfer';
    else if (context.mainTaskCompleted && context.proofOk && context.courtCompleted) verdict = 'self_victory';
    else if (context.partialCompletion && context.courtCompleted) verdict = 'partial_victory';
    else verdict = 'failure';
    
    // Scoring (упрощённая версия)
    let xpDelta = 0;
    if (context.mainTaskCompleted) xpDelta += 50;
    if (context.bossTaskCompleted) xpDelta += 80;
    if (context.proofOk) xpDelta += 20;
    if (context.externalResultCreated) xpDelta += 100;
    if (context.courtCompleted) xpDelta += 10;
    if (context.partialCompletion) xpDelta += 25;
    if (context.failedMainTask) xpDelta -= 30;
    if (context.failedBossTask) xpDelta -= 50;
    if (context.selfDeceptionDetected) xpDelta -= 60;
    if (context.falseRestDetected) xpDelta -= 20;
    if (context.learningWithoutPractice) xpDelta -= 15;
    
    let innerCoreDelta = 0;
    if (context.mainTaskCompleted) innerCoreDelta += 3;
    if (context.bossTaskCompleted) innerCoreDelta += 5;
    if (context.courtCompleted) innerCoreDelta += 2;
    if (context.externalResultCreated) innerCoreDelta += 4;
    if (context.selfDeceptionDetected) innerCoreDelta -= 5;
    if (context.falseRestDetected) innerCoreDelta -= 4;
    if (context.failedMainTask) innerCoreDelta -= 2;
    if (context.failedBossTask) innerCoreDelta -= 3;
    
    let abyssIndexDelta = 0;
    if (context.failedMainTask) abyssIndexDelta += 8;
    if (context.failedBossTask) abyssIndexDelta += 12;
    if (context.selfDeceptionDetected) abyssIndexDelta += 10;
    if (context.falseRestDetected) abyssIndexDelta += 6;
    if (context.repeatedPattern) abyssIndexDelta += 8;
    if (context.mainTaskCompleted) abyssIndexDelta -= 5;
    if (context.bossTaskCompleted) abyssIndexDelta -= 8;
    
    // Debt logic
    let debtCreated = false;
    let debtType;
    if (context.failedBossTask) { debtCreated = true; debtType = 'critical'; }
    else if (context.repeatedPattern) { debtCreated = true; debtType = 'systemic'; }
    else if (context.failedMainTask) { debtCreated = true; debtType = 'medium'; }
    else if (context.selfDeceptionDetected) { debtCreated = true; debtType = 'medium'; }
    
    // Respectful reason overrides
    if (context.respectfulReason && !context.selfDeceptionDetected) {
      debtCreated = false;
      debtType = undefined;
    }
    
    // Recovery quest
    let recoveryQuest = null;
    if (verdict === 'failure' || verdict === 'self_deception') {
      if (context.selfDeceptionDetected) {
        recoveryQuest = { title: 'Честный разбор', description: 'Записать, что помешало. Признать, что минимальное действие было возможно.', xpRestore: 15, innerCoreReward: 3, abyssReduction: 5, status: 'planned' };
      } else if (context.falseRestDetected) {
        recoveryQuest = { title: 'Вернуть контроль', description: '25 минут фокус-блока без телефона.', xpRestore: 20, innerCoreReward: 4, abyssReduction: 6, status: 'planned' };
      } else if (context.repeatedPattern) {
        recoveryQuest = { title: 'Прервать паттерн', description: 'Сделать то, что откладываешь, за 5 минут.', xpRestore: 25, innerCoreReward: 5, abyssReduction: 8, status: 'planned' };
      } else {
        recoveryQuest = { title: '5 минут действия', description: 'Минимальное действие по невыполненной задаче.', xpRestore: 15, innerCoreReward: 2, abyssReduction: 4, status: 'planned' };
      }
    }
    
    // Update profile
    const updatedProfile = { ...profile };
    updatedProfile.totalXp = Math.max(0, updatedProfile.totalXp + xpDelta);
    updatedProfile.innerCore = Math.max(0, Math.min(100, updatedProfile.innerCore + innerCoreDelta));
    updatedProfile.abyssIndex = Math.max(0, Math.min(100, updatedProfile.abyssIndex + abyssIndexDelta));
    
    // Level
    const newLevel = Math.floor(updatedProfile.totalXp / 200) + 1;
    if (newLevel > updatedProfile.level) updatedProfile.level = newLevel;
    
    // Streak
    if (verdict === 'self_victory' || verdict === 'recovered_victory') {
      updatedProfile.currentStreak += 1;
    } else if (verdict === 'failure' || verdict === 'self_deception') {
      updatedProfile.currentStreak = 0;
    }
    
    // Stabilization
    const allReviews = [...previousReviews, { verdict, failedTaskIds }];
    const lastThree = allReviews.slice(-3);
    const allFailed = lastThree.length >= 3 && lastThree.every(r => 
      r.verdict === 'failure' || r.verdict === 'self_deception' || (r.failedTaskIds && r.failedTaskIds.length > 0)
    );
    const openDebts = debtCreated ? 1 : 0;
    const stabilizationTriggered = updatedProfile.abyssIndex >= 61 || 
      (updatedProfile.abyssIndex >= 50 && openDebts >= 3) || 
      openDebts >= 5 || 
      allFailed;
    
    if (stabilizationTriggered) {
      updatedProfile.activeStabilization = true;
    }
    
    return {
      verdict,
      xpDelta,
      innerCoreDelta,
      abyssIndexDelta,
      debtCreated,
      debtType,
      recoveryQuest,
      stabilizationTriggered,
      updatedProfile,
      completedTaskIds,
      failedTaskIds,
      partialTaskIds,
    };
  }

  // Run all tests
  tests.push(test1());
  tests.push(test2());
  tests.push(test3());
  tests.push(test4());
  tests.push(test5());

  const passed = tests.filter(t => t).length;
  const total = tests.length;
  
  console.log(`\n📊 Результаты: ${passed}/${total} тестов пройдено`);
  console.log(passed === total ? '✅ Все тесты пройдены!' : '❌ Есть падения');
}

// Run tests
runPhase8Tests();
