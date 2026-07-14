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
