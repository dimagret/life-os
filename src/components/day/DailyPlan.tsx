'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Task } from '@/types';
import { countFinishedDayTasks, isTaskFinishedForDay } from '@/lib/dayPlan';
import {
  DAY_BLOCKS,
  getDayBlockTaskLimitStatus,
  groupTasksByDayBlock,
  resolveTaskBlockRole,
  sortTasksByDailyProtocol,
} from '@/lib/dailyProtocol';
import { TaskCard } from './TaskCard';

interface DailyPlanProps {
  tasks: Task[];
  onUpdateTask: (taskId: string, patch: Partial<Task>) => void;
  onAddProof: (taskId: string, type: 'text' | 'link', value: string) => void;
  onStartFocus?: (task: Task) => void;
}

export function DailyPlan({ tasks, onUpdateTask, onAddProof, onStartFocus }: DailyPlanProps) {
  const t = useTranslations('dailyPlan');
  const closedCount = countFinishedDayTasks(tasks);
  const sortedTasks = useMemo(() => sortTasksByDailyProtocol(tasks), [tasks]);
  const grouped = useMemo(() => groupTasksByDayBlock(sortedTasks), [sortedTasks]);
  const isMinimumDay = useMemo(
    () => sortedTasks.length === 3 && sortedTasks.every((task) => resolveTaskBlockRole(task) === 'main'),
    [sortedTasks]
  );
  const limitStatus = useMemo(
    () => new Map(getDayBlockTaskLimitStatus(sortedTasks).map((status) => [status.block, status])),
    [sortedTasks]
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            {t('title')}
          </h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {t('blockRule')}
          </p>
        </div>
        <span className="text-xs text-[var(--text-muted)] text-right shrink-0">
          {tasks.length > 0
            ? t('taskProgressClosed', { closed: closedCount, total: tasks.length })
            : t('taskCount', { count: 0 })}
        </span>
      </div>

      {isMinimumDay ? (
        <div className="rounded-lg border border-[var(--state-control)] bg-[var(--state-control-soft)] p-3">
          <p className="text-xs font-medium leading-relaxed text-[var(--state-control)]">
            {t('minimumDay')}
          </p>
        </div>
      ) : null}

      <div className="space-y-6">
        {DAY_BLOCKS.map((block) => {
          const blockTasks = grouped[block];
          const activeTasks = blockTasks.filter((task) => !isTaskFinishedForDay(task));
          const closedTasks = blockTasks.filter(isTaskFinishedForDay);
          const status = limitStatus.get(block);
          const overLimit = Boolean(status?.overMainLimit || status?.overSupportLimit);

          return (
            <section key={block} className="space-y-3 border-l border-[var(--border-subtle)] pl-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                    {t(`blocks.${block}`)}
                  </h3>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    {blockTasks.length > 0
                      ? t('blockTaskCount', {
                          main: status?.mainCount ?? 0,
                          support: status?.supportCount ?? 0,
                        })
                      : t('emptyBlock')}
                  </p>
                </div>
                {overLimit ? (
                  <span className="rounded-md border border-[var(--state-risk)] bg-[var(--state-risk-soft)] px-2 py-1 text-[10px] font-medium text-[var(--state-risk)]">
                    {t('limitWarning')}
                  </span>
                ) : null}
              </div>

              {activeTasks.length > 0 ? (
                <div className="space-y-3">
                  {closedTasks.length > 0 ? (
                    <h4 className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                      {t('activeSection')}
                    </h4>
                  ) : null}
                  {activeTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      roleLabel={t(resolveTaskBlockRole(task) === 'main' ? 'mainRole' : 'supportRole')}
                      onUpdate={onUpdateTask}
                      onAddProof={onAddProof}
                      onStartFocus={onStartFocus}
                    />
                  ))}
                </div>
              ) : null}

              {closedTasks.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                    {t('completedSection')}
                  </h4>
                  {closedTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      roleLabel={t(resolveTaskBlockRole(task) === 'main' ? 'mainRole' : 'supportRole')}
                      onUpdate={onUpdateTask}
                      onAddProof={onAddProof}
                      onStartFocus={onStartFocus}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      <div className="tactile-card p-4">
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          {t('note')}
        </p>
      </div>
    </div>
  );
}
