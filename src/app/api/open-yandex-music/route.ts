import { NextResponse } from 'next/server';

const YANDEX_MUSIC_HOME_URL = 'https://music.yandex.ru';

export function GET() {
  const response = NextResponse.redirect(YANDEX_MUSIC_HOME_URL, 302);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
