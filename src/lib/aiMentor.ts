import { GoalAnalysis, MentorContext } from '@/types';
import {
  callAI,
  buildGoalAnalysisPrompt,
  buildMentorPrompt,
  buildDailyTrajectoryPrompt,
  type DailyTrajectoryPromptInput,
  type GoalAnalysisLocale,
} from './aiClient';
import { CACHE_CONFIGS } from './aiCache';
import { analyzeGoal as mockAnalyzeGoal, generateMentorMessage as mockGenerateMentorMessage } from './mockMentor';
import { getMentorOfflineOnly } from './aiPreferences';
import { clamp, getTodayDate } from './utils';
import { deadlineForCalendarDuration } from './goalCalendar';

// ——— Shared AI-with-mock-fallback helper ———

async function withAiFallback<T>(
  aiCall: () => Promise<T | null>,
  mockFallback: () => T,
  label: string
): Promise<T> {
  try {
    const result = await aiCall();
    if (result !== null) return result;
  } catch (error) {
    console.log(`${label} failed, using mock:`, error);
  }
  return mockFallback();
}

export interface DailyTrajectoryPayload {
  microGoal: string;
  weeklyLink: string;
  learningTitle: string;
  learningDescription: string;
  practiceTitle: string;
  practiceDescription: string;
  outputTitle: string;
  outputDescription: string;
  risk: string;
  minimumAction: string;
}

const TRAJ_TITLE_MAX = 78;
const TRAJ_DESC_MAX = 520;
const TRAJ_MICRO_MAX = 160;
const TRAJ_LINK_MAX = 360;

function clipStr(s: string, max: number): string {
  const t = s.trim();
  if (!t) return t;
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function parseDailyTrajectory(content: string): DailyTrajectoryPayload | null {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const data = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    const req = [
      'microGoal',
      'weeklyLink',
      'learningTitle',
      'learningDescription',
      'practiceTitle',
      'practiceDescription',
      'outputTitle',
      'outputDescription',
    ] as const;

    for (const k of req) {
      if (typeof data[k] !== 'string' || !(data[k] as string).trim()) return null;
    }

    const risk = typeof data.risk === 'string' ? data.risk.trim() : '';
    const minimumAction = typeof data.minimumAction === 'string' ? data.minimumAction.trim() : '';

    return {
      microGoal: clipStr(data.microGoal as string, TRAJ_MICRO_MAX),
      weeklyLink: clipStr(data.weeklyLink as string, TRAJ_LINK_MAX),
      learningTitle: clipStr(data.learningTitle as string, TRAJ_TITLE_MAX),
      learningDescription: clipStr(data.learningDescription as string, TRAJ_DESC_MAX),
      practiceTitle: clipStr(data.practiceTitle as string, TRAJ_TITLE_MAX),
      practiceDescription: clipStr(data.practiceDescription as string, TRAJ_DESC_MAX),
      outputTitle: clipStr(data.outputTitle as string, TRAJ_TITLE_MAX),
      outputDescription: clipStr(data.outputDescription as string, TRAJ_DESC_MAX),
      risk: risk ? clipStr(risk, 220) : '',
      minimumAction: minimumAction ? clipStr(minimumAction, 220) : '',
    };
  } catch {
    return null;
  }
}

export async function generateDailyTrajectoryAsync(
  input: DailyTrajectoryPromptInput
): Promise<DailyTrajectoryPayload | null> {
  try {
    const response = await callAI({
      prompt: buildDailyTrajectoryPrompt(input),
      mode: 'standard',
      context: { dayOrdinal: input.dayOrdinal },
      cacheConfig: CACHE_CONFIGS.dailyTrajectory,
    });
    if (response.fallback || !response.content) return null;
    return parseDailyTrajectory(response.content);
  } catch (error) {
    console.log('Daily trajectory AI failed:', error);
    return null;
  }
}

// ——— Async Goal Analysis with AI fallback ———

export async function analyzeGoalAsync(
  input: string,
  userLevel: number,
  locale: GoalAnalysisLocale = 'ru'
): Promise<GoalAnalysis> {
  return withAiFallback(
    async () => {
      const response = await callAI({
        prompt: buildGoalAnalysisPrompt(input, locale),
        mode: 'standard',
        context: { userLevel },
        cacheConfig: CACHE_CONFIGS.goalAnalysis,
      });
      if (response.fallback || !response.content) return null;
      return parseGoalAnalysis(response.content);
    },
    () => mockAnalyzeGoal(input, userLevel, locale),
    'AI analysis'
  );
}

function parseGoalAnalysis(content: string): GoalAnalysis | null {
  try {
    // Try to find JSON in response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const data = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!data.rewrittenGoal || !data.externalResult || typeof data.realismScore !== 'number') {
      return null;
    }

    // Backward-compat: some prompts/responses send `suggestedDeadline` as a number-of-days string.
    const rawDays =
      Number(data.suggestedDeadlineDays) ||
      parseInt(String(data.suggestedDeadline ?? ''), 10);
    const days = clamp(Number.isFinite(rawDays) && rawDays > 0 ? rawDays : 14, 3, 90);

    const rawMinutes = Number(data.suggestedFirstActionMinutes);
    const minutes = clamp(Number.isFinite(rawMinutes) && rawMinutes > 0 ? rawMinutes : 30, 5, 60);

    return {
      originalInput: data.originalInput || '',
      rewrittenGoal: data.rewrittenGoal,
      externalResult: data.externalResult,
      realismScore: clamp(data.realismScore, 0, 100),
      warnings: Array.isArray(data.warnings) ? data.warnings : [],
      suggestedDeadline: deadlineForCalendarDuration(getTodayDate(), days),
      suggestedDeadlineDays: days,
      suggestedFirstAction: data.suggestedFirstAction || 'Сделать первый шаг',
      suggestedFirstActionMinutes: minutes,
    };
  } catch {
    return null;
  }
}

// ——— Async Mentor Message with AI fallback ———

export async function generateMentorMessageAsync(
  context: MentorContext,
  voiceTone?: string
): Promise<string> {
  if (typeof window !== 'undefined' && getMentorOfflineOnly()) {
    return mockGenerateMentorMessage(context);
  }

  return withAiFallback(
    async () => {
      const response = await callAI({
        prompt: buildMentorPrompt(context.event, {
          abyssIndex: context.abyssIndex,
          innerCore: context.innerCore,
          verdict: context.verdict,
          dayBrief: context.dayBrief,
          courtHistoryCount: context.courtHistoryCount,
        }),
        mode: context.mode,
        voiceTone,
        context: {
          abyssIndex: context.abyssIndex,
          innerCore: context.innerCore,
        },
        cacheConfig: CACHE_CONFIGS.mentorMessage,
      });
      if (response.fallback || !response.content) return null;
      return response.content.trim();
    },
    () => mockGenerateMentorMessage(context),
    'AI mentor'
  );
}

export { fetchAIHealth, isAIAvailable, clearAIHealthCache } from './aiHealth';
export type { AIHealthResult, AIHealthReason } from './aiHealth';
