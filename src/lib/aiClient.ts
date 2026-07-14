import { resolveApiPath } from '@/lib/capacitor/apiUrl';
import { StrictnessMode } from '@/types';
import {
  getCachedAIResponse,
  setCachedAIResponse,
  CACHE_CONFIGS,
  CacheConfig,
} from './aiCache';

const DEFAULT_MODEL = 'google/gemini-flash-1.5';

interface AIRequest {
  prompt: string;
  mode?: StrictnessMode;
  model?: string;
  voiceTone?: string;
  context?: Record<string, unknown>;
  cacheConfig?: CacheConfig;
}

interface AIResponse {
  content?: string;
  error?: string;
  fallback: boolean;
  cached?: boolean;
}

export async function callAI({
  prompt,
  mode = 'standard',
  model = DEFAULT_MODEL,
  voiceTone,
  context,
  cacheConfig,
}: AIRequest): Promise<AIResponse> {
  const tone = voiceTone || 'default';

  // Check cache first
  if (cacheConfig) {
    const cached = getCachedAIResponse(prompt, mode, model, tone, cacheConfig);
    if (cached !== undefined) {
      return { content: cached, fallback: false, cached: true };
    }
  }

  try {
    const response = await fetch(resolveApiPath('/api/ai'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        mode,
        model,
        context: {
          ...context,
          strictnessMode: mode,
          voiceTone: tone,
        },
      }),
    });

    const data = await response.json();

    // Store in cache if successful
    if (!data.fallback && data.content && cacheConfig) {
      setCachedAIResponse(prompt, mode, model, tone, cacheConfig, data.content);
    }

    return {
      content: data.content,
      error: data.error,
      fallback: data.fallback || false,
      cached: false,
    } as AIResponse;
  } catch (error) {
    console.error('AI call failed:', error);
    return { error: 'Network error', fallback: true };
  }
}

// Helper to build prompts for different scenarios
export type GoalAnalysisLocale = 'ru' | 'en';

export function buildGoalAnalysisPrompt(
  input: string,
  locale: GoalAnalysisLocale = 'ru'
): string {
  if (locale === 'en') {
    return `Analyze this goal: "${input}"

Return STRICT JSON with this exact shape (no markdown wrapper and no comments):
{
  "rewrittenGoal": "the goal rewritten as an external result",
  "externalResult": "a concrete visible result",
  "realismScore": a number from 0 to 100,
  "warnings": ["warning 1", "warning 2"],
  "suggestedDeadlineDays": an integer from 3 to 90,
  "suggestedFirstAction": "the first action in 1-2 sentences; do not mention minutes because they have a separate field",
  "suggestedFirstActionMinutes": an integer from 5 to 60
}

Rules:
- Write every human-readable JSON string in English.
- Rewrite the goal around an EXTERNAL result (not "learn", but "make and show").
- realismScore: 70+ when concrete and realistic, 50-69 when vague, below 50 when unrealistic.
- warnings: process language, missing deadline, or excessive ambition.
- suggestedDeadlineDays must be an INTEGER with no words.
- suggestedFirstActionMinutes must be an INTEGER with no words.`;
  }

  return `Проанализируй цель: "${input}"

Верни СТРОГО JSON следующей формы (без markdown-обёртки, без комментариев):
{
  "rewrittenGoal": "цель переписанная на внешний результат",
  "externalResult": "конкретный видимый результат",
  "realismScore": число от 0 до 100,
  "warnings": ["предупреждение 1", "предупреждение 2"],
  "suggestedDeadlineDays": число дней от 3 до 90,
  "suggestedFirstAction": "первый шаг (1-2 предложения, без ссылок на минуты — это поле отдельное)",
  "suggestedFirstActionMinutes": число минут от 5 до 60
}

Правила:
- Цель должна быть переписана на ВНЕШНИЙ результат (не "учиться", а "сделать и показать").
- realismScore: 70+ если конкретно и реально, 50-69 если расплывчато, <50 если фантастика.
- warnings: процессный язык / отсутствие дедлайна / чрезмерная амбициозность.
- suggestedDeadlineDays: ЦЕЛОЕ число дней (никаких слов — только число).
- suggestedFirstActionMinutes: ЦЕЛОЕ число минут на первый шаг (никаких слов — только число).`;
}

