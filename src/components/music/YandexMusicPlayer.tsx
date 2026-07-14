'use client';

import {
  getYandexMusicEmbedHeight,
  normalizeYandexMusicEmbedUrl,
} from '@/lib/focusMusic';

interface YandexMusicPlayerProps {
  url?: string | null;
  title: string;
  className?: string;
}

export function YandexMusicPlayer({ url, title, className = '' }: YandexMusicPlayerProps) {
  const embedUrl = normalizeYandexMusicEmbedUrl(url);
  if (!embedUrl) return null;

  return (
    <div
      className={`overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] ${className}`}
    >
      <iframe
        src={embedUrl}
        title={title}
        width="100%"
        height={getYandexMusicEmbedHeight(embedUrl)}
        allow="autoplay; encrypted-media; clipboard-write"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        className="block w-full border-0 bg-white"
      />
    </div>
  );
}
