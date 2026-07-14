'use client';

import type { UserProfile } from '@/types';

export type FocusMusicSource = NonNullable<UserProfile['focusMusicSource']>;
export type FocusMusicPreset = NonNullable<UserProfile['focusMusicPreset']>;
export type FocusMusicUrlIssue = 'empty' | 'invalid' | 'pageLink';
export type YandexMusicEmbedIssue = 'empty' | 'invalid';

const URL_AUDIO_VOLUME = 0.72;
export const YANDEX_MUSIC_HOME_URL = 'https://music.yandex.ru';
export const YANDEX_MUSIC_OPEN_URL = YANDEX_MUSIC_HOME_URL;
export const DEFAULT_YANDEX_MUSIC_EMBED_URL = 'https://music.yandex.ru/iframe/playlist/music-blog/1587';
export const LEGACY_DEFAULT_YANDEX_MUSIC_EMBED_URLS = [
  'https://music.yandex.ru/iframe/#track/55436076/8102024',
  'https://music.yandex.ru/iframe/album/8102024/track/55436076',
] as const;
const YANDEX_MUSIC_IFRAME_ORIGIN = 'https://music.yandex.ru';
const PRESET_GAIN: Record<FocusMusicPreset, number> = {
  softNoise: 0.055,
  deepNoise: 0.07,
  lowPulse: 0.035,
};
const PLAYER_PAGE_HOSTS = [
  /(^|\.)music\.yandex\./,
  /(^|\.)youtube\.com$/,
  /^youtu\.be$/,
  /(^|\.)music\.apple\.com$/,
  /(^|\.)open\.spotify\.com$/,
  /(^|\.)soundcloud\.com$/,
  /(^|\.)vk\.com$/,
];

type SourceNode = AudioBufferSourceNode | OscillatorNode;

interface BuiltInState {
  ctx: AudioContext;
  gain: GainNode;
  preset: FocusMusicPreset;
  nodes: SourceNode[];
}

let urlAudio: HTMLAudioElement | null = null;
let urlAudioSource = '';
let builtInState: BuiltInState | null = null;
let fadeIntervalId: number | null = null;
let fadeStopTimeoutId: number | null = null;
let previewTimeoutId: number | null = null;

function canUseAudio(): boolean {
  return typeof window !== 'undefined';
}

export function openYandexMusicPage(): boolean {
  if (!canUseAudio()) return false;

  try {
    const openedWindow = window.open(YANDEX_MUSIC_OPEN_URL, '_blank');
    if (openedWindow) {
      try {
        openedWindow.opener = null;
      } catch {
        // Some browser shells expose a locked WindowProxy. The page still opened.
      }
      return true;
    }
  } catch {
    // Fall back to same-tab navigation below.
  }

  window.location.assign(YANDEX_MUSIC_OPEN_URL);
  return false;
}

function getAudioContextClass(): typeof AudioContext | null {
  if (!canUseAudio()) return null;
  const win = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  return win.AudioContext ?? win.webkitAudioContext ?? null;
}

function resolveSource(profile: UserProfile): FocusMusicSource {
  if (profile.focusMusicSource === 'url') return 'url';
  if (profile.focusMusicSource === 'yandex') return 'yandex';
  return 'builtin';
}

function resolvePreset(profile: UserProfile): FocusMusicPreset {
  const preset = profile.focusMusicPreset;
  return preset === 'deepNoise' || preset === 'lowPulse' ? preset : 'softNoise';
}

export function getFocusMusicUrlIssue(rawUrl?: string | null): FocusMusicUrlIssue | null {
  const value = rawUrl?.trim() ?? '';
  if (!value) return 'empty';

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return 'invalid';
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'invalid';

  const hostname = url.hostname.toLowerCase();
  if (PLAYER_PAGE_HOSTS.some((pattern) => pattern.test(hostname))) return 'pageLink';

  if (/\.(?:html?|php|aspx?)$/i.test(url.pathname)) return 'pageLink';

  return null;
}

function isYandexMusicHost(hostname: string): boolean {
  return /^music\.yandex\./.test(hostname.toLowerCase());
}

function isSafeYandexHash(hash: string): boolean {
  return /^#(?:track|album|playlist)\/[^\s"'<>]+$/i.test(hash);
}

function isSafeYandexEmbedPath(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] !== 'iframe') return false;

  if (segments[1] === 'album') {
    if (!segments[2]) return false;
    if (segments.length === 3) return true;
    return segments.length === 5 && segments[3] === 'track' && Boolean(segments[4]);
  }

  if (segments[1] === 'playlist') {
    return segments.length === 4 && Boolean(segments[2]) && Boolean(segments[3]);
  }

  return false;
}

