import { useState } from 'react';
import {
  Task,
  FocusBlock as FocusBlockRecord,
  FocusAccountabilityAnswers,
  FocusSessionReflection,
} from '@/types';
import {
  clearActiveFocusSession,
  createFocusBlock,
  loadActiveFocusSession,
  loadFocusBlocks,
  loadTasks,
  saveActiveFocusSession,
  updateFocusBlock,
} from '@/lib/storage';
import { inferFocusOutcome } from '@/lib/focusOutcome';

export type PostFocusFlow =
  | null
  | { phase: 'accountabilityDeep'; blockId: string }
  | { phase: 'reflect'; blockId: string }
  | { phase: 'optionalComment'; blockId: string }
  | {
      phase: 'rest';
      blockId: string;
      lostFocusHeavy: boolean;
      afterRest: 'optionalComment';
      showRecoveryHint: boolean;
    };

export function useTodaySession() {
  const [activeFocusTask, setActiveFocusTask] = useState<Task | null>(() => {
    if (typeof window === 'undefined') return null;
    const session = loadActiveFocusSession();
    if (!session?.taskId) return null;
    const task = loadTasks().find((item) => item.id === session.taskId);
    if (!task || task.status === 'completed' || task.status === 'partial' || task.status === 'failed') {
      clearActiveFocusSession();
      return null;
    }
    return task;
  });
  const [postFocus, setPostFocus] = useState<PostFocusFlow>(null);

  const handleStartFocus = (task: Task) => {
    const plannedMinutes = task.plannedMinutes ?? 25;
    saveActiveFocusSession({
      taskId: task.id,
      phase: 'idle',
      selectedDuration: plannedMinutes,
      customMinutes: '',
      customOpen: false,
      timeLeft: 0,
      segmentTotalSeconds: plannedMinutes * 60,
      sessionTargetMinutes: plannedMinutes,
      fullDurationHonored: false,
      distractions: [],
      result: '',
      updatedAt: new Date().toISOString(),
    });
    setActiveFocusTask(task);
  };

  const handleFocusComplete = (block: FocusBlockRecord) => {
    clearActiveFocusSession();
    setActiveFocusTask(null);
    const { id: _omitId, ...payload } = block;
    const saved = createFocusBlock(payload);

    const outcome = inferFocusOutcome(block.result ?? '');
    updateFocusBlock(saved.id, { resultOutcome: outcome });

    if (outcome === 'negative') {
      setPostFocus({ phase: 'accountabilityDeep', blockId: saved.id });
      return;
    }

    if (block.distractions.length > 2) {
      setPostFocus({ phase: 'reflect', blockId: saved.id });
      return;
    }

    setPostFocus({
      phase: 'rest',
      blockId: saved.id,
      lostFocusHeavy: false,
      afterRest: 'optionalComment',
      showRecoveryHint: false,
    });
  };

  const handleFocusFail = (block: FocusBlockRecord) => {
    clearActiveFocusSession();
    setActiveFocusTask(null);
    const { id: _omitId, ...payload } = block;
    const saved = createFocusBlock(payload);
    updateFocusBlock(saved.id, { resultOutcome: 'negative' });
    setPostFocus({ phase: 'accountabilityDeep', blockId: saved.id });
  };

  const advanceRestToOptionalComment = () => {
    setPostFocus((prev) =>
      prev?.phase === 'rest' && prev.afterRest === 'optionalComment'
        ? { phase: 'optionalComment', blockId: prev.blockId }
        : null
    );
  };

  const handleAccountabilitySubmit = (blockId: string, answers: FocusAccountabilityAnswers) => {
    updateFocusBlock(blockId, { accountabilityAnswers: answers });
    setPostFocus(null);
  };

  const handleReflectionSubmit = (blockId: string, reflection: FocusSessionReflection) => {
    updateFocusBlock(blockId, { sessionReflection: reflection });
    const b = loadFocusBlocks().find((x) => x.id === blockId);
    const lostFocusHeavy = (b?.distractions.length ?? 0) > 4;
    setPostFocus({
      phase: 'rest',
      blockId,
      lostFocusHeavy,
      afterRest: 'optionalComment',
      showRecoveryHint: true,
    });
  };

  const handleOptionalCommentSubmit = (blockId: string, text: string) => {
    if (text.trim()) {
      updateFocusBlock(blockId, { sessionComment: text.trim() });
    }
    setPostFocus(null);
  };

  const resetSession = () => {
    clearActiveFocusSession();
    setActiveFocusTask(null);
    setPostFocus(null);
  };

  return {
    activeFocusTask,
    postFocus,
    resetSession,
    handleStartFocus,
    handleFocusComplete,
    handleFocusFail,
    advanceRestToOptionalComment,
    handleAccountabilitySubmit,
    handleReflectionSubmit,
    handleOptionalCommentSubmit,
  };
}
