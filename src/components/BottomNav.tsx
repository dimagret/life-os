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

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  return (
    <nav
      aria-label={t('main')}
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] lg:hidden"
    >
      <div className={`nav-surface system-nav-surface pointer-events-auto mx-auto flex h-16 w-full max-w-lg items-stretch border ${styles.mobileSurface}`}>
        {navItems.map((item) => {
          const isActive =
            item.href === '/action-court'
              ? pathname === item.href || pathname.startsWith('/action-court/')
              : pathname === item.href;
          const label = t(item.key);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              data-active={isActive ? 'true' : undefined}
              className={`touch-manipulation flex h-full min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 transition-[color,transform] duration-200 ease-out active:translate-y-px motion-reduce:transform-none ${styles.mobileItem} ${isActive ? styles.active : ''} ${
                isActive
                  ? 'state-text'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <span
                className={`inline-flex h-8 w-8 items-center justify-center transition-transform duration-200 ease-out motion-reduce:transition-none ${styles.iconWrap} ${
                  isActive
                    ? ''
                    : 'hover:bg-[var(--bg-hover)] active:scale-[0.96]'
                }`}
              >
                <item.Icon
                  aria-hidden="true"
                  size={21}
                  strokeWidth={isActive ? 2 : 1.7}
                />
              </span>
              <span className="max-w-full text-center text-[11px] font-medium leading-[1.2] tracking-wide">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

