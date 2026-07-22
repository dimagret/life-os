# Weekly Growth Loop Implementation Plan

**Goal:** Add a compact weekly decision loop to Life OS without introducing a new navigation section or a heavy planning system.

**Architecture:** Keep the daily loop unchanged. Store one weekly review per goal and week, compute its factual summary from existing plans, tasks, focus sessions, and court reviews, and render the result directly below the active weekly goal. Extend the focus completion reflection with optional distraction duration and a return action.

**Tech Stack:** Next.js 14, React, TypeScript, local/cloud storage adapter, Vitest, CSS Modules.

---

## Task 1: Weekly review domain and persistence

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/constants.ts`
- Modify: `src/lib/storage/persistence.ts`
- Modify: `src/lib/storage/index.ts`
- Modify: `src/lib/migrations.ts`
- Create: `src/lib/weeklyGrowth.ts`
- Test: `tests/weekly-growth.test.ts`
- Test: `tests/storage-persistence.test.ts`
- Test: `tests/migrations.test.ts`

1. Add failing tests for week boundaries, factual snapshot aggregation, dominant distraction, optional commercial action, storage round-trip, and migration defaults.
2. Run the focused tests and confirm they fail for the missing contracts.
3. Add `WeeklyGrowthReview`, snapshot types, storage key, repository helpers, and a backward-compatible schema migration.
4. Implement pure weekly aggregation helpers and rerun the focused tests.

## Task 2: Compact weekly decision on Goals

**Files:**
- Create: `src/components/goals/WeeklyGrowthCard.tsx`
- Modify: `src/app/[locale]/goals/GoalsClient.tsx`
- Modify: `src/app/[locale]/goals/Goals.module.css`
- Modify: `messages/ru.json`
- Modify: `messages/en.json`
- Create: `tests/weekly-growth-source.test.ts`

1. Add a failing source contract for the card placement, fact/in-progress/hypothesis labels, and the business-only commercial field.
2. Render one compact card below the active weekly goal with the automatic summary visible first.
3. Keep constraint, experiment, and metric as the three primary inputs; show the commercial step only for `money` and `business` goals.
4. Put stop/continue/next-week reflection behind a disclosure to avoid overloading the screen.
5. Save changes through the existing storage and cloud-sync path.

## Task 3: Minimal distraction reflection in Focus

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/components/day/FocusBlock.tsx`
- Modify: `messages/ru.json`
- Modify: `messages/en.json`
- Create: `tests/focus-reflection-source.test.ts`

1. Add a failing contract for distraction minutes, primary distraction, and return action.
2. Show these fields only after a session that actually recorded distractions.
3. Clamp minutes to the session duration and persist the optional reflection on `FocusBlock`.
4. Verify pause/resume behavior remains unchanged.

## Task 4: Verification and delivery

1. Run focused tests, then `npm test`, lint, and production build.
2. Start the local app and inspect Goals and Focus at desktop and mobile widths.
3. Review `git diff` to ensure unrelated user files are untouched.
4. Commit only the implementation files on a feature branch; do not deploy production.
