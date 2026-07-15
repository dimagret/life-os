import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('responsive design contracts', () => {
  it('keeps bottom navigation labels readable without clipping', () => {
    const source = read('src/components/BottomNav.tsx');
    expect(source).toContain('text-[11px]');
    expect(source).toContain('leading-[1.2]');
    expect(source).not.toContain('truncate text-[10px]');
  });

  it('lets strictness options reflow safely at narrow widths', () => {
    const source = read('src/app/[locale]/profile/Profile.module.css');
    expect(source).toContain('grid-template-columns: minmax(0, 1fr)');
    expect(source).toContain('@media (min-width: 360px)');
    expect(source).toContain('repeat(2, minmax(0, 1fr))');
    expect(read('src/app/[locale]/profile/ProfileClient.tsx')).toContain('inline-flex min-h-11 w-full cursor-pointer items-center');
    expect(source).toContain('overflow-wrap: anywhere');
  });

  it('does not truncate the main-result promise on mobile', () => {
    const source = read('src/components/court/ActionCourt.module.css');
    expect(source).toContain('overflow-wrap: anywhere');
    expect(source).not.toContain('-webkit-line-clamp');
  });

  it('keeps audited navigation and focus actions at least 44px tall', () => {
    const actionCourt = read('src/components/court/ActionCourt.module.css');
    const history = read('src/components/court/ReviewHistory.module.css');
    const detail = read('src/components/court/ReviewHistoryDetail.module.css');
    const globals = read('src/app/globals.css');

    expect(actionCourt.match(/\.historyLink \{[\s\S]*?min-height: 44px;/g)).toHaveLength(2);
    expect(history.match(/min-height: 44px;/g)).toHaveLength(2);
    expect(detail.match(/\.backLink \{[\s\S]*?min-height: 44px;/g)).toHaveLength(1);
    expect(globals).toMatch(/\.focus-more-menu button \{[\s\S]*?min-height: 44px;/);
    expect(read('src/components/day/DayCommandCenter.module.css')).toContain('overflow-wrap: anywhere');
    expect(read('src/components/day/DayCommandCenter.module.css')).toMatch(/\.editButton \{[\s\S]*?min-width: 44px;[\s\S]*?min-height: 44px;/);
    expect(read('src/components/day/TaskCard.tsx')).toContain('inline-flex min-h-11 items-center');
  });
});