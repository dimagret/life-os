'use client';

/**
 * Лёгкий «дзынь» по окончании таймера через Web Audio API.
 * Без файлов в `public/`. SSR/jsdom — no-op.
 *
 * Возвращает `Promise<void>`, ошибки не пробрасываются.
 * Вызывается из обработчика, инициированного жестом пользователя
 * (старт таймера), поэтому autoplay-policy выполнена.
 */
export async function playTimerEndChime(): Promise<void> {
  if (typeof window === 'undefined') return;

  type AudioCtor = typeof AudioContext;
  const Ctor: AudioCtor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
  if (!Ctor) return;

  let ctx: AudioContext | null = null;
  try {
    ctx = new Ctor();
    const now = ctx.currentTime;

    // Две короткие ноты (E5 → A5) с экспоненциальным спадом — ненавязчивый «ding-ding».
    const tones: Array<{ freq: number; start: number; dur: number }> = [
      { freq: 659.25, start: 0, dur: 0.18 },
      { freq: 880.0, start: 0.18, dur: 0.32 },
    ];

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.001;
    masterGain.connect(ctx.destination);

    let lastEnd = now;
    for (const tone of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = tone.freq;
      const startAt = now + tone.start;
      const endAt = startAt + tone.dur;
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.18, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, endAt);
      osc.connect(gain).connect(masterGain);
      osc.start(startAt);
      osc.stop(endAt + 0.02);
      if (endAt > lastEnd) lastEnd = endAt;
    }

    // Закрыть контекст после последней ноты, чтобы не утекали ресурсы.
    const closeDelayMs = Math.ceil((lastEnd - now) * 1000) + 80;
    const ctxRef = ctx;
    window.setTimeout(() => {
      ctxRef.close().catch(() => {});
    }, closeDelayMs);
  } catch {
    if (ctx) {
      ctx.close().catch(() => {});
    }
  }
}
