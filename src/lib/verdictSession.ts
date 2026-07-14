import type {
  DayPlan,
  FailureReason,
  FocusBlock,
  Task,
  Verdict,
  VerdictFocusRecap,
  VerdictInfluenceKey,
  VerdictMainCategory,
  VerdictNextStepKey,
  VerdictResolutionKey,
  VerdictSessionSnapshot,
  VerdictTaskSummary,
} from '@/types';
import { getBaseLevel } from '@/lib/mockMentor';
import { stripLegacyTodayFromTaskTitle, stripTrajectoryContextPrefix } from '@/lib/utils';

function plannedDayIntent(task: Task): string {
  const micro = task.microGoal?.trim();
  if (micro) return micro;
  const stripped = stripTrajectoryContextPrefix(task.description);
  if (stripped) return stripped;
  const title = stripLegacyTodayFromTaskTitle(task.title).trim();
  return title || task.title;
}

/** Совместимо с TaskFailure из FailureReview без импорта компонента. */
export interface FailureInput {
  taskId: string;
  reasonType: FailureReason['type'];
  couldDoMinimum: boolean;
  comment: string;
}


export function taskStatusesFromVerdictResult(
  tasks: Task[],
  completedTaskIds: string[],
  partialTaskIds: string[],
  failedTaskIds: string[]
): Record<string, Task['status']> {
  const m: Record<string, Task['status']> = {};
  for (const t of tasks) {
    if (completedTaskIds.includes(t.id)) m[t.id] = 'completed';
    else if (partialTaskIds.includes(t.id)) m[t.id] = 'partial';
    else if (failedTaskIds.includes(t.id)) m[t.id] = 'failed';
    else m[t.id] = t.status;
  }
  return m;
}

export function verdictToMainCategory(verdict: Verdict): VerdictMainCategory {
  if (verdict === 'self_victory' || verdict === 'recovered_victory') return 'victory';
  if (verdict === 'partial_victory') return 'partial_victory';
  if (verdict === 'respectful_transfer') return 'day_void';
  return 'defeat';
}

function reasonToInfluenceKeys(type: FailureReason['type']): VerdictInfluenceKey[] {
  switch (type) {
    case 'social_media':
    case 'games':
      return ['distractions', 'resistance'];
    case 'work_force_majeure':
    case 'family_emergency':
      return ['external'];
    case 'serious_illness':
    case 'minor_illness':
      return ['external', 'internal'];
    case 'tired':
    case 'no_mood':
    case 'fear':
    case 'perfectionism':
      return ['internal', 'resistance'];
    case 'task_too_big':
      return ['volume'];
    case 'bad_planning':
    case 'forgot':
      return ['time'];
    case 'lazy':
    case 'learning_instead_action':
      return ['resistance'];
    case 'false_rest':
      return ['distractions', 'resistance'];
    default:
      return [];
  }
}

function focusDistractionsToKeys(tags: string[]): VerdictInfluenceKey[] {
  const keys = new Set<VerdictInfluenceKey>();
  for (const t of tags) {
    if (t === 'social' || t === 'phone') keys.add('distractions');
    if (t === 'thoughts') keys.add('internal');
    if (t === 'people') keys.add('external');
    if (t === 'other') keys.add('other');
  }
  return [...keys];
}

function dedupeKeys(keys: VerdictInfluenceKey[]): VerdictInfluenceKey[] {
  const order: VerdictInfluenceKey[] = [
    'distractions',
    'external',
    'internal',
    'time',
    'volume',
    'resistance',
    'other',
  ];
  const set = new Set(keys);
  return order.filter((k) => set.has(k));
}

function latestCompletedFocusForTask(taskId: string, blocks: FocusBlock[]): FocusBlock | undefined {
  const list = blocks.filter((b) => b.taskId === taskId && b.status === 'completed');
  return list.length ? list[list.length - 1] : undefined;
}

function deriveResolution(
  outcome: 'completed' | 'partial' | 'failed',
  failure: FailureInput | undefined,
  respectfulNoMinimum: boolean
): VerdictResolutionKey {
  if (outcome === 'completed') return 'count_full';
  if (outcome === 'partial') return 'count_partial';
  if (!failure) return 'count_none';
  if (respectfulNoMinimum) return 'defer';
  if (failure.couldDoMinimum) return 'assign_accountability';
  if (failure.reasonType === 'task_too_big' || failure.reasonType === 'bad_planning') return 'rebuild';
  return 'count_none';
}

