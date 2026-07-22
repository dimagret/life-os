import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('activation prototype contract', () => {
  it('keeps the prototype isolated from production persistence', () => {
    const source = read('src/components/activation/ActivationPrototype.tsx');
    expect(source).toContain("| 'adaptation';");
    expect(source).toContain('setHideShell(true)');
    expect(source).toContain('/brand/life-os-mark.png');
    expect(source).toContain('disciplineProfile.evidence');
    expect(source).toContain('t.profile.markers.sabotage');
    expect(source).toContain('const PROFILE_ICONS');
    expect(source).toContain('data-profile={disciplineProfile.profileId}');
    expect(source).toContain('<ProfileIcon size={24}');
    expect(source).toContain('data-profile-scenario={disciplineProfile.profileId}');
    expect(source).toContain('profileCopy.scenario.start');
    expect(source).toContain('profileCopy.scenario.focus');
    expect(source).toContain('profileCopy.scenario.setback');
    expect(source).toContain('deriveActivationProgram({');
    expect(source).toContain('selectedModeOverride?.diagnosticKey === diagnosticKey');
    expect(source).toContain('setSelectedModeOverride({ mode: modeId, diagnosticKey })');
    for (const profileId of [
      'depleted', 'overloaded', 'avoidant', 'perfectionist', 'analytical',
      'busywork', 'fragmented', 'building', 'stable',
    ]) {
      expect(source).toContain(`${profileId}:`);
    }
    expect(source).not.toContain('t.profile.values.confirmed');
    expect(source).not.toContain('localStorage');
    expect(source).not.toContain('completeFirstRun');
  });

  it('provides a noindex localized route', () => {
    const page = read('src/app/[locale]/activation-prototype/page.tsx');
    expect(page).toContain("robots: { index: false, follow: false }");
    expect(page).toContain('setRequestLocale(locale)');
  });

  it('is mobile-first and adds a dedicated desktop layout', () => {
    const css = read('src/components/activation/ActivationPrototype.module.css');
    expect(css).toContain('min-width: 320px');
    expect(css).toContain('min-height: 100dvh');
    expect(css).toContain('@media (min-width: 960px)');
    expect(css).toMatch(/\.rail \{[\s\S]*?display: none;/);
    expect(css).toMatch(/@media \(min-width: 960px\) \{[\s\S]*?\.rail \{[\s\S]*?display: grid;/);
    expect(css).toContain('min-height: 44px');
    expect(css).toContain('hue-rotate(95deg)');
    expect(css).toContain('.field input:-webkit-autofill');
    expect(css).toContain('-webkit-text-fill-color: var(--ap-text)');
    expect(css).toContain('.viewport .field input:not([type="checkbox"]):not([type="radio"])');
    expect(css).toContain('"icon time"');
    expect(css).toContain('"icon content"');
    expect(css).toMatch(/@media \(min-width: 560px\) \{[\s\S]*?"time icon content"/);
  });

  it('keeps the desktop phase rail anchored instead of vertically centering it', () => {
    const css = read('src/components/activation/ActivationPrototype.module.css');
    expect(css).toMatch(/\.phaseList \{[\s\S]*?align-content:\s*start;/);
    expect(css).toMatch(/\.phaseList \{[\s\S]*?align-self:\s*start;/);
    expect(css).toMatch(/\.phaseList::before \{[\s\S]*?top:\s*80px;/);
  });

  it('keeps legal policy links inline with the separate consent', () => {
    const source = read('src/components/activation/ActivationPrototype.tsx');

    expect(source).toMatch(/lifeos-privacy-consent[\s\S]*?\/legal\/consent[\s\S]*?\/legal\/privacy[\s\S]*?\/legal\/cookies/);
    expect(source).not.toContain('styles.legalLinks');
  });

  it('reuses the established Life OS orbit timer language', () => {
    const source = read('src/components/activation/ActivationPrototype.tsx');
    const css = read('src/components/activation/ActivationPrototype.module.css');

    expect(source).toContain('function PrototypeTimerRing');
    expect(source).toContain('className={styles.timerOrbit}');
    expect(source).toContain('className={styles.timerWaveform}');
    expect(source).toContain('data-state={focusState}');
    expect(css).toContain('.timerOrbit');
    expect(css).toContain('.timerOrbitMarker');
    expect(css).toContain('.timerWaveform');
    expect(css).not.toMatch(/\.timerDial\s*\{[\s\S]*?conic-gradient/);
  });

  it('keeps Russian activation headlines concise', () => {
    const source = read('src/components/activation/activationCopy.ts');
    const russianCopy = source.slice(source.indexOf('ru: {'), source.indexOf('en: {'));
    const headlines = [...russianCopy.matchAll(/^\s{6}title: '([^']+)'/gm)].map((match) => match[1]);

    expect(headlines).toHaveLength(12);
    expect(headlines.every((headline) => headline.length <= 40)).toBe(true);
    expect(russianCopy).toContain("reduceTitle: 'Нагрузка снижена'");
    expect(russianCopy).toContain("recoveryTitle: 'Завтра — восстановление'");
  });
});
