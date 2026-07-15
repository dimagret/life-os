'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { ActiveFocusPhase, FocusBlock as FocusBlockType, FocusEarlyExitReason, TaskType, UserProfile } from '@/types';
import { stripLegacyTodayFromTaskTitle } from '@/lib/utils';
import { playTimerEndChime } from '@/lib/sound';
import { hapticsImpactLight } from '@/lib/capacitor/native';
import { loadActiveFocusSession, loadUserProfile, saveActiveFocusSession } from '@/lib/storage';
import {
  DEFAULT_YANDEX_MUSIC_EMBED_URL,
  fadeOutFocusMusic,
  openYandexMusicPage,
  pauseFocusMusic,
  playFocusMusic,
  stopFocusMusic,
} from '@/lib/focusMusic';
import { YandexMusicPlayer } from '@/components/music/YandexMusicPlayer';
import {
  ArrowLeft,
  CheckCircle2,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  XCircle,
} from 'lucide-react';

const PRESETS = [15, 25, 45] as const;
const WAVE_BAR_SCALE = [0.32, 0.48, 0.74, 0.58, 0.92, 0.68, 0.42, 0.84, 0.54, 0.36] as const;

interface FocusBlockProps {
  taskTitle: string;
  /** Микроцель для отображения: обычно task.microGoal || dayPlan.mainResult */
  dayMicroGoal?: string;
  /** Откуда взята строка выше — подпись «этап» vs «день». */
  microGoalScope?: 'day' | 'stage';
  /** Длинное описание задачи (контекст трека) — только в раскрытии. */
  taskDetail?: string;
  taskType?: TaskType;
  taskId?: string;
  onComplete: (block: FocusBlockType) => void;
  onFail: (block: FocusBlockType) => void;
  onCancel: () => void;
}

type Phase = ActiveFocusPhase;

const DISTRACTION_KEYS = ['social', 'phone', 'thoughts', 'people', 'other'] as const;
const EARLY_EXIT_REASON_KEYS: FocusEarlyExitReason[] = [
  'bad_estimate',
  'external',
  'low_energy',
  'avoidance',
  'distraction',
];

type InitialFocusState = {
  phase: Phase;
  selectedDuration: number;
  customMinutes: string;
  customOpen: boolean;
  timeLeft: number;
  segmentTotalSeconds: number;
  segmentEndsAtMs: number | null;
  startedAtIso?: string;
  sessionTargetMinutes: number;
  fullDurationHonored: boolean;
  distractions: string[];
  result: string;
  earlyExitReason?: FocusEarlyExitReason;
  salvageAction: string;
  skipCompletionSignal: boolean;
};

