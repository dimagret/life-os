# Implementation handoff — Midnight Command application

Read `DESIGN.md`, `design-contract.md`, `src/components/MidnightTheme.module.css`, `src/components/LayoutShell.tsx`, `src/components/onboarding/*`, and `src/app/globals.css`.

- Keep the existing React state, routing, storage behavior, and accessibility labels.
- Apply the shared Midnight Command layer at `LayoutShell`; do not recreate route-specific palettes.
- Render onboarding inside a fixed `100dvh × 100vw` dark shell with `overflow: hidden` and `overscroll-behavior: none`.
- Use a centered `32rem` maximum content column and compact responsive spacing.
- Remove the duplicated three-row explainer from the welcome form; keep one concise product sentence.
- Apply the same shell, typography, fields, selectable cards, and CTA language to all three steps.
- Use only repository code and CSS; add no dependency or remote asset.
- Acceptance: onboarding has zero x/y overflow at 390×844 and 1287×912; all content routes have zero horizontal overflow; navigation, fields, cards, CTA, metrics, error/loading, recovery, and focus states share the same palette and surface rules.

- Resting selectable controls and collapsed disclosures use `--surface-card`; selected controls use `--state-soft`, `--state-border`, and `--state-color`.
- Primary workflow actions use the solid current state token. Preserve semantic victory, risk, and deception colors for task outcomes.
- Reserve `--surface-inset` for nested information and fields; do not use it as the default unselected-choice background.
