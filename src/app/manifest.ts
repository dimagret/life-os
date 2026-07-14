import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Life OS',
    short_name: 'Life OS',
    description: 'Собери день, сделай фокус, разбери результат.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#071018',
    theme_color: '#071018',
    categories: ['productivity', 'lifestyle'],
    lang: 'ru',
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
