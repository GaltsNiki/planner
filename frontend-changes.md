# Frontend changes — Weekly view redesign

Scope: front-end / UI changes to the **Weekly view** (`Неделя`) only. Data models,
business logic for other views, and the Daily / Habits / Overview views were left
untouched, except for one **shared** analytics helper (`weekAnalytics`) that is
consumed exclusively by the Weekly view's analytics card.

## Goals (from the task)

1. Cleaner, easier-to-scan visual design — better typography hierarchy, spacing,
   and contrast between days/events.
2. A weekly analytics section showing:
   - task/event **completion rate** for the week,
   - **comparison to the previous week's** completion rate,
   - a **simple visual** of activity distribution across the 7 days.
3. Stay consistent with the app's existing design language (dark surfaces, the
   `#E8563F` accent, the token set in `tokens.ts`).

---

## Files changed

### 1. `src/shared/progress.ts` — previous-week comparison (shared logic)

`weekAnalytics()` previously returned only this week's completion, per-goal stats,
and per-day bars. It had **no** week-over-week comparison, which the task requires.

- Extended the `WeekAnalytics` interface with `prevPct`, `prevDone`, `prevTotal`,
  and `deltaPct` (this week's rate minus the previous week's, in whole percentage
  points).
- Computed those by measuring completion for `weekOffset - 1` with the same scope
  (all tasks, leisure included) so the two rates are directly comparable.
- No behavioural change to existing fields; existing tests still pass.

This is shared code, but it is only used by the Weekly view's analytics component,
so it stays within the task's scope.

### 2. `src/shared/__tests__/progress.test.ts` — coverage for the new logic

Added two cases to the `weekAnalytics` suite:

- Compares the week rate against the immediately preceding week (`deltaPct`,
  `prevPct`, `prevDone`, `prevTotal`).
- Reports a zeroed previous week when the prior week had no tasks (delta then
  equals this week's rate).

All 12 tests in the file pass (76/76 across the whole suite).

### 3. `src/renderer/src/components/WeekAnalytics.tsx` — analytics card redesign

Rewrote the analytics card into three clear zones with a stronger hierarchy:

**a) Header** — a real `<h2>` at 16px/700 with a quiet `Пн–Вс` subtitle. The
inline "X of Y · Z%" summary was removed from the header and promoted into a
dedicated stat tile (below), which reads better.

**b) KPI band — three stat tiles** (following the dataviz "stat tile" contract:
label · value · optional signed delta):

- **Выполнение за неделю** — the headline completion rate as a large number
  (30px/700) with `done из total задач`, plus a thin accent meter of the same value.
- **Против прошлой недели** — the week-over-week delta as a signed value
  (`+N` / `−N п.п.`) with a direction glyph in a tinted circle. Color follows
  direction × good: **up = success green** (`successFg`), **down = muted accent**
  (`accentPartner`), **flat / no data = neutral ink**. Sub-line gives the context
  (`было X% · стало Y%`), and it degrades to `—` + "нет данных за прошлую неделю"
  when the prior week is empty.
- **Дней с задачами** — how many of the 7 days had any planned activity (`N из 7`),
  with seven pips beneath it (filled = day has tasks). A quick scannability metric.

**c) Body — two columns:**

- **Прогресс по этапам целей** (left) — the existing per-goal stage steppers,
  kept but with a proper uppercase section label and slightly more breathing room.
- **Активность по дням** (right) — the 7-day distribution chart, refined to follow
  the data-viz mark specs:
  - Columns grow from a single baseline with **rounded data-ends**, capped width
    (max 26px) so they don't fill the slot.
  - Fill height (and the accent gradient) encode the day's completion rate; an
    all-todo day still shows a small stub so it's visible.
  - **Weekend axis labels** sit in a fainter ink to distinguish Сб/Вс.
  - **Per-column hover** brightens the bar and shows a floating tooltip with the
    exact `pct% · done/total`; the count label and axis label also brighten.

All colors come from the existing `COLORS` token set — no new palette introduced.

### 4. `src/renderer/src/views/WeekView.tsx` — grid scannability

Improved the day columns so the week grid is easier to scan and ties visually to
the analytics below:

- Each **day header** now shows a hairline completion meter + a `done/total` count
  (only when the day has tasks). A fully-completed day's meter turns **green**
  (the `success` token), matching the app's "done" semantics elsewhere.
