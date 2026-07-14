'use client';

import type { CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { UserProfile } from '@/types';

interface TodayMetricsProps {
  profile: UserProfile | null;
  debtsCount: number;
}

export function TodayMetrics({ profile, debtsCount }: TodayMetricsProps) {
  const t = useTranslations('today');
  const core = clampPercentage(profile?.innerCore ?? 0);
  const abyss = clampPercentage(profile?.abyssIndex ?? 0);
  const xp = profile?.totalXp ?? 0;
  const streak = profile?.currentStreak ?? 0;
  const meterState = getMeterState(core, abyss, debtsCount);
  const ariaLabel = [
    `${t('metrics.core')}: ${core}%`,
    `${t('metrics.abyss')}: ${abyss}%`,
    `${t('metrics.streak')}: ${streak}`,
    `${t('metrics.xp')}: ${xp}`,
    `${t('metrics.debts')}: ${debtsCount}`,
  ].join('. ');

  return (
    <Card className="status-orbit-card mb-5" aria-label={ariaLabel}>
      <CardHeader className="flex-row items-start justify-between gap-3 pb-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Life OS
          </p>
          <CardTitle className="mt-1 leading-snug">
            {t('metrics.core')} / {t('metrics.abyss')}
          </CardTitle>
        </div>
        <span className="tactile-chip shrink-0 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider">
          {profile ? `LVL ${profile.level}` : 'LVL 0'}
        </span>
      </CardHeader>

      <CardContent>
        <div className="status-meter-summary" data-state={meterState}>
          <div className="min-w-0">
            <span className="status-meter-kicker">{t('metrics.stateLabel')}</span>
            <strong className="status-meter-state">{t(`metrics.states.${meterState}`)}</strong>
          </div>
          <span className="status-meter-signal" aria-hidden="true" />
        </div>

        <div className="status-meter-stack">
          <MetricBar
            label={t('metrics.core')}
            value={core}
            helper={t('metrics.coreHint')}
            tone="core"
          />
          <MetricBar
            label={t('metrics.abyss')}
            value={abyss}
            helper={t('metrics.abyssHint')}
            tone="abyss"
          />
        </div>

        <p className="status-meter-note">
          {t('metrics.feedbackNote')}
        </p>

        <div className="status-metric-strip mt-4 grid grid-cols-3 gap-2">
          <StatusCapsule label={t('metrics.streak')} value={streak} />
          <StatusCapsule label={t('metrics.xp')} value={xp} />
          <StatusCapsule
            label={t('metrics.debts')}
            value={debtsCount}
            tone={debtsCount > 0 ? 'deception' : 'victory'}
          />
        </div>
      </CardContent>
    </Card>
  );
}

type MeterState = 'neutral' | 'stable' | 'risk' | 'debt';

function getMeterState(core: number, abyss: number, debtsCount: number): MeterState {
  if (debtsCount > 0 && abyss >= 21) return 'debt';
  if (abyss >= 41 || abyss > core + 20) return 'risk';
  if (core >= 30 && core >= abyss + 15) return 'stable';
  return 'neutral';
}

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function MetricBar({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: number;
  helper: string;
  tone: 'core' | 'abyss';
}) {
  return (
    <div
      className="status-meter-row"
      data-tone={tone}
      style={{ '--meter-scale': value / 100 } as CSSProperties}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="status-meter-label">{label}</span>
          <p className="status-meter-helper">{helper}</p>
        </div>
        <strong className="status-meter-value">
          {value}
          <span>%</span>
        </strong>
      </div>
      <div className="status-meter-track" aria-hidden="true">
        <span className="status-meter-fill" />
      </div>
    </div>
  );
}

function StatusCapsule({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'victory' | 'deception';
}) {
  return (
    <div
      data-state={tone}
      className="status-capsule flex min-w-0 flex-col justify-center px-3 py-2 text-center"
    >
      <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </span>
      <span className={`mt-1 text-base font-bold leading-none tabular-nums ${tone ? 'state-text' : 'text-[var(--text-primary)]'}`}>
        {value}
      </span>
    </div>
  );
}