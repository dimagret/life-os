'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, Play } from 'lucide-react';
import { DayPlan, Task } from '@/types';
import {
  stripLegacyTodayFromTaskTitle,
  stripTrajectoryContextPrefix,
} from '@/lib/utils';
import { isTaskFinishedForDay } from '@/lib/dayPlan';
import { resolveTaskDayBlock, sortTasksByDailyProtocol } from '@/lib/dailyProtocol';
import styles from './DayCommandCenter.module.css';

interface DayCommandCenterProps {
  dayPlan: DayPlan;
  tasks?: Task[];
  weeklyGoalTitle?: string;
  tasksClosed?: number;
  tasksTotal?: number;
  onSaveMainResult?: (value: string) => void;
  onStartFocus?: (task: Task) => void;
}

function hasLegacyDoneText(text: string | undefined): boolean {
  return !!text && (/\bСделано:\s*/iu.test(text) || /\bDone:\s*/iu.test(text));
}

function stripRepeatedWeeklyLead(text: string): string {
  const trimmed = text.trim();
  const ruMarker = '. Сегодня';
  const enMarker = '. Today';
  if (/^Цель недели:/iu.test(trimmed) && trimmed.includes(ruMarker)) {
    return `Сегодня${trimmed.split(ruMarker).slice(1).join(ruMarker)}`.trim();
  }
  if (/^Weekly goal:/iu.test(trimmed) && trimmed.includes(enMarker)) {
    return `Today${trimmed.split(enMarker).slice(1).join(enMarker)}`.trim();
  }
  return trimmed;
}

function getCompactTaskText(task: Task): string {
  const text =
    stripTrajectoryContextPrefix(task.microGoal) ||
    stripTrajectoryContextPrefix(task.description) ||
    stripLegacyTodayFromTaskTitle(task.title);

  return text
    .replace(/^Контекст недели:\s*«[^»]*»\.\s*/iu, '')
    .replace(/^Weekly context:\s*[“"][^”"]+[”"]\.\s*/iu, '')
    .replace(/^Weekly context:\s*"[^"]+"\.\s*/iu, '')
    .replace(/\s+по\s+«[^»]+»/iu, '')
    .replace(/\s+—\s+на пути к\s+«[^»]+»/iu, '')
    .replace(/\s+on\s+[“"][^”"]+[”"]/iu, '')
    .replace(/\s+toward\s+[“"][^”"]+[”"]/iu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function DayCommandCenter({
  dayPlan,
  tasks = [],
  weeklyGoalTitle,
  tasksClosed = 0,
  tasksTotal = 0,
  onSaveMainResult,
  onStartFocus,
}: DayCommandCenterProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingMicro, setEditingMicro] = useState(false);
  const [microDraftOverride, setMicroDraftOverride] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const microDraft = microDraftOverride ?? dayPlan.mainResult;
  const t = useTranslations('dayPlan');
  const tDaily = useTranslations('dailyPlan');
  const tTask = useTranslations('task');
  const tToday = useTranslations('today');
  const tc = useTranslations('common');
  const flowTasks = sortTasksByDailyProtocol(tasks);
  const commandTasks = flowTasks.slice(0, 3);
  const priorityTask =
    flowTasks.find((task) => task.status === 'in_progress' && !isTaskFinishedForDay(task)) ||
    flowTasks.find((task) => !isTaskFinishedForDay(task));
  const selectedTask =
    flowTasks.find(
      (task) => task.id === selectedTaskId && !isTaskFinishedForDay(task)
    ) || priorityTask;
  const weeklyLabel =
    weeklyGoalTitle?.trim() ||
    (hasLegacyDoneText(dayPlan.weeklyTrajectory) ? '' : dayPlan.weeklyTrajectory?.trim()) ||
    t('weekGoalFallback');
  const trajectoryNote = hasLegacyDoneText(dayPlan.weeklyTrajectory)
    ? t('trajectoryFallback')
    : dayPlan.weeklyTrajectory?.trim()
      ? stripRepeatedWeeklyLead(dayPlan.weeklyTrajectory)
      : t('trajectoryFallback');
  const progressMax = Math.max(tasksTotal, 1);
  const progressValue = Math.min(tasksClosed, progressMax);
  const progressPercent = Math.round((progressValue / progressMax) * 100);

  return (
    <section className={styles.commandCard} aria-labelledby="today-command-title">
      <div className={styles.topline}>
        <div>
          <p id="today-command-title" className={styles.kicker}>
            {tToday('nextAction.title')}
          </p>
          <p className={styles.progressCopy} aria-live="polite">
            {tDaily('taskProgressClosed', { closed: tasksClosed, total: tasksTotal })}
          </p>
        </div>
        <span className={styles.progressValue} aria-hidden="true">
          {tasksClosed}/{tasksTotal}
        </span>
      </div>

      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={progressMax}
        aria-valuenow={progressValue}
        aria-label={tDaily('taskProgressClosed', { closed: tasksClosed, total: tasksTotal })}
      >
        <span className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
      </div>

      <div className={styles.resultBlock}>
        <div className={styles.resultHeader}>
          <span className={styles.resultLabel}>{t('mainResult')}</span>
          {onSaveMainResult && !editingMicro ? (
            <button
              type="button"
              onClick={() => {
                setMicroDraftOverride(dayPlan.mainResult);
                setEditingMicro(true);
              }}
              className={styles.editButton}
            >
              {t('editMicroGoal')}
            </button>
          ) : null}
        </div>

        {editingMicro && onSaveMainResult ? (
          <div className={styles.editForm}>
            <textarea
              value={microDraft}
              onChange={(event) => setMicroDraftOverride(event.target.value)}
              placeholder={t('microGoalPlaceholder')}
              rows={3}
              className="tactile-field w-full resize-none p-3 text-sm placeholder:text-[var(--text-disabled)] focus:outline-none focus:border-[var(--state-color)]"
            />
            <div className={styles.formActions}>
              <button
                type="button"
                onClick={() => {
                  setMicroDraftOverride(null);
                  setEditingMicro(false);
                }}
                className={styles.secondaryButton}
              >
                {tc('cancel')}
              </button>
              <button
                type="button"
                disabled={!microDraft.trim()}
                onClick={() => {
                  onSaveMainResult(microDraft.trim());
                  setMicroDraftOverride(null);
                  setEditingMicro(false);
                }}
                className={styles.saveButton}
              >
                {tc('save')}
              </button>
            </div>
          </div>
        ) : (
          <p className={styles.mainResult}>{dayPlan.mainResult}</p>
        )}
      </div>

      {selectedTask && onStartFocus ? (
        <button
          type="button"
          onClick={() => onStartFocus(selectedTask)}
          className={styles.primaryAction}
          aria-label={`${tTask('startFocus')}: ${getCompactTaskText(selectedTask)}`}
        >
          <span className={styles.primaryCopy}>
            <strong>{tTask('startFocus')}</strong>
            <span>
              {getCompactTaskText(selectedTask)}
              {selectedTask.plannedMinutes
                ? ` · ${tTask('plannedMinutes', { minutes: selectedTask.plannedMinutes })}`
                : ''}
            </span>
          </span>
          <span className={styles.primaryIcon} aria-hidden="true">
            <Play size={17} fill="currentColor" />
          </span>
        </button>
      ) : null}

      {commandTasks.length > 0 ? (
        <ol className={styles.stepList} aria-label={t('taskStages')}>
          {commandTasks.map((task, index) => {
            const period = resolveTaskDayBlock(task);
            const isFinished = isTaskFinishedForDay(task);
            const isCurrent = selectedTask?.id === task.id;

            return (
              <li key={task.id}>
                <button
                  type="button"
                  disabled={isFinished}
                  onClick={() => setSelectedTaskId(task.id)}
                  className={styles.stepRow}
                  data-current={isCurrent ? 'true' : undefined}
                  data-status={task.status}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-pressed={isCurrent}
                >
                  <span className={styles.stepIndex} aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className={styles.stepBody}>
                    <span className={styles.stepPeriod}>{tDaily(`blocks.${period}`)}</span>
                    <span className={styles.stepTask}>{getCompactTaskText(task)}</span>
                  </span>
                  <span className={styles.stepStatus}>{tTask(`status.${task.status}`)}</span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : null}

      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={styles.detailsToggle}
        aria-expanded={expanded}
        aria-controls="today-command-details"
      >
        <span>{expanded ? t('collapse') : t('expand')}</span>
        <ChevronDown className={styles.chevron} data-open={expanded ? 'true' : undefined} size={16} aria-hidden="true" />
      </button>

      <div id="today-command-details" hidden={!expanded} className={styles.detailsPanel}>
        <div className={styles.detailBlock}>
          <span className={styles.detailLabel}>{t('weekGoal')}</span>
          <p>{weeklyLabel}</p>
        </div>
        <div className={styles.detailBlock}>
          <span className={styles.detailLabel}>{t('weeklyTrajectory')}</span>
          <p>{trajectoryNote}</p>
        </div>
        <div className={styles.detailGrid}>
          <div className={styles.detailBlock}>
            <span className={styles.detailLabel}>{t('deadline')}</span>
            <p>{dayPlan.deadline}</p>
          </div>
          <div className={styles.detailBlock}>
            <span className={styles.detailLabel}>{t('failureRisk')}</span>
            <p>{dayPlan.risk}</p>
          </div>
          <div className={styles.detailBlock}>
            <span className={styles.detailLabel}>{t('minAction')}</span>
            <p>{dayPlan.minimumAction}</p>
          </div>
          <div className={styles.detailBlock}>
            <span className={styles.detailLabel}>{t('protection')}</span>
            <p>{dayPlan.protection}</p>
          </div>
          <div className={styles.detailBlock}>
            <span className={styles.detailLabel}>{t('reward')}</span>
            <p>{dayPlan.rewardText}</p>
          </div>
          <div className={styles.detailBlock}>
            <span className={styles.detailLabel}>{t('consequence')}</span>
            <p>{dayPlan.consequenceText}</p>
          </div>
        </div>
      </div>
    </section>
  );
}


