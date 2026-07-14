# Life OS / Режим Хозяина — AI Coding Instructions

## 1. Product identity

Life OS / Режим Хозяина is an anti-self-deception action system.

It is not:
- a cute habit tracker;
- a fantasy RPG;
- a simple todo app;
- a motivation diary;
- a soft self-care app.

It is:
- a strict but respectful personal operating system;
- a system for goals, action, proof, responsibility and recovery;
- a product where the central ritual is Action Court / Суд Действия.

Core loop:

Goal → Day Order → Execution → Action Court → Verdict → Consequences → Next Step.

The app must help the user:
- set real goals;
- convert learning into action;
- avoid self-deception;
- complete the main task of the day;
- prove execution;
- receive rewards or consequences;
- recover after failure;
- build inner core.

## 2. Main product concept

The product is based on the idea:

"Не важно, что ты хотел. Важно, что ты сделал."

The user gives promises to himself.
The app helps track whether those promises were fulfilled.
If the user fails, the app identifies whether it was a real reason or self-deception.

The app must be strict toward self-deception, but respectful toward the person.

## 3. Central ritual: Action Court / Суд Действия

Every day has three stages:

1. Morning — Day Order / Приказ Дня
2. Day — Execution / Исполнение
3. Evening — Action Court / Суд Действия

The Action Court checks:
- what was promised;
- what was done;
- what was not done;
- whether there is proof;
- whether the reason is respectful or self-deception;
- what verdict applies;
- what reward or penalty applies;
- what the next step is.

## 4. Verdicts

Use these internal values:

- self_victory = Победа над собой
- partial_victory = Частичная победа
- respectful_transfer = Уважительный перенос
- failure = Провал дня
- self_deception = Самообман
- recovered_victory = Восстановленная победа

## 5. Core metrics

The user profile must track:

- totalXp
- level
- innerCore
- abyssIndex
- currentStreak
- activeStabilization
- debts
- externalResultsCount

XP shows activity.
Inner Core shows character and self-trust.
Abyss Index shows loss of control.
Debts show broken promises.
External Results show real-world progress.

## 6. Product rules

1. XP is given for actions, not intentions.
2. Learning gives less XP than practice.
3. External results give the highest XP.
4. If the user could do a 2–5 minute minimum action but did not, the reason cannot be fully respectful.
5. Hard and owner modes require Action Court and accepted proof for key / boss / output tasks before victory.
6. Soft mode may reduce penalties, but a day without Action Court cannot become full self_victory.
7. A completed proof-required task without proof is downgraded before verdict; it cannot satisfy proofOk.
8. self_victory requires the main task, the external/boss result, accepted proof, and a completed Action Court.
9. abyssIndex starts at 0% for a new user.
10. Stabilization mode starts at abyssIndex >= 61%.
11. Stabilization freezes new large goals and leaves one main task, one recovery quest, and Action Court.
12. The mentor must never insult the user.
13. The mentor attacks behavior, not identity.
14. Every failure and self-deception verdict must have a recovery path.
15. Repeated failure reasons become a systemic pattern and must be visible in debt/scoring logic.

## 7. Execution Engine

The app must prevent endless learning.

Learning must lead to:

Learning → Practice → Output

Task types:
- learning
- practice
- output
- feedback
- monetization
- rest
- recovery

Learning alone gives low XP.
Practice gives medium XP.
Output, feedback and monetization give high XP.

If the user has 3 learning tasks in a row without practice or output, the next task must be practice/output.

The app must convert goals like:
"Хочу изучать дизайн"
into:
"За 7 дней сделать первый экран, показать одному человеку и получить обратную связь."

## 8. AI mentor tone

The AI mentor must be:
- strict;
- calm;
- factual;
- respectful;
- action-oriented;
- anti-self-deception;
- never toxic.

Forbidden phrases:
- "ты слабый"
- "ты безнадёжен"
- "ты всё испортил"
- "ты проиграл жизнь"
- insults
- shame-based messages

Allowed style:
- "Факт: задача не выполнена."
- "Минимальное действие было возможно."
- "Это нарушение договора."
- "Следующий шаг — 5 минут действия."
- "Контроль можно вернуть через действие."

## 9. UI direction

Visual direction:

Dark Minimal Control Interface
+ Premium Discipline Aesthetic
+ State-driven Accent System

The interface must feel:
- strict;
- minimal;
- premium;
- calm;
- serious;
- focused;
- not playful;
- not colorful;
- not cartoonish.

No RPG style.
No confetti.
No bright noisy colors.
No full-screen red panic states.

## 10. State-driven UI

The UI must react to user state through accent colors.

States:
- control
- hold
- risk
- stabilization
- recovery
- victory
- deception

State priority:

Deception > Stabilization > Hold > Risk > Recovery > Victory > Control

State changes should affect only:
- CTA;
- badges;
- progress bars;
- outlines;
- status strip;
- icon accents;
- soft glow.

Do not recolor the entire app.

## 11. MVP stack

Use:
- Next.js
- TypeScript
- Tailwind CSS
- local-first storage through localStorage
- optional server API routes for AI and auth/health checks
- OpenRouter-backed AI when `OPENROUTER_API_KEY` is configured
- rule-based mock mentor fallback when AI is unavailable or mentor offline mode is enabled

## 12. Architecture

Use this structure:

app/
components/
lib/
types/
data/
docs/

Important files:

lib/storage.ts
lib/mockMentor.ts
lib/scoring.ts
lib/uiState.ts
types/index.ts
data/defaultKnowledge.ts
data/demoData.ts

## 13. UI principles

- Mobile-first.
- Dark premium interface.
- One main CTA per screen.
- Every screen should show the next action.
- Complex logic should stay under the hood.
- Business logic must not be embedded inside UI components.
- All localStorage reads/writes must go through storage.ts.
- UI state logic must go through uiState.ts.

## 14. MVP implementation order

Do not build everything at once.

Follow phases:

1. Project scaffold + UI tokens
2. Types + storage
3. Mock mentor + scoring
4. Onboarding + contract + mode selection
5. Goal Builder + Execution Engine
6. Day Command Center + Daily Plan
7. Focus Block + Useful Rest
8. Action Court + Verdict
9. Stabilization + Recovery Quest
10. Profile + Codex + Demo Data
