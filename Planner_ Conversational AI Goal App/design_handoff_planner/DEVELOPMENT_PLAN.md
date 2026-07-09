# Planner — Development Plan (v2, updated for the finished hi-fi design)

A conversational AI goal planner for desktop (Windows). The user talks through a goal in natural language; Claude breaks it into milestones and tasks; the plan stays visible and checkable across Today / Week / Goal / Review views.

**What changed since v1:** the Do + Reflect UI is now fully designed (see `README.md` + `design/Planner Desktop.dc.html`) and adds concrete product scope: task descriptions with Notes-style editing, links & time parsed from descriptions, swipe-to-delete, a date navigator, week offsets with per-week tasks, drag-and-drop rescheduling, weekly analytics, and web-searched weekend leisure suggestions. The plan below folds these in.

## Stack & principles (unchanged)
- Electron + React + TypeScript, scaffolded with electron-vite. Local-only storage, no accounts.
- Claude API via the user's own key (model `claude-opus-4-8`), `@anthropic-ai/sdk` in the main process only.
- Security-first: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`; key encrypted with `safeStorage`, never in the renderer; all network calls in main.
- TDD on core logic; typecheck + lint + tests green after every step; clean UI / logic / storage layering; atomic commits.
- Project location: `C:\Claude_Projects\Planner`.

## Architecture
```
Renderer (React/TS) ──IPC──▶ Preload bridge ──▶ Main (Node/TS)
  Today / Week / Goal /       (contextBridge,     Anthropic SDK (chat, plan
  Review + Chat panel          typed, minimal)     extraction, leisure search)
  no secrets, no Node                              JSON storage, safeStorage key
```

## Data model (src/shared/types.ts) — updated
- `Goal { id, title, description, category, dotColor, status, closenessLabel?, claudeTake?, createdAt }`
  - `dotColor`: per-goal accent from the design palette (see README tokens).
  - A built-in "Отдых и баланс" (leisure) goal hosts weekend suggestions added to the plan.
- `Milestone { id, goalId, title, order, status: 'done'|'active'|'todo', targetDate? }`
- `Task { id, goalId, milestoneId?, title, description, done, scheduledDate?: ISODate, order, createdAt, completedAt? }`
  - **Scheduling is by real date** (the prototype's `day`+`week` offsets map to dates).
  - **Derived, not stored:** `time` — first `HH:MM` token found in `description`; `link` — first URL in `description`. Pure functions in `src/shared/taskMeta.ts` (unit-tested): `extractTime(desc)`, `extractLink(desc)`.
- `ChatMessage { id, goalId, role, content, createdAt }` — chat history is **per-goal**.
- `LeisureSuggestion { id, date, category, title, venue, addedTaskId? }` (cache of last search).
- `Settings { location?, interests?: string[] }` — feeds the leisure search.

## Core pure logic (src/shared/) — all TDD
- `progress.ts`: percent per goal/milestone from task flags; day progress; week (Mon–Fri) analytics: per-goal `{done,total,pct}` + per-day pct.
- `closeness.ts`: milestone-based closeness (done/active/todo → stepper states + label).
- `taskMeta.ts`: time & link extraction; sort-by-time within groups.
- `dates.ts`: week math (Monday start, offsets, ranges like "6 – 12 июля", genitive month names, ru-RU).
- `staleness.ts`: stale-task detection (no state change for N days) driving "Застряли?" and Review.

## Claude integration (src/main/services/anthropic.ts)
1. **Chat (adjust-via-chat, get-unstuck, review):** `client.messages.stream(...)`, `thinking: { type: "adaptive" }`, deltas streamed to renderer over IPC. Context includes the active goal's plan + recent progress so replies like "Как мои успехи?" are grounded.
2. **Plan extraction (Define phase):** structured outputs — JSON schema / `messages.parse()` with Zod for `{ milestones: [{ title, tasks: [{ title, description? }] }] }`.
3. **Break-down-a-task:** structured output `{ steps: [{ title, description? }] }`; on accept, replaces/augments the stale task.
4. **Weekly review (Обзор):** one call summarizing done/stalled from real data → the "Итоги недели" card + per-goal `claudeTake`.
5. **Weekend leisure search (NEW, replaces the design's mock):** Claude with the **web search tool** enabled, prompted with the user's location + interests + the weekend dates; structured output `{ saturday: Suggestion[], sunday: Suggestion[] }` (title, category, venue/address). Cached per week; "Обновить подборку" re-runs it. Graceful offline fallback (keep last cache, show error state).
- Defaults: max_tokens 16000 non-streaming / 64000 streaming.

## Storage (src/main/services/storage.ts)
Single JSON doc in `app.getPath('userData')/planner-data.json` (goals, milestones, tasks, chats, leisure cache, settings). Pure (de)serialize, unit-tested; schema kept SQLite-friendly.

## UI build scope (renderer) — from the design
Components (styling per README tokens; ru-RU copy as in the prototype):
- `AppShell` (sidebar 264px / main / chat 360px collapsible), `Sidebar` (nav + goal list w/ progress), `ChatPanel` (bubbles, chips, streaming), `ClaudeMark`.
- `TodayView`: `DateNavigator` (‹ 7 июля ›), `DayProgressCard`, `GoalTaskGroup`, `TaskRow` (checkbox, time chip, link-ified title, description preview, **swipe-to-delete** w/ eased animation), `AddTaskRow`, `StuckCard`.
- `TaskEditor`: title; Notes-style description (full-width, borderless, scrollable, formatting toolbar docked at the bottom); goal + date pickers; delete. No time field — time lives in the description.
- `WeekView`: `WeekSwitcher` (offset nav + Прошлая/Текущая/Будущая badge + reset), 7 `DayColumn`s (today highlight, weekend dimming, header click → Today at that date, **drag-and-drop move between days** — use `@dnd-kit` rather than raw HTML5 DnD), `WeekAnalyticsCard` (per-goal bars + Пн–Пт day chart), `WeekendIdeasCard` (Сб/Вс suggestion lists, refresh w/ spinner, "В задачи" → creates task under leisure goal, "В плане" state).
- `GoalDetail`: hero (closeness phrase, conic ring, milestone stepper + labels, Claude's take), milestone sections with status chips.
- `ReviewView`: Claude summary card, 3-up goal cards, stale list.
- `Settings`: API key (set/clear/status) + location & interests for leisure search.
- State: Zustand store mirroring the prototype's state (`view`, `activeGoalId`, `selectedDate`, `weekOffset`, `chatOpen`, editor draft, per-goal chats).

## Build order (each step ends with typecheck + lint + tests green)
1. Scaffold electron-vite React-TS at `C:\Claude_Projects\Planner`; git init; .gitignore; blank app launches.
2. Shared types + pure logic with tests first: `progress`, `closeness`, `taskMeta`, `dates`, `staleness`.
3. Storage service + tests; load/save wired in main.
4. Secure window + preload bridge; one round-trip IPC proven.
5. API key flow (`keychain.ts` + Settings UI incl. location/interests).
6. App shell + Sidebar + view routing; design tokens as a small constants module.
7. TodayView: date navigator, groups, TaskRow (toggle, time chip, links), day progress. Persist on change.
8. TaskEditor (Notes-style description, link/time behavior) + swipe-to-delete.
9. WeekView: switcher, columns, CRUD from cells, drag-and-drop, header→Today.
10. Week analytics card (pure functions from step 2).
11. Claude chat streaming → ChatPanel (per-goal history); suggestion chips; break-down flow (structured output).
12. Define phase: new-goal chat → plan extraction → review/edit → accept (fills goals/milestones/tasks). *(UI to be designed following the shell's vocabulary.)*
13. Weekend leisure: web-search-backed suggestion service + WeekendIdeasCard wiring; cache + offline fallback.
14. GoalDetail + ReviewView (incl. weekly-review Claude call).
15. Polish: empty states, error surfacing (bad key / offline), animations (hover 120ms, bars 300ms, swipe-delete eased), full E2E pass.

## Verification
Automated: `tsc --noEmit`, eslint, vitest after every step. Unit tests: progress/closeness math, time & link extraction, week/date math, staleness, storage round-trip, plan & break-down & leisure schemas.
Manual E2E:
1. Key save/clear; confirm encrypted at rest; renderer bundle greps clean of the key.
2. Define a goal via chat → structured plan appears → accept fills the planner.
3. Today: navigate dates; add/edit/delete (incl. swipe); description link opens externally (e.g. Strava); `09:00` in description shows as the task's time and orders the list.
4. Week: switch weeks (tasks are week-scoped); drag a task Tue→Thu; day header opens Today at that date; analytics update as tasks toggle.
5. Weekend ideas: refresh triggers a real search (location/interests honored); "В задачи" lands on the right day under "Отдых и баланс"; offline → graceful fallback.
6. Progress: check tasks → day bar, goal bars, ring, stepper, review cards all update; relaunch → everything persists.
7. Security config check: contextIsolation/sandbox on, nodeIntegration off.
