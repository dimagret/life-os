'use client';

import { useState, useEffect, useId, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  loadUserProfile,
  saveUserProfile,
  loadDebts,
  loadActionCourtReviews,
  loadKnowledgeModules,
  bootstrapApp,
  resetAllData,
  snapshotAllStorage,
  restoreSnapshot,
  type StorageSnapshot,
} from '@/lib/storage';
import { type StrictnessMode, type UserProfile } from '@/types';
import { useShell } from '@/lib/shell-context';
import { MetricCard, ProgressBar } from '@/components/ui/MetricCard';
import { createDemoData } from '@/data/demoData';
import { fetchAIHealth, clearAIHealthCache, type AIHealthResult } from '@/lib/aiMentor';
import { getMentorOfflineOnly, setMentorOfflineOnly } from '@/lib/aiPreferences';
import { getCacheStats } from '@/lib/aiClient';
import { ConfirmInline } from '@/components/ui/ConfirmInline';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LocaleToggle } from '@/components/ui/LocaleToggle';
import { Toast } from '@/components/ui/Toast';
import { Switch } from '@/components/ui/Switch';
import {
  DEFAULT_YANDEX_MUSIC_EMBED_URL,
  getFocusMusicUrlIssue,
  normalizeYandexMusicEmbedUrl,
  openYandexMusicPage,
  previewFocusMusic,
  stopFocusMusicPreview,
  type FocusMusicUrlIssue,
} from '@/lib/focusMusic';
import { YandexMusicPlayer } from '@/components/music/YandexMusicPlayer';
import styles from './Profile.module.css';

const AI_MODEL_LABEL: Record<string, string> = {
  'google/gemini-flash-1.5': 'Gemini Flash 1.5',
  'anthropic/claude-3.5-sonnet': 'Claude 3.5 Sonnet',
  'meta-llama/llama-3.1-70b': 'Llama 3.1 70B',
  'openai/gpt-4o-mini': 'GPT-4o Mini',
};

