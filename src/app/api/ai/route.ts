import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AUTH_COOKIE_NAME, getAuthConfig, verifyAuthSessionCookie } from '@/lib/auth';
import { getClientIp, rateLimit } from '@/lib/rateLimit';

const ALLOWED_MODELS = [
  'google/gemini-flash-1.5',
  'google/gemini-flash-1.5-8b',
] as const;
const DEFAULT_MODEL = ALLOWED_MODELS[0];

const ALLOWED_TONES = ['default', 'cold', 'warm', 'neutral', 'firm'] as const;
const ALLOWED_MODES = ['soft', 'standard', 'hard', 'owner'] as const;

const ContextSchema = z
  .object({
    voiceTone: z.enum(ALLOWED_TONES).default('default'),
    strictnessMode: z.enum(ALLOWED_MODES).optional(),
    abyssIndex: z.number().min(0).max(100).optional(),
    innerCore: z.number().min(0).max(100).optional(),
    verdict: z.string().max(64).optional(),
  })
  .strip()
  .default({ voiceTone: 'default' });

const BodySchema = z.object({
  prompt: z.string().min(1).max(2000),
  mode: z.enum(ALLOWED_MODES).default('standard'),
  model: z.enum(ALLOWED_MODELS).optional(),
  context: ContextSchema,
});

type Body = z.infer<typeof BodySchema>;

/** Normalized origin: scheme + host (+ port), no path — for safe equality checks (no prefix bypass). */
function normalizeOrigin(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  try {
    if (/^https?:\/\//i.test(s)) {
      const u = new URL(s);
      return `${u.protocol}//${u.host}`;
    }
    const withScheme =
      s.startsWith('localhost') || /^127\./.test(s) ? `http://${s}` : `https://${s}`;
    const u = new URL(withScheme);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

function requestOrigin(req: NextRequest): string | null {
  const o = req.headers.get('origin');
  if (o) {
    const n = normalizeOrigin(o);
    if (n) return n;
  }
  const ref = req.headers.get('referer');
  if (ref) {
    try {
      const u = new URL(ref);
      return `${u.protocol}//${u.host}`;
    } catch {
      return null;
    }
  }
  return null;
}

function isAllowedOrigin(req: NextRequest): boolean {
  const candidate = requestOrigin(req);
  if (!candidate) return false;

  const host = req.headers.get('host');
  const sameOriginCandidates = [
    normalizeOrigin(req.nextUrl.origin),
    host ? normalizeOrigin(`${req.nextUrl.protocol}//${host}`) : null,
  ].filter((origin): origin is string => Boolean(origin));

  if (sameOriginCandidates.includes(candidate)) {
    return true;
  }

  const raw = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!raw.length) {
    return process.env.NODE_ENV !== 'production';
  }

  const allowList = raw.map((r) => normalizeOrigin(r)).filter((x): x is string => Boolean(x));
  if (!allowList.length) {
    console.error('[api/ai] ALLOWED_ORIGINS has no valid origin URLs');
    return process.env.NODE_ENV !== 'production';
  }

  return allowList.includes(candidate);
}

function getRateLimitIp(request: NextRequest): string {
  return getClientIp({ headers: request.headers });
}

async function isAuthorizedAppRequest(request: NextRequest): Promise<NextResponse | null> {
  const authConfig = getAuthConfig();
  if (authConfig.mode === 'disabled') return null;
  if (authConfig.mode === 'misconfigured') {
    return NextResponse.json(
      { error: 'Auth misconfigured', fallback: true },
      { status: 503 },
    );
  }

  const validSession = await verifyAuthSessionCookie(request.cookies.get(AUTH_COOKIE_NAME)?.value);
  if (validSession) return null;

  return NextResponse.json(
    { error: 'Unauthorized', fallback: true },
    { status: 401 },
  );
}

export async function POST(request: NextRequest) {
  const unauthorized = await isAuthorizedAppRequest(request);
  if (unauthorized) return unauthorized;

  if (!isAllowedOrigin(request)) {
    return NextResponse.json(
      { error: 'Forbidden origin', fallback: true },
      { status: 403 }
    );
  }

  const ip = getRateLimitIp(request);
  const limit = await rateLimit(`ai:${ip}`);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many requests', fallback: true },
      {
        status: 429,
        headers: {
          'Retry-After': Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000)).toString(),
          'X-RateLimit-Limit': limit.limit.toString(),
          'X-RateLimit-Remaining': limit.remaining.toString(),
          'X-RateLimit-Reset': Math.ceil(limit.reset / 1000).toString(),
        },
      }
    );
  }

  let body: Body;
  try {
    const raw = await request.json();
    body = BodySchema.parse(raw);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', code: 'VALIDATION_ERROR', fallback: true },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Invalid body', fallback: true },
      { status: 400 }
    );
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: 'Service unavailable', fallback: true },
      { status: 503 }
    );
  }

  const model = body.model ?? DEFAULT_MODEL;
  const systemPrompt = buildSystemPrompt(body.mode, body.context);

  try {
    const upstream = await fetch(
      `${process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1'}/chat/completions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://life-os.app',
          'X-Title': 'Life OS',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: body.prompt },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      }
    );

    if (!upstream.ok) {
      console.error('OpenRouter error:', upstream.status, upstream.statusText);
      return NextResponse.json(
        { error: 'AI upstream error', fallback: true },
        { status: 502 }
      );
    }

    const data = await upstream.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Empty AI response', fallback: true },
        { status: 502 }
      );
    }

    return NextResponse.json({ content, fallback: false });
  } catch (error) {
    console.error('AI route error:', error);
    return NextResponse.json(
      { error: 'Internal error', fallback: true },
      { status: 500 }
    );
  }
}

function buildSystemPrompt(
  mode: (typeof ALLOWED_MODES)[number],
  context: Body['context']
): string {
  const strictness = context.strictnessMode ?? mode;
  const modeRules: Record<(typeof ALLOWED_MODES)[number], string> = {
    soft: 'Поддержка, маленький шаг и восстановление без давления.',
    standard: 'Факт, причина и одна конкретная корректировка.',
    hard: 'Прямота и ответственность без унижения или обесценивания работы.',
    owner: 'Высокая требовательность к обязательству и системе, но не оценка личности.',
  };
  const voiceRules: Record<(typeof ALLOWED_TONES)[number], string> = {
    default: 'нейтральный и фактический',
    cold: 'сдержанный и фактический, без эмоционального наказания',
    warm: 'поддерживающий и ясный, без сюсюканья',
    neutral: 'нейтральный, без эмоциональной окраски',
    firm: 'твёрдый и конкретный, без унижения',
  };

  return `Ты — наставник Life OS. Помогай превращать намерения в проверяемые действия.

Обязательные правила:
- оценивай действие, данные и систему, а не личность человека;
- не обесценивай выполненную работу;
- не называй обучение прокрастинацией без подтверждённого повторяющегося паттерна;
- не используй стыд, угрозы, наказание или моральные ярлыки;
- различай «причина не указана» и «причина не подтверждена»;
- любая негативная обратная связь заканчивается одним конкретным следующим шагом;
- не обещай доход, продуктивность, дисциплину или личностные изменения без данных;
- ответ: 1–2 коротких предложения.

Режим: ${strictness}. ${modeRules[strictness]}
Дополнительный тон: ${voiceRules[context.voiceTone]}.`;
}
