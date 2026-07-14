import type { FailureReason, VerdictNextStepKey, VerdictSessionSnapshot } from '@/types';

export interface TomorrowAdjustmentFailure {
  taskId: string;
  reasonType: FailureReason['type'];
  repairAction?: string;
}

export type TomorrowAdjustmentMessages = Partial<Record<VerdictNextStepKey, string>>;

export interface TomorrowAdjustmentSource {
  date: string;
  tomorrowAdjustment?: string;
}

export function buildTomorrowAdjustment({
  failures,
  sessionSnapshot,
  messages = {},
}: {
  failures: TomorrowAdjustmentFailure[];
  sessionSnapshot?: VerdictSessionSnapshot;
  messages?: TomorrowAdjustmentMessages;
}): string | undefined {
  const explicitRepair = failures
    .map((failure) => failure.repairAction?.trim())
    .find((repair): repair is string => Boolean(repair));

  if (explicitRepair) return explicitRepair;

  const nextStepKey = sessionSnapshot?.nextStepKey;
  if (!nextStepKey || nextStepKey === 'continue') return undefined;

  const fallback = messages[nextStepKey]?.trim();
  return fallback || undefined;
}
export function pickLatestTomorrowAdjustmentBefore(
  plans: TomorrowAdjustmentSource[],
  date: string
): string | undefined {
  return [...plans]
    .filter((plan) => plan.date < date && plan.tomorrowAdjustment?.trim())
    .sort((a, b) => b.date.localeCompare(a.date))[0]
    ?.tomorrowAdjustment?.trim();
}
