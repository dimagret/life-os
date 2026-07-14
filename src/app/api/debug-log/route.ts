import { NextRequest, NextResponse } from 'next/server';

const MAX_MESSAGE_LENGTH = 500;
const MAX_CONTEXT_KEYS = 10;
const MAX_CONTEXT_VALUE_LENGTH = 200;
const DEBUG_LOG_ENDPOINT_ENABLED = process.env.ENABLE_DEBUG_LOG_ENDPOINT === 'true';

/** Strips control characters to prevent log injection. */
function sanitizeString(value: string, maxLength: number): string {
  return value
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .slice(0, maxLength)
    .trim();
}

function sanitizeContext(raw: unknown): Record<string, string> | undefined {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const result: Record<string, string> = {};
  let count = 0;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (count >= MAX_CONTEXT_KEYS) break;
    if (typeof k !== 'string' || typeof v !== 'string') continue;
    result[sanitizeString(k, 64)] = sanitizeString(v, MAX_CONTEXT_VALUE_LENGTH);
    count++;
  }
  return result;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === 'production' || !DEBUG_LOG_ENDPOINT_ENABLED) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Body must be an object' }, { status: 400 });
  }

  const { message, level, context } = body as Record<string, unknown>;

  if (typeof message !== 'string' || message.trim() === '') {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  const safeMessage = sanitizeString(message, MAX_MESSAGE_LENGTH);
  const safeLevel =
    typeof level === 'string' && ['debug', 'info', 'warn', 'error'].includes(level)
      ? level
      : 'debug';
  const safeContext = sanitizeContext(context);

  const logFn =
    safeLevel === 'error'
      ? console.error
      : safeLevel === 'warn'
        ? console.warn
        : safeLevel === 'info'
          ? console.info
          : console.debug;

  logFn('[debug-log]', safeMessage, safeContext ?? '');

  return NextResponse.json({ ok: true });
}
