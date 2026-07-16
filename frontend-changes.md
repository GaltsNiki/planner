# Frontend changes — Daily view redesign

Scope: front-end / UI changes to the **Daily view** (`Сегодня` / `TodayView`) only.
Data models, business logic, and the other views (Weekly, Habits, Spheres) were
left untouched. One **shared** component used exclusively by the Daily view —
`TaskRow` — was extended with an opt-in prop; no other view consumes it.

## Design problems in the old Daily view (evaluated against the design principles)

Screenshots of the current view were taken with the browser preview harness
(`web-preview.html` on the standalone Vite preview server) and evaluated against
the seven design principles:

1. **Fitts's Law — violated.** Day-navigation arrows were small (30×30) and
   floated in the centre of the canvas; the prev/next-day labels were tiny, faint
   text; the primary "add task" action was a low-contrast dashed strip in the
   middle of the page. Nothing used the screen edges.
2. **Window zoning — violated.** No real top toolbar. The date navigator was
   centred rather than anchored, and the day's summary (progress) lived in a
   separate card lower down, detached from navigation.
3. **Above the fold — weak.** At 1440×900 the content filled only the top ~55%,
   leaving a large dead void; the centred `maxWidth: 760` column wasted most of the
   horizontal space.
4. **Visual hierarchy / scan — weak.** Although the agenda is time-ordered, the
   time was shown as a chip on the far right of each row — you could not scan a
   time column, and the time was detached from the task it belonged to.
5. **Gestalt proximity / common region — partial.** The progress card and the add
   button floated away from the list they related to.

## What changed (`src/renderer/src/views/TodayView.tsx`)

### 1. A real top toolbar (`DayToolbar`) — zoning + Fitts's Law
Replaced the centred `DateNavigator` with a left-anchored toolbar row:
- **Larger stepper arrows** (30×30 → **38×38**, radius 11) with hover feedback and
  tooltips — bigger, easier targets.
- The **date label is the calendar trigger** (with its own hover surface), tight
  next to the arrows (proximity grouping).
- A **"Сегодня" jump chip** appears only when you've navigated off today, giving a
  one-click return to the real current day.
- The **day progress meter + `done / total` count is pinned to the right edge** of
  the same toolbar (`margin-left: auto`), so navigation and the day's summary read
  as one top zone and sit above the fold. Turns **green** at 100%.
- The old standalone "Прогресс дня" card was removed (its information now lives in
  the toolbar), reclaiming vertical space.

### 2. A scannable time "spine" (`AgendaEntry`) — visual hierarchy
Each task now renders inside an agenda entry with a **fixed-width left time gutter**
(`TIME_GUTTER = 62`). The task's time is shown there, right-aligned and tabular, so
every time lines up in a single column you can scan top-to-bottom (F-pattern).
Tasks without a time show a small goal-coloured dot in the gutter instead. Because
the gutter is now the single source of the time, the redundant right-side time chip
on the row is suppressed (see the `TaskRow` change below).

### 3. A "now" marker (`NowMarker`) — signposting what's next
On the **real today only**, a thin accent rule labelled **`СЕЙЧАС`** is dropped into
the agenda at the current wall-clock time — before the first task scheduled later
than now (or after the last timed task when everything is past). It makes the most
relevant part of the day easy to find. Only renders when the day has at least one
timed task.

### 4. A friendly empty state — Fitts's Law + no dead void
When a day has no tasks, instead of a thin dashed strip the view shows a **large,
centred, clickable placeholder** (accent "+" tile + "На этот день пока нет задач" /
"Нажмите, чтобы добавить первую"). The whole block is the add target.

### 5. Add button attached to the list — action–result proximity
When the day has tasks, the "Добавить задачу" button sits directly at the end of
the list it appends to, indented to align with the agenda column (not the time
gutter).

### 6. Wider content column
`maxWidth` raised from **760 → 880** so the agenda uses more of the available width
and less of the screen is empty.

