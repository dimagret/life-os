import { NextResponse } from 'next/server';

/** GET — дешёвая проверка: есть ли ключ API на сервере (без вызова OpenRouter). */
export async function GET() {
  const hasKey = Boolean(process.env.OPENROUTER_API_KEY?.trim());
  return NextResponse.json(
    {
      ok: hasKey,
      reason: hasKey ? undefined : 'missing_api_key',
      status: hasKey ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}