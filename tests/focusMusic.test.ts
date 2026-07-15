import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_YANDEX_MUSIC_EMBED_URL,
  FOCUS_MUSIC_ASSETS,
  FOCUS_MUSIC_CATALOG,
  getFocusMusicUrlIssue,
  getYandexMusicEmbedHeight,
  getYandexMusicEmbedIssue,
  getYandexMusicPageUrl,
  normalizeYandexMusicEmbedUrl,
  openYandexMusicPage,
  playFocusMusic,
  YANDEX_MUSIC_OPEN_URL,
} from '@/lib/focusMusic';
import type { UserProfile } from '@/types';


describe('Life OS focus music catalog', () => {
  it('exposes six unique built-in soundscapes', () => {
    expect(FOCUS_MUSIC_CATALOG).toEqual([
      'softNoise',
      'deepNoise',
      'rain',
      'airFlow',
      'lowPulse',
      'night',
    ]);
    expect(new Set(FOCUS_MUSIC_CATALOG).size).toBe(FOCUS_MUSIC_CATALOG.length);
  });

  it('maps every preset to a unique local audio asset', () => {
    const assets = FOCUS_MUSIC_CATALOG.map((preset) => FOCUS_MUSIC_ASSETS[preset]);

    expect(assets.every((asset) => asset.startsWith('/audio/focus/') && asset.endsWith('.mp3'))).toBe(true);
    expect(new Set(assets).size).toBe(FOCUS_MUSIC_CATALOG.length);
  });

  it('plays the selected local asset instead of generating procedural noise', async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    const AudioMock = vi.fn(() => ({
      currentTime: 0,
      loop: false,
      pause: vi.fn(),
      paused: true,
      play,
      preload: '',
      volume: 1,
    }));
    vi.stubGlobal('window', {
      clearInterval: vi.fn(),
      clearTimeout: vi.fn(),
    });
    vi.stubGlobal('Audio', AudioMock);

    const started = await playFocusMusic({
      focusMusicEnabled: true,
      focusMusicSource: 'builtin',
      focusMusicPreset: 'rain',
    } as UserProfile);

    expect(started).toBe(true);
    expect(AudioMock).toHaveBeenCalledWith('/audio/focus/rain.mp3');
    expect(play).toHaveBeenCalledOnce();

    vi.unstubAllGlobals();
  });
});
describe('getFocusMusicUrlIssue', () => {
  it('allows direct audio-like URLs', () => {
    expect(getFocusMusicUrlIssue('https://cdn.example.com/focus.mp3')).toBeNull();
    expect(getFocusMusicUrlIssue('https://radio.example.com/live/stream')).toBeNull();
  });

  it('rejects empty and malformed URLs', () => {
    expect(getFocusMusicUrlIssue('')).toBe('empty');
    expect(getFocusMusicUrlIssue('not a url')).toBe('invalid');
    expect(getFocusMusicUrlIssue('ftp://example.com/focus.mp3')).toBe('invalid');
  });

  it('rejects music service page links', () => {
    expect(getFocusMusicUrlIssue('https://music.yandex.ru/album/8102024/track/55436076')).toBe('pageLink');
    expect(getFocusMusicUrlIssue('https://music.yandex.ru/iframe/#track/55436076/8102024')).toBe('pageLink');
    expect(getFocusMusicUrlIssue('https://www.youtube.com/watch?v=abc')).toBe('pageLink');
    expect(getFocusMusicUrlIssue('https://open.spotify.com/track/abc')).toBe('pageLink');
  });
});

