'use client';

import type { UserProfile } from '@/types';

export type FocusMusicSource = NonNullable<UserProfile['focusMusicSource']>;
export type FocusMusicPreset = NonNullable<UserProfile['focusMusicPreset']>;
export type FocusMusicUrlIssue = 'empty' | 'invalid' | 'pageLink';
export type YandexMusicEmbedIssue = 'empty' | 'invalid';

const URL_AUDIO_VOLUME = 0.72;
export const YANDEX_MUSIC_HOME_URL = 'https://music.yandex.ru';
export const YANDEX_MUSIC_OPEN_URL = YANDEX_MUSIC_HOME_URL;
export const DEFAULT_YANDEX_MUSIC_EMBED_URL = '';
export const LEGACY_DEFAULT_YANDEX_MUSIC_EMBED_URLS = [
  'https://music.yandex.ru/iframe/#track/71263/419460',
  'https://music.yandex.ru/iframe/playlist/music-blog/1587',
  'https://music.yandex.ru/iframe/#track/55436076/8102024',
  'https://music.yandex.ru/iframe/album/8102024/track/55436076',
] as const;
const YANDEX_MUSIC_IFRAME_ORIGIN = 'https://music.yandex.ru';
const PRESET_VOLUME: Record<FocusMusicPreset, number> = {
  softNoise: 0.7,
  deepNoise: 0.72,
  lowPulse: 0.64,
  rain: 0.68,
  airFlow: 0.72,
  night: 0.7,
  kreamLiquidLab: 0.66,
  gioliAndromeda: 0.66,
  gioliDiesis: 0.66,
};

