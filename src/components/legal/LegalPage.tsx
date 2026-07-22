import type { ReactNode } from 'react';

export function LegalPage({
  title,
  description,
  version,
  children,
  locale,
}: {
  title: string;
  description: string;
  version: string;
  children: ReactNode;
  locale: string;
}) {
  return (
    <main className="min-h-screen bg-[var(--bg-primary)] px-4 py-10 text-[var(--text-primary)] sm:px-6">
      <article className="mx-auto max-w-3xl">
        <a
          href={`/${locale}/register`}
          className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent-brand)] hover:underline"
        >
          ← Life OS
        </a>
        <header className="mt-8 border-b border-[var(--border-subtle)] pb-7">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Юридические документы</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">{description}</p>
          <p className="mt-4 text-xs text-[var(--text-disabled)]">Редакция от {version}</p>
        </header>
        <div className="space-y-8 py-8 text-sm leading-7 text-[var(--text-secondary)] [&_a]:text-[var(--accent-brand)] [&_a]:underline [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[var(--text-primary)] [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-3 [&_ul]:space-y-2">
          {children}
        </div>
        <nav
          aria-label="Юридические документы"
          className="flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--border-subtle)] py-6 text-xs"
        >
          <a href={`/${locale}/legal/privacy`}>Политика конфиденциальности</a>
          <a href={`/${locale}/legal/consent`}>Согласие на обработку данных</a>
          <a href={`/${locale}/legal/cookies`}>Политика cookies</a>
        </nav>
      </article>
    </main>
  );
}