export function buildMentorPrompt(event: string, context?: Record<string, unknown>): string {
  const abyssIndex = context?.abyssIndex as number | undefined;
  const innerCore = context?.innerCore as number | undefined;
  const verdict = context?.verdict as string | undefined;
  const courtHistoryCount = context?.courtHistoryCount as number | undefined;
  const dayBrief = context?.dayBrief as string | undefined;

  let prompt = `Событие: ${event}\n`;

  if (abyssIndex !== undefined) {
    prompt += `Индекс пропасти: ${abyssIndex}%\n`;
  }
  if (innerCore !== undefined) {
    prompt += `Внутренний стержень: ${innerCore}%\n`;
  }
  if (verdict !== undefined && String(verdict).trim()) {
    prompt += `Вердикт: ${String(verdict).trim()}\n`;
  }
  if (courtHistoryCount !== undefined && Number.isFinite(courtHistoryCount)) {
    prompt += `Записей разбора дня в истории: ${courtHistoryCount}\n`;
  }
  const brief = dayBrief?.trim();
  if (brief) {
    prompt += `\nКонтекст дня:\n${brief.slice(0, 900)}${brief.length > 900 ? '…' : ''}\n`;
  }

  prompt += `\nДай короткое сообщение (1-2 предложения) без мотивационной риторики. Факты и действия.`;

  return prompt;
}

// Export cache utilities for external use
export { getCacheStats, clearCache } from './aiCache';

export type DailyTrajectoryLocale = 'ru' | 'en';

export interface DailyTrajectoryPromptInput {
  weeklyGoalTitle: string;
  weeklyOriginalInput: string;
  externalResult: string;
  deadline: string;
  dayOrdinal: number;
  locale: DailyTrajectoryLocale;
}

export function buildDailyTrajectoryPrompt(p: DailyTrajectoryPromptInput): string {
  const lang = p.locale === 'en' ? 'English' : 'Russian';
  return `You are a planning coach. The user has a WEEKLY / horizon goal. Today is day ${p.dayOrdinal} on their path (sequential day count since they started daily orders).

Weekly working goal (title): "${p.weeklyGoalTitle}"
Original wording: "${p.weeklyOriginalInput}"
Target external / measurable outcome: "${p.externalResult}"
Deadline (if any): "${p.deadline}"

Task: Propose ONE coherent day that advances the weekly goal. The day must feel like a micro-stage, not three unrelated chores.

Rules (internal — do not repeat verbatim to user):
- microGoal states ONLY today's micro-goal. Do not repeat the weekly title, do not start with "Day N toward …", and do not describe the whole week.
- weeklyLink explains in plain language how today moves the needle (answer: "how does today advance the week?"). It may name the weekly target, but it must stay separate from the micro-goal.
- learning, practice, and output MUST refer to the SAME thread: learn what is needed for today's micro-stage → apply it → ship a small visible artifact (post, message, prototype, case snippet, test, portfolio piece, client touchpoint, etc.). Prefer real-world application when natural; never force monetization wording.
- Tasks must be doable in one day, concrete, not generic "study something".
- Do not use "Done:", "Сделано:", or any wording that implies the step has already been completed. The plan is created before work starts.
- Do NOT add parentheses with "today"/"сегодня" or similar date qualifiers to task titles — they are already daily tasks.
- outputTitle is the daily boss task. It should describe the day's external deliverable, not a vague "visible step".
- If the goal is about earning money with websites / landing pages / client work, prefer a client-acquisition day: define target buyers, write a proposal/offer, and send 10-20 quality personalized outreaches or responses. Do not suggest only 3 headlines/offers; that is too little for market response.
- All string values MUST be written in ${lang} for the user interface.

Return STRICTLY JSON (no markdown fences, no comments):
{
  "microGoal": "one short headline, max ~120 chars",
  "weeklyLink": "1-2 sentences",
  "learningTitle": "max ~70 chars, specific",
  "learningDescription": "what to learn and why for today's micro-goal",
  "practiceTitle": "max ~70 chars",
  "practiceDescription": "exercise tied to what was learned",
  "outputTitle": "max ~70 chars, visible outcome",
  "outputDescription": "what to publish/deliver/show; link to weekly outcome",
  "risk": "optional: one plausible derail risk for today",
  "minimumAction": "optional: tiny fallback first step if stuck"
}

Omit risk and minimumAction only if you have nothing useful; then use empty string "".`;
}
