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
