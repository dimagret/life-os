interface MetricCardProps {
  label: string;
  value: string | number;
  suffix?: string;
  variant?: 'default' | 'accent' | 'warning' | 'danger' | 'riskScale';
  /** Spoken unit ("процентов", "очков") for screen readers, since `suffix` may be a glyph. */
  unitLabel?: string;
}

function clampPercentage(value: string | number): number {
  const numeric = typeof value === 'number' ? value : Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(100, Math.max(0, numeric));
}

function getRiskScaleStyle(value: string | number): { color: string } {
  const percentage = clampPercentage(value);
  const hue = 145 - percentage * 1.45;
  const lightness = 34 + Math.min(percentage, 55) * 0.08;
  return { color: `color-mix(in srgb, hsl(${hue} 68% ${lightness}%) 72%, var(--text-primary))` };
}

export function MetricCard({ label, value, suffix, variant = 'default', unitLabel }: MetricCardProps) {
  const variantStyles = {
    default: 'text-[var(--text-primary)]',
    accent: 'state-text',
    warning: 'text-[var(--state-risk-strong)]',
    danger: 'text-[var(--state-deception-strong)]',
    riskScale: '',
  };

  const spokenUnit = unitLabel ?? (suffix === '%' ? 'процентов' : '');
  const ariaLabel = spokenUnit ? `${label}: ${value} ${spokenUnit}` : `${label}: ${value}`;
  const valueStyle = variant === 'riskScale' ? getRiskScaleStyle(value) : undefined;

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="tactile-card p-3 text-center"
    >
      <div className={`text-2xl font-bold tabular-nums leading-none ${variantStyles[variant]}`} style={valueStyle} aria-hidden="true">
        {value}
        {suffix && <span className="text-sm ml-1">{suffix}</span>}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)]" aria-hidden="true">
        {label}
      </div>
    </div>
  );
}

interface ProgressBarProps {
  label: string;
  value: number;
  max?: number;
  variant?: 'default' | 'warning' | 'danger' | 'riskScale';
}

export function ProgressBar({ label, value, max = 100, variant = 'default' }: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  const barColors = {
    default: '',
    warning: 'bg-[var(--state-risk)]',
    danger: 'bg-[var(--state-stabilization)]',
    riskScale: '',
  };
  const riskScaleStyle =
    variant === 'riskScale' ? { width: `${percentage}%`, backgroundColor: getRiskScaleStyle(value).color } : undefined;

  return (
    <div className="tactile-card p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
        <span className="text-sm font-bold tabular-nums text-[var(--text-primary)]">
          {value}
          <span className="text-[var(--text-muted)]">/{max}</span>
        </span>
      </div>
      <div className="progress-track h-2.5 w-full">
        <div
          className={`progress-fill h-full transition-all ${barColors[variant]}`}
          style={riskScaleStyle ?? { width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