export default function ProfileClient() {
  const t = useTranslations('profile');
  const locale = useLocale();
  const mentorOfflineLabelId = useId();
  const soundLabelId = useId();
  const focusMusicLabelId = useId();
  const focusMusicSourceId = useId();
  const focusMusicPresetId = useId();
  const focusMusicUrlId = useId();
  const focusYandexUrlId = useId();
  const focusMusicEndId = useId();
  const taskReminderLabelId = useId();
  const taskReminderIntervalId = useId();
  const tToday = useTranslations('today');
  const tState = useTranslations('stateLabels');
  const { currentState } = useShell();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [debtsCount, setDebtsCount] = useState(0);
  const [courtCount, setCourtCount] = useState(0);
  const [knowledgeCount, setKnowledgeCount] = useState(0);
  const [pendingStrictness, setPendingStrictness] = useState<StrictnessMode | null>(null);
  const [strictnessAcknowledged, setStrictnessAcknowledged] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [aiHealth, setAiHealth] = useState<AIHealthResult | null>(null);
  const [mentorOfflineOnly, setMentorOfflineOnlyState] = useState(() =>
    typeof window !== 'undefined' ? getMentorOfflineOnly() : false
  );
  const [cacheStats, setCacheStats] = useState({ memoryEntries: 0, storageEntries: 0 });
  const [undoSnapshot, setUndoSnapshot] = useState<StorageSnapshot | null>(null);
  const [focusMusicPreviewing, setFocusMusicPreviewing] = useState(false);
  const [focusMusicError, setFocusMusicError] = useState<string | null>(null);
  const [focusYandexDraft, setFocusYandexDraft] = useState('');
  const focusMusicPreviewTimeoutRef = useRef<number | null>(null);

  const loadData = () => {
    const userProfile = loadUserProfile();
    const debts = loadDebts();
    const reviews = loadActionCourtReviews();
    const knowledge = loadKnowledgeModules();

    setProfile(userProfile);
    setFocusYandexDraft(userProfile.focusYandexEmbedUrl ?? DEFAULT_YANDEX_MUSIC_EMBED_URL);
    setDebtsCount(debts.filter((d) => d.status === 'open').length);
    setCourtCount(reviews.length);
    setKnowledgeCount(knowledge.filter((k) => k.unlocked).length);
  };

  useEffect(() => {
    let isActive = true;
    function init() {
      loadData();
      fetchAIHealth().then((h) => {
        if (isActive) setAiHealth(h);
      });
      if (isActive) setCacheStats(getCacheStats());
    }
    init();
    const handleStorage = () => init();
    window.addEventListener('storage', handleStorage);

    return () => {
      isActive = false;
      window.removeEventListener('storage', handleStorage);
      if (focusMusicPreviewTimeoutRef.current !== null) {
        window.clearTimeout(focusMusicPreviewTimeoutRef.current);
      }
      stopFocusMusicPreview();
    };
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    window.location.assign(`/${locale}/login`);
  };

  if (!profile) return null;

  const updateProfile = (patch: Partial<UserProfile>) => {
    const updated = { ...profile, ...patch };
    saveUserProfile(updated);
    setProfile(updated);
  };

  const focusMusicSource = profile.focusMusicSource ?? 'builtin';
  const focusMusicPreset = profile.focusMusicPreset ?? 'softNoise';
  const focusMusicUrlIssue =
    focusMusicSource === 'url' ? getFocusMusicUrlIssue(profile.focusMusicUrl) : null;
  const canPreviewFocusMusic =
    focusMusicSource === 'builtin' || (focusMusicSource === 'url' && focusMusicUrlIssue === null);

  const getFocusMusicIssueMessage = (issue: FocusMusicUrlIssue) => {
    if (issue === 'pageLink') return t('focusMusicUrlPageUnsupported');
    if (issue === 'invalid') return t('focusMusicUrlInvalid');
    return t('focusMusicUrlEmpty');
  };

  const handleYandexMusicApply = () => {
    const normalized = normalizeYandexMusicEmbedUrl(focusYandexDraft);
    if (!normalized) {
      const isHomePage = /^https?:\/\/music\.yandex\.ru\/?(?:[?#].*)?$/i.test(focusYandexDraft.trim());
      setFocusMusicError(t(isHomePage ? 'focusMusicYandexSpecificLink' : 'focusMusicYandexInvalid'));
      return;
    }
    updateProfile({
      focusMusicEnabled: true,
      focusMusicSource: 'yandex',
      focusYandexEmbedUrl: normalized,
      focusYandexPlayerOpen: true,
    });
    setFocusYandexDraft(normalized);
    setFocusMusicError(null);
  };

  const stopFocusMusicPreviewUi = () => {
    if (focusMusicPreviewTimeoutRef.current !== null) {
      window.clearTimeout(focusMusicPreviewTimeoutRef.current);
      focusMusicPreviewTimeoutRef.current = null;
    }
    stopFocusMusicPreview();
    setFocusMusicPreviewing(false);
  };

  const handleFocusMusicPreview = async () => {
    if (focusMusicPreviewing) {
      stopFocusMusicPreviewUi();
      return;
    }
    if (focusMusicSource === 'url' && focusMusicUrlIssue) {
      setFocusMusicError(getFocusMusicIssueMessage(focusMusicUrlIssue));
      return;
    }
    if (!canPreviewFocusMusic) return;

    setFocusMusicError(null);
    setFocusMusicPreviewing(true);
    const started = await previewFocusMusic({
      ...profile,
      focusMusicEnabled: true,
      focusMusicSource,
      focusMusicPreset,
    });
    if (!started) {
      setFocusMusicPreviewing(false);
      setFocusMusicError(t('focusMusicPreviewFailed'));
      return;
    }
    focusMusicPreviewTimeoutRef.current = window.setTimeout(() => {
      focusMusicPreviewTimeoutRef.current = null;
      setFocusMusicPreviewing(false);
    }, 8000);
  };

  const handleFillDemo = () => {
    createDemoData();
    bootstrapApp();
    loadData();
  };

  const handleReset = () => {
    setUndoSnapshot(snapshotAllStorage());
    resetAllData();
    bootstrapApp();
    setShowResetConfirm(false);
    loadData();
  };

  const handleUndoReset = () => {
    if (!undoSnapshot) return;
    restoreSnapshot(undoSnapshot);
    setUndoSnapshot(null);
    loadData();
  };


  const strictnessOptions: StrictnessMode[] = ['soft', 'standard', 'hard', 'owner'];
  const selectedStrictness = pendingStrictness ?? profile.strictnessMode;
  const strictnessNeedsAcknowledgement = selectedStrictness === 'hard' || selectedStrictness === 'owner';

  const chooseStrictness = (mode: StrictnessMode) => {
    if (mode === profile.strictnessMode) {
      setPendingStrictness(null);
      setStrictnessAcknowledged(false);
      return;
    }
    setPendingStrictness(mode);
    setStrictnessAcknowledged(false);
  };

  const confirmStrictness = () => {
    if (!pendingStrictness) return;
    if ((pendingStrictness === 'hard' || pendingStrictness === 'owner') && !strictnessAcknowledged) return;
    updateProfile({ strictnessMode: pendingStrictness });
    setPendingStrictness(null);
    setStrictnessAcknowledged(false);
  };

  return (
    <div className={`app-page ${styles.profile}`}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t('title')}</h1>
        <p className={styles.pageSubtitle}>{t('settingsIntro')}</p>
      </header>

      <section aria-labelledby="account-mode-heading" className="space-y-3">
        <div>
          <h2 id="account-mode-heading" className="text-lg font-semibold text-[var(--text-primary)]">
            {t('accountModeTitle')}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
            {t('accountModeHint')}
          </p>
        </div>

        <div data-state={currentState} className={`tactile-card ${styles.stateSummary}`}>
          <div className={styles.stateSummaryRow}>
            <div className={styles.stateIdentity}>
              <span aria-hidden="true" className={styles.stateMark} />
              <span className={styles.stateName}>{tState(currentState)}</span>
            </div>
            <span className={styles.strictnessName}>
              {t(`strictness.${profile.strictnessMode}`)}
            </span>
          </div>
        </div>

        {profile.activeStabilization && (
          <div className="tactile-card border-[var(--state-stabilization)] bg-[var(--state-stabilization-soft)] p-4">
            <h3 className="text-sm font-semibold text-[var(--state-stabilization)]">
              {t('stabilizationCardTitle')}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
              {t('stabilizationCardBody')}
            </p>
          </div>
        )}

        <fieldset className="tactile-card p-4">
          <legend className="px-1 text-sm font-semibold text-[var(--text-primary)]">
            {t('strictnessControlTitle')}
          </legend>
          <p className="mb-3 text-xs leading-relaxed text-[var(--text-muted)]">
            {t('strictnessControlHint')}
          </p>
          <div role="radiogroup" aria-label={t('strictnessControlTitle')} className={styles.strictnessGrid}>
            {strictnessOptions.map((mode) => {
              const checked = selectedStrictness === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => chooseStrictness(mode)}
                  className={`tactile-button selection-control ${styles.strictnessOption}`}
                >
                  {t(`strictness.${mode}`)}
                </button>
              );
            })}
          </div>

          {pendingStrictness && (
            <div className="mt-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                {t('strictnessChangeTitle', { mode: t(`strictness.${pendingStrictness}`) })}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                {t(`strictnessEffects.${pendingStrictness}`)}
              </p>
              {strictnessNeedsAcknowledgement && (
                <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={strictnessAcknowledged}
                    onChange={(event) => setStrictnessAcknowledged(event.target.checked)}
                    className="mt-0.5"
                  />
                  <span>{t('strictnessExplicitConsent')}</span>
                </label>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPendingStrictness(null);
                    setStrictnessAcknowledged(false);
                  }}
                  className="tactile-button min-h-11 px-3 text-xs text-[var(--text-secondary)]"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={confirmStrictness}
                  disabled={strictnessNeedsAcknowledgement && !strictnessAcknowledged}
                  className="tactile-button tactile-button-primary min-h-11 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t('strictnessConfirm')}
                </button>
              </div>
            </div>
          )}
        </fieldset>

        <button
          type="button"
          onClick={handleLogout}
          className="tactile-button tactile-button-secondary w-full min-h-11 px-3 text-sm"
        >
          {t('logout')}
        </button>
      </section>

      <section aria-labelledby="progress-heading" className="mt-10">
        <h2 id="progress-heading" className="text-lg font-semibold text-[var(--text-primary)]">
          {t('progressTitle')}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
          {t('progressHint')}
        </p>

        <details className="mt-3 tactile-card p-4">
          <summary className="inline-flex min-h-11 w-full cursor-pointer items-center text-sm font-medium text-[var(--text-primary)]">
            {t('progressDetailsSummary')}
          </summary>
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <MetricCard label={tToday('metrics.xp')} value={profile.totalXp} variant="accent" />
              <MetricCard label={tToday('metrics.core')} value={profile.innerCore} suffix="%" variant={profile.innerCore < 30 ? 'warning' : 'default'} />
              <MetricCard label={tToday('metrics.abyss')} value={profile.abyssIndex} suffix="%" variant="riskScale" />
            </div>
            <p className="text-xs leading-relaxed text-[var(--text-muted)]">{t('metricsLegend')}</p>
            <ProgressBar label={t('progressInnerCore')} value={profile.innerCore} max={100} variant={profile.innerCore < 30 ? 'warning' : 'default'} />
            <ProgressBar label={t('progressAbyss')} value={profile.abyssIndex} max={100} variant="riskScale" />
            <div className="grid grid-cols-2 gap-2">
              <MetricCard label={t('level')} value={profile.level} variant="default" />
              <MetricCard label={t('streakLabel')} value={profile.currentStreak} variant={profile.currentStreak > 0 ? 'accent' : 'default'} />
              <MetricCard label={t('externalResults')} value={profile.externalResultsCount} variant="default" />
              <MetricCard label={t('codexUnlocked')} value={knowledgeCount} variant="default" />
              <MetricCard label={t('debts')} value={debtsCount} variant={debtsCount > 0 ? 'danger' : 'default'} />
              <MetricCard label={t('courtsPassed')} value={courtCount} variant="default" />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>{t('levelProgress')}</span>
                <span className="tabular-nums">{profile.totalXp % 200}/200 XP</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-hover)]" role="progressbar" aria-label={t('levelProgress')} aria-valuenow={profile.totalXp % 200} aria-valuemin={0} aria-valuemax={200}>
                <div className="h-full rounded-full bg-[var(--accent-brand)]" style={{ width: `${(profile.totalXp % 200) / 2}%` }} />
              </div>
            </div>
          </div>
        </details>
      </section>

      <section aria-labelledby="ai-data-heading" className="mt-10 space-y-3">
        <div>
          <h2 id="ai-data-heading" className="text-lg font-semibold text-[var(--text-primary)]">
            {t('aiDataTitle')}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
            {t('aiDataHint')}
          </p>
        </div>

        <div className="tactile-card p-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t('dataControlTitle')}</h3>
          <div className="mt-3 space-y-2 text-xs leading-relaxed text-[var(--text-muted)]">
            <p>{t('dataLocal')}</p>
            <p>{t('dataAiWhen')}</p>
            <p>{t('dataAiPurpose')}</p>
            <p>{t('dataAiChoice')}</p>
          </div>
        </div>

        <div className="tactile-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1" id={mentorOfflineLabelId}>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t('aiMentorOfflineToggle')}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-muted)]">{t('aiMentorOfflineHint')}</p>
            </div>
            <Switch
              checked={mentorOfflineOnly}
              onCheckedChange={(value) => {
                setMentorOfflineOnly(value);
                setMentorOfflineOnlyState(value);
              }}
              aria-labelledby={mentorOfflineLabelId}
            />
          </div>
        </div>

        <details className="tactile-card p-4">
          <summary className="inline-flex min-h-11 w-full cursor-pointer items-center text-sm font-medium text-[var(--text-primary)]">
            {t('aiTechnicalSummary')}
          </summary>
          <div className="mt-4 space-y-3 text-xs leading-relaxed text-[var(--text-muted)]">
            {aiHealth !== null && (
              <div>
                <span className={aiHealth.ok ? 'text-[var(--state-victory)]' : 'text-[var(--state-risk)]'}>
                  {aiHealth.ok ? t('aiStatusActive') : t('aiStatusInactive')}
                </span>
                {!aiHealth.ok && aiHealth.reason && (
                  <p className="mt-1">
                    {aiHealth.reason === 'missing_api_key' && t('aiReasonMissingApiKey')}
                    {aiHealth.reason === 'network' && t('aiReasonNetwork')}
                    {aiHealth.reason === 'bad_response' && t('aiReasonBadResponse')}
                    {aiHealth.reason === 'http_error' && t('aiReasonHttp', { status: String(aiHealth.httpStatus ?? 'вЂ”') })}
                  </p>
                )}
              </div>
            )}
            <p>{t('modelLabel')}: {AI_MODEL_LABEL['google/gemini-flash-1.5']}</p>
            <p>{t('sessionCache', { count: cacheStats.memoryEntries })}</p>
            <p>{t('persistedCache', { count: cacheStats.storageEntries })}</p>
            <p>{t('costHint')}</p>
            <button
              type="button"
              className="tactile-button min-h-11 px-3 text-xs text-[var(--accent-brand)]"
              onClick={() => {
                clearAIHealthCache();
                fetchAIHealth().then((health) => setAiHealth(health));
              }}
            >
              {t('aiHealthRetry')}
            </button>
          </div>
        </details>
      </section>

      {/* Appearance */}
      <section aria-labelledby="appearance-heading" className="mt-10 border-t border-[var(--border-subtle)] pt-6">
        <h2 id="appearance-heading" className="text-lg font-semibold text-[var(--text-primary)]">
          {t('appearance')}
        </h2>
        <p className="mt-1 mb-3 text-xs leading-relaxed text-[var(--text-muted)]">{t('appearanceHint')}</p>
        <ThemeToggle />
        <div className="mt-3">
          <LocaleToggle />
        </div>
      </section>

      {/* Focus / sound */}
      <section aria-labelledby="focus-sound-heading" className="mt-10 border-t border-[var(--border-subtle)] pt-6">
        <h2 id="focus-sound-heading" className="text-lg font-semibold text-[var(--text-primary)]">
          {t('focusSection')}
        </h2>
        <p className="mt-1 mb-3 text-xs leading-relaxed text-[var(--text-muted)]">{t('focusSectionHint')}</p>
        <div className="tactile-card flex items-start justify-between gap-3 p-4">
          <div className="min-w-0 flex-1" id={soundLabelId}>
            <p className="text-sm font-medium text-[var(--text-primary)] leading-snug">
              {t('soundToggle')}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
              {t('soundHint')}
            </p>
          </div>
          <Switch
            checked={profile.soundEnabled ?? true}
            onCheckedChange={(v) => updateProfile({ soundEnabled: v })}
            aria-labelledby={soundLabelId}
          />
        </div>

        <div className="tactile-card mt-3 space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1" id={focusMusicLabelId}>
              <p className="text-sm font-medium text-[var(--text-primary)] leading-snug">
                {t('focusMusicToggle')}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                {t('focusMusicHint')}
              </p>
            </div>
            <Switch
              checked={profile.focusMusicEnabled ?? false}
              onCheckedChange={(v) => updateProfile({ focusMusicEnabled: v })}
              aria-labelledby={focusMusicLabelId}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor={focusMusicSourceId}
                className="text-xs uppercase tracking-wider text-[var(--text-muted)] block mb-1.5"
              >
                {t('focusMusicSource')}
              </label>
              <select
                id={focusMusicSourceId}
                value={focusMusicSource}
                onChange={(e) => {
                  const nextSource =
                    e.target.value === 'url'
                      ? 'url'
                      : e.target.value === 'yandex'
                        ? 'yandex'
                        : 'builtin';
                  const nextPatch: Partial<UserProfile> = {
                    focusMusicSource: nextSource,
                  };
                  if (nextSource === 'yandex') {
                    nextPatch.focusYandexPlayerOpen = true;
                  }
                  updateProfile({
                    ...nextPatch,
                  });
                  setFocusMusicError(null);
                  stopFocusMusicPreviewUi();
                }}
                className="tactile-field w-full p-3 text-sm focus:outline-none focus:border-[var(--accent-brand)]"
              >
                <option value="builtin">{t('focusMusicBuiltin')}</option>
                <option value="yandex">{t('focusMusicYandexSource')}</option>
                <option value="url">{t('focusMusicUrlSource')}</option>
              </select>
            </div>

            {focusMusicSource === 'builtin' && (
              <div>
                <label
                  htmlFor={focusMusicPresetId}
                  className="text-xs uppercase tracking-wider text-[var(--text-muted)] block mb-1.5"
                >
                  {t('focusMusicPreset')}
                </label>
                <select
                  id={focusMusicPresetId}
                  value={focusMusicPreset}
                  onChange={(e) => {
                    const nextPreset =
                      e.target.value === 'deepNoise'
                        ? 'deepNoise'
                        : e.target.value === 'lowPulse'
                          ? 'lowPulse'
                          : 'softNoise';
                    updateProfile({ focusMusicPreset: nextPreset });
                    setFocusMusicError(null);
                    stopFocusMusicPreviewUi();
                  }}
                  className="tactile-field w-full p-3 text-sm focus:outline-none focus:border-[var(--accent-brand)]"
                >
                  <option value="softNoise">{t('focusMusicPresetSoftNoise')}</option>
                  <option value="deepNoise">{t('focusMusicPresetDeepNoise')}</option>
                  <option value="lowPulse">{t('focusMusicPresetLowPulse')}</option>
                </select>
              </div>
            )}
          </div>

          {focusMusicSource === 'url' && (
            <div>
              <label
                htmlFor={focusMusicUrlId}
                className="text-xs uppercase tracking-wider text-[var(--text-muted)] block mb-1.5"
              >
                {t('focusMusicUrl')}
              </label>
              <input
                id={focusMusicUrlId}
                type="url"
                value={profile.focusMusicUrl ?? ''}
                onChange={(e) => {
                  updateProfile({ focusMusicUrl: e.target.value });
                  setFocusMusicError(null);
                }}
                placeholder={t('focusMusicUrlPlaceholder')}
                className="tactile-field w-full p-3 text-sm placeholder:text-[var(--text-disabled)] focus:outline-none focus:border-[var(--accent-brand)]"
              />
              <p className="text-[10px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
                {t('focusMusicUrlHint')}
              </p>
              {focusMusicUrlIssue && focusMusicUrlIssue !== 'empty' && (
                <p className="mt-2 rounded-lg border border-[var(--state-risk-border)] bg-[var(--state-risk-soft)] px-3 py-2 text-[10px] leading-relaxed text-[var(--state-risk)]">
                  {getFocusMusicIssueMessage(focusMusicUrlIssue)}
                </p>
              )}
            </div>
          )}

          {focusMusicSource === 'yandex' ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3">
                <p className="text-xs leading-relaxed text-[var(--text-muted)]">{t('focusMusicYandexHint')}</p>
                <div className="mt-3">
                  <label htmlFor={focusYandexUrlId} className="mb-1.5 block text-xs uppercase tracking-wider text-[var(--text-muted)]">{t('focusMusicYandexUrl')}</label>
                  <input
                    id={focusYandexUrlId}
                    type="text"
                    inputMode="url"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={focusYandexDraft}
                    onChange={(event) => { setFocusYandexDraft(event.target.value); setFocusMusicError(null); }}
                    placeholder={t('focusMusicYandexUrlPlaceholder')}
                    className="tactile-field w-full p-3 text-sm placeholder:text-[var(--text-disabled)] focus:outline-none focus:border-[var(--accent-brand)]"
                  />
                  <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--text-muted)]">{t('focusMusicYandexUrlHint')}</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={handleYandexMusicApply} className="tactile-button inline-flex min-h-11 w-full items-center justify-center px-3 text-center text-xs text-[var(--accent-brand)] hover:bg-[var(--accent-brand-soft)]">{t('focusMusicYandexApply')}</button>
                  <button type="button" onClick={() => openYandexMusicPage(focusYandexDraft || profile.focusYandexEmbedUrl)} className="tactile-button inline-flex min-h-11 w-full items-center justify-center px-3 text-center text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">{t('focusMusicYandexLogin')}</button>
                </div>
              </div>
              <YandexMusicPlayer url={profile.focusYandexEmbedUrl} title={t('focusMusicYandexPlayerTitle')} />
              {focusMusicError && (
                <p className="rounded-lg border border-[var(--state-risk-border)] bg-[var(--state-risk-soft)] px-3 py-2 text-[10px] leading-relaxed text-[var(--state-risk)]">{focusMusicError}</p>
              )}
              <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">{t('focusMusicYandexFallback')}</p>
              <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">{t('focusMusicYandexEndStops')}</p>
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={handleFocusMusicPreview}
                disabled={!canPreviewFocusMusic}
                className={`tactile-button w-full border py-3 text-sm transition-all ${
                  canPreviewFocusMusic
                    ? 'border-[var(--accent-brand)] text-[var(--accent-brand)] hover:bg-[var(--accent-brand-soft)]'
                    : 'border-[var(--border-subtle)] text-[var(--text-disabled)] cursor-not-allowed'
                }`}
              >
                {focusMusicPreviewing ? t('focusMusicStopPreview') : t('focusMusicPreview')}
              </button>
              <p className="text-[10px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
                {t('focusMusicPreviewHint')}
              </p>
              {focusMusicError && (
                <p className="mt-2 rounded-lg border border-[var(--state-risk-border)] bg-[var(--state-risk-soft)] px-3 py-2 text-[10px] leading-relaxed text-[var(--state-risk)]">
                  {focusMusicError}
                </p>
              )}
            </div>
          )}

          <div>
            <label
              htmlFor={focusMusicEndId}
              className="text-xs uppercase tracking-wider text-[var(--text-muted)] block mb-1.5"
            >
              {t('focusMusicEnd')}
            </label>
            <select
              id={focusMusicEndId}
              value={profile.focusMusicEndBehavior ?? 'fade'}
              onChange={(e) =>
                updateProfile({
                  focusMusicEndBehavior: e.target.value === 'continue' ? 'continue' : 'fade',
                })
              }
              className="tactile-field w-full p-3 text-sm focus:outline-none focus:border-[var(--accent-brand)]"
            >
              <option value="fade">{t('focusMusicFade')}</option>
              <option value="continue">{t('focusMusicContinue')}</option>
            </select>
          </div>
        </div>

      </section>

      <section aria-labelledby="reminders-heading" className="mt-10 border-t border-[var(--border-subtle)] pt-6">
        <h2 id="reminders-heading" className="text-lg font-semibold text-[var(--text-primary)]">{t('remindersTitle')}</h2>
        <p className="mt-1 mb-3 text-xs leading-relaxed text-[var(--text-muted)]">{t('remindersHint')}</p>
        <div className="tactile-card space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1" id={taskReminderLabelId}>
              <p className="text-sm font-medium text-[var(--text-primary)] leading-snug">
                {t('taskReminderToggle')}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                {t('taskReminderHint')}
              </p>
            </div>
            <Switch
              checked={profile.taskReminderEnabled ?? false}
              onCheckedChange={(v) => updateProfile({ taskReminderEnabled: v })}
              aria-labelledby={taskReminderLabelId}
            />
          </div>
          <div>
            <label
              htmlFor={taskReminderIntervalId}
              className="text-xs uppercase tracking-wider text-[var(--text-muted)] block mb-1.5"
            >
              {t('taskReminderEvery')}
            </label>
            <input
              id={taskReminderIntervalId}
              type="number"
              min={5}
              max={240}
              step={5}
              value={profile.taskReminderMinutes ?? 60}
              onChange={(e) => {
                const next = Math.min(Math.max(parseInt(e.target.value, 10) || 60, 5), 240);
                updateProfile({ taskReminderMinutes: next });
              }}
              className="tactile-field w-full p-3 text-sm tabular-nums focus:outline-none focus:border-[var(--accent-brand)]"
            />
          </div>
        </div>
      </section>

      {/* Development tools are intentionally unavailable in production. */}
      {process.env.NODE_ENV !== 'production' && (
        <section aria-labelledby="development-heading" className="mt-10 border-t border-[var(--border-subtle)] pt-6">
          <h2 id="development-heading" className="text-lg font-semibold text-[var(--text-primary)]">{t('dev')}</h2>
          <button
            type="button"
            onClick={handleFillDemo}
            className="tactile-button mt-3 w-full min-h-11 border border-[var(--accent-brand)] px-3 text-sm text-[var(--accent-brand)]"
          >
            {t('fillDemo')}
          </button>
        </section>
      )}

      <section
        aria-labelledby="danger-heading"
        data-state={currentState}
        className={styles.dangerSection}
      >
        <h2 id="danger-heading" className={styles.dangerTitle}>{t('dangerTitle')}</h2>
        <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{t('dangerHint')}</p>
        <div className="mt-3">
          {!showResetConfirm ? (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className={`tactile-button ${styles.dangerTrigger}`}
            >
              {t('resetData')}
            </button>
          ) : (
            <ConfirmInline
              open={showResetConfirm}
              message={t('resetMessage')}
              confirmLabel={t('resetConfirm')}
              cancelLabel={t('cancel')}
              onConfirm={handleReset}
              onCancel={() => setShowResetConfirm(false)}
            />
          )}
        </div>
      </section>

      <Toast
        open={undoSnapshot !== null}
        message={tToday('toast.dataReset')}
        actionLabel={tToday('toast.restore')}
        onAction={handleUndoReset}
        onDismiss={() => setUndoSnapshot(null)}
        durationMs={5000}
      />
    </div>
  );
}
