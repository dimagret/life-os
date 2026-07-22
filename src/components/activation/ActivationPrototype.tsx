'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import {
  ArrowLeft,
  ArrowRight,
  BatteryLow,
  Blocks,
  Check,
  Clock,
  Eye,
  Flag,
  Gauge,
  Gem,
  Layers3,
  ListChecks,
  Lock,
  Pause,
  PauseCircle,
  Play,
  RotateCcw,
  Search,
  Shield,
  ShieldCheck,
  Shuffle,
  Target,
  Timer,
} from 'lucide-react';
import { useShell } from '@/lib/shell-context';
import { deriveActivationProfile, deriveActivationProgram } from '@/lib/activationProfile';
import { activationCopy } from './activationCopy';
import styles from './ActivationPrototype.module.css';

export type StepId =
  | 'entry'
  | 'commitment'
  | 'reality'
  | 'sabotage'
  | 'distractions'
  | 'capacity'
  | 'profile'
  | 'program'
  | 'goal'
  | 'day'
  | 'focus'
  | 'review'
  | 'adaptation';

type ModeId = 'gentle' | 'base' | 'intensive';
type FocusState = 'idle' | 'running' | 'done';
type OutcomeId = 'completed' | 'partial' | 'failed';
type Copy = typeof activationCopy.ru;
export interface ActivationSubmission {
  email: string;
  cadence: string;
  sabotage: string[];
  distractions: string[];
  focusMinutes: number;
  dailyMinutes: number;
  energy: string;
  profileId: string;
  selectedMode: ModeId;
  program: { focus: number; blocks: number; volume: number; tasks: number };
  weeklyGoal: string;
  successCriterion: string;
  goalReason: string;
  startTime: string;
}

export type RegistrationResult = { status: 'authenticated' } | { status: 'confirmation-required' };
export interface RegistrationCredentials {
  email: string;
  password: string;
}


interface ActivationPrototypeProps {
  mode?: 'prototype' | 'production';
  initialEmail?: string;
  startAt?: StepId;
  onRegister?: (credentials: RegistrationCredentials) => Promise<RegistrationResult>;
  onComplete?: (submission: ActivationSubmission) => Promise<void>;
}

const STEPS: readonly StepId[] = [
  'entry',
  'commitment',
  'reality',
  'sabotage',
  'distractions',
  'capacity',
  'profile',
  'program',
  'goal',
  'day',
  'focus',
  'review',
  'adaptation',
];
const PRODUCTION_STEPS: readonly StepId[] = STEPS.slice(0, 10);

const PHASE_STARTS = [0, 2, 6, 8, 10] as const;

const PROFILE_ICONS = {
  depleted: BatteryLow,
  overloaded: Layers3,
  avoidant: PauseCircle,
  perfectionist: Gem,
  analytical: Search,
  busywork: ListChecks,
  fragmented: Shuffle,
  building: Blocks,
  stable: ShieldCheck,
} as const;

const TIMER_WAVE_BARS = [0.32, 0.48, 0.74, 0.58, 0.92, 0.68, 0.42, 0.84, 0.54, 0.36] as const;

function PrototypeTimerRing({ progress }: { progress: number }) {
  const size = 240;
  const center = size / 2;
  const innerRadius = 82;
  const orbitRadius = 97;
  const normalizedProgress = Math.min(1, Math.max(0, progress));
  const circumference = 2 * Math.PI * orbitRadius;
  const offset = circumference * (1 - normalizedProgress);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={styles.timerOrbit} aria-hidden="true">
      <circle className={styles.timerOrbitTrack} cx={center} cy={center} r={orbitRadius} fill="none" strokeWidth="5" />
      <circle
        className={styles.timerOrbitGlow}
        cx={center}
        cy={center}
        r={orbitRadius}
        fill="none"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
      />
      <circle
        className={styles.timerOrbitProgress}
        cx={center}
        cy={center}
        r={orbitRadius}
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
      />
      <circle className={styles.timerInnerRing} cx={center} cy={center} r={innerRadius} fill="none" strokeWidth="1" />
      <g
        className={styles.timerOrbitMarker}
        style={{
          transform: `rotate(${normalizedProgress * 360}deg)`,
          transformOrigin: `${center}px ${center}px`,
        }}
      >
        <circle cx={center} cy={center - orbitRadius} r="5" strokeWidth="2" />
      </g>
    </svg>
  );
}

