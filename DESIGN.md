# Life OS — Midnight Command

## 1. Visual Theme & Atmosphere

Life OS uses a disciplined dual-palette command-interface aesthetic: deep ink or cool parchment surfaces, restrained lavender signals, compact hierarchy, and a single obvious action per screen. The interface should feel controlled and serious, not punitive, futuristic, or decorative.

## 2. Color

- Dark canvas: `#07070c` with a subtle top-violet ambient bloom, never a bright gradient.
- Light canvas: pure `#ffffff`; white elevated surfaces use neutral-gray borders and restrained shadows so semantic state colors remain the only chromatic signals.
- Elevated surface: `rgba(17, 17, 27, 0.82)`.
- Primary text: `#f4f0ff`; secondary: `#cfc9e3`; muted: `#8f88a3`.
- Brand accent: `#bca7ff`; strong focus: `#d7ccff`.
- Borders: lavender-tinted white at 12–22% opacity.
- Every product route, navigation surface, loading state, error state, and focus flow supports functional dark and light Midnight Command palettes. The profile switch must change the rendered tokens immediately and persist the preference.

## 3. Typography

- Display: `Segoe UI Variable Display`, `Aptos Display`, system sans-serif.
- Body: `Segoe UI Variable Text`, `Aptos`, system sans-serif.
- Headlines use 700 weight, tight tracking, and balanced wrapping.
- Labels use 600 weight, 0.08em tracking, and compact uppercase.
- Numeric progress uses tabular figures.

## 4. Spacing & Grid

- Desktop content column: `min(32rem, calc(100vw - 2rem))`.
- Mobile gutter: 20px; desktop gutter: 32px.
- Base rhythm: 4 / 8 / 12 / 16 / 24 / 32px.
- The onboarding viewport is a fixed `100dvh × 100vw` canvas with no document or inner-panel scrolling.
- Content routes use the same 34rem working column, 20px mobile gutter, and shared page rhythm.

## 5. Layout & Composition

- Progress stays in a compact top rail.
- The active step is vertically and horizontally centered in the remaining viewport.
- Each step must fit within the viewport at 390×844 and 1287×912 without horizontal or vertical overflow.
- Use one central column. Do not place multiple phone mockups or feature cards side by side inside the product UI.

## 6. Components

- Inputs: dark inset fields, 1px tinted border, 12px radius, visible lavender focus ring.
- Primary CTA: full-width lavender surface, dark label, 12px radius, 48px target height.
- Supporting rows: borderless or single-divider treatment; cards are used only for selectable modes.
- Progress: two thin segments matching the fast-start flow: result, then plan plus explicit agreement.

## 7. Motion & Interaction

- 160–220ms transitions using opacity and transform only.
- Buttons move down by 1px on press.
- Step changes may fade/translate subtly but never introduce scroll or page movement.
- Respect `prefers-reduced-motion`.

## 8. Voice & Brand

- Direct, compact, factual Russian copy.
- One promise, one explanation, one action per screen.
- Strict tone without shame language, theatrical threats, or motivational clichés.

## 9. Anti-patterns

- No nonfunctional theme control, hardcoded dark surface in light mode, or mixed palettes within one theme.
- No page, panel, horizontal, or rubber-band scrolling during onboarding.
- No blue/purple AI gradient wash, cyan glow, glass-card stack, or equal feature-card row.
- No duplicated explanation of the three-step loop on the result screen.
- No extra progress step unless product logic adds a real user decision.
- No clipped controls, hidden CTA, or viewport-height assumptions based on `100vh`.

## 10. Surface and selection hierarchy

- Canvas: pure white in light mode and deep ink in dark mode.
- Resting cards, disclosures, and selectable controls use `--surface-card`; in light mode this is white.
- `--surface-inset` is reserved for nested information, form fields, and non-interactive measurements.
- A selected control uses a soft fill, border, label, and inset edge from the current `--state-*` token family.
- The primary action uses the solid current `--state-color`; fixed orange or violet is not allowed for workflow actions.
- Semantic task outcomes keep their own victory, risk, and deception token families.
- Outer cards use 16px radius; nested controls use 10–11px radius.