- Bumped the non-weekend column background very slightly and dropped the weekend
  background a touch, so weekdays vs. weekend read more distinctly without shouting.
- Minor header spacing/letter-spacing tidy-up.

No changes to drag-and-drop, task cards, or any data flow.

---

## Design-language consistency

- Reused `COLORS` tokens throughout (accent, accent gradient, `success`/`successFg`,
  text ink scale, borders) — nothing hard-coded outside the existing system.
- Card shells match the existing `WeekendIdeas` / analytics card treatment
  (`cardBg`, `border06`, radius 16, matching padding).
- Stat-tile numerals use proportional figures for the big headline values and
  `tabular-nums` only for the aligned counts/axis labels, per data-viz guidance.
- The delta uses the app's established green "done" color for improvement and a
  muted accent for regression, rather than introducing new status colors.

## Verification

- `npx tsc --noEmit -p tsconfig.web.json` → clean (exit 0).
- `npx vitest run` → **76/76 passing**, including 2 new `weekAnalytics` cases.
- Rendered in the browser preview harness (`web-preview.html` via
  `vite.preview.config.ts`) and screenshotted:
  - current week (positive data),
  - a week with a **negative** delta (`−29 п.п.`, down arrow, muted accent),
  - the day-distribution **hover tooltip** (`100% · 4/4`),
  - the per-day header meters in the grid.

## Screenshots captured during the work

- `week-view-before.png` — original grid.
- `week-analytics-before.png` — original analytics + weekend ideas.
- `week-grid-after.png` — redesigned grid with per-day meters.
- `week-analytics-after1.png` — redesigned analytics (KPI band + charts).
- `week-analytics-delta-down.png` — negative week-over-week delta state.
- `week-analytics-hover.png` — day-distribution hover tooltip.

---
---

# Frontend changes — Habits view redesign

Improved the visual design of the **Habits** view and added an **adherence
analytics** section. Scope was limited to the Habits view and its supporting
(front-end / data-derivation) code — no other views (Daily, Weekly, Overview),
data models, or business logic were changed.

Reference screenshot of the result: `habits-after-final.png`.

## Files changed

| File | Change |
|------|--------|
| `src/renderer/src/views/HabitsView.tsx` | Full visual redesign of the board + new analytics section |
| `src/shared/habits.ts` | **New** — pure adherence-analytics functions (streaks, rolling rates, history) |
| `src/shared/__tests__/habits.test.ts` | **New** — 17 unit tests for the analytics logic |
| `src/shared/seed.ts` | Enriched seed habit history so the analytics have real data on first run |

The redesign uses only the existing design tokens (`COLORS` in
`src/renderer/src/tokens.ts`) and the app's established card / accent language, so it
sits consistently beside the other views (it mirrors the `WeekAnalytics` card's
structure and header pattern).

---

## 1. Cleaner, easier-to-scan weekly board

**Before:** a narrow (620px) card with a `name | 7 cells | total | delete` grid,
flat rows, small type, and low contrast between rows.

**After:**

- **Wider layout** (720px) with more generous row height and padding.
- **Typography hierarchy:** larger, heavier habit titles (14.5px/600); tighter,
  uppercase, letter-spaced column headers; `tabular-nums` on all figures so numbers
  align.
- **Row contrast:** each row lifts to the `rowBg` surface on hover, giving clear
  per-row separation without heavy borders.
- **"Today" emphasis:** the current day's column header and its day cells are tinted
  with the accent, so the actionable column stands out at a glance.
- **Done-cell polish:** slightly larger rounded markers with a soft accent shadow, so
  completed days read as filled chips rather than flat squares.
- **New "СЕРИЯ" (streak) column:** a flame icon + current-streak day count on every
  row — an at-a-glance adherence cue right where you mark days.

## 2. Adherence analytics section (new)

A new card below the board, titled **"Аналитика привычек"**, matching the
`WeekAnalytics` card's design language (same surface, radius, header layout).

- **Overall summary tiles** in the header: mean completion rate across all habits over
  the **last 7 days** and **last 30 days**.
- **Per-habit rows**, each showing:
  - **Current streak** (flame + day count) and the habit's **best/record streak**.
  - **7-day and 30-day completion rate** as figures, each over a thin accent meter.
  - **30-day consistency heatmap** — one small cell per day, oldest → today
    (left → right). Completed days carry the accent (with a soft shadow); missed days
    a faint track. Runs of completions read as solid accent bands, making consistency
    (and gaps) visible over time. Every cell has a `date — выполнено/пропущено`
    tooltip.