function PrototypeTimerWaveform({ active }: { active: boolean }) {
  return (
    <div className={styles.timerWaveform} data-active={active ? 'true' : undefined} aria-hidden="true">
      {TIMER_WAVE_BARS.map((scale, index) => (
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

function format(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    template
  );
}

function addMinutes(time: string, minutes: number) {
  const [hours, mins] = time.split(':').map(Number);
  const total = (hours * 60 + mins + minutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function phaseIndexForStep(stepIndex: number) {
  let phase = 0;
  PHASE_STARTS.forEach((start, index) => {
    if (stepIndex >= start) phase = index;
  });
  return phase;
}

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

interface ChoiceOption {
  id: string;
  title: string;
  text: string;
}

function optionTitle(options: readonly ChoiceOption[], id: string) {
  return options.find((option) => option.id === id)?.title ?? id;
}

function summarizeOptions(options: readonly ChoiceOption[], ids: string[], moreTemplate: string) {
  const titles = ids.map((id) => optionTitle(options, id));
  if (titles.length <= 2) return titles.join(' · ');
  return `${titles.slice(0, 2).join(' · ')} · ${format(moreTemplate, { count: titles.length - 2 })}`;
}

function ChoiceGrid({
  options,
  selected,
  onSelect,
  multi = false,
  compact = false,
}: {
  options: readonly ChoiceOption[];
  selected: string[];
  onSelect: (id: string) => void;
  multi?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`${styles.choiceGrid} ${compact ? styles.choiceGridCompact : ''}`}>
      {options.map((option) => {
        const active = selected.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            className={styles.choice}
            data-selected={active ? 'true' : undefined}
            aria-pressed={active}
            onClick={() => onSelect(option.id)}
          >
            <span className={styles.choiceIndicator} aria-hidden="true">
              {active ? <Check size={14} strokeWidth={2.5} /> : multi ? <span /> : <i />}
            </span>
            <span className={styles.choiceCopy}>
              <strong>{option.title}</strong>
              <small>{option.text}</small>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ActivationPrototype({
  mode = 'prototype',
  onRegister,
  onComplete,
  initialEmail = '',
  startAt = 'entry',
}: ActivationPrototypeProps = {}) {
  const rawLocale = useLocale();
  const isRu = rawLocale !== 'en';
  const t = activationCopy[isRu ? 'ru' : 'en'] as unknown as Copy;
  const { setHideShell } = useShell();

  const production = mode === 'production';
  const journeySteps = production && startAt !== 'entry'
    ? PRODUCTION_STEPS.slice(1)
    : production
      ? PRODUCTION_STEPS
      : STEPS;

  const [stepIndex, setStepIndex] = useState(() => Math.max(0, journeySteps.indexOf(startAt)));
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [consent, setConsent] = useState(false);
  const [honestAgreement, setHonestAgreement] = useState(false);
  const [cadence, setCadence] = useState('');
  const [sabotage, setSabotage] = useState<string[]>([]);
  const [distractions, setDistractions] = useState<string[]>([]);
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [dailyMinutes, setDailyMinutes] = useState(90);
  const [energy, setEnergy] = useState('variable');
  const [selectedModeOverride, setSelectedModeOverride] = useState<{ mode: ModeId; diagnosticKey: string } | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState('');
  const [successCriterion, setSuccessCriterion] = useState('');
  const [goalReason, setGoalReason] = useState('');
  const [startTime, setStartTime] = useState('09:30');
  const [focusState, setFocusState] = useState<FocusState>('idle');
  const [distractionMarks, setDistractionMarks] = useState(0);
  const [outcome, setOutcome] = useState<OutcomeId>('partial');
  const [reviewFact, setReviewFact] = useState('');
  const [tomorrowChange, setTomorrowChange] = useState('');
  const [registered, setRegistered] = useState(mode === 'prototype' || startAt !== 'entry');
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const journeyNote = production
    ? (isRu ? '\u0417\u0430\u0449\u0438\u0449\u0451\u043d\u043d\u044b\u0439 \u0430\u043a\u043a\u0430\u0443\u043d\u0442 \u00b7 \u0434\u0430\u043d\u043d\u044b\u0435 \u0441\u0438\u043d\u0445\u0440\u043e\u043d\u0438\u0437\u0438\u0440\u0443\u044e\u0442\u0441\u044f' : 'Secure account - data is synced')
    : t.prototypeNote;
  const privacyNote = production
    ? (isRu ? '\u041f\u0430\u0440\u043e\u043b\u044c \u043e\u0431\u0440\u0430\u0431\u0430\u0442\u044b\u0432\u0430\u0435\u0442\u0441\u044f Supabase Auth \u0438 \u043d\u0435 \u0441\u043e\u0445\u0440\u0430\u043d\u044f\u0435\u0442\u0441\u044f \u0432 Life OS.' : 'Your password is handled by Supabase Auth and is never stored in Life OS.')
    : t.entry.privacy;

  const step: StepId = journeySteps[stepIndex] ?? 'entry';
  const phaseIndex = phaseIndexForStep(stepIndex);

  useEffect(() => {
    setHideShell(true);
    return () => setHideShell(false);
  }, [setHideShell]);

  const disciplineProfile = useMemo(() => deriveActivationProfile({
    cadence,
    sabotage,
    distractions,
    focusMinutes,
    dailyMinutes,
    energy,
  }), [cadence, dailyMinutes, distractions, energy, focusMinutes, sabotage]);

  const recommendedMode: ModeId = disciplineProfile.recommendedMode;
  const diagnosticKey = [cadence, sabotage.join(','), distractions.join(','), focusMinutes, dailyMinutes, energy].join('|');
  const selectedMode = selectedModeOverride?.diagnosticKey === diagnosticKey
    ? selectedModeOverride.mode
    : recommendedMode;

  const modes = useMemo(() => ({
    gentle: deriveActivationProgram({
      profileId: disciplineProfile.profileId,
      mode: 'gentle',
      focusMinutes,
      dailyMinutes,
    }),
    base: deriveActivationProgram({
      profileId: disciplineProfile.profileId,
      mode: 'base',
      focusMinutes,
      dailyMinutes,
    }),
    intensive: deriveActivationProgram({
      profileId: disciplineProfile.profileId,
      mode: 'intensive',
      focusMinutes,
      dailyMinutes,
    }),
  }), [dailyMinutes, disciplineProfile.profileId, focusMinutes]);

  const program = modes[selectedMode];
  const recommendedProgram = modes[recommendedMode];

  const adaptation = useMemo<'maintain' | 'reduce' | 'recovery'>(() => {
    if (outcome === 'failed' && energy === 'low') return 'recovery';
    if (outcome !== 'completed' || distractionMarks >= 3) return 'reduce';
    return 'maintain';
  }, [distractionMarks, energy, outcome]);

  const tomorrowProgram = useMemo(() => {
    if (adaptation === 'recovery') {
      return { focus: 10, volume: 30, tasks: 1 };
    }
    if (adaptation === 'reduce') {
      return {
        focus: Math.max(10, program.focus - 5),
        volume: Math.max(30, program.volume - 20),
        tasks: Math.max(2, program.tasks - 1),
      };
    }
    return program;
  }, [adaptation, program]);

  const canContinue = useMemo(() => {
    switch (step) {
      case 'entry':
        return !awaitingEmailConfirmation && email.includes('@') && password.length >= 8 && consent && (!production || privacyConsent);
      case 'commitment':
        return honestAgreement;
      case 'reality':
        return Boolean(cadence);
      case 'sabotage':
        return sabotage.length > 0;
      case 'distractions':
        return distractions.length > 0;
      case 'goal':
        return weeklyGoal.trim().length >= 8 && successCriterion.trim().length >= 5;
      case 'focus':
        return focusState === 'done';
      default:
        return true;
    }
  }, [awaitingEmailConfirmation, cadence, consent, distractions.length, email, focusState, honestAgreement, password.length, privacyConsent, production, sabotage.length, step, successCriterion, weeklyGoal]);

  const goNext = async () => {
    if (!canContinue || submitting) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      if (production && step === 'entry' && !registered) {
        if (!onRegister) throw new Error(isRu ? '\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044f \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430.' : 'Registration is unavailable.');
        if (!privacyConsent) {
          throw new Error(isRu ? '\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u0441\u043e\u0433\u043b\u0430\u0441\u0438\u0435 \u043d\u0430 \u043e\u0431\u0440\u0430\u0431\u043e\u0442\u043a\u0443 \u043f\u0435\u0440\u0441\u043e\u043d\u0430\u043b\u044c\u043d\u044b\u0445 \u0434\u0430\u043d\u043d\u044b\u0445.' : 'Confirm your personal data consent.');
        }
        const registration = await onRegister({ email: email.trim(), password });
        if (registration.status === 'confirmation-required') {
          setPassword('');
          setAwaitingEmailConfirmation(true);
          return;
        }
        setRegistered(true);
      }
      setStepIndex((current) => Math.min(current + 1, journeySteps.length - 1));
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : (isRu ? '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c.' : 'Could not continue.'));
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => {
    setStepIndex((current) => Math.max(0, current - 1));
  };
  const finishProduction = async () => {
    if (!onComplete || submitting) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      await onComplete({
        email: email.trim(),
        cadence,
        sabotage: [...sabotage],
        distractions: [...distractions],
        focusMinutes,
        dailyMinutes,
        energy,
        profileId: disciplineProfile.profileId,
        selectedMode,
        program: { ...program },
        weeklyGoal,
        successCriterion,
        goalReason,
        startTime,
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : (isRu ? '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0443.' : 'Could not save setup.'));
      setSubmitting(false);
    }
  };

  const restart = () => {
    setStepIndex(0);
    setEmail('');
    setPassword('');
    setConsent(false);
    setHonestAgreement(false);
    setCadence('');
    setSabotage([]);
    setDistractions([]);
    setFocusMinutes(25);
    setDailyMinutes(90);
    setEnergy('variable');
    setSelectedModeOverride(null);
    setWeeklyGoal('');
    setSuccessCriterion('');
    setGoalReason('');
    setStartTime('09:30');
    setFocusState('idle');
    setDistractionMarks(0);
    setOutcome('partial');
    setReviewFact('');
    setTomorrowChange('');
  };

  const profileCopy = t.profile.profiles[disciplineProfile.profileId];
  const ProfileIcon = PROFILE_ICONS[disciplineProfile.profileId];
  const profileEvidence = disciplineProfile.evidence;
  const rhythmEvidence = optionTitle(t.reality.options, profileEvidence.cadence);
  const sabotageEvidence = summarizeOptions(t.sabotage.options, profileEvidence.sabotage, t.profile.more);
  const distractionEvidence = summarizeOptions(t.distractions.options, profileEvidence.distractions, t.profile.more);
  const energyEvidence = optionTitle(t.capacity.energy, profileEvidence.energy);
  const capacityEvidence = format(t.profile.capacityEvidence, {
    energy: energyEvidence,
    focus: profileEvidence.focusMinutes,
    daily: profileEvidence.dailyMinutes,
  });

  const dailyResult = weeklyGoal.trim() || (isRu ? 'Первый измеримый фрагмент недельной цели' : 'First measurable piece of the weekly result');

  const renderStep = () => {
    switch (step) {
      case 'entry':
        return (
          <div className={styles.entryGrid}>
            <section className={styles.heroCopy}>
              <p className={styles.kicker}>{t.entry.label}</p>
              <h2>{t.entry.title}</h2>
              <p className={styles.lead}>{t.entry.text}</p>
              <div className={styles.valueList}>
                <span>{t.entry.valueTitle}</span>
                {t.entry.values.map((item, index) => (
                  <div key={item}>
                    <b>0{index + 1}</b>
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.formPanel} aria-label={t.stepNames[0]} data-confirmation-required={awaitingEmailConfirmation ? 'true' : undefined}>
              <div className={styles.formHeading}>
                <Lock size={18} aria-hidden="true" />
                <div>
                  <strong>{t.stepNames[0]}</strong>
                  <span>{journeyNote}</span>
                </div>
              </div>
              {awaitingEmailConfirmation && (
                <div className={styles.confirmationPanel} role="status">
                  <ShieldCheck size={28} aria-hidden="true" />
                  <div><strong>{isRu ? '\u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u043f\u043e\u0447\u0442\u0443' : 'Check your email'}</strong>
                  <p>{isRu ? '\u0410\u043a\u043a\u0430\u0443\u043d\u0442 \u0441\u043e\u0437\u0434\u0430\u043d. \u041f\u0435\u0440\u0435\u0439\u0434\u0438\u0442\u0435 \u043f\u043e \u0441\u0441\u044b\u043b\u043a\u0435 \u0432 \u043f\u0438\u0441\u044c\u043c\u0435. \u041f\u043e\u0441\u043b\u0435 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f Life OS \u043e\u0442\u043a\u0440\u043e\u0435\u0442\u0441\u044f \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438.' : 'Your account was created. Open the link in the email. Life OS will continue automatically after confirmation.'}</p></div>
                </div>
              )}
              <label className={styles.field}>
                <span>{t.entry.email}</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={t.entry.emailPlaceholder}
                  autoComplete="email"
                />
              </label>
              <label className={styles.field}>
                <span>{t.entry.password}</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={t.entry.passwordPlaceholder}
                  autoComplete="new-password"
                />
              </label>
              {production && (
                <div className={styles.checkboxRow}>
                  <input
                    id="lifeos-privacy-consent"
                    type="checkbox"
                    checked={privacyConsent}
                    onChange={(event) => setPrivacyConsent(event.target.checked)}
                  />
                  <span>
                    <label htmlFor="lifeos-privacy-consent">
                      {isRu ? 'Я даю отдельное согласие на обработку персональных данных.' : 'I separately consent to personal data processing.'}
                    </label>{' '}
                    <a href={`/${rawLocale}/legal/consent`} target="_blank" rel="noreferrer">
                      {isRu ? 'Открыть согласие' : 'Read consent'}
                    </a>{' · '}
                    <a href={`/${rawLocale}/legal/privacy`} target="_blank" rel="noreferrer">{isRu ? 'Политика обработки данных' : 'Privacy policy'}</a>
                    {' · '}
                    <a href={`/${rawLocale}/legal/cookies`} target="_blank" rel="noreferrer">{isRu ? 'Политика cookies' : 'Cookie policy'}</a>
                  </span>
                </div>
              )}
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                />
                <span>{t.entry.consent}</span>
              </label>
              <p className={styles.privacyNote}><Shield size={14} aria-hidden="true" />{privacyNote}</p>
              {production && submitError && <p role="alert" className={styles.privacyNote}>{submitError}</p>}
              {production && !awaitingEmailConfirmation && (
                <button type="button" className={`${styles.nextButton} ${styles.registrationSubmit}`} onClick={goNext} disabled={!canContinue || submitting}>
                  {submitting ? (isRu ? '\u041f\u043e\u0434\u043e\u0436\u0434\u0438\u0442\u0435\u2026' : 'Please wait...') : t.next}<ArrowRight size={17} />
                </button>
              )}
              {production && !awaitingEmailConfirmation && (
                <p className={styles.loginPrompt}>
                  {isRu ? 'Уже есть аккаунт?' : 'Already have an account?'}{' '}
                  <a className={styles.loginLink} href={`/${rawLocale}/login`}>
                    {isRu ? 'Войти' : 'Sign in'}
                  </a>
                </p>
              )}
            </section>
          </div>
        );

      case 'commitment':
        return (
          <section className={styles.narrowPanel}>
            <StepHeading label={t.commitment.label} title={t.commitment.title} text={t.commitment.text} />
            <div className={styles.principleGrid}>
              {t.commitment.principles.map((principle, index) => (
                <article key={principle.title}>
                  <span>0{index + 1}</span>
                  <div><strong>{principle.title}</strong><p>{principle.text}</p></div>
                </article>
              ))}
            </div>
            <label className={`${styles.checkboxRow} ${styles.commitmentCheck}`}>
              <input
                type="checkbox"
                checked={honestAgreement}
                onChange={(event) => setHonestAgreement(event.target.checked)}
              />
              <span>{t.commitment.agreement}</span>
            </label>
          </section>
        );

      case 'reality':
        return (
          <section className={styles.narrowPanel}>
            <StepHeading label={t.reality.label} title={t.reality.title} text={t.reality.text} />
            <ChoiceGrid options={t.reality.options} selected={cadence ? [cadence] : []} onSelect={setCadence} />
          </section>
        );

      case 'sabotage':
        return (
          <section className={styles.widePanel}>
            <StepHeading label={t.sabotage.label} title={t.sabotage.title} text={t.sabotage.text} />
            <ChoiceGrid options={t.sabotage.options} selected={sabotage} onSelect={(id) => setSabotage((values) => toggleValue(values, id))} multi compact />
          </section>
        );

      case 'distractions':
        return (
          <section className={styles.widePanel}>
            <StepHeading label={t.distractions.label} title={t.distractions.title} text={t.distractions.text} />
            <ChoiceGrid options={t.distractions.options} selected={distractions} onSelect={(id) => setDistractions((values) => toggleValue(values, id))} multi compact />
          </section>
        );

      case 'capacity':
        return (
          <section className={styles.widePanel}>
            <StepHeading label={t.capacity.label} title={t.capacity.title} text={t.capacity.text} />
            <div className={styles.capacityGrid}>
              <label className={styles.rangeCard}>
                <span><b>{t.capacity.focus}</b><strong>{format(t.capacity.minutes, { value: focusMinutes })}</strong></span>
                <input type="range" min="10" max="90" step="5" value={focusMinutes} onChange={(event) => setFocusMinutes(Number(event.target.value))} />
                <small><i>10</i><i>45</i><i>90</i></small>
              </label>
              <label className={styles.rangeCard}>
                <span><b>{t.capacity.daily}</b><strong>{format(t.capacity.minutes, { value: dailyMinutes })}</strong></span>
                <input type="range" min="30" max="240" step="15" value={dailyMinutes} onChange={(event) => setDailyMinutes(Number(event.target.value))} />
                <small><i>30</i><i>120</i><i>240</i></small>
              </label>
            </div>
            <div className={styles.subsection}>
              <span>{t.capacity.energyTitle}</span>
              <ChoiceGrid options={t.capacity.energy} selected={[energy]} onSelect={setEnergy} compact />
            </div>
          </section>
        );

      case 'profile': {
        const rhythmTone = profileEvidence.cadence === 'stable'
          ? 'good'
          : profileEvidence.cadence === 'rare' || profileEvidence.cadence === 'sometimes'
            ? 'risk'
            : 'neutral';
        const distractionTone = profileEvidence.distractions.length >= 3 ? 'risk' : 'neutral';
        const capacityTone = profileEvidence.energy === 'low' || profileEvidence.focusMinutes <= 20
          ? 'risk'
          : profileEvidence.energy === 'stable' && profileEvidence.focusMinutes >= 35
            ? 'good'
            : 'neutral';
        return (
          <section className={styles.profilePanel}>
            <StepHeading label={t.profile.label} title={t.profile.title} text={t.profile.text} />
            <div className={styles.profileGrid}>
              <article className={styles.profileIdentity}>
                <div className={styles.profileSignal} data-profile={disciplineProfile.profileId}><ProfileIcon size={24} aria-hidden="true" /></div>
                <span>{t.profile.dominantLabel}</span>
                <h2>{profileCopy.name}</h2>
                <p>{profileCopy.insight}</p>
              </article>
              <div className={styles.profileEvidence}>
                <span>{t.profile.basisTitle}</span>
                <div className={styles.markerGrid}>
                  <Metric label={t.profile.markers.rhythm} value={rhythmEvidence} tone={rhythmTone} />
                  <Metric label={t.profile.markers.sabotage} value={sabotageEvidence} tone="neutral" />
                  <Metric label={t.profile.markers.distractions} value={distractionEvidence} tone={distractionTone} />
                  <Metric label={t.profile.markers.capacity} value={capacityEvidence} tone={capacityTone} />
                </div>
              </div>
            </div>
            <div className={styles.profileScenario} data-profile-scenario={disciplineProfile.profileId}>
              <header>
                <div><span>{t.profile.scenarioTitle}</span><strong>{t.program.modes[recommendedMode].title}</strong></div>
                <small>{recommendedProgram.focus} {isRu ? 'мин' : 'min'} · {recommendedProgram.blocks} {isRu ? 'бл.' : 'blocks'} · {recommendedProgram.volume} {isRu ? 'мин/день' : 'min/day'}</small>
              </header>
              <dl>
                <div><dt>{t.profile.scenarioLabels.start}</dt><dd>{profileCopy.scenario.start}</dd></div>
                <div><dt>{t.profile.scenarioLabels.focus}</dt><dd>{profileCopy.scenario.focus}</dd></div>
                <div><dt>{t.profile.scenarioLabels.setback}</dt><dd>{profileCopy.scenario.setback}</dd></div>
              </dl>
            </div>
            <div className={styles.insightBar}><Eye size={17} aria-hidden="true" /><div><span>{t.profile.insightTitle}</span><p>{profileCopy.insight}</p></div></div>
          </section>
        );
      }

      case 'program':
        return (
          <section className={styles.widePanel}>
            <StepHeading label={t.program.label} title={t.program.title} text={t.program.text} />
            <div className={styles.modeGrid}>
              {(Object.keys(t.program.modes) as ModeId[]).map((modeId) => {
                const mode = t.program.modes[modeId];
                const params = modes[modeId];
                const selected = selectedMode === modeId;
                return (
                  <button
                    key={modeId}
                    type="button"
                    className={styles.modeCard}
                    data-selected={selected ? 'true' : undefined}
                    aria-pressed={selected}
                    onClick={() => setSelectedModeOverride({ mode: modeId, diagnosticKey })}
                  >
                    <span className={styles.modeTopline}>
                      <strong>{mode.title}</strong>
                      {recommendedMode === modeId && <em>{t.program.recommended}</em>}
                    </span>
                    <p>{mode.text}</p>
                    <dl>
                      <div><dt>{t.program.focus}</dt><dd>{params.focus} {isRu ? 'мин' : 'min'}</dd></div>
                      <div><dt>{t.program.blocks}</dt><dd>{params.blocks}</dd></div>
                      <div><dt>{t.program.volume}</dt><dd>{params.volume} {isRu ? 'мин' : 'min'}</dd></div>
                      <div><dt>{t.program.tasks}</dt><dd>{params.tasks}</dd></div>
                    </dl>
                    {selected && <span className={styles.selectedFlag}><Check size={13} />{t.program.selected}</span>}
                  </button>
                );
              })}
            </div>
            <p className={styles.explanation}><Shield size={15} aria-hidden="true" />{t.program.explanation}</p>
          </section>
        );

      case 'goal':
        return (
          <section className={styles.goalGrid}>
            <div>
              <StepHeading label={t.goal.label} title={t.goal.title} text={t.goal.text} />
              <div className={styles.ruleCard}><Target size={19} aria-hidden="true" /><p>{t.goal.rule}</p></div>
            </div>
            <div className={styles.goalForm}>
              <label className={styles.field}><span>{t.goal.goalLabel}</span><textarea rows={3} value={weeklyGoal} onChange={(event) => setWeeklyGoal(event.target.value)} placeholder={t.goal.goalPlaceholder} /></label>
              <label className={styles.field}><span>{t.goal.criterionLabel}</span><input value={successCriterion} onChange={(event) => setSuccessCriterion(event.target.value)} placeholder={t.goal.criterionPlaceholder} /></label>
              <label className={styles.field}><span>{t.goal.whyLabel}</span><input value={goalReason} onChange={(event) => setGoalReason(event.target.value)} placeholder={t.goal.whyPlaceholder} /></label>
            </div>
          </section>
        );

      case 'day':
        return (
          <section className={styles.dayGrid}>
            <div>
              <StepHeading label={t.day.label} title={t.day.title} text={t.day.text} />
              <label className={styles.timeField}><Clock size={17} aria-hidden="true" /><span>{t.day.start}</span><input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label>
              <div className={styles.daySummary}>
                <span>{t.day.dailyResult}</span><strong>{dailyResult}</strong>
                <span>{t.day.minimum}</span><p>{t.day.minimumValue}</p>
              </div>
            </div>
            <ol className={styles.timeline}>
              <TimelineItem time={startTime} title={t.day.timeline.prepare} text={profileCopy.scenario.start} icon={<Shield size={16} />} />
              <TimelineItem time={addMinutes(startTime, 15)} title={t.day.timeline.focus} text={t.day.timeline.focusText} icon={<Target size={16} />} active meta={`${program.focus} ${isRu ? 'мин' : 'min'}`} />
              <TimelineItem time={addMinutes(startTime, 15 + program.focus + 10)} title={t.day.timeline.capture} text={t.day.timeline.captureText} icon={<Flag size={16} />} />
            </ol>
          </section>
        );

      case 'focus': {
        const timerValue = focusState === 'running'
          ? `${String(Math.max(program.focus - 1, 0)).padStart(2, '0')}:42`
          : `${String(program.focus).padStart(2, '0')}:00`;
        const timerProgress = focusState === 'idle' ? 0 : focusState === 'running' ? 0.18 : 1;
        const modeTitle = selectedMode === 'gentle'
          ? t.program.modes.gentle.title
          : selectedMode === 'base'
            ? t.program.modes.base.title
            : t.program.modes.intensive.title;
        return (
          <section className={styles.focusGrid}>
            <div>
              <StepHeading label={t.focus.label} title={t.focus.title} text={t.focus.text} />
              <div className={styles.focusTask}><span>{t.day.dailyResult}</span><strong>{dailyResult}</strong></div>
              <p className={styles.focusGuard}><Shield size={15} />{profileCopy.scenario.focus}</p>
            </div>
            <div
              className={styles.timerPanel}
              data-state={focusState}
              data-running={focusState === 'running' ? 'true' : undefined}
            >
              <div className={styles.timerDial}>
                <PrototypeTimerWaveform active={focusState === 'running'} />
                <PrototypeTimerRing progress={timerProgress} />
                <div
                  className={styles.timerContent}
                  role="timer"
                  aria-label={`${focusState === 'idle' ? t.focus.idle : focusState === 'running' ? t.focus.running : t.focus.done}: ${timerValue}`}
                >
                  <span>{focusState === 'idle' ? t.focus.idle : focusState === 'running' ? t.focus.running : t.focus.done}</span>
                  <strong>{timerValue}</strong>
                  <small>{modeTitle} · {program.focus} {isRu ? 'мин' : 'min'}</small>
                </div>
              </div>
              {focusState === 'idle' ? (
                <button type="button" className={styles.focusPrimary} onClick={() => setFocusState('running')}><Play size={17} fill="currentColor" />{t.focus.start}</button>
              ) : focusState === 'running' ? (
                <div className={styles.focusActions}>
                  <button type="button" onClick={() => setDistractionMarks((count) => count + 1)}><Eye size={16} />{t.focus.mark}</button>
                  <button type="button" onClick={() => setFocusState('done')}><Pause size={16} />{t.focus.stop}</button>
                </div>
              ) : (
                <div className={styles.focusComplete}><Check size={18} /><span>{t.focus.done}</span></div>
              )}
              <p aria-live="polite">{format(t.focus.marked, { count: distractionMarks })}</p>
            </div>
          </section>
        );
      }

      case 'review': {
        const actualMinutes = outcome === 'completed' ? program.focus : outcome === 'partial' ? Math.max(5, Math.round(program.focus * 0.6)) : 0;
        return (
          <section className={styles.reviewGrid}>
            <div>
              <StepHeading label={t.review.label} title={t.review.title} text={t.review.text} />
              <div className={styles.factStrip}>
                <Metric label={t.review.planned} value={`${program.focus} ${isRu ? 'мин' : 'min'}`} tone="neutral" />
                <Metric label={t.review.actual} value={`${actualMinutes} ${isRu ? 'мин' : 'min'}`} tone={actualMinutes === program.focus ? 'good' : 'risk'} />
                <Metric label={t.review.distractions} value={String(distractionMarks)} tone={distractionMarks >= 3 ? 'risk' : 'neutral'} />
              </div>
              <div className={styles.subsection}>
                <span>{t.review.resultTitle}</span>
                <ChoiceGrid options={t.review.outcomes} selected={[outcome]} onSelect={(id) => setOutcome(id as OutcomeId)} compact />
              </div>
            </div>
            <div className={styles.reviewForm}>
              <label className={styles.field}><span>{t.review.fact}</span><textarea rows={4} value={reviewFact} onChange={(event) => setReviewFact(event.target.value)} placeholder={t.review.factPlaceholder} /></label>
              <label className={styles.field}><span>{t.review.plan}</span><textarea rows={4} value={tomorrowChange} onChange={(event) => setTomorrowChange(event.target.value)} placeholder={t.review.planPlaceholder} /></label>
            </div>
          </section>
        );
      }

      case 'adaptation': {
        const title = adaptation === 'maintain' ? t.adaptation.maintainTitle : adaptation === 'reduce' ? t.adaptation.reduceTitle : t.adaptation.recoveryTitle;
        const text = adaptation === 'maintain' ? t.adaptation.maintainText : adaptation === 'reduce' ? t.adaptation.reduceText : t.adaptation.recoveryText;
        return (
          <section className={styles.adaptationPanel} data-decision={adaptation}>
            <p className={styles.kicker}>{t.adaptation.label}</p>
            <div className={styles.decisionSignal}><span><Check size={25} /></span><small>{t.adaptation.reason}</small></div>
            <h1>{title}</h1>
            <p className={styles.lead}>{text}</p>
            <div className={styles.tomorrowCard}>
              <span>{t.adaptation.tomorrow}</span>
              <dl>
                <div><dt><Timer size={16} />{t.adaptation.focus}</dt><dd>{tomorrowProgram.focus} {isRu ? 'мин' : 'min'}</dd></div>
                <div><dt><Gauge size={16} />{t.adaptation.volume}</dt><dd>{tomorrowProgram.volume} {isRu ? 'мин' : 'min'}</dd></div>
                <div><dt><Target size={16} />{t.adaptation.actions}</dt><dd>{tomorrowProgram.tasks}</dd></div>
              </dl>
            </div>
            <p className={styles.returnReason}><ArrowRight size={16} />{profileCopy.scenario.setback}</p>
          </section>
        );
      }
    }
  };

  if (production && step === 'entry') {
    return (
      <div className={`${styles.viewport} ${styles.registrationViewport}`} data-testid="activation-prototype">
        <main className={styles.registrationWorkspace}>
          <div className={styles.registrationCard}>
            <div className={styles.registrationBrand}>
              <Image className={styles.brandLogo} src="/brand/life-os-mark.png" alt="" aria-hidden="true" width={540} height={480} sizes="44px" unoptimized />
              <div><strong>Life OS</strong><small>discipline system</small></div>
            </div>
            <header className={styles.registrationHeader}>
              <p className={styles.kicker}>{t.eyebrow}</p>
              <h1>{t.stepNames[0]}</h1>
              <p className={styles.lead}>{isRu ? '\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 email \u2014 \u043f\u043e\u0441\u043b\u0435 \u044d\u0442\u043e\u0433\u043e \u043e\u0442\u043a\u0440\u043e\u044e\u0442\u0441\u044f \u0448\u0430\u0433\u0438 \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438.' : 'Confirm your email to open the setup steps.'}</p>
            </header>
            <div className={styles.registrationEntry} aria-live="polite">
              {renderStep()}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.viewport} data-testid="activation-prototype">
      <aside className={styles.rail} aria-label={isRu ? 'Этапы активации' : 'Activation phases'}>
        <div className={styles.brand}>
          <Image className={styles.brandLogo} src="/brand/life-os-mark.png" alt="" aria-hidden="true" width={540} height={480} sizes="44px" unoptimized />
          <div><strong>Life OS</strong><small>discipline system</small></div>
        </div>
        <div className={styles.railIntro}>
          <span>{t.eyebrow}</span>
          <p>{journeyNote}</p>
        </div>
        <ol className={styles.phaseList}>
          {t.phases.map((phase, index) => (
            <li key={phase.title} data-active={index === phaseIndex ? 'true' : undefined} data-complete={index < phaseIndex ? 'true' : undefined}>
              <span>{index < phaseIndex ? <Check size={13} /> : `0${index + 1}`}</span>
              <div><strong>{phase.title}</strong><small>{phase.detail}</small></div>
            </li>
          ))}
        </ol>
        <div className={styles.railFooter}>
          <Shield size={15} aria-hidden="true" />
          <span>{isRu ? 'Строго к фактам. Бережно к человеку.' : 'Strict with evidence. Humane with people.'}</span>
        </div>
      </aside>

      <main className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.mobileBrand}>
            <Image className={styles.brandLogo} src="/brand/life-os-mark.png" alt="" aria-hidden="true" width={540} height={480} sizes="44px" unoptimized />
            <strong>Life OS</strong>
          </div>
          <div className={styles.stepMeta}>
            <span>{t.stepNames[STEPS.indexOf(step)]}</span>
            <small>{format(t.progress, { current: stepIndex + 1, total: journeySteps.length })}</small>
          </div>
          <div className={styles.progressTrack} role="progressbar" aria-valuemin={1} aria-valuemax={journeySteps.length} aria-valuenow={stepIndex + 1} aria-label={t.progress.replace('{current}', String(stepIndex + 1)).replace('{total}', String(journeySteps.length))}>
            <span style={{ transform: `scaleX(${(stepIndex + 1) / journeySteps.length})` }} />
          </div>
        </header>

        <div className={styles.stage}>
          <div key={step} className={styles.stageInner} aria-live="polite">
            {renderStep()}
          </div>
        </div>

        <footer className={styles.controls}>
          <button type="button" className={styles.backButton} onClick={goBack} disabled={stepIndex === 0}>
            <ArrowLeft size={17} />
            <span>{t.back}</span>
          </button>
          <div className={styles.stepDots} aria-hidden="true">
            {journeySteps.map((item, index) => <span key={item} data-active={index === stepIndex ? 'true' : undefined} data-complete={index < stepIndex ? 'true' : undefined} />)}
          </div>
          {submitError && <p role="alert" className={styles.privacyNote}>{submitError}</p>}
          {production && step === 'day' ? (
            <button type="button" className={styles.nextButton} onClick={finishProduction} disabled={submitting}>
              {submitting ? (isRu ? '\u0421\u043e\u0445\u0440\u0430\u043d\u044f\u0435\u043c\u2026' : 'Saving...') : (isRu ? '\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043c\u043e\u0439 \u0434\u0435\u043d\u044c' : 'Open my day')}<ArrowRight size={17} />
            </button>
          ) : step === 'adaptation' ? (
            <button type="button" className={styles.nextButton} onClick={restart}>
              <RotateCcw size={17} />{t.finish}
            </button>
          ) : (
            <button type="button" className={styles.nextButton} onClick={goNext} disabled={!canContinue || submitting}>
              {submitting ? (isRu ? '\u041f\u043e\u0434\u043e\u0436\u0434\u0438\u0442\u0435\u2026' : 'Please wait...') : t.next}<ArrowRight size={17} />
            </button>
          )}
        </footer>
      </main>
    </div>
  );
}

function StepHeading({ label, title, text }: { label: string; title: string; text: string }) {
  return (
    <header className={styles.heading}>
      <p className={styles.kicker}>{label}</p>
      <h1>{title}</h1>
      <p className={styles.lead}>{text}</p>
    </header>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: 'good' | 'risk' | 'neutral' }) {
  return (
    <div className={styles.metric} data-tone={tone}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TimelineItem({ time, title, text, icon, active, meta }: { time: string; title: string; text: string; icon: React.ReactNode; active?: boolean; meta?: string }) {
  return (
    <li className={styles.timelineItem} data-active={active ? 'true' : undefined}>
      <time>{time}</time>
      <span className={styles.timelineIcon}>{icon}</span>
      <div><strong>{title}</strong><p>{text}</p>{meta && <small>{meta}</small>}</div>
    </li>
  );
}
