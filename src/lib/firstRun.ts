'use client';

import type { Goal, Task } from '@/types';
import type { DailyTrajectoryPayload } from '@/lib/aiMentor';
import {
  createGoal,
  getActiveWeeklyGoal,
  getTodayPlan,
  getTasksByIds,
  loadUserProfile,
  restoreSnapshot,
  saveUserProfile,
  snapshotAllStorage,
} from '@/lib/storage';
import {
  createDayPlanFromTrajectory,
  type DayPlanBundle,
  type DayPlanTranslator,
} from '@/lib/dayPlanCreation';
import { deadlineForGoalHorizon } from '@/lib/goalCalendar';

export type FirstRunLocale = 'ru' | 'en';

export interface FirstRunDraft {
  result: string;
  weeklyGoal: string;
  todayResult: string;
  weeklyTrajectory: string;
  trajectory: DailyTrajectoryPayload;
}

interface CompleteFirstRunInput {
  draft: FirstRunDraft;
  locale: FirstRunLocale;
  contractAccepted: boolean;
  tToday: DayPlanTranslator;
}

export interface FirstRunResult extends DayPlanBundle {
  goal: Goal;
  firstTask: Task;
}

function normalizeResult(result: string): string {
  return result.replace(/\s+/g, ' ').trim().slice(0, 240);
}

export function buildFirstRunDraft(
  rawResult: string,
  locale: FirstRunLocale
): FirstRunDraft {
  const result = normalizeResult(rawResult);
  if (!result) throw new Error('result_required');

  if (locale === 'en') {
    return {
      result,
      weeklyGoal: `In 7 days, complete and show a first result: ${result}`,
      todayResult: result,
      weeklyTrajectory: 'Today creates the first verifiable version of the weekly result.',
      trajectory: {
        microGoal: result,
        weeklyLink: 'Today creates the first verifiable version of the weekly result.',
        learningTitle: 'Define what “done” looks like',
        learningDescription: 'Write one visible sign that will prove the result is ready.',
        practiceTitle: 'Build the first workable version',
        practiceDescription: 'Make the smallest workable version of the result.',
        outputTitle: 'Save or show the result',
        outputDescription: 'Save the file, send a link, or show the result to someone.',
        risk: 'Getting stuck in planning instead of making the first version.',
        minimumAction: 'Spend five minutes making a visible part of the result.',
      },
    };
  }

  return {
    result,
    weeklyGoal: `За 7 дней завершить и показать первый результат: ${result}`,
    todayResult: result,
    weeklyTrajectory: 'Сегодня появляется первая проверяемая версия недельного результата.',
    trajectory: {
      microGoal: result,
      weeklyLink: 'Сегодня появляется первая проверяемая версия недельного результата.',
      learningTitle: 'Определить критерий готовности',
      learningDescription: 'Запиши один видимый признак, по которому результат можно считать готовым.',
      practiceTitle: 'Собрать первую рабочую версию',
      practiceDescription: 'Сделай минимальную рабочую версию результата.',
      outputTitle: 'Сохранить или показать результат',
      outputDescription: 'Сохрани файл, отправь ссылку или покажи результат другому человеку.',
      risk: 'Застрять в планировании вместо первой рабочей версии.',
      minimumAction: 'Пять минут делать видимую часть результата.',
    },
  };
}

function buildGoal(
  draft: FirstRunDraft,
  locale: FirstRunLocale,
  userId: string
): Omit<Goal, 'id' | 'createdAt'> {
  return {
    userId,
    title: draft.weeklyGoal,
    originalInput: draft.result,
    area: 'other',
    level: 0,
    specific: draft.todayResult,
    measurable: draft.result,
    deadline: deadlineForGoalHorizon('weekly'),
    why:
      locale === 'en'
        ? 'Get the first useful result before adding more setup.'
        : 'Получить первый полезный результат до дополнительных настроек.',
    externalResult: draft.result,
    realismScore: 70,
    status: 'active',
    horizon: 'weekly',
  };
}

function firstRunCopy(locale: FirstRunLocale) {
  if (locale === 'en') {
    return {
      minimumAction: 'Spend five minutes making a visible part of the result.',
      deadline: 'Today',
      proof: 'A note, file, screenshot, or link that shows the action.',
      risk: 'Getting stuck in planning instead of making the first version.',
      protection: 'Start a 25-minute timer and turn off notifications.',
      rewardText: 'The first useful result is visible.',
      consequenceText: 'Record the reason and choose one smaller step for tomorrow.',
    };
  }
  return {
    minimumAction: 'Пять минут делать видимую часть результата.',
    deadline: 'Сегодня',
    proof: 'Заметка, файл, скриншот или ссылка, подтверждающие действие.',
    risk: 'Застрять в планировании вместо первой рабочей версии.',
    protection: 'Запусти таймер на 25 минут и выключи уведомления.',
    rewardText: 'Первый полезный результат стал видимым.',
    consequenceText: 'Зафиксировать причину и выбрать один меньший шаг на завтра.',
  };
}

export function completeFirstRun({
  draft,
  locale,
  contractAccepted,
  tToday,
}: CompleteFirstRunInput): FirstRunResult {
  if (!contractAccepted) throw new Error('contract_required');

  const snapshot = snapshotAllStorage();
  try {
    const profile = loadUserProfile();
    const existingPlan = getTodayPlan();
    const existingGoal = getActiveWeeklyGoal();

    if (profile.onboardingCompleted && existingPlan && existingGoal) {
      const tasks = getTasksByIds(existingPlan.taskIds);
      if (!tasks[0]) throw new Error('first_task_missing');
      return { dayPlan: existingPlan, tasks, goal: existingGoal, firstTask: tasks[0] };
    }

    const goal = existingGoal ?? createGoal(buildGoal(draft, locale, profile.id));
    const bundle = createDayPlanFromTrajectory({
      goal,
      profile,
      trajectory: draft.trajectory,
      tToday,
      mainResult: draft.todayResult,
      weeklyTrajectory: draft.weeklyTrajectory,
      copy: firstRunCopy(locale),
    });
    const firstTask = bundle.tasks[0];
    if (!firstTask) throw new Error('first_task_missing');

    saveUserProfile({
      ...profile,
      onboardingCompleted: true,
      skippedOnboarding: false,
      contractAccepted: true,
    });

    return { ...bundle, goal, firstTask };
  } catch (error) {
    restoreSnapshot(snapshot);
    throw error;
  }
}