- **Legend** at the foot of the card explaining the colour mapping
  (выполнено / пропущено) and time direction (30 дней назад → сегодня), so identity
  is never conveyed by colour alone.

The section only renders when at least one habit exists (the empty state keeps the
original friendly prompt).

## 3. Analytics logic — `src/shared/habits.ts`

The math is factored into pure, tested functions rather than inlined in the view. A
habit stores completions as `"<weekOffset>:<dayIndex>"` keys (absolute week index +
Monday-first day), so each key maps to a real calendar date; that lets streaks and
rolling windows span week boundaries correctly.

- `habitHistory(habit, count, today)` — the last N days ending today, oldest first
  (the heatmap/rate basis).
- `habitRate(habit, windowDays, today)` — completed / window as a percentage.
- `currentStreak(habit, today)` — consecutive completed days back from today. Today
  not being marked yet does **not** break the streak (a grace day), so a habit done
  through yesterday still reads as live.
- `longestStreak(habit)` — the longest gap-free run anywhere in history (the "record").
- `habitAnalytics(habit, today)` — bundles the above for one habit.
- `overallRate(habits, windowDays, today)` — mean rate across habits, for the summary
  tiles.

All functions take an injectable `today`/`anchor` for deterministic testing.

## 4. Seed data — `src/shared/seed.ts`

The seed's four habits previously only had completions in the current week, leaving
the 30-day analytics empty on a fresh install. Completions were extended across the
current week and the four prior weeks (relative offsets `−1…−4`, which `migrate()`
rebases onto the real calendar), with varied patterns (a long reading streak, a
sparse "no sugar" habit, an abandoned "meditation" habit) so the streaks, rates, and
heatmap demonstrate the feature realistically.

---

## Verification

- `npm run typecheck` — passes (both `tsconfig.node` and `tsconfig.web`).
- `npx vitest run` — **93 tests pass**, including the 17 new `habits.test.ts` cases
  covering keys, history, rates, current/longest streaks (incl. the grace-day and
  gap cases), the bundled analytics, and the overall rate.
- Rendered and screenshotted the view in a browser (Vite + Playwright) with the chat
  panel both open and closed; layout reflows cleanly with no overflow, and the
  board's streak column matches the analytics section's streak values.

### How it was previewed

Because this is an Electron app whose renderer depends on the `window.planner` IPC
bridge, a temporary browser harness (a standalone Vite entry that stubbed
`window.planner` with seed data) was used to render the view for screenshots. That
scaffolding was **removed** after the work — it is not part of the committed change.

---
---

# Frontend Changes — Overview view: Spheres of Life

Front-end / UI work on the **Обзор (Overview)** view (`ReviewView.tsx`) to add and
improve "spheres of life" — life categories (Health, Career, …) that group goals.
The data model for spheres and goals already existed; no data model, business
logic, or other views (Daily / Weekly / Habits) were changed except the one
**shared** helper (`stepSegments`) that the Overview view relies on.

## What the task asked for

- Create and name a sphere, then add one or more goals within it.
- Auto-assign each sphere a colour from a curated palette, with a manual override.
- Group spheres visually so their relationship reads at a glance.
- Use each sphere's colour consistently across its goals, progress indicators and
  related UI, so colour communicates "this belongs to this sphere".
- Keep the palette colours distinguishable and readable (contrast).
- Stay consistent with the app's existing design language.

## Summary of what changed

The create/name/add-goal plumbing already existed; the work here **fixed the
colour story and redesigned the layout** so the view reads as a coherent group of
colour-coded life areas.

| Before | After |
| --- | --- |
| Spheres stacked as full-width sections; one goal left a huge empty half-width "add goal" card. Heavy scrolling; relationships not visible at a glance. | Responsive **grid of sphere cards** — all areas of life visible together, each self-contained. |
| Goal progress bars were **hard-coded coral** regardless of sphere (a blue sphere showed a coral bar). | Progress segments, rollup bar, goal %, goal dot and card accents are all painted in the **sphere's own colour**. |
| No sphere-level progress; you had to read each goal to gauge an area. | Each sphere card header shows a **rollup**: goal count + mean-progress bar + %. |
| Palette mixed one hex with five oklch values, uneven spacing. | Curated **7-colour palette**, evenly spaced hues, uniform lightness/chroma, AA contrast on the dark background. |

## Files changed

### `src/shared/closeness.ts` — shared, colour-aware progress segments (the core fix)
- `stepSegments(goal)` hard-coded the coral accent for done/active segments. It now
  takes an **optional `accent` argument** (`stepSegments(goal, accent)`) that
  defaults to the original coral, so existing callers are unaffected.
- The active segment now uses `color-mix(in oklab, <accent> 50%, transparent)` so
  the half-opacity tint works for **any** colour format (hex *or* oklch) without
  parsing.
- This is the single change that lets a goal's progress bar render in its sphere's
  colour everywhere it's shown.

### `src/shared/palette.ts` — curated, distinguishable palette
- Reworked `GOAL_COLORS` into a 7-colour set: coral (brand) → amber → green → teal
  → blue → violet → magenta.
- Hues spaced ~55–75° apart so no two are easily confused; lightness held in a
  narrow 0.68–0.75 band and chroma in 0.13–0.16 so colours carry similar weight and
  each clears WCAG-AA (≥4.5:1) contrast against the `#141416` card / `#0d0d0f` app
  backgrounds. First entry stays the brand coral. Documented inline.
- New spheres auto-pick the next palette colour in order, then cycle
  (existing `addSphere` behaviour — unchanged, now drawing from the better palette).

### `src/renderer/src/views/ReviewView.tsx` — the Overview layout redesign
- **Grid instead of a vertical stack**: `grid` with
  `repeat(auto-fill, minmax(340px, 1fr))`, so spheres group into a scannable set of
  cards that reflow by width.
- New **`SphereCard`** component — one card per sphere:
  - Colour-tinted card fill + border, and a **colour-tinted header band with a
    solid colour spine** on the left edge as an unmistakable sphere-colour marker.
  - **Sphere rollup** in the header: goal count (`sphereStatsOf`) + a mean-progress
    bar and % painted in the sphere colour.
  - Inline-editable name (double-click / pencil), a colour dot that opens the
    **palette override**, and delete (hidden for the permanent "Разное" fallback).
  - Its goals, then a **slim "add goal" row** (replacing the oversized empty card).
- Redesigned **`GoalCard`** — takes a `sphereColor` prop; the goal dot, the `%`
  figure, and the stage-progress segments all render in the sphere colour
  (`stepSegments(goal, sphereColor)`).
- Added a `sphereTint()` helper that derives all the translucent tints (fill,
  border, band, rail, soft text) from the one sphere colour via `color-mix`, so a
  single accent drives the whole card — no second colour to pick per sphere.
- Added `goalWord()` for correct Russian pluralisation (1 цель / 2 цели / 5 целей).

### `src/renderer/src/views/GoalDetail.tsx` — colour identity carries into the goal page
- When a goal is opened from its sphere, the **progress ring** (conic gradient) and
  the **stage bar** now use the goal's colour (`ag.dotColor`) instead of the fixed
  coral, so an opened goal keeps the colour identity it had in the Overview.
- Task-completion checkboxes and the Claude-take card keep the brand accent — those
  are app-level controls, not sphere-progress indicators.

### `src/shared/__tests__/logic.test.ts` — updated for the new segment API
- Updated the existing `stepSegments` test for the `color-mix` active tint, and
  added a case asserting segments are tinted with a supplied sphere accent.

## Design-language consistency

- Reused existing tokens (`COLORS`), card radii/borders, hover classes
  (`row-hover`, `card-hover`), the `GoalDot` primitive and the shared `stepSegments`
  logic — the new cards match the Daily / Weekly / Habits vocabulary.
- The sphere colour is applied as **subtle translucent tints** (card fill ~5%,
  band ~12%) so cards read as one group without becoming loud; the solid colour is
  reserved for the spine, dot, progress fills and % so colour reads as *meaning*,
  not decoration.

## Verification

- `npm run typecheck` (node + web) — passes.
- `npm run test` — 77/77 pass (including the updated `stepSegments` tests).
- `npm run build` — main, preload and renderer all build.
- Driven in the browser end-to-end: created a sphere ("Финансы", auto-assigned the
  next palette colour), added a goal into it (goal inherited the sphere colour),
  and overrode a sphere's colour (the change propagated to its header, rollup, goal
  dot and goal progress bar in one action).

---
---

# Frontend changes — Habits view redesign (2026-07-16 pass)

