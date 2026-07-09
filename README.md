# Planner

Conversational AI goal planner for desktop (Electron + React + TypeScript).
Built from the design handoff in `Planner_ Conversational AI Goal App/`.

**AI features are mocked** — chat replies, task break-down, weekly review, and the
weekend-leisure "web search" are served by deterministic canned logic
(`src/shared/mockAI.ts`) behind the same IPC surface a real Anthropic integration
would use. Swap `src/main/services/ai.ts` for real `@anthropic-ai/sdk` calls to go live.

## Run

```bash
npm install
npm run dev        # launch the app (electron-vite dev)
```

## Other scripts

```bash
npm run build      # production bundle (main + preload + renderer)
npm start          # preview the production build
npm test           # vitest unit tests (pure logic)
npm run typecheck  # tsc for node + web projects
```

## Architecture

```
Renderer (React/TS) ──IPC──▶ Preload bridge ──▶ Main (Node/TS)
  Today / Week / Goal /       (contextBridge,     JSON storage (userData)
  Review + Chat panel          typed, minimal)    safeStorage API key
  Zustand store                                   mock AI service
```

- **Security:** `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`.
  External links open in the OS browser. The API key is encrypted at rest with
  `safeStorage` and never crosses into the renderer.
- **`src/shared/`** — framework-free, unit-tested logic: types, `taskMeta`
  (time/link extraction), `progress`, `closeness`, `dates` (ru-RU week math),
  `staleness`, `mockAI`, `seed`, and the IPC contract.
- **`src/main/`** — secure window, IPC handlers, storage / keychain / AI services.
- **`src/renderer/`** — Zustand store mirroring the prototype state, the four views
  (Today, Week, Goal, Review), the chat panel, and the Notes-style task editor.

## Views

- **Сегодня** — date navigator, day-progress card, task groups by goal, swipe-to-delete
  rows, time chips & links derived from descriptions, the "Застряли?" stuck card.
- **Неделя** — 7-column board with `@dnd-kit` drag-and-drop rescheduling, week
  analytics (per-goal bars + Пн–Пт chart), weekend leisure ideas with refresh.
- **Цель** — conic progress ring, milestone stepper, Claude's take, milestone sections.
- **Обзор** — mocked weekly summary, 3-up goal cards, stale-task list.

## Data

A single JSON document at `app.getPath('userData')/planner-data.json`, seeded on first
run from `src/shared/seed.ts`. Changes persist automatically (debounced).

## Not built (per handoff, undesigned)

Define phase (goal creation via chat → plan extraction), Settings screen UI,
light theme, empty/error states.