function buildInitialFocusState(taskId: string | undefined): InitialFocusState {
  const defaults: InitialFocusState = {
    phase: 'idle',
    selectedDuration: 25,
    customMinutes: '',
    customOpen: false,
    timeLeft: 0,
    segmentTotalSeconds: 25 * 60,
    segmentEndsAtMs: null,
    startedAtIso: undefined,
    sessionTargetMinutes: 25,
    fullDurationHonored: false,
    distractions: [],
    result: '',
    earlyExitReason: undefined,
    salvageAction: '',
    skipCompletionSignal: false,
  };

  if (typeof window === 'undefined' || !taskId) return defaults;
  const saved = loadActiveFocusSession();
  if (!saved || saved.taskId !== taskId) return defaults;

  const savedEndAtMs = isoToMs(saved.segmentEndsAt);
  const restoredTimeLeft =
    saved.phase === 'running'
      ? remainingSecondsUntil(savedEndAtMs)
      : Math.max(0, saved.timeLeft);
  const completedWhileAway = saved.phase === 'running' && restoredTimeLeft === 0;

  return {
    phase: saved.phase,
    selectedDuration: saved.selectedDuration || defaults.selectedDuration,
    customMinutes: saved.customMinutes || '',
    customOpen: saved.customOpen || false,
    timeLeft: restoredTimeLeft,
    segmentTotalSeconds: saved.segmentTotalSeconds || (saved.selectedDuration || 25) * 60,
    segmentEndsAtMs: saved.phase === 'running' ? savedEndAtMs : null,
    startedAtIso: saved.startedAt,
    sessionTargetMinutes: saved.sessionTargetMinutes || saved.selectedDuration || 25,
    fullDurationHonored: saved.fullDurationHonored || completedWhileAway,
    distractions: Array.isArray(saved.distractions) ? saved.distractions : [],
    result: saved.result || '',
    earlyExitReason: saved.earlyExitReason,
    salvageAction: saved.salvageAction || '',
    skipCompletionSignal: completedWhileAway,
  };
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function isoToMs(value: string | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function remainingSecondsUntil(endAtMs: number | null): number {
  if (!endAtMs) return 0;
  return Math.max(0, Math.ceil((endAtMs - Date.now()) / 1000));
}

function TimerRing({
  progress,
  paused,
}: {
  progress: number;
  paused: boolean;
}) {
  const size = 240;
  const center = size / 2;
  const innerR = 82;
  const orbitR = 97;
  const normalizedProgress = clamp01(progress);
  const orbitC = 2 * Math.PI * orbitR;
  const orbitOffset = orbitC * (1 - normalizedProgress);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="focus-orbit-ring" aria-hidden="true">
      <circle
        cx={center}
        cy={center}
        r={orbitR}
        fill="none"
        stroke="var(--focus-timer-orbit-track)"
        strokeWidth="5"
      />
      <circle
        cx={center}
        cy={center}
        r={orbitR}
        fill="none"
        stroke="url(#focusTimerGradient)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={orbitC}
        strokeDashoffset={orbitOffset}
        transform={`rotate(-90 ${center} ${center})`}
        filter="url(#focusOrbitArcGlow)"
        className={`transition-[stroke-dashoffset,opacity] duration-300 ease-out ${
          paused ? 'opacity-0' : 'opacity-55'
        }`}
      />
      <circle
        cx={center}
        cy={center}
        r={orbitR}
        fill="none"
        stroke="url(#focusTimerGradient)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={orbitC}
        strokeDashoffset={orbitOffset}
        transform={`rotate(-90 ${center} ${center})`}
        className={`transition-[stroke-dashoffset] duration-300 ease-out ${
          paused ? 'opacity-55' : 'opacity-100'
        }`}
      />
      <circle
        cx={center}
        cy={center}
        r={innerR}
        fill="none"
        stroke="var(--focus-timer-inner-outline)"
        strokeWidth="1"
      />
      <g
        className={`focus-orbit-marker ${paused ? 'opacity-65' : ''}`}
        style={{
          transform: `rotate(${normalizedProgress * 360}deg)`,
          transformOrigin: `${center}px ${center}px`,
        }}
      >
        <circle
          cx={center}
          cy={center - orbitR}
          r="5"
          fill="var(--signal-cyan)"
          stroke="var(--surface-card)"
          strokeWidth="2"
        />
      </g>
      <defs>
        <filter id="focusOrbitArcGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
        <linearGradient id="focusTimerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--signal-cyan)" />
          <stop offset="52%" stopColor="var(--signal-blue)" />
          <stop offset="100%" stopColor="var(--accent-brand)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function FocusWaveform({ active }: { active: boolean }) {
  return (
    <div className="focus-waveform" data-active={active ? 'true' : undefined} aria-hidden="true">
      {WAVE_BAR_SCALE.map((scale, index) => (
        <span
          key={`${scale}-${index}`}
          style={{
            height: `${Math.round(26 + scale * 58)}px`,
            animationDelay: `${index * 90}ms`,
          }}
        />
      ))}
    </div>
  );
}

export function FocusBlock({
  taskTitle,
  dayMicroGoal,
  microGoalScope = 'day',
  taskDetail,
  taskType,
  taskId,
  onComplete,
  onFail,
  onCancel,
}: FocusBlockProps) {
  const [initialFocusState] = useState<InitialFocusState>(() => buildInitialFocusState(taskId));

  const [phase, setPhase] = useState<Phase>(initialFocusState.phase);
  const [selectedDuration, setSelectedDuration] = useState(initialFocusState.selectedDuration);
  const [customMinutes, setCustomMinutes] = useState(initialFocusState.customMinutes);
  const [customOpen, setCustomOpen] = useState(initialFocusState.customOpen);
  const [timeLeft, setTimeLeft] = useState(initialFocusState.timeLeft);
  /** Длина текущего отрезка отсчёта (сек), для кольца и расчёта прогресса. */
  const [segmentTotalSeconds, setSegmentTotalSeconds] = useState(initialFocusState.segmentTotalSeconds);
  const [segmentEndsAtMs, setSegmentEndsAtMs] = useState<number | null>(initialFocusState.segmentEndsAtMs);
  const [startedAtIso, setStartedAtIso] = useState<string | undefined>(initialFocusState.startedAtIso);
  /** Итоговая длительность блока в минутах (пресет + принятые +5 мин). */
  const [sessionTargetMinutes, setSessionTargetMinutes] = useState(initialFocusState.sessionTargetMinutes);

  const [fullDurationHonored, setFullDurationHonored] = useState(initialFocusState.fullDurationHonored);
  const [distractions, setDistractions] = useState<string[]>(initialFocusState.distractions);
  const [showDistractionInput, setShowDistractionInput] = useState(false);
  const [result, setResult] = useState(initialFocusState.result);
  const [earlyExitReason, setEarlyExitReason] = useState<FocusEarlyExitReason | undefined>(initialFocusState.earlyExitReason);
  const [salvageAction, setSalvageAction] = useState(initialFocusState.salvageAction);
  const [focusMusicProfile, setFocusMusicProfile] = useState<UserProfile | null>(() =>
    typeof window !== 'undefined' ? loadUserProfile() : null
  );
  const skipCompletionSignalRef = useRef(initialFocusState.skipCompletionSignal);

  const t = useTranslations('focus');
  const tt = useTranslations('task.types');
  const tTask = useTranslations('task');
  const tc = useTranslations('common');

  const typeLabel = taskType ? tt(taskType) : tt('practice');

  const taskTitleDisplay = useMemo(
    () => stripLegacyTodayFromTaskTitle(taskTitle),
    [taskTitle]
  );

  const recordedGoal = useMemo(() => {
    const d = dayMicroGoal?.trim();
    const title = stripLegacyTodayFromTaskTitle(taskTitle).trim();
    if (d && title) return `${d} · ${title}`;
    return d || title;
  }, [dayMicroGoal, taskTitle]);

  const showDetail =
    Boolean(taskDetail?.trim()) &&
    taskDetail!.trim() !== taskTitle.trim() &&
    taskDetail!.trim() !== taskTitleDisplay;
  const yandexEmbedUrl = focusMusicProfile?.focusYandexEmbedUrl ?? DEFAULT_YANDEX_MUSIC_EMBED_URL;
  const showYandexPlayerPanel =
    Boolean(focusMusicProfile?.focusMusicEnabled) &&
    focusMusicProfile?.focusMusicSource === 'yandex' &&
    (phase === 'running' ||
      phase === 'paused' ||
      (phase === 'completed' && focusMusicProfile.focusMusicEndBehavior === 'continue'));

  const idleDisplaySeconds = selectedDuration * 60;

  const ringProgress = useMemo(() => {
    if (phase === 'idle') return 0;
    if (segmentTotalSeconds <= 0) return 0;
    return 1 - timeLeft / segmentTotalSeconds;
  }, [phase, timeLeft, segmentTotalSeconds]);

  useEffect(() => {
    if (!taskId) return;

    saveActiveFocusSession({
      taskId,
      phase,
      selectedDuration,
      customMinutes,
      customOpen,
      timeLeft,
      segmentTotalSeconds,
      sessionTargetMinutes,
      fullDurationHonored,
      distractions,
      result,
      earlyExitReason,
      salvageAction,
      startedAt: startedAtIso,
      segmentEndsAt: segmentEndsAtMs ? new Date(segmentEndsAtMs).toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    });
  }, [
    taskId,
    phase,
    selectedDuration,
    customMinutes,
    customOpen,
    timeLeft,
    segmentTotalSeconds,
    sessionTargetMinutes,
    fullDurationHonored,
    distractions,
    result,
    earlyExitReason,
    salvageAction,
    startedAtIso,
    segmentEndsAtMs,
  ]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getCurrentTimeLeft = useCallback(() => {
    return phase === 'running' ? remainingSecondsUntil(segmentEndsAtMs) : timeLeft;
  }, [phase, segmentEndsAtMs, timeLeft]);

  /** Для сохранения блока: полная сессия или фактически отработанные минуты текущего отрезка. */
  const getRecordedDurationMinutes = (): number => {
    if (fullDurationHonored) return sessionTargetMinutes;
    const elapsedSec = Math.max(0, segmentTotalSeconds - getCurrentTimeLeft());
    return Math.max(1, Math.round(elapsedSec / 60));
  };

  const applyPreset = (mins: number) => {
    setSelectedDuration(mins);
    setCustomOpen(false);
    setCustomMinutes('');
  };

  const applyCustomMinutes = () => {
    const n = parseInt(customMinutes, 10);
    if (!Number.isFinite(n) || n < 1 || n > 180) return;
    setSelectedDuration(n);
    setCustomOpen(false);
  };

  const startFocus = () => {
    const secs = selectedDuration * 60;
    const now = new Date();
    setFocusMusicProfile(loadUserProfile());
    setSessionTargetMinutes(selectedDuration);
    setSegmentTotalSeconds(secs);
    setTimeLeft(secs);
    setSegmentEndsAtMs(now.getTime() + secs * 1000);
    setStartedAtIso(now.toISOString());
    setFullDurationHonored(false);
    setEarlyExitReason(undefined);
    setSalvageAction('');
    setPhase('running');
    setShowDistractionInput(false);
  };

  const pauseTimer = () => {
    setTimeLeft(getCurrentTimeLeft());
    setSegmentEndsAtMs(null);
    setPhase('paused');
  };

  const resumeTimer = () => {
    const secs = Math.max(0, timeLeft);
    setFocusMusicProfile(loadUserProfile());
    setSegmentEndsAtMs(Date.now() + secs * 1000);
    setPhase('running');
  };

  const resetTimer = () => {
    setPhase('idle');
    setTimeLeft(0);
    setSegmentEndsAtMs(null);
    setSegmentTotalSeconds(selectedDuration * 60);
    setSessionTargetMinutes(selectedDuration);
    setStartedAtIso(undefined);
    setFullDurationHonored(false);
    setDistractions([]);
    setEarlyExitReason(undefined);
    setSalvageAction('');
    setShowDistractionInput(false);
  };

  useEffect(() => {
    const profile = loadUserProfile();
    if (!profile.focusMusicEnabled) {
      stopFocusMusic();
      return;
    }

    if (profile.focusMusicSource === 'yandex') {
      stopFocusMusic();
      return;
    }

    if (phase === 'running') {
      void playFocusMusic(profile);
      return;
    }

    if (phase === 'completed') {
      if (profile.focusMusicEndBehavior === 'continue') {
        void playFocusMusic(profile);
      } else {
        fadeOutFocusMusic();
      }
      return;
    }

    if (phase === 'paused' || phase === 'idle' || phase === 'result') {
      pauseFocusMusic();
    }
  }, [phase]);

  useEffect(() => {
    return () => {
      stopFocusMusic();
    };
  }, []);

  useEffect(() => {
    if (phase !== 'running' || !segmentEndsAtMs) return;
    const id = window.setInterval(() => {
      setTimeLeft(remainingSecondsUntil(segmentEndsAtMs));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, segmentEndsAtMs]);

  useEffect(() => {
    if (phase !== 'running' || timeLeft > 0) return;
    let isActive = true;
    function complete() {
      if (!isActive) return;
      setFullDurationHonored(true);
      setSegmentEndsAtMs(null);
      setPhase('completed');
      const soundEnabled = loadUserProfile().soundEnabled ?? true;
      if (soundEnabled && !skipCompletionSignalRef.current) {
        void playTimerEndChime();
        void hapticsImpactLight();
      }
      skipCompletionSignalRef.current = false;
    }
    complete();
    return () => { isActive = false; };
  }, [phase, timeLeft]);

  const openResultPhase = () => {
    const remaining = getCurrentTimeLeft();
    setTimeLeft(remaining);
    setSegmentEndsAtMs(null);
    setFullDurationHonored(remaining === 0);
    if (remaining === 0) {
      setEarlyExitReason(undefined);
      setSalvageAction('');
    }
    setPhase('result');
  };

  const handleFiveMoreMinutes = () => {
    const secs = 5 * 60;
    setFocusMusicProfile(loadUserProfile());
    setSessionTargetMinutes((m) => m + 5);
    setSegmentTotalSeconds(secs);
    setTimeLeft(secs);
    setSegmentEndsAtMs(Date.now() + secs * 1000);
    setFullDurationHonored(false);
    setEarlyExitReason(undefined);
    setSalvageAction('');
    setPhase('running');
  };

  const handleComplete = () => {
    const earlyExitPatch = fullDurationHonored
      ? {}
      : {
          earlyExitReason,
          salvageAction: salvageAction.trim(),
        };
    const block: FocusBlockType = {
      id: 'focus_' + Date.now(),
      taskId,
      goal: recordedGoal,
      durationMinutes: getRecordedDurationMinutes(),
      startedAt: startedAtIso,
      endedAt: new Date().toISOString(),
      distractions,
      status: 'completed',
      result,
      fullDurationHonored,
      ...earlyExitPatch,
    };
    onComplete(block);
  };

  const handleFail = () => {
    const block: FocusBlockType = {
      id: 'focus_' + Date.now(),
      taskId,
      goal: recordedGoal,
      durationMinutes: getRecordedDurationMinutes(),
      startedAt: startedAtIso,
      endedAt: new Date().toISOString(),
      distractions,
      status: 'failed',
    };
    onFail(block);
  };

  const headerBlock = (
    <div className="focus-context-card mb-6 px-4 py-3 text-left">
      <div className="flex items-start gap-3">
        <span className="focus-icon-tile mt-0.5" aria-hidden="true">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold leading-snug text-[var(--text-primary)]">{taskTitleDisplay}</h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            <span className="text-[var(--text-secondary)]">{typeLabel}</span>
            <span className="mx-1.5 opacity-50">·</span>
            <span>{t('focusSession')}</span>
          </p>
        </div>
      </div>
    </div>
  );

  const centerVisual = (seconds: number, paused: boolean) => (
    <div className="focus-visual-stage mx-auto">
      <div className="focus-visual-glow" aria-hidden="true" />
      <FocusWaveform active={!paused && phase === 'running'} />
      <span className="focus-pill focus-visual-label">{paused ? t('paused') : t('focusSession')}</span>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <TimerRing progress={ringProgress} paused={paused} />
      </div>
      <div className="relative z-[1] flex items-center justify-center px-2">
        <span
          className={`focus-timer-value font-sans tabular-nums font-medium leading-none text-[var(--text-primary)] antialiased ${
            paused ? 'opacity-85' : ''
          }`}
        >
          {formatTime(seconds)}
        </span>
      </div>
      <span className={`focus-orbit-caption ${paused ? 'focus-orbit-caption-held' : ''}`}>
        {paused ? t('focusHeld') : `${selectedDuration} ${t('min')}`}
      </span>
    </div>
  );

  const yandexMusicBlock = showYandexPlayerPanel ? (
    <div className="focus-detail-card mt-6 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            {t('yandexMusicTitle')}
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-[var(--text-muted)]">
            {t('yandexMusicHint')}
          </p>
        </div>
      </div>
      {yandexEmbedUrl ? (
        <YandexMusicPlayer url={yandexEmbedUrl} title={t('yandexMusicTitle')} className="mt-3" />
      ) : (
        <p className="mt-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-3 text-xs text-[var(--text-muted)]">
          {t('yandexMusicEmpty')}
        </p>
      )}
      <p className="mt-3 text-[10px] leading-relaxed text-[var(--text-muted)]">
        {t('yandexMusicSlow')}
      </p>
      <button
        type="button"
        onClick={() => openYandexMusicPage(yandexEmbedUrl)}
        className="focus-secondary-button mt-3 inline-flex w-full items-center justify-center px-4 text-xs font-medium"
      >
        {t('yandexMusicOpenExternal')}
      </button>
      <p className="mt-2 text-[10px] leading-relaxed text-[var(--text-muted)]">
        {t('yandexMusicExternalMode')}
      </p>
    </div>
  ) : null;

  if (phase === 'idle') {
    return (
      <div className="focus-immersive-page flex flex-col">
        <div className="focus-shell mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-6">
          <button
            type="button"
            onClick={onCancel}
            className="focus-back-button mb-6 self-start"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {tc('back')}
          </button>

          {headerBlock}

          {centerVisual(idleDisplaySeconds, false)}

          <p className="mt-6 mb-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{t('presets')}</p>
          <div className="flex flex-wrap justify-center gap-2 mb-3">
            {PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => applyPreset(m)}
                className={`focus-preset-button ${
                  selectedDuration === m && !customOpen
                    ? 'focus-preset-button-active'
                    : ''
                }`}
              >
                {m} {t('min')}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setCustomOpen(true);
                setCustomMinutes(String(selectedDuration));
              }}
              className={`focus-preset-button ${
                customOpen
                  ? 'focus-preset-button-active'
                  : ''
              }`}
            >
              {t('custom')}
            </button>
          </div>

          {customOpen && (
            <div className="flex items-center justify-center gap-2 mb-6">
              <input
                type="number"
                min={1}
                max={180}
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                className="focus-input w-20 px-3 py-2 text-center text-sm tabular-nums"
              />
              <span className="text-sm text-[var(--text-muted)]">{t('min')}</span>
              <button
                type="button"
                onClick={applyCustomMinutes}
                className="focus-secondary-button min-h-11 px-3 text-sm font-medium"
              >
                {t('applyCustom')}
              </button>
            </div>
          )}

          <div className="focus-detail-card mb-8 p-4">
            <span className="text-xs uppercase tracking-wider text-[var(--text-muted)] block mb-2">
              {t('blockGoal')}
            </span>
            {dayMicroGoal?.trim() ? (
              <>
                <p className="text-[0.65rem] uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  {microGoalScope === 'stage' ? tTask('stageMicroLabel') : t('dayMicroLabel')}
                </p>
                <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                  {dayMicroGoal.trim()}
                </p>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-3">
                  {t('sessionOnTask', { task: taskTitleDisplay })}
                </p>
              </>
            ) : (
              <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                {t('sessionOnTask', { task: taskTitleDisplay })}
              </p>
            )}
            {showDetail && (
              <details className="mt-3 group">
                <summary className="text-xs text-[var(--text-muted)] cursor-pointer list-none flex items-center gap-1 [&::-webkit-details-marker]:hidden">
                  <span className="transition-transform group-open:rotate-90 opacity-60" aria-hidden>
                    ›
                  </span>
                  {t('fullTaskDetails')}
                </summary>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-2 pl-3 border-l border-[var(--border-subtle)] whitespace-pre-line">
                  {taskDetail!.trim()}
                </p>
              </details>
            )}
          </div>

          <button
            type="button"
            onClick={startFocus}
            className="focus-primary-button w-full text-sm"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            {t('start')}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'running' || phase === 'paused') {
    const paused = phase === 'paused';
    return (
      <div className="focus-immersive-page flex flex-col">
        <div className="focus-shell mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-4">
          {headerBlock}

          {centerVisual(timeLeft, paused)}

          {yandexMusicBlock}

          <div className="focus-control-panel mx-auto mt-10">
            {paused ? (
              <button
                type="button"
                onClick={resumeTimer}
                className="focus-primary-button w-full text-sm"
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                {t('resume')}
              </button>
            ) : (
              <button
                type="button"
                onClick={pauseTimer}
                className="focus-primary-button w-full text-sm"
              >
                <Pause className="h-4 w-4" aria-hidden="true" />
                {t('pause')}
              </button>
            )}

            <div className="focus-control-row">
              <button
                type="button"
                onClick={() => setShowDistractionInput((current) => !current)}
                className="focus-control-button focus-control-button-warning"
                aria-expanded={showDistractionInput}
              >
                {t('distracted')}
              </button>
              <button type="button" onClick={openResultPhase} className="focus-control-button">
                <Square className="h-3.5 w-3.5" aria-hidden="true" />
                {t('finish')}
              </button>
              <details className="focus-more-actions">
                <summary className="focus-control-button focus-control-more" aria-label={t('moreActions')}>
                  <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
                </summary>
                <div className="focus-more-menu">
                  <button type="button" onClick={resetTimer}>
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    {t('reset')}
                  </button>
                  <button type="button" onClick={handleFail} className="focus-more-menu-danger">
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                    {t('failBlock')}
                  </button>
                </div>
              </details>
            </div>

            {showDistractionInput && (
              <div className="focus-distraction-panel">
                <span className="text-xs text-[var(--text-muted)] block">{t('whatDistracted')}</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DISTRACTION_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setDistractions((prev) => [...prev, key]);
                        setShowDistractionInput(false);
                      }}
                      className="focus-mini-button"
                    >
                      {t(`distractions.${key}`)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {distractions.length > 0 && (
              <p className="mt-3 text-center text-xs text-[var(--text-muted)]">
                {t('distractionsCount', { count: distractions.length })}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'completed') {
    return (
      <div className="focus-immersive-page flex flex-col">
        <div className="focus-shell mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-6">
          {headerBlock}

          <div className="focus-detail-card mb-6 px-5 py-8 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-8 w-8 text-[var(--signal-cyan)]" aria-hidden="true" />
            <h2 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">{t('completedTitle')}</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {t('completedDuration', { minutes: sessionTargetMinutes })}
            </p>
          </div>

          {yandexMusicBlock}

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setPhase('result')}
              className="focus-primary-button w-full text-sm"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {t('markResult')}
            </button>
            <button
              type="button"
              onClick={handleFiveMoreMinutes}
              className="focus-secondary-button w-full text-sm"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              {t('fiveMore')}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            >
              {t('close')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const resultDurationMinutes = getRecordedDurationMinutes();
  const isEarlyExitResult = !fullDurationHonored;
  const canSaveResult =
    result.trim().length > 0 &&
    (!isEarlyExitResult || Boolean(earlyExitReason && salvageAction.trim().length > 0));

  return (
    <div className="focus-immersive-page flex flex-col">
      <div className="focus-shell mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-6">
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-[var(--text-primary)]">{t('resultTitle')}</h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">{taskTitleDisplay}</p>

        <div className="space-y-4 mb-6">
          <div className="focus-detail-card p-4">
            <div className="flex justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">{t('resultDuration')}</span>
              <span className="text-sm text-[var(--text-primary)] tabular-nums">
                {resultDurationMinutes} {t('min')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">{t('resultDistractions')}</span>
              <span className="text-sm text-[var(--text-primary)]">{distractions.length}</span>
            </div>
          </div>
        </div>

        {isEarlyExitResult ? (
          <div className="focus-detail-card mb-4 space-y-4 p-4">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t('earlyExitTitle')}</h2>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                {t('earlyExitIntro')}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {EARLY_EXIT_REASON_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={earlyExitReason === key}
                  onClick={() => setEarlyExitReason(key)}
                  className="focus-mini-button selection-control"
                >
                  {t(`earlyExitReasons.${key}`)}
                </button>
              ))}
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                {t('salvageActionLabel')}
              </span>
              <textarea
                value={salvageAction}
                onChange={(e) => setSalvageAction(e.target.value)}
                placeholder={t('salvageActionPlaceholder')}
                rows={2}
                className="focus-input w-full resize-none p-3 text-sm placeholder:text-[var(--text-disabled)] focus:outline-none focus:border-[var(--signal-cyan)]"
              />
            </label>
            <p className="text-xs leading-relaxed text-[var(--text-muted)]">{t('salvageActionHint')}</p>
          </div>
        ) : null}

        <textarea
          value={result}
          onChange={(e) => setResult(e.target.value)}
          placeholder={t('resultPlaceholder')}
          className="focus-input mb-4 h-28 w-full resize-none p-4 text-sm placeholder:text-[var(--text-disabled)] focus:outline-none focus:border-[var(--signal-cyan)]"
        />

        <p className="text-xs text-[var(--text-muted)] mb-6">{t('noResultNote')}</p>

        <button
          type="button"
          onClick={handleComplete}
          disabled={!canSaveResult}
          className={`focus-primary-button w-full text-sm ${
            canSaveResult
              ? ''
              : 'cursor-not-allowed opacity-45'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {t('saveResult')}
        </button>
      </div>
    </div>
  );
}