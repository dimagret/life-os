'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { Home, Scale, Target, CircleUser, type LucideProps } from 'lucide-react';
import styles from './SystemNavigation.module.css';

type NavIcon = React.ComponentType<LucideProps>;

const navItems: Array<{ href: '/' | '/action-court' | '/goals' | '/profile'; key: string; Icon: NavIcon }> = [
  { href: '/', key: 'today', Icon: Home },
  { href: '/action-court', key: 'courtFull', Icon: Scale },
  { href: '/goals', key: 'goals', Icon: Target },
  { href: '/profile', key: 'profile', Icon: CircleUser },
];

/**
 * Desktop sidebar (lg+ only). Mobile uses BottomNav instead.
 * Shares the [data-state] colour token system with BottomNav.
 */
export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  return (
    <aside
      aria-label={t('main')}
      className="nav-surface hidden sticky top-0 h-screen w-60 flex-col border-r border-[var(--border-subtle)] px-4 py-8 lg:flex"
    >
      <Link href="/" className="mb-8 flex min-h-11 items-center gap-2.5 rounded-xl px-2 transition-colors hover:bg-[var(--bg-hover)]">
        <span aria-hidden="true" className="h-2.5 w-2.5 flex-none rounded-full state-dot" />
        <span className="text-base font-bold tracking-tight text-[var(--text-primary)]">
          Life OS
        </span>
      </Link>

      <nav>
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive =
            item.href === '/action-court'
              ? pathname === item.href || pathname.startsWith('/action-court/')
              : pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  data-active={isActive ? 'true' : undefined}
                  className={`group flex min-h-11 items-center gap-3 px-3 py-2.5 text-sm font-medium transition-[color,transform] active:scale-[0.99] motion-reduce:transform-none ${styles.sidebarItem} ${isActive ? styles.active : ''} ${
                    isActive
                      ? 'state-text'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <item.Icon
                    aria-hidden="true"
                    size={19}
                    strokeWidth={isActive ? 2 : 1.7}
                    className={`flex-none transition-colors ${
                      isActive
                        ? 'state-text'
                        : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'
                    }`}
                  />
                  <span>{t(item.key)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto text-[10px] uppercase tracking-wider text-[var(--text-muted)] px-2">
        {t('ownerMode')}
      </div>
    </aside>
  );
}
