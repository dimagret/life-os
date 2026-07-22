import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3003';

const RU_ROUTES: Array<{ path: string; priority: number }> = [
  { path: '/', priority: 1.0 },
  { path: '/legal/privacy', priority: 0.3 },
  { path: '/legal/consent', priority: 0.3 },
  { path: '/legal/cookies', priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const ruEntries = RU_ROUTES.map(({ path, priority }) => ({
    url: `${SITE_URL}/ru${path === '/' ? '' : path}`,
    priority,
    changeFrequency: 'weekly',
  } satisfies MetadataRoute.Sitemap[number]));

  return [
    ...ruEntries,
    { url: `${SITE_URL}/en`, priority: 0.7, changeFrequency: 'weekly' },
  ];
}