## Shared component change (`src/renderer/src/components/TaskRow.tsx`)

`TaskRow` is used **only** by the Daily view (its own doc-comment says so). Added an
opt-in **`hideTime`** prop:
- When set, the right-side time chip is not rendered (the Daily agenda already shows
  the time in its gutter).
- The time is **still parsed and still stripped from the inline description line**
  regardless of `hideTime`, so a time embedded in a description is never printed
  twice. This is handled by keeping the real `time` for stripping and gating only
  the chip render behind a new `showTimeChip` flag.

Default behaviour (no prop) is unchanged.

## Verification

- `npm run typecheck` (node + web) — clean.
- `npm test` — **98/98** tests pass.
- Verified in the browser preview: default today (untimed → gutter dots), a day
  with timed tasks (aligned `07:00`/`21:00` spine, no duplicate chips), the
  `СЕЙЧАС` marker placed between a past and an upcoming task, the "Сегодня" jump
  chip off-today, and the empty-state placeholder.
- Temporary seed edits used only to visualise the timed/now states were reverted;
  `src/shared/seed.ts` is unchanged.

---

# Frontend changes — Weekly view: toolbar & board layout redesign

Scope: front-end / UI changes to the **Weekly view** (`Неделя`) only — specifically
its **top toolbar** and the **day-column grid**. No data models, business logic, or
other views were touched. Only `src/renderer/src/views/WeekView.tsx` changed; it
**reuses** the store's existing `thisWeek()` action and the `weekAnalytics()`
selector (nothing added to shared code). This entry documents the redesign applied
via the `weekly_design` workflow, which targets Fitts's Law, Gestalt grouping,
visual hierarchy, window zoning, an 8px grid, above-the-fold priority, and
action-result proximity.

## Before

- Week nav (`‹ 13–19 июля ›`) was three loose elements floating mid-toolbar; the
  arrows were small (32px) and unanchored.
- The prime top-right corner held a **passive instructional hint** ("Перетащите
  задачу между днями…") — dead weight in a high-value spot.
- The week's completion figure ("5/17") lived **only** in the analytics card
  **below the fold**, so the key overview metric was never visible on entry.
- Empty weekend columns showed a lone "Add task" button floating at the top,
  reading as unintentional voids.

## Changes, mapped to the design principles

1. **Fitts's Law** — week navigation is now a single 48px-tall pill with **40×40
   arrow targets** (`WeekNav`), each hugging the control's edge; the
   **week-completion summary chip** sits in the **top-right corner**
   (`marginLeft: auto`), a Fitts-friendly Z-pattern endpoint.
2. **Gestalt** — the two arrows + range label are bound into **one rounded surface**
   with hairline internal dividers, so they read as a single unit (common region);
   each day header gains a **divider** binding it to its task list; the summary chip
   reuses the analytics meter treatment (similarity).
3. **Visual hierarchy** — removed the **duplicate** week-range label (it already
   shows in the app header); demoted the drag hint out of the prime corner; added a
   small weekend dot marker so the week/weekend split reads at a glance.
4. **Window zoning** — the top zone is now purely global controls: navigation
   (left) + "jump to current week" + week-status summary (right corner).
5. **Grid & spacing** — toolbar on the 8px system (48px control heights, `gap: 16`,
   `marginBottom: 24`); the drag hint sits 12px under the board.
6. **Above the fold** — the **week-completion summary chip**
   ("ВЫПОЛНЕНО · 5 / 17 · meter · 29 %") now lives in the toolbar, so the single
   most important overview metric is visible **on entry**; it also handles the
   empty-week state ("нет задач").
7. **Action-result proximity** — a new **"Сегодня"** button (wired to the existing
   `thisWeek()`) appears **only when viewing another week**, beside the navigation
   it complements; the drag hint sits directly beneath the board; every day
   column's **"Add task"** button is **bottom-anchored** (the list takes the slack
   via `flex: 1`), giving a consistent target across all seven columns and fixing
   the "floating add button on empty weekend columns" problem.

## New internal components (same file)

- `WeekNav` — the bound week-navigation pill (arrows + range/badge + calendar opener).
- `WeekSummaryChip` — the top-right week-completion summary (count + meter + %),
  with an empty-state ("нет задач").

## Verification

- `npx tsc --noEmit -p tsconfig.web.json` — passes (0 errors).
- `npx vitest run` — all 98 tests pass.
- Verified in the browser preview harness (`vite.preview.config.ts`): week nav ‹ ›
  changes weeks; the calendar picker opens anchored below the nav pill with the
  current week highlighted; "Сегодня" appears on a non-current week and returns to
  the current one; the summary chip shows live completion on a populated week and
  "нет задач" on an empty one; day columns render with header dividers, weekend
  markers, and bottom-anchored add-task buttons.

---

# Frontend changes — Weekly view redesign (earlier: analytics)

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

# Frontend changes — Sidebar (shared navigation panel) redesign

Front-end / UI work on the **Sidebar** (`src/renderer/src/components/Sidebar.tsx`),
the navigation panel shared by the Daily, Weekly, Habits and Spheres views. No data
models, business logic, or the internal content of any view were touched — the change
is confined to the sidebar's own presentation (nav items, section structure,
active/hover states, spacing, and the goals list). Two hover-helper CSS classes were
added to the shared stylesheet.

## Files changed

| File | Change |
|------|--------|
| `src/renderer/src/components/Sidebar.tsx` | Restructured layout into clear zones; new active/hover states; fixed the duplicate-label problem; sphere-colour goal grouping |
| `src/renderer/src/styles.css` | Added `.nav-item` / `.nav-goal` CSS hover classes (background-lift on hover, driven by CSS not JS) |

## Problems in the original sidebar (measured against the design principles)

1. **Duplicate / ambiguous labels (Gestalt similarity, hierarchy).** The panel had a
   nav item **«Сферы жизни»** *and*, just below, an uppercase section caption
   **«СФЕРЫ ЖИЗНИ»** for the goals list — two different controls that read almost
   identically. The section caption used the same faint disabled ink and uppercase
   treatment as each sphere's own header, so all three levels looked alike.
2. **No boundary between zones (common region).** Navigation and the goals list ran
   together with only whitespace between them; nothing bound each as its own region.