A second design pass over the **Habits** view, focused on layout, glanceability, and
Fitts's-Law/Gestalt improvements on top of the existing analytics feature. **Scope:
front-end / UI only.** The single source file changed is
`src/renderer/src/views/HabitsView.tsx`. No data models, business logic, or other views
were touched. All habit analytics (`@shared/habits.ts`), the seed data, and the store API
were reused as-is — `overallRate`, `habitAnalytics`, `habitRate`, `weekBadge`, and the
store's `thisWeek()` action already existed and are now surfaced in the UI.

Reference screenshot of the result: `habits-final.png`.

## What changed (and the design principle behind each)

### 1. New summary bar above the fold — *Above the fold · Visual hierarchy (F-pattern)*
Added a `SummaryBar` at the very top of the view: four equally-sized stat tiles.
- **Эта неделя** — overall completion across all habits over 7 days (`overallRate(habits, 7)`).
- **30 дней** — overall completion over 30 days (`overallRate(habits, 30)`).
- **Привычек** — active habit count.
- **Лучшая серия** — strongest current streak across all habits, with a flame glyph.

The most valuable "how am I doing?" signal now sits in the top third, forming the top bar
of the F-pattern scan before any per-habit detail. Percentage tiles tint their value by
strength (accent ≥ 70%, partner ≥ 40%, muted below). The four tiles share identical size,
shape, radius, padding and label style (*Gestalt similarity*) so they read as one group.

### 2. "Эта неделя" reset button — *Fitts's Law · Window zoning (Z-pattern terminus)*
When off the current week, an accent "Эта неделя" pill appears in the previously-empty
top-right corner of the week navigator (`marginLeft: auto`) as a one-click way back — the
Z-pattern's top-right terminus. Only shown when `!isCurrentWeek`. Wired to `thisWeek()`.

### 3. Larger day-toggle cells with checkmarks — *Fitts's Law · Similarity (non-colour state)*
Day cells are the most frequent action, so the day column widened `34→38px` and the marker
grew `22→30px` (radius `7→9`). Completed cells now render a white ✓ inside, so the done
state doesn't depend on the accent colour alone (colour-vision accessibility).

### 4. Stronger "today" column cue — *Visual hierarchy · Window zoning*
The current day already highlighted its weekday header; now its empty cells carry an
accent tint (`accent12`), turning the current day into a clear vertical scan guide down
the board. Applied only on the current week.

### 5. Per-habit adherence rates in analytics — *Window zoning (right = contextual detail)*
The analytics grid gained two right-hand columns, **7 ДН** and **30 ДН**, showing each
habit's rolling completion percentage (from `habitAnalytics`), tinted by strength to match
the summary tiles. This puts adherence detail on the right edge — the contextual-detail
zone — legible without counting heatmap cells. Grid: `160px 1fr` → `190px 1fr 54px 54px`.

### 6. Heatmap cells matched to board cells — *Gestalt similarity*
The 30-day strip cells were tall bars (`≈16×24`, radius 4); they're now near-square
(`18×18`, radius 5) so the "done = accent square" mark reads identically in the board and
the strip. The two sections now feel like one tracker rather than two unrelated tables.

### 7. Spacing / alignment polish — *Grid & spacing*
- Content column widened `720→760px` for more board/heatmap breathing room.
- Vertical rhythm between summary, navigator, board and analytics normalised toward the
  8px grid (e.g. analytics card top gap `20→16`).
- Legend swatch radius bumped `2→3` to match the new cell radii.

## What was intentionally left unchanged
- All streak / rate / heatmap math in `@shared/habits.ts` (reused, not modified).
- Seed data, and the add/rename/toggle/delete interactions and their store actions.
- The week navigator's core mechanics (prev/next arrows, range label, badge).

## Verification
- `npx tsc --noEmit -p tsconfig.web.json` — passes (exit 0).
- `npx vitest run src/shared/__tests__/habits.test.ts` — 17/17 pass.
- Rendered via the project's `vite.preview.config.ts` harness and screenshotted the
  current-week state, the off-week state (reset button + no today-highlight), and the
  analytics section. Final current-week view saved as `habits-final.png`.

### How it was previewed
The renderer depends on the Electron `window.planner` IPC bridge, so it was run in a plain
browser via the committed `vite.preview.config.ts` + `web-preview.html` harness (which
stubs `window.planner` with seed data). No throwaway scaffolding was added to the repo.
