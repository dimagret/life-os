import { UiState } from '@/types';

export const statePriority: UiState[] = [
  'deception',
  'stabilization',
  'hold',
  'risk',
  'recovery',
  'victory',
  'control',
];

export function getStateFromMetrics(abyssIndex: number, debts: number): UiState {
  if (abyssIndex >= 61) return 'stabilization';
  if (debts >= 3) return 'deception';
  if (abyssIndex >= 41) return 'risk';
  if (abyssIndex >= 21) return 'hold';
  return 'control';
}

export const stateColors: Record<UiState, { color: string; soft: string; border: string; glow: string }> = {
  control: {
    color: 'var(--state-control)',
    soft: 'var(--state-control-soft)',
    border: 'var(--state-control-border)',
    glow: 'var(--shadow-glow)',
  },
  hold: {
    color: 'var(--state-hold)',
    soft: 'var(--state-hold-soft)',
    border: 'var(--state-hold-border)',
    glow: '0 0 24px rgba(142, 162, 255, 0.16)',
  },
  risk: {
    color: 'var(--state-risk)',
    soft: 'var(--state-risk-soft)',
    border: 'var(--state-risk-border)',
    glow: '0 0 24px rgba(255, 211, 122, 0.16)',
  },
  stabilization: {
    color: 'var(--state-stabilization)',
    soft: 'var(--state-stabilization-soft)',
    border: 'var(--state-stabilization-border)',
    glow: '0 0 24px rgba(255, 155, 130, 0.16)',
  },
  recovery: {
    color: 'var(--state-recovery)',
    soft: 'var(--state-recovery-soft)',
    border: 'var(--state-recovery-border)',
    glow: '0 0 24px rgba(125, 226, 200, 0.16)',
  },
  victory: {
    color: 'var(--state-victory)',
    soft: 'var(--state-victory-soft)',
    border: 'var(--state-victory-border)',
    glow: '0 0 24px rgba(146, 230, 167, 0.16)',
  },
  deception: {
    color: 'var(--state-deception)',
    soft: 'var(--state-deception-soft)',
    border: 'var(--state-deception-border)',
    glow: '0 0 24px rgba(255, 126, 152, 0.16)',
  },
};