export const FOCUS_MUSIC_CATALOG: readonly FocusMusicPreset[] = [
  'softNoise',
  'deepNoise',
  'rain',
  'airFlow',
  'lowPulse',
  'night',
  'kreamLiquidLab',
  'gioliAndromeda',
  'gioliDiesis',
] as const;
export const FOCUS_MUSIC_AMBIENCE_CATALOG: readonly FocusMusicPreset[] = [
  'softNoise',
  'deepNoise',
  'rain',
  'airFlow',
  'lowPulse',
  'night',
] as const;
export const FOCUS_MUSIC_FOCUS_CATALOG: readonly FocusMusicPreset[] = [
  'kreamLiquidLab',
  'gioliAndromeda',
  'gioliDiesis',
] as const;
export const FOCUS_MUSIC_ASSETS: Readonly<Record<FocusMusicPreset, string>> = {
  softNoise: '/audio/focus/soft-noise.mp3',
  deepNoise: '/audio/focus/deep-noise.mp3',
  rain: '/audio/focus/rain.mp3',
  airFlow: '/audio/focus/air-flow.mp3',
  lowPulse: '/audio/focus/low-pulse.mp3',
  night: '/audio/focus/night.mp3',
  kreamLiquidLab: '/audio/focus/kream-liquid-lab-vol-8.mp3',
  gioliAndromeda: '/audio/focus/gioli-assia-andromeda-theater.mp3',
  gioliDiesis: '/audio/focus/gioli-assia-diesis-etna.mp3',
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

let urlAudio: HTMLAudioElement | null = null;
let urlAudioSource = '';
let fadeIntervalId: number | null = null;
let previewTimeoutId: number | null = null;

function canUseAudio(): boolean {
  return typeof window !== 'undefined';
}

export function openYandexMusicPage(rawUrl?: string | null): boolean {
  if (!canUseAudio()) return false;

  const pageUrl = getYandexMusicPageUrl(rawUrl) ?? YANDEX_MUSIC_OPEN_URL;

  try {
    const openedWindow = window.open(pageUrl, '_blank');
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

  window.location.assign(pageUrl);
  return false;
}

function resolveSource(profile: UserProfile): FocusMusicSource {
  if (profile.focusMusicSource === 'url') return 'url';
  if (profile.focusMusicSource === 'yandex') return 'yandex';
  return 'builtin';
}

function resolvePreset(profile: UserProfile): FocusMusicPreset {
  const preset = profile.focusMusicPreset;
  return FOCUS_MUSIC_CATALOG.includes(preset as FocusMusicPreset) ? (preset as FocusMusicPreset) : 'softNoise';
}

export function getFocusMusicUrlIssue(rawUrl?: string | null): FocusMusicUrlIssue | null {
  const value = extractYandexMusicUrl(rawUrl);
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

function extractYandexMusicUrl(rawInput?: string | null): string {
  const value = rawInput?.trim() ?? '';
  if (!value) return '';

  const decoded = value
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, '&');
  const iframeSrc = decoded.match(/<iframe\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);

  return (iframeSrc?.[1] ?? iframeSrc?.[2] ?? iframeSrc?.[3] ?? decoded).trim();
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
  const value = extractYandexMusicUrl(rawUrl);
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
  const value = extractYandexMusicUrl(rawUrl);
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

export function getYandexMusicPageUrl(rawUrl?: string | null): string | null {
  const embedUrl = normalizeYandexMusicEmbedUrl(rawUrl);
  if (!embedUrl) return null;

  let url: URL;
  try {
    url = new URL(embedUrl);
  } catch {
    return null;
  }

  const hashSegments = url.hash.slice(1).split('/').filter(Boolean);
  const [hashType, hashFirst, hashSecond] = hashSegments;
  if (hashType === 'track' && hashFirst && hashSecond) {
    return `${YANDEX_MUSIC_HOME_URL}/album/${hashSecond}/track/${hashFirst}`;
  }
  if (hashType === 'album' && hashFirst) {
    return `${YANDEX_MUSIC_HOME_URL}/album/${hashFirst}`;
  }
  if (hashType === 'playlist' && hashFirst && hashSecond) {
    return `${YANDEX_MUSIC_HOME_URL}/users/${hashFirst}/playlists/${hashSecond}`;
  }

  const segments = url.pathname.split('/').filter(Boolean);
  if (segments[0] !== 'iframe') return null;
  if (segments[1] === 'album' && segments[2]) {
    if (segments[3] === 'track' && segments[4]) {
      return `${YANDEX_MUSIC_HOME_URL}/album/${segments[2]}/track/${segments[4]}`;
    }
    return `${YANDEX_MUSIC_HOME_URL}/album/${segments[2]}`;
  }
  if (segments[1] === 'playlist' && segments[2] && segments[3]) {
    return `${YANDEX_MUSIC_HOME_URL}/users/${segments[2]}/playlists/${segments[3]}`;
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
}

function clearPreviewTimer(): void {
  if (!canUseAudio()) return;
  if (previewTimeoutId !== null) {
    window.clearTimeout(previewTimeoutId);
    previewTimeoutId = null;
  }
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

async function playAudioSource(nextSource: string, volume: number): Promise<boolean> {
  if (!urlAudio || urlAudioSource !== nextSource) {
    stopUrlAudio();
    urlAudio = new Audio(nextSource);
    urlAudio.loop = true;
    urlAudio.preload = 'auto';
    urlAudioSource = nextSource;
  }

  urlAudio.volume = volume;
  try {
    await urlAudio.play();
    return true;
  } catch {
    return false;
  }
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
    const nextUrl = profile.focusMusicUrl?.trim();
    if (!nextUrl) return false;
    if (getFocusMusicUrlIssue(nextUrl)) return false;
    return playAudioSource(nextUrl, URL_AUDIO_VOLUME);
  }

  const preset = resolvePreset(profile);
  return playAudioSource(FOCUS_MUSIC_ASSETS[preset], PRESET_VOLUME[preset]);
}

export function pauseFocusMusic(): void {
  clearFadeTimers();
  if (urlAudio) urlAudio.pause();
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
}

export function stopFocusMusic(): void {
  clearFadeTimers();
  clearPreviewTimer();
  stopUrlAudio();
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

export type FocusMusicPlaybackState = {
  currentTime: number;
  duration: number;
};

export function getFocusMusicPlaybackState(): FocusMusicPlaybackState {
  if (!urlAudio) return { currentTime: 0, duration: 0 };
  return {
    currentTime: Number.isFinite(urlAudio.currentTime) ? urlAudio.currentTime : 0,
    duration: Number.isFinite(urlAudio.duration) ? urlAudio.duration : 0,
  };
}

export function seekFocusMusic(nextTime: number): void {
  if (!urlAudio || !Number.isFinite(nextTime)) return;
  const duration = Number.isFinite(urlAudio.duration) ? urlAudio.duration : nextTime;
  urlAudio.currentTime = Math.min(Math.max(0, nextTime), duration);
}
