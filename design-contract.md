# Life OS onboarding design contract

## Goal and target

Target: the complete Life OS responsive web application: onboarding, Today, Action Court, Goals, Profile, Codex, login, loading/error states, recovery, and focus flows. Audience: a person operating the product daily. Goal: apply one Midnight Command system across every route while preserving existing behavior; onboarding remains a stationary, non-scrollable viewport.

## Evidence

| Evidence | Confidence | What it proves |
|---|---|---|
| `output/playwright/midnight-command-ru-desktop.png` | observed | Dark ink canvas, narrow centered column, lavender progress and CTA, compact form |
| `output/playwright/midnight-command-ru-mobile.png` | observed | Same visual language at mobile width, no alternate light treatment |
| `output/visual-qa/ru-390-today-dark.png` | observed | Dark command-center product surfaces and restrained cyan only for data visualization |
| Browser comment at 1287×912 | provided | Current onboarding scrolls and visually diverges from the references |
| Current `OnboardingFlow.tsx` | observed | Product logic has two fast-start steps: one result, then plan plus explicit agreement |
| Always-dark onboarding | inferred | Best way to preserve one onboarding identity across OS theme settings |

## Keep / change / do not copy

| Reference | Keep | Change | Do not copy |
|---|---|---|---|
| Midnight Command desktop/mobile | Dark canvas, narrow column, compact progress, lavender action, dense hierarchy | Use the two-step fast-start flow and explicit honest-day agreement | Old mode-selection gate, old “Режим Хозяина” positioning, exact legacy copy |
| Dark Today visual QA | Material depth and disciplined contrast | Reserve cyan for live metrics, not onboarding decoration | Exact dashboard chart or navigation layout on onboarding |
| Current onboarding | Fixed viewport, controlled form state, and completion gate | Ask for one result, preview the generated day, and require explicit agreement before persistence | Required identity fields, hidden agreement, and mode selection before first value |

## Final stance

Life OS becomes one Midnight Command product surface: almost-black, compact, and intentionally quiet. Lavender indicates navigation, progress, and primary action; semantic risk/recovery colors stay restrained. All content routes share the same navigation, typography, fields, cards, buttons, and 34rem working column, while onboarding remains a fixed zero-scroll canvas.

## Risks and unknowns

- There is no separately supplied external reference URL; only repository screenshots and the browser comment are verifiable.
- Very short landscape mobile viewports may require an additional compact media query; the acceptance sizes are 390×844 and 1287×912.
- The rest of the application still supports light mode; this change deliberately scopes the always-dark rule to onboarding.

## Quality gate

- [ ] `scrollWidth === clientWidth` and `scrollHeight === clientHeight` on onboarding.
- [ ] No nested element has user-scrollable overflow.
- [ ] Both fast-start steps fit 390×844 and 1287×912.
- [ ] CTA remains visible and keyboard-focusable.
- [ ] Theme remains visually identical when the root theme is light or dark.
- [ ] Goal, three tasks, and the day persist before onboarding completion; agreement requires the visible checkbox action.
- [ ] Today, Action Court, Goals, Profile, Codex, login, loading/error, recovery, and focus flows share the same palette and component treatment.
- [ ] Desktop and 390px mobile route checks report zero horizontal overflow.

## Shared surface contract

The application has two complete palettes, not one dark palette with a light exception. Light mode uses a white canvas and white resting interactive surfaces; dark mode uses ink surfaces. Selection logic is identical in both palettes: neutral rest, soft current-state selection, solid current-state primary action. Inset gray is reserved for nested information rather than unselected choices.
