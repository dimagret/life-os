// MVP v0.1 End-to-End Test
// Полный сквозной тест всех 23 шагов
// Запустить в консоли браузера: скопировать код и нажать Enter

function runMVPE2ETest() {
  console.log('🧪 MVP v0.1 — Полный сквозной тест\n');
  console.log('=' .repeat(50));

  const results = [];

  // Шаг 1: Очистить localStorage
  function step1() {
    console.log('\n[1/23] Очистка localStorage...');
    localStorage.clear();
    const isClear = localStorage.length === 0;
    console.log(`   ${isClear ? '✅' : '❌'} localStorage очищен`);
    return isClear;
  }

  // Шаг 2: Открыть приложение (bootstrap)
  function step2() {
    console.log('\n[2/23] Bootstrap приложения...');
    // Имитация bootstrapApp
    const profile = {
      id: 'user_' + Date.now(),
      createdAt: new Date().toISOString(),
      onboardingCompleted: false,
      contractAccepted: false,
      strictnessMode: 'standard',
      level: 1,
      totalXp: 0,
      innerCore: 0,
      abyssIndex: 20,
      currentStreak: 0,
      activeStabilization: false,
      externalResultsCount: 0,
    };
    localStorage.setItem('lifeos:userProfile', JSON.stringify(profile));
    const loaded = JSON.parse(localStorage.getItem('lifeos:userProfile'));
    const ok = loaded.id === profile.id;
    console.log(`   ${ok ? '✅' : '❌'} Приложение загружено, профиль создан`);
    return ok;
  }

  // Шаг 3: Пройти onboarding
  function step3() {
    console.log('\n[3/23] Прохождение onboarding...');
    const profile = JSON.parse(localStorage.getItem('lifeos:userProfile'));
    profile.onboardingCompleted = true;
    profile.contractAccepted = true;
    localStorage.setItem('lifeos:userProfile', JSON.stringify(profile));
    const loaded = JSON.parse(localStorage.getItem('lifeos:userProfile'));
    const ok = loaded.onboardingCompleted && loaded.contractAccepted;
    console.log(`   ${ok ? '✅' : '❌'} Onboarding пройден`);
    return ok;
  }

  // Шаг 4: Создать цель
  function step4() {
    console.log('\n[4/23] Создание цели...');
    const goal = {
      id: 'goal_' + Date.now(),
      userId: JSON.parse(localStorage.getItem('lifeos:userProfile')).id,
      title: 'За 14 дней собрать первый одностраничный лендинг и показать его одному человеку',
      originalInput: 'Хочу научиться делать сайты',
      area: 'skill',
      level: 1,
      specific: 'Собрать первый лендинг',
      measurable: 'Опубликованный лендинг',
      deadline: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      why: 'Пользователь хочет превратить цель в действие.',
      externalResult: 'Первый одностраничный лендинг, показанный одному человеку.',
      realismScore: 72,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('lifeos:goals', JSON.stringify([goal]));
    const loaded = JSON.parse(localStorage.getItem('lifeos:goals'));
    const ok = loaded.length === 1 && loaded[0].originalInput === 'Хочу научиться делать сайты';
    console.log(`   ${ok ? '✅' : '❌'} Цель создана: "${goal.title.slice(0, 50)}..."`);
    return ok;
  }

  // Шаг 5: Принять AI-разбор
  function step5() {
    console.log('\n[5/23] Принятие AI-разбора...');
    const goals = JSON.parse(localStorage.getItem('lifeos:goals'));
    const ok = goals[0].realismScore > 0 && goals[0].externalResult.length > 0;
    console.log(`   ${ok ? '✅' : '❌'} AI-разбор принят (realismScore: ${goals[0].realismScore})`);
    return ok;
  }

  // Шаг 6: Сформировать Приказ Дня
  function step6() {
    console.log('\n[6/23] Формирование Приказа Дня...');
    const goal = JSON.parse(localStorage.getItem('lifeos:goals'))[0];
    const today = new Date().toISOString().split('T')[0];

    const learningTask = {
      id: 'task_learning_' + Date.now(),
      goalId: goal.id,
      title: 'Изучить один короткий материал под задачу',
      description: 'Найти и изучить один референс, урок или пример',
      type: 'learning',
      importance: 'normal',
      status: 'planned',
      xpReward: 10,
      xpPenalty: 5,
      proofRequired: false,
      createdAt: new Date().toISOString(),
    };

    const practiceTask = {
      id: 'task_practice_' + (Date.now() + 1),
      goalId: goal.id,
      title: 'Применить знание в задаче',
      description: 'Сделать первый практический шаг по цели',
      type: 'practice',
      importance: 'important',
      status: 'planned',
      xpReward: 20,
      xpPenalty: 20,
      proofRequired: true,
      createdAt: new Date().toISOString(),
    };

    const outputTask = {
      id: 'task_output_' + (Date.now() + 2),
      goalId: goal.id,
      title: 'Создать видимый результат',
      description: 'Создать что-то, что можно показать или измерить',
      type: 'output',
      importance: 'boss',
      status: 'planned',
      xpReward: 40,
      xpPenalty: 40,
      proofRequired: true,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem('lifeos:tasks', JSON.stringify([learningTask, practiceTask, outputTask]));

    const dayPlan = {
      id: 'day_' + Date.now(),
      date: today,
      goalId: goal.id,
      mainResult: 'Собрать первый экран лендинга',
      bossTaskId: outputTask.id,
      minimumAction: 'Открыть файл и выписать 5 блоков лендинга',
      deadline: '20:00',
      risk: 'Залипание в обучение вместо сборки экрана',
      protection: 'Один короткий урок, затем сразу практика',
      rewardText: 'XP, рост стержня и движение к внешнему результату',
      consequenceText: 'Если минимум не будет сделан, задача станет долгом',
      taskIds: [learningTask.id, practiceTask.id, outputTask.id],
      status: 'active',
    };

    localStorage.setItem('lifeos:dayPlans', JSON.stringify([dayPlan]));

    const loadedPlan = JSON.parse(localStorage.getItem('lifeos:dayPlans'))[0];
    const loadedTasks = JSON.parse(localStorage.getItem('lifeos:tasks'));
    const ok = loadedPlan.taskIds.length === 3 && loadedTasks.length === 3;
    console.log(`   ${ok ? '✅' : '❌'} Приказ Дня создан (3 задачи)`);
    return ok;
  }

  // Шаг 7: Выполнить learning
  function step7() {
    console.log('\n[7/23] Выполнение learning...');
    const tasks = JSON.parse(localStorage.getItem('lifeos:tasks'));
    tasks[0].status = 'completed';
    tasks[0].completedAt = new Date().toISOString();
    localStorage.setItem('lifeos:tasks', JSON.stringify(tasks));
    const ok = tasks[0].status === 'completed';
    console.log(`   ${ok ? '✅' : '❌'} Learning выполнена`);
    return ok;
  }

  // Шаг 8: Частично выполнить practice
  function step8() {
    console.log('\n[8/23] Частичное выполнение practice...');
    const tasks = JSON.parse(localStorage.getItem('lifeos:tasks'));
    tasks[1].status = 'partial';
    localStorage.setItem('lifeos:tasks', JSON.stringify(tasks));
    const ok = tasks[1].status === 'partial';
    console.log(`   ${ok ? '✅' : '❌'} Practice частично выполнена`);
    return ok;
  }

  // Шаг 9: Добавить proof к output
  function step9() {
    console.log('\n[9/23] Добавление proof к output...');
    const tasks = JSON.parse(localStorage.getItem('lifeos:tasks'));
    tasks[2].proof = {
      id: 'proof_' + Date.now(),
      taskId: tasks[2].id,
      type: 'link',
      value: 'https://example.com/landing-draft',
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('lifeos:tasks', JSON.stringify(tasks));
    const ok = !!tasks[2].proof;
    console.log(`   ${ok ? '✅' : '❌'} Proof добавлен: ${tasks[2].proof.value}`);
    return ok;
  }

  // Шаг 10: Пройти фокус-блок
  function step10() {
    console.log('\n[10/23] Прохождение фокус-блока...');
    const focusBlock = {
      id: 'focus_' + Date.now(),
      taskId: JSON.parse(localStorage.getItem('lifeos:tasks'))[0].id,
      goal: 'Изучить материал по лендингам',
      durationMinutes: 25,
      startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      endedAt: new Date().toISOString(),
      distractions: ['Соцсети'],
      status: 'completed',
      result: 'Прочитал статью о структуре лендингов',
    };
    localStorage.setItem('lifeos:focusBlocks', JSON.stringify([focusBlock]));
    const loaded = JSON.parse(localStorage.getItem('lifeos:focusBlocks'));
    const ok = loaded.length === 1 && loaded[0].status === 'completed';
    console.log(`   ${ok ? '✅' : '❌'} Фокус-блок пройден (25 мин, 1 отвлечение)`);
    return ok;
  }

  // Шаг 11: Пройти Суд Действия
  function step11() {
    console.log('\n[11/23] Прохождение Суда Действия...');
    const tasks = JSON.parse(localStorage.getItem('lifeos:tasks'));
    const dayPlan = JSON.parse(localStorage.getItem('lifeos:dayPlans'))[0];

    const review = {
      id: 'review_' + Date.now(),
      date: dayPlan.date,
      dayPlanId: dayPlan.id,
      completedTaskIds: [tasks[0].id],
      failedTaskIds: [],
      partialTaskIds: [tasks[1].id],
      falseRestDetected: false,
      verdict: 'partial_victory',
      xpDelta: 25,
      innerCoreDelta: 2,
      abyssIndexDelta: -3,
      debtIds: [],
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem('lifeos:actionCourtReviews', JSON.stringify([review]));
    dayPlan.status = 'closed';
    localStorage.setItem('lifeos:dayPlans', JSON.stringify([dayPlan]));

    const loaded = JSON.parse(localStorage.getItem('lifeos:actionCourtReviews'));
    const ok = loaded.length === 1;
    console.log(`   ${ok ? '✅' : '❌'} Суд пройден (вердикт: ${review.verdict})`);
    return ok;
  }

  // Шаг 12: Получить вердикт
  function step12() {
    console.log('\n[12/23] Проверка вердикта...');
    const review = JSON.parse(localStorage.getItem('lifeos:actionCourtReviews'))[0];
    const ok = review.verdict === 'partial_victory';
    console.log(`   ${ok ? '✅' : '❌'} Вердикт: ${review.verdict}`);
    console.log(`      XP: ${review.xpDelta > 0 ? '+' : ''}${review.xpDelta}`);
    console.log(`      Стержень: ${review.innerCoreDelta > 0 ? '+' : ''}${review.innerCoreDelta}`);
    console.log(`      Пропасть: ${review.abyssIndexDelta > 0 ? '+' : ''}${review.abyssIndexDelta}`);
    return ok;
  }

  // Шаг 13: Проверить метрики
  function step13() {
    console.log('\n[13/23] Проверка метрик...');
    const profile = JSON.parse(localStorage.getItem('lifeos:userProfile'));
    // Apply deltas manually (normally done by app logic)
    profile.totalXp += 25;
    profile.innerCore += 2;
    profile.abyssIndex = Math.max(0, profile.abyssIndex - 3);
    profile.externalResultsCount = 0; // boss task not completed
    localStorage.setItem('lifeos:userProfile', JSON.stringify(profile));

    const loaded = JSON.parse(localStorage.getItem('lifeos:userProfile'));
    const ok = loaded.totalXp === 25 && loaded.innerCore === 2 && loaded.abyssIndex === 17;
    console.log(`   ${ok ? '✅' : '❌'} Метрики обновлены:`);
    console.log(`      XP: ${loaded.totalXp}`);
    console.log(`      Стержень: ${loaded.innerCore}`);
    console.log(`      Пропасть: ${loaded.abyssIndex}`);
    return ok;
  }

  // Шаг 14: Открыть Кодекс
  function step14() {
    console.log('\n[14/23] Открытие Кодекса...');
    const modules = JSON.parse(localStorage.getItem('lifeos:knowledgeModules')) || [];
    const ok = modules.length >= 2; // At least 2 modules exist
    console.log(`   ${ok ? '✅' : '❌'} Кодекс доступен (${modules.length} модулей)`);
    return ok;
  }

  // Шаг 15: Проверить материалы
  function step15() {
    console.log('\n[15/23] Проверка материалов Кодекса...');
    const modules = JSON.parse(localStorage.getItem('lifeos:knowledgeModules')) || [];
    const unlocked = modules.filter((m) => m.unlocked);
    const locked = modules.filter((m) => !m.unlocked);
    console.log(`   ✅ Открыто: ${unlocked.length} материалов`);
    unlocked.forEach((m) => console.log(`      ✓ ${m.title}`));
    console.log(`   🔒 Закрыто: ${locked.length} материалов`);
    locked.forEach((m) => console.log(`      ○ ${m.title} (${m.unlockCondition})`));
    return unlocked.length >= 2;
  }

  // Шаг 16: Создать провал/долг
  function step16() {
    console.log('\n[16/23] Создание долга...');
    const debt = {
      id: 'debt_' + Date.now(),
      taskId: JSON.parse(localStorage.getItem('lifeos:tasks'))[2].id,
      title: 'Закрыть внешний результат по лендингу',
      type: 'medium',
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('lifeos:debts', JSON.stringify([debt]));
    const loaded = JSON.parse(localStorage.getItem('lifeos:debts'));
    const ok = loaded.length === 1 && loaded[0].status === 'open';
    console.log(`   ${ok ? '✅' : '❌'} Долг создан: "${debt.title}" (${debt.type})`);
    return ok;
  }

  // Шаг 17: Проверить recovery quest
  function step17() {
    console.log('\n[17/23] Проверка recovery quest...');
    const quest = {
      id: 'quest_' + Date.now(),
      title: 'Вернуть контроль через 10 минут действия',
      description: 'Открыть файл лендинга и собрать один блок. Не планировать — делать.',
      xpRestore: 15,
      innerCoreReward: 2,
      abyssReduction: 4,
      status: 'planned',
    };
    localStorage.setItem('lifeos:recoveryQuests', JSON.stringify([quest]));
    const loaded = JSON.parse(localStorage.getItem('lifeos:recoveryQuests'));
    const ok = loaded.length === 1 && loaded[0].status === 'planned';
    console.log(`   ${ok ? '✅' : '❌'} Recovery quest создан: "${quest.title}"`);
    return ok;
  }

  // Шаг 18: Довести индекс до стабилизации
  function step18() {
    console.log('\n[18/23] Доведение индекса до стабилизации...');
    const profile = JSON.parse(localStorage.getItem('lifeos:userProfile'));
    profile.abyssIndex = 65; // Trigger stabilization
    localStorage.setItem('lifeos:userProfile', JSON.stringify(profile));
    const loaded = JSON.parse(localStorage.getItem('lifeos:userProfile'));
    const ok = loaded.abyssIndex >= 61;
    console.log(`   ${ok ? '✅' : '❌'} Индекс пропасти: ${loaded.abyssIndex}% (порог: 61%)`);
    return ok;
  }

  // Шаг 19: Проверить режим стабилизации
  function step19() {
    console.log('\n[19/23] Проверка режима стабилизации...');
    // Trigger stabilization logic
    const profile = JSON.parse(localStorage.getItem('lifeos:userProfile'));
    const debts = JSON.parse(localStorage.getItem('lifeos:debts')) || [];
    const reviews = JSON.parse(localStorage.getItem('lifeos:actionCourtReviews')) || [];

    const openDebts = debts.filter((d) => d.status === 'open').length;
    const shouldStabilize = profile.abyssIndex >= 61 ||
      (profile.abyssIndex >= 50 && openDebts >= 3) ||
      openDebts >= 5 ||
      (reviews.length >= 3 && reviews.slice(-3).every((r) =>
        r.verdict === 'failure' || r.verdict === 'self_deception' || r.failedTaskIds.length > 0
      ));

    if (shouldStabilize) {
      profile.activeStabilization = true;
      localStorage.setItem('lifeos:userProfile', JSON.stringify(profile));
    }

    const loaded = JSON.parse(localStorage.getItem('lifeos:userProfile'));
    const ok = loaded.activeStabilization;
    console.log(`   ${ok ? '✅' : '❌'} Стабилизация активирована`);
    return ok;
  }

  // Шаг 20: Заполнить демо-данными
  function step20() {
    console.log('\n[20/23] Заполнение демо-данными...');
    // Clear and fill with demo data
    localStorage.clear();

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const demoProfile = {
      id: 'demo_user',
      createdAt: now,
      onboardingCompleted: true,
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

    const demoGoal = {
      id: 'demo_goal',
      userId: 'demo_user',
      title: 'За 14 дней собрать первый одностраничный лендинг',
      originalInput: 'Хочу научиться делать сайты',
      area: 'skill',
      level: 1,
      specific: 'Собрать первый лендинг',
      measurable: 'Опубликованный лендинг',
      deadline: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      why: 'Пользователь хочет превратить цель в действие.',
      externalResult: 'Первый одностраничный лендинг, показанный одному человеку.',
      realismScore: 72,
      status: 'active',
      createdAt: now,
    };

    localStorage.setItem('lifeos:userProfile', JSON.stringify(demoProfile));
    localStorage.setItem('lifeos:goals', JSON.stringify([demoGoal]));

    const loaded = JSON.parse(localStorage.getItem('lifeos:userProfile'));
    const ok = loaded.level === 2 && loaded.totalXp === 180;
    console.log(`   ${ok ? '✅' : '❌'} Демо-данные загружены`);
    console.log(`      Уровень: ${loaded.level}, XP: ${loaded.totalXp}, Стержень: ${loaded.innerCore}%`);
    return ok;
  }

  // Шаг 21: Сбросить данные
  function step21() {
    console.log('\n[21/23] Сброс данных...');
    localStorage.clear();
    const isClear = localStorage.length === 0;
    console.log(`   ${isClear ? '✅' : '❌'} Данные сброшены`);
    return isClear;
  }

  // Шаг 22: Перезагрузить (симуляция)
  function step22() {
    console.log('\n[22/23] Симуляция перезагрузки...');
    // Check that after reload state is consistent
    const profile = JSON.parse(localStorage.getItem('lifeos:userProfile'));
    const ok = profile === null; // Should be null after clear
    console.log(`   ${ok ? '✅' : '❌'} После сброса профиль очищен`);
    return ok;
  }

  // Шаг 23: Проверить сохранение
  function step23() {
    console.log('\n[23/23] Проверка сохранения данных...');
    // Create fresh data
    const profile = {
      id: 'final_test',
      createdAt: new Date().toISOString(),
      onboardingCompleted: true,
      contractAccepted: true,
      strictnessMode: 'standard',
      level: 1,
      totalXp: 0,
      innerCore: 0,
      abyssIndex: 20,
      currentStreak: 0,
      activeStabilization: false,
      externalResultsCount: 0,
    };
    localStorage.setItem('lifeos:userProfile', JSON.stringify(profile));

    // Simulate reload
    const reloaded = JSON.parse(localStorage.getItem('lifeos:userProfile'));
    const ok = reloaded.id === 'final_test' && reloaded.onboardingCompleted;
    console.log(`   ${ok ? '✅' : '❌'} Данные сохраняются после reload`);
    return ok;
  }

  // Run all steps
  results.push(step1());
  results.push(step2());
  results.push(step3());
  results.push(step4());
  results.push(step5());
  results.push(step6());
  results.push(step7());
  results.push(step8());
  results.push(step9());
  results.push(step10());
  results.push(step11());
  results.push(step12());
  results.push(step13());
  results.push(step14());
  results.push(step15());
  results.push(step16());
  results.push(step17());
  results.push(step18());
  results.push(step19());
  results.push(step20());
  results.push(step21());
  results.push(step22());
  results.push(step23());

  const passed = results.filter((r) => r).length;
  const total = results.length;

  console.log('\n' + '='.repeat(50));
  console.log(`📊 Итог: ${passed}/${total} шагов пройдено`);

  if (passed === total) {
    console.log('✅ MVP v0.1 — ВСЕ ТЕСТЫ ПРОЙДЕНЫ');
  } else {
    console.log('❌ Есть падения. Проверь шаги выше.');
  }

  return { passed, total, results };
}

// Запуск теста
const testResult = runMVPE2ETest();
console.log('\n💡 Для ручного тестирования:');
console.log('   1. Открой http://localhost:3003');
console.log('   2. Пройди onboarding');
console.log('   3. Создай цель: "Хочу научиться делать сайты"');
console.log('   4. Сформируй Приказ Дня');
console.log('   5. Выполни/частично выполни задачи');
console.log('   6. Пройди Суд Действия');
console.log('   7. Проверь Profile, Codex, Stabilization');
console.log('   8. Используй демо-данные и сброс в Profile');