describe('Yandex Music iframe helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('accepts only official Yandex Music iframe URLs for the shell', () => {
    expect(getYandexMusicEmbedIssue(DEFAULT_YANDEX_MUSIC_EMBED_URL)).toBe('empty');
    expect(getYandexMusicEmbedIssue('https://music.yandex.ru/iframe/album/8102024/track/55436076')).toBeNull();
    expect(getYandexMusicEmbedIssue('https://music.yandex.ru/iframe/playlist/user-name/123')).toBeNull();
    expect(getYandexMusicEmbedIssue('https://music.yandex.ru/iframe/#track/55436076/8102024')).toBeNull();
    expect(getYandexMusicEmbedIssue('https://music.yandex.ru/album/8102024/track/55436076')).toBe('invalid');
    expect(getYandexMusicEmbedIssue('https://example.com/iframe/#track/55436076/8102024')).toBe('invalid');
  });

  it('normalizes Yandex Music page links to iframe URLs', () => {
    expect(normalizeYandexMusicEmbedUrl('https://music.yandex.ru/album/8102024/track/55436076?utm_source=share')).toBe(
      'https://music.yandex.ru/iframe/#track/55436076/8102024'
    );
    expect(normalizeYandexMusicEmbedUrl('https://music.yandex.ru/album/8102024')).toBe(
      'https://music.yandex.ru/iframe/#album/8102024'
    );
    expect(normalizeYandexMusicEmbedUrl('https://music.yandex.ru/iframe/#track/55436076/8102024')).toBe(
      'https://music.yandex.ru/iframe/#track/55436076/8102024'
    );
  });

  it('accepts complete iframe HTML copied from Yandex Music', () => {
    const html = '<iframe frameborder="0" src="https://music.yandex.ru/iframe/#track/55436076/8102024"></iframe>';
    const encodedHtml = '<iframe src=&quot;https://music.yandex.ru/iframe/#album/8102024&quot;></iframe>';

    expect(normalizeYandexMusicEmbedUrl(html)).toBe(
      'https://music.yandex.ru/iframe/#track/55436076/8102024'
    );
    expect(normalizeYandexMusicEmbedUrl(encodedHtml)).toBe(
      'https://music.yandex.ru/iframe/#album/8102024'
    );
    expect(getYandexMusicEmbedIssue(html)).toBeNull();
  });

  it('does not treat the Yandex Music home page as embeddable content', () => {
    expect(normalizeYandexMusicEmbedUrl('https://music.yandex.ru/')).toBeNull();
  });

  it('builds exact Yandex Music fallback pages from iframe URLs', () => {
    expect(getYandexMusicPageUrl('https://music.yandex.ru/iframe/#track/149969643/41454476')).toBe(
      'https://music.yandex.ru/album/41454476/track/149969643'
    );
    expect(getYandexMusicPageUrl('https://music.yandex.ru/iframe/album/41454476/track/149969643')).toBe(
      'https://music.yandex.ru/album/41454476/track/149969643'
    );
    expect(getYandexMusicPageUrl('https://music.yandex.ru/iframe/#album/41454476')).toBe(
      'https://music.yandex.ru/album/41454476'
    );
    expect(getYandexMusicPageUrl('https://music.yandex.ru/iframe/playlist/example/42')).toBe(
      'https://music.yandex.ru/users/example/playlists/42'
    );
  });
  it('uses taller iframe shells for playlist and album embeds', () => {
    expect(getYandexMusicEmbedHeight('https://music.yandex.ru/iframe/#track/71263/419460')).toBe(180);
    expect(getYandexMusicEmbedHeight('https://music.yandex.ru/iframe/album/8102024/track/55436076')).toBe(244);
    expect(getYandexMusicEmbedHeight('https://music.yandex.ru/iframe/#track/55436076/8102024')).toBe(180);
  });

  it('does not create an Audio element for Yandex Music shell mode', async () => {
    const AudioMock = vi.fn();
    vi.stubGlobal('window', {
      clearInterval: vi.fn(),
      clearTimeout: vi.fn(),
    });
    vi.stubGlobal('Audio', AudioMock);

    const started = await playFocusMusic({
      id: 'user_test',
      createdAt: new Date().toISOString(),
      onboardingCompleted: true,
      skippedOnboarding: false,
      contractAccepted: true,
      strictnessMode: 'standard',
      level: 1,
      totalXp: 0,
      innerCore: 0,
      abyssIndex: 0,
      currentStreak: 0,
      activeStabilization: false,
      externalResultsCount: 0,
      focusMusicEnabled: true,
      focusMusicSource: 'yandex',
      focusYandexEmbedUrl: 'https://music.yandex.ru/iframe/album/8102024/track/55436076',
    } satisfies UserProfile);

    expect(started).toBe(false);
    expect(AudioMock).not.toHaveBeenCalled();
  });
});

describe('openYandexMusicPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens Yandex Music in a new tab when the browser allows it', () => {
    const openedWindow = { opener: {} as unknown };
    const assign = vi.fn();
    const open = vi.fn(() => openedWindow);

    vi.stubGlobal('window', {
      open,
      location: { assign },
    });

    expect(openYandexMusicPage('https://music.yandex.ru/iframe/#track/149969643/41454476')).toBe(true);
    expect(open).toHaveBeenCalledWith(
      'https://music.yandex.ru/album/41454476/track/149969643',
      '_blank'
    );
    expect(openedWindow.opener).toBeNull();
    expect(assign).not.toHaveBeenCalled();
  });

  it('falls back to same-tab navigation when a browser shell blocks the popup', () => {
    const assign = vi.fn();
    const open = vi.fn(() => null);

    vi.stubGlobal('window', {
      open,
      location: { assign },
    });

    expect(openYandexMusicPage()).toBe(false);
    expect(assign).toHaveBeenCalledWith(YANDEX_MUSIC_OPEN_URL);
  });
});