function buildYandexIframeUrlFromHash(hash: string): string | null {
  if (!isSafeYandexHash(hash)) return null;

  const segments = hash.slice(1).split('/').filter(Boolean);
  const [type, first, second] = segments;

  if (type === 'track' && first && second) {
    return `${YANDEX_MUSIC_IFRAME_ORIGIN}/iframe/#track/${first}/${second}`;
  }

  if (type === 'album' && first) {
    return `${YANDEX_MUSIC_IFRAME_ORIGIN}/iframe/#album/${first}`;
  }

  if (type === 'playlist' && first && second) {
    return `${YANDEX_MUSIC_IFRAME_ORIGIN}/iframe/#playlist/${first}/${second}`;
  }

  return null;
}

export function getYandexMusicEmbedIssue(rawUrl?: string | null): YandexMusicEmbedIssue | null {
  const value = rawUrl?.trim() ?? '';
  if (!value) return 'empty';

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return 'invalid';
  }

  if (url.protocol !== 'https:') return 'invalid';
  if (url.hostname.toLowerCase() !== 'music.yandex.ru') return 'invalid';
  if (!isSafeYandexEmbedPath(url.pathname) && !buildYandexIframeUrlFromHash(url.hash)) {
    return 'invalid';
  }

  return null;
}

export function normalizeYandexMusicEmbedUrl(rawUrl?: string | null): string | null {
  const value = rawUrl?.trim() ?? '';
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (!isYandexMusicHost(url.hostname)) return null;

  const hashEmbedUrl = buildYandexIframeUrlFromHash(url.hash);
  if (hashEmbedUrl) {
    return hashEmbedUrl;
  }

  if (isSafeYandexEmbedPath(url.pathname)) {
    return `${YANDEX_MUSIC_IFRAME_ORIGIN}${url.pathname}`;
  }

  const segments = url.pathname.split('/').filter(Boolean);
  const albumIndex = segments.indexOf('album');
  if (albumIndex >= 0) {
    const albumId = segments[albumIndex + 1];
    if (!albumId) return null;
    const trackIndex = segments.indexOf('track');
    const trackId = trackIndex >= 0 ? segments[trackIndex + 1] : undefined;
    if (trackId) return `${YANDEX_MUSIC_IFRAME_ORIGIN}/iframe/#track/${trackId}/${albumId}`;
    return `${YANDEX_MUSIC_IFRAME_ORIGIN}/iframe/#album/${albumId}`;
  }

  const usersIndex = segments.indexOf('users');
  const playlistsIndex = segments.indexOf('playlists');
  const userId = usersIndex >= 0 ? segments[usersIndex + 1] : undefined;
  const playlistId = playlistsIndex >= 0 ? segments[playlistsIndex + 1] : undefined;
  if (userId && playlistId) {
    return `${YANDEX_MUSIC_IFRAME_ORIGIN}/iframe/playlist/${userId}/${playlistId}`;
  }

  return null;
}

export function getYandexMusicEmbedHeight(rawUrl?: string | null): number {
  const embedUrl = normalizeYandexMusicEmbedUrl(rawUrl);
  if (!embedUrl) return 244;

  let url: URL;
  try {
    url = new URL(embedUrl);
  } catch {
    return 244;
  }

  const hashType = url.hash.slice(1).split('/')[0];

  if (
    url.pathname.includes('/playlist/') ||
    /^\/iframe\/album\/[^/]+\/?$/.test(url.pathname) ||
    hashType === 'album' ||
    hashType === 'playlist'
  ) {
    return 450;
  }

  if (hashType === 'track') return 180;

  return 244;
}

function clearFadeTimers(): void {
  if (!canUseAudio()) return;
  if (fadeIntervalId !== null) {
    window.clearInterval(fadeIntervalId);
    fadeIntervalId = null;
  }
  if (fadeStopTimeoutId !== null) {
    window.clearTimeout(fadeStopTimeoutId);
    fadeStopTimeoutId = null;
  }
}

function clearPreviewTimer(): void {
  if (!canUseAudio()) return;
  if (previewTimeoutId !== null) {
    window.clearTimeout(previewTimeoutId);
    previewTimeoutId = null;
  }
}

function createNoiseBuffer(ctx: AudioContext, preset: FocusMusicPreset): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * 2));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;

  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    if (preset === 'deepNoise') {
      last = (last + 0.02 * white) / 1.02;
      data[i] = Math.max(-1, Math.min(1, last * 3.5));
    } else {
      last = 0.92 * last + 0.08 * white;
      data[i] = Math.max(-1, Math.min(1, last * 1.2));
    }
  }

  return buffer;
}

function createBuiltInState(preset: FocusMusicPreset): BuiltInState | null {
  const AudioContextClass = getAudioContextClass();
  if (!AudioContextClass) return null;

  const ctx = new AudioContextClass();
  const gain = ctx.createGain();
  const nodes: SourceNode[] = [];
  gain.gain.value = 0;
  gain.connect(ctx.destination);

  if (preset === 'lowPulse') {
    const carrier = ctx.createOscillator();
    const carrierGain = ctx.createGain();
    carrier.type = 'sine';
    carrier.frequency.value = 82;
    carrierGain.gain.value = 0.65;
    carrier.connect(carrierGain).connect(gain);
    carrier.start();
    nodes.push(carrier);

    const overtone = ctx.createOscillator();
    const overtoneGain = ctx.createGain();
    overtone.type = 'sine';
    overtone.frequency.value = 164;
    overtoneGain.gain.value = 0.12;
    overtone.connect(overtoneGain).connect(gain);
    overtone.start();
    nodes.push(overtone);
  } else {
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    source.buffer = createNoiseBuffer(ctx, preset);
    source.loop = true;
    filter.type = 'lowpass';
    filter.frequency.value = preset === 'deepNoise' ? 420 : 980;
    filter.Q.value = 0.45;
    source.connect(filter).connect(gain);
    source.start();
    nodes.push(source);
  }

  return { ctx, gain, preset, nodes };
}

function rampBuiltInGain(target: number, seconds: number): void {
  const current = builtInState;
  if (!current) return;
  const now = current.ctx.currentTime;
  current.gain.gain.cancelScheduledValues(now);
  current.gain.gain.setValueAtTime(current.gain.gain.value, now);
  current.gain.gain.linearRampToValueAtTime(target, now + seconds);
}

function stopUrlAudio(): void {
  if (!urlAudio) return;
  urlAudio.pause();
  urlAudio.volume = URL_AUDIO_VOLUME;
  try {
    urlAudio.currentTime = 0;
  } catch {
    // Some streams are not seekable.
  }
  urlAudio = null;
  urlAudioSource = '';
}

function stopBuiltIn(): void {
  const current = builtInState;
  if (!current) return;
  builtInState = null;
  current.nodes.forEach((node) => {
    try {
      node.stop();
    } catch {
      // Oscillators and buffer sources can only be stopped once.
    }
  });
  current.gain.disconnect();
  void current.ctx.close().catch(() => undefined);
}

export async function playFocusMusic(profile: UserProfile): Promise<boolean> {
  if (!canUseAudio() || !profile.focusMusicEnabled) {
    stopFocusMusic();
    return false;
  }

  clearFadeTimers();
  const source = resolveSource(profile);

  if (source === 'yandex') {
    stopFocusMusic();
    return false;
  }

  if (source === 'url') {
    stopBuiltIn();
    const nextUrl = profile.focusMusicUrl?.trim();
    if (!nextUrl) return false;
    if (getFocusMusicUrlIssue(nextUrl)) return false;

    if (!urlAudio || urlAudioSource !== nextUrl) {
      stopUrlAudio();
      urlAudio = new Audio(nextUrl);
      urlAudio.loop = true;
      urlAudio.preload = 'auto';
      urlAudio.volume = URL_AUDIO_VOLUME;
      urlAudioSource = nextUrl;
    }

    try {
      urlAudio.volume = URL_AUDIO_VOLUME;
      await urlAudio.play();
      return true;
    } catch {
      return false;
    }
  }

  stopUrlAudio();
  const preset = resolvePreset(profile);
  if (!builtInState || builtInState.preset !== preset || builtInState.ctx.state === 'closed') {
    stopBuiltIn();
    builtInState = createBuiltInState(preset);
  }

  if (!builtInState) return false;

  try {
    await builtInState.ctx.resume();
    rampBuiltInGain(PRESET_GAIN[preset], 0.18);
    return true;
  } catch {
    return false;
  }
}

export function pauseFocusMusic(): void {
  clearFadeTimers();
  if (urlAudio) urlAudio.pause();
  if (builtInState) rampBuiltInGain(0, 0.12);
}

export function fadeOutFocusMusic(): void {
  if (!canUseAudio()) return;
  clearFadeTimers();

  if (urlAudio && !urlAudio.paused) {
    const audio = urlAudio;
    const startVolume = audio.volume || URL_AUDIO_VOLUME;
    let step = 0;
    fadeIntervalId = window.setInterval(() => {
      step += 1;
      audio.volume = Math.max(0, startVolume * (1 - step / 18));
      if (step >= 18) {
        clearFadeTimers();
        audio.pause();
        audio.volume = URL_AUDIO_VOLUME;
      }
    }, 100);
  }

  if (builtInState) {
    rampBuiltInGain(0, 1.8);
    fadeStopTimeoutId = window.setTimeout(() => {
      fadeStopTimeoutId = null;
      stopBuiltIn();
    }, 2100);
  }
}

export function stopFocusMusic(): void {
  clearFadeTimers();
  clearPreviewTimer();
  stopUrlAudio();
  stopBuiltIn();
}

export async function previewFocusMusic(profile: UserProfile, durationMs = 8000): Promise<boolean> {
  if (!canUseAudio()) return false;
  clearPreviewTimer();
  const started = await playFocusMusic({ ...profile, focusMusicEnabled: true });
  if (!started) return false;
  previewTimeoutId = window.setTimeout(() => {
    previewTimeoutId = null;
    stopFocusMusic();
  }, durationMs);
  return true;
}

export function stopFocusMusicPreview(): void {
  clearPreviewTimer();
  stopFocusMusic();
}
