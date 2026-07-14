import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Locale-aware re-exports of next/navigation primitives.
// Use these instead of next/link / next/navigation in components that
// should respect the active locale (sidebar, BottomNav, in-app links).
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