3. **Weak states (Fitts's Law, similarity).**
   - Nav items had **no hover feedback** at all — an inactive target gave no signal it
     was clickable.
   - The active nav item was a fill tint only, with no edge-anchored marker.
   - The active **goal** row used `rgba(255,255,255,0.05)` — practically invisible.
4. **Colour identity didn't carry.** Sphere colours drove the Spheres view's cards,
   but in the sidebar the goal rows were monochrome apart from a 3px bar, so the
   sidebar didn't visually tie back to the colour-coded spheres.
5. **Off-grid spacing.** Padding/margins were a mix of 2 / 9 / 11 / 22 px with no
   consistent rhythm.

## What changed

### 1. Explicit zones with a common-region divider
The panel is now three clearly separated regions, top-to-bottom, matching the
**window-zoning** principle (top = brand/global chrome, then navigation, then the
goals list):

- **Top:** brand (logo + "Planner") + collapse button — unchanged behaviour, tidied
  spacing.
- **Navigation:** the four view links, wrapped in a semantic `<nav>`.
- A **1px hairline divider** binds navigation apart from the goals list below, so the
  two are read as distinct **common regions** instead of two look-alike captions.

### 2. Fixed the duplicate-label problem
The goals-section caption was renamed from **«СФЕРЫ ЖИЗНИ»** to **«МОИ ЦЕЛИ»**, so it
no longer collides with the «Сферы жизни» nav item. It now also shows a **goal count**
beside it, so it reads as a real, quantified group header rather than a bare caption.
Its ink was lifted (from `textDisabled` to a heavier `textMuted` at 700 weight) so the
section header outranks the individual sphere headers beneath it — a clear
**visual hierarchy** (section → sphere → goal).

### 3. Stronger, consistent states (Fitts's Law + similarity)
- **Nav hover:** new `.nav-item` CSS class gives every inactive nav row a quiet
  background-lift + brighter text on hover, so the full-width row reads as a target.
- **Active nav item:** keeps the accent fill **and** gains a **left indicator bar**
  pinned to the panel edge (`left: -14px`), an edge-anchored "you are here" marker
  (Fitts's Law — the border is effectively an infinite-width target) that's far more
  legible than a fill alone.
- **Active goal row:** now tinted in **its own sphere's colour** (`${color}1f`), with
  the `%` figure and title also picking up the sphere colour / heavier weight — the
  selection is obvious and colour-consistent with the sphere it belongs to (previously
  near-invisible). New `.nav-goal` hover class gives inactive goal rows a lift too.

### 4. Sphere-colour grouping (common region + similarity)
Each sphere's goals now sit inside a **hairline rail on the left in the sphere's own
colour** (`borderLeft: 1px solid ${color}33`, indented), which:
- **binds** a sphere's goals together as one group (common region), and
- **carries the sphere colour** down into its goals, so the sidebar now matches the
  colour-coded cards in the Spheres view (coral Здоровье, amber Развитие, green
  Карьера, teal Досуг — verified side by side).

Sphere-header dots gained a soft colour glow, and goal progress bars were thickened
from 3px to 4px with a fuller radius for legibility.

### 5. Grid & spacing
Spacing was snapped onto a consistent 4/8-px-based rhythm: panel padding `16px`, nav
gap `3`, item padding `10×12`, divider margins `16/4`, goal group gap `3` and
`10px` bottom spacing between spheres. The goals scroll region is now `flex: 1`
(`minHeight: 0`), so the panel fills the full height cleanly and the goals list, not
empty space, absorbs any extra room.

> Note on the footer: the Settings + API-key footer is gated behind
> `AI_FEATURES_ENABLED`, which is currently `false`, so it stays hidden — it was left
> exactly as-is (out of scope, and it only configures the disabled AI integration).

All colours come from the existing `COLORS` token set / the spheres' own colours — no
new palette was introduced.

## Verification

- `npx tsc --noEmit -p tsconfig.web.json` → clean (exit 0).
- `npx vitest run` → **98/98 passing** (UI-only change; no logic touched).
- Rendered in the browser preview harness (`web-preview.html` via
  `vite.preview.config.ts`) and screenshotted the sidebar in **all four views**:
  - **Daily / Today** — active accent bar on «Сегодня».
  - **Weekly** — active bar on «Неделя», panel unaffected by the week board.
  - **Habits** — active bar on «Привычки».
  - **Spheres** — sidebar rails/dots line up in colour with the Spheres cards.
  - **Active goal** state (sphere-colour tint + coloured %) by selecting a goal.
  - **Collapse / expand** round-trips correctly (hide → header expand button → show).

## Screenshots captured during the work

- `sidebar-crop-before.png` — original sidebar (cramped, duplicate caption, invisible
  active goal state).
- `sidebar-crop-after.png` — redesigned sidebar (zones, divider, «МОИ ЦЕЛИ» + count,
  sphere rails, active bar).
- `sidebar-active-goal-after.png` — active goal tinted in its sphere colour.
- `sidebar-habits-after.png`, `sidebar-spheres-after.png`, `sidebar-week-crop-after.png`
  — the shared panel verified in each view.
- `sidebar-collapsed-after.png` — collapsed state.

---

# Frontend changes — Spheres (Сферы жизни) view: life-balance summary + toolbar

Front-end / UI work on the **Сферы жизни** view (`ReviewView.tsx`) only. The change
is confined to that single file — no data models, business logic, shared helpers,
or other views (Daily / Weekly / Habits) were touched. It reuses the existing
`sphereStatsOf` progress helper, the `COLORS` token set, and the `GoalDot`
primitive, so it stays inside the app's design language.

## Why (design-principle audit of the previous layout)

The top third of the screen — the most valuable real estate and the F/Z-pattern
entry point — held only a long drag-instruction sentence and a faint outline
"Добавить сферу" chip. There was **no at-a-glance sense of overall life balance**,
which is the whole point of a "spheres of life" view. Concretely:

- **Above the fold (principle 6) / Visual hierarchy (3):** no headline metric or
  first fixation; the eye landed on a wall of equally-weighted cards.
- **Fitts's law (1):** the primary create action was a small, low-contrast chip;
  the verbose reorder hint occupied the top-left hotspot instead.
- **Window zoning (4):** the top toolbar zone was underused (a hint + one weak
  button) rather than carrying a global overview.

## What changed

### 1. New **"Баланс жизни"** summary band (above the fold)

A headline card added at the very top of the view (`LifeBalanceBand`):

- **Large mean-progress figure** (40px/700, `tabular-nums`) — the overall balance
  across all spheres — giving the top third a strong first fixation point.
- **Count line** — `N сфер · M целей`, with correct Russian pluralisation for
  *both* words (`sphereWord`, reused `goalWord`).
- **Primary "Добавить сферу" button** promoted to a **filled accent** control
  (`PrimaryAddSphere`), anchored to the band's right edge — a large, high-contrast
  target rather than a faint chip (Fitts's law). A single component renders it, so
  the band and the empty-state use the exact same control.
- **Per-sphere breakdown** — one labelled slot per sphere, each carrying its own
  colour dot, name, `%`, and a colour-filled meter (fill = that sphere's progress).
  The slots are a responsive `auto-fit, minmax(150px, 1fr)` grid, so which areas of
  life lead and which lag reads instantly, the slots **wrap** gracefully with many
  spheres (verified at 7), and each slot's colour matches its card below (Gestalt
  similarity binds the summary to the grid).

### 2. Toolbar demoted to a quiet reorder hint

The old row (long sentence + weak add button) is gone. The primary action now lives
in the summary band; what remains above the grid is a **single small, low-priority**
grip hint, shown only when reordering is actually possible (`> 1` sphere), so it no
longer competes with the primary action for the top-left of the screen.

### 3. Empty-state parity

When there are no spheres yet (so the summary band is hidden), the same
`PrimaryAddSphere` button renders in the grid area, so the create action always has
a prominent home.

The sphere cards, goal cards, colour-coding, drag-reorder, inline rename/recolor,
and add-goal flows are **unchanged** — the redesign only adds the summary zone and
reworks the toolbar around them.

## Design-language consistency

- Summary band matches the existing Claude-summary / analytics card shell
  (`cardBg`, `border06`, radius 18, matching padding).
- Colours come entirely from `COLORS` and each sphere's own colour (via `color-mix`
  for the meter track), matching the per-sphere colour story already in the cards.
- Numerals use `tabular-nums`; spacing follows the existing 8-based rhythm.

## Verification

- `npm run typecheck` (node + web) — passes (exit 0).
- `npm run test` — **98/98 pass** (no test needed changing; the change is view-only).
- `npm run build` (electron-vite) — main, preload and renderer all build.
- Driven in the browser preview harness (`web-preview.html`) and screenshotted:
  - `spheres-before-1440.png` / `spheres-before-1120.png` — original layout.
  - `spheres-after-1440.png` — new summary band + grid (3-col).
  - `spheres-after-1120.png` — 2-col reflow, band still one row.
  - `spheres-after-7spheres-top.png` — 7 spheres: band wraps to two rows cleanly,
    correct `7 сфер · 4 цели` pluralisation, new spheres colour-matched across the
    band, cards and sidebar.
