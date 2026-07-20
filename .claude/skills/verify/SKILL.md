---
name: verify
description: Drive the Planner renderer in a real browser to verify UI changes end-to-end.
---

# Verifying Planner UI changes

This is an Electron app, but the renderer is plain React + Vite and talks to the
main process only through `window.planner`. Stub that bridge and the whole UI runs
in a normal browser, where Playwright can drive it. This is far easier than
automating Electron on Windows.

## Harness

Three throwaway files at the repo root (delete them when done — do NOT commit):

1. **`verify-stub.ts`** — defines `window.planner` before the app loads:
   `loadData` returns a seeded `PlannerData`, `saveData` records to
   `window.__lastSave` (assert against this to prove a change persisted),
   `hasKey` → `false`, and `chat`/`review`/`leisure`/`breakDown` as no-ops.
   Seed goals/milestones/tasks with SHOUTY ids (`ALPHA`, `BETA`) — they're easy
   to assert on and never collide with real UI text.

2. **`verify-harness.html`** — `<div id="root">`, then the stub as a module
   script, then `/src/renderer/src/main.tsx`. Stub must come first.

3. **`vite.verify.config.ts`** — plain (not electron-) vite, `root: process.cwd()`,
   the `@shared` + `@renderer` aliases copied from `electron.vite.config.ts`,
   `plugins: [react()]`, a fixed port. Use `process.cwd()`, NOT `__dirname` — it's
   undefined in an ESM config and the aliases silently resolve wrong. Symptom:
   every module importing `@shared/*` 500s with "Failed to resolve import", and
   `#root` renders empty. Write this file with the Write tool; a bash heredoc
   mangles it.

Run: `npx vite --config vite.verify.config.ts` then open
`http://localhost:<port>/verify-harness.html`.

## Driving it

Playwright is NOT a project dependency. It lives in the npx cache — find it with
`ls ~/AppData/Local/npm-cache/_npx/*/node_modules | grep playwright`, then put
your script in that directory and `node` it from there, so the import resolves.

Gotchas that cost real time here:

- **dnd-kit drags need stepped pointer events.** `locator.dragTo()` and single
  `mouse.move` jumps do nothing — `PointerSensor` has a 5px activation
  constraint. Do: `mouse.move(start)` → `mouse.down()` → small move past the
  threshold → `mouse.move(end, { steps: 20 })` → pause → `mouse.up()`.
- **Context menus won't open via `click({ button: 'right' })`.** Use explicit
  `mouse.down({button:'right'})` / `mouse.up({button:'right'})`.
- **Menu item labels are `<span>`, not `<div>`** — `span:text-is("...")`.
- Selectors: stage title inputs are the `input`s with `style.fontWeight === '600'`.

## Worth driving

- Goals view: stage drag-reorder (both directions, and dropping onto the LAST
  stage — that's the case a naive "insert before target" gets wrong), plus
  task copy/paste through the right-click menus and the "Добавить задачу" row.
- Always assert against `window.__lastSave`, not just the DOM: the store writes
  through `persist()`, and a reorder that renders but never saves is a bug.