function deriveNextStepForTask(
  outcome: 'completed' | 'partial' | 'failed',
  failure: FailureInput | undefined,
  respectfulNoMinimum: boolean
): VerdictNextStepKey {
  if (outcome === 'completed') return 'continue';
  if (outcome === 'partial') return 'split';
  if (!failure) return 'recovery';
  if (respectfulNoMinimum) return 'tomorrow';
  if (failure.couldDoMinimum) return 'capture_reason';
  return 'recovery';
}

function deriveSessionNextStep(verdict: Verdict): VerdictNextStepKey {
  if (verdict === 'respectful_transfer') return 'tomorrow';
  if (verdict === 'self_victory' || verdict === 'recovered_victory') return 'continue';
  if (verdict === 'partial_victory') return 'split';
  if (verdict === 'self_deception') return 'capture_reason';
  return 'recovery';
}

export function pickFocusRecap(
  dayPlan: DayPlan,
  tasks: Task[],
  taskStatuses: Record<string, Task['status']>,
  blocks: FocusBlock[]
): VerdictFocusRecap | null {
  const completedIds = tasks.filter((t) => taskStatuses[t.id] === 'completed').map((t) => t.id);
  if (completedIds.length === 0) return null;

  const candidate =
    dayPlan.bossTaskId && completedIds.includes(dayPlan.bossTaskId)
      ? dayPlan.bossTaskId
      : completedIds[0];

  const block = latestCompletedFocusForTask(candidate, blocks);
  if (!block) return null;

  const n = block.distractions.length;
  const workedFullTime = !!block.fullDurationHonored;

  let suggestRecoveryMinutes: 5 | 10 | undefined;
  if (workedFullTime && n > 2) {
    suggestRecoveryMinutes = n > 4 ? 10 : 5;
  }

  return {
    taskId: candidate,
    fullDurationHonored: workedFullTime,
    distractionsCount: n,
    reflection: block.sessionReflection,
    sessionComment: block.sessionComment,
    suggestRecoveryMinutes,
  };
}

export function buildVerdictSessionSnapshot(params: {
  verdict: Verdict;
  dayPlan: DayPlan;
  tasks: Task[];
  taskStatuses: Record<string, Task['status']>;
  failures: FailureInput[];
  focusBlocks: FocusBlock[];
}): VerdictSessionSnapshot {
  const { verdict, dayPlan, tasks, taskStatuses, failures, focusBlocks } = params;

  const failureByTask = new Map(failures.map((f) => [f.taskId, f]));

  const taskSummaries: VerdictTaskSummary[] = tasks.map((task) => {
    let st = taskStatuses[task.id] ?? task.status;
    if (st === 'planned' || st === 'in_progress') st = 'failed';

    const outcome: VerdictTaskSummary['outcome'] =
      st === 'completed' ? 'completed' : st === 'partial' ? 'partial' : 'failed';

    const failure = failureByTask.get(task.id);
    const base = failure ? getBaseLevel(failure.reasonType) : 3;
    const respectfulNoMinimum = !!failure && base === 0 && !failure.couldDoMinimum;

    let influenceKeys: VerdictInfluenceKey[] = [];
    if (failure && outcome === 'failed') {
      influenceKeys = dedupeKeys(reasonToInfluenceKeys(failure.reasonType));
      if (failure.comment?.trim()) {
        influenceKeys = dedupeKeys([...influenceKeys, 'other']);
      }
    } else if (outcome === 'partial' && failure) {
      influenceKeys = dedupeKeys(reasonToInfluenceKeys(failure.reasonType));
      if (failure.comment?.trim()) {
        influenceKeys = dedupeKeys([...influenceKeys, 'other']);
      }
    } else if (outcome === 'completed') {
      const fb = latestCompletedFocusForTask(task.id, focusBlocks);
      if (fb) {
        influenceKeys = dedupeKeys(focusDistractionsToKeys(fb.distractions));
      }
    }

    const unspecifiedInfluence = influenceKeys.length === 0;

    return {
      taskId: task.id,
      title: task.title,
      plannedIntent: plannedDayIntent(task),
      outcome,
      influenceKeys,
      influenceOtherNote: failure?.comment?.trim() || undefined,
      resolutionKey: deriveResolution(outcome, failure, respectfulNoMinimum),
      nextStepKey: deriveNextStepForTask(outcome, failure, respectfulNoMinimum),
      unspecifiedInfluence,
    };
  });

  const dayInfluenceKeys = dedupeKeys(
    taskSummaries.flatMap((s) => s.influenceKeys)
  );

  const focusRecap = pickFocusRecap(dayPlan, tasks, taskStatuses, focusBlocks);

  return {
    mainCategory: verdictToMainCategory(verdict),
    taskSummaries,
    dayInfluenceKeys,
    focusRecap,
    nextStepKey: deriveSessionNextStep(verdict),
  };
}
