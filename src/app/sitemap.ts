import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3003';

const ROUTES: Array<{ path: string; priority: number }> = [
  { path: '/', priority: 1.0 },
  { path: '/goals', priority: 0.8 },
  { path: '/action-court', priority: 0.8 },
  { path: '/codex', priority: 0.6 },
  { path: '/profile', priority: 0.4 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const entries: MetadataRoute.Sitemap = [];
  for (const { path, priority } of ROUTES) {
    entries.push({
      url: `${SITE_URL}/ru${path === '/' ? '' : path}`,
      lastModified,
      priority,
      changeFrequency: 'weekly',
    });
    entries.push({
      url: `${SITE_URL}/en${path === '/' ? '' : path}`,
      lastModified,
      priority: priority * 0.8,
      changeFrequency: 'weekly',
    });
  }
  return entries;
}
