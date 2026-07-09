# Handoff: Planner — Conversational AI Goal Planner (Desktop)

## Overview
"Planner" is a desktop (Electron) app where users manage AI-generated goal plans: check off daily tasks, plan the week, watch milestone-based progress, and adjust plans by chatting with Claude. This bundle contains the complete hi-fi interactive design of the **Do** and **Reflect** phases (the **Define** phase — goal creation via chat — is specified in the development plan but not yet designed).

## About the Design Files
The files in `design/` are **design references created in HTML** — an interactive prototype showing intended look and behavior, **not production code to copy directly**. Your task is to **recreate this design in the target codebase** (Electron + React + TypeScript, per the development plan) using its established patterns and libraries. The prototype's logic (in the `<script data-dc-script>` block of `Planner Desktop.dc.html`) is a faithful behavioral spec: read it for exact interaction rules, state shapes, and style values. Open `design/Planner Desktop.dc.html` in a browser to use the living prototype.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, and interactions are final. Recreate pixel-perfectly.

## App Shell (all screens)
Three-column desktop layout, min window ~1440×900, dark theme only:
- **Left sidebar** — 264px fixed. Background `#0a0a0c`, right border `1px solid rgba(255,255,255,0.05)`. Contents top-to-bottom: logo + wordmark "Planner"; nav (Сегодня / Неделя / Обзор); "МОИ ЦЕЛИ" section label (11px/600, letter-spacing 0.6px, `#5c5c62`); goal list (each row: 9px colored dot, 13.5px/500 title, milestone count `2/4`, 3px progress bar in the goal's color); pinned bottom: Настройки + green "API-ключ подключён" status dot.
- **Main area** — flexible. Background `#0d0d0f`. 64px header (title 19px/700, subtitle 12.5px `#7a7a80`, right-aligned "Спросить Claude" button — coral tint `rgba(232,86,63,0.13)` bg, `rgba(232,86,63,0.3)` border, `#E8563F` text). Content scrolls, 28px padding.
- **Right chat panel** — 360px, collapsible (toggled by "Спросить Claude" / ×). Same bg/border as sidebar. Header: Claude logo mark + active goal name. Messages: user bubbles right-aligned (coral-tint bg `rgba(232,86,63,0.18)`, radius `14px 14px 4px 14px`), assistant left (bg `#161618`, radius `14px 14px 14px 4px`), 13.5px/1.5. Footer: suggestion chips (pill, `rgba(255,255,255,0.05)` bg) + input row with coral send button (34×34, radius 9px, up-arrow icon).

Nav active state: coral text `#E8563F` on `rgba(232,86,63,0.13)`, radius 10px. Inactive `#b4b4b9`.

## Screens / Views

### 1. Сегодня (Daily view) — `data-screen-label="Today"`
Max-width 760px, centered.
- **Date navigator** (top, centered): `6 июля  ‹  [7 июля / Вторник]  ›  8 июля`. Current date 18px/700 with weekday caption below (12px `#7a7a80`); neighbor date labels 13.5px `#6f6f75`, clickable; ‹ › buttons 30×30, bg `#161618`, border `rgba(255,255,255,0.08)`, radius 9px. Arrows/labels hide (visibility:hidden) at week bounds. Header title shows "Сегодня" only when the selected day is today, otherwise the weekday name.
- **Day progress card**: bg `#141416`, border `rgba(255,255,255,0.06)`, radius 16px. "Прогресс дня" + "N из M задач" (count coral), 8px progress bar with coral gradient `linear-gradient(90deg,#E8563F,#f0855f)`, animated width.
- **Task groups by goal**: group header = goal dot + goal title (14.5px/600) + milestone count; clicking opens Goal detail. Task rows: bg `#161618`, border `rgba(255,255,255,0.05)`, radius 13px, padding ~13px 15px, hover `#1e1e22`. Row anatomy: 22px circular checkbox (unchecked: 2px border `rgba(255,255,255,0.22)`; checked: solid `#E8563F` with white ✓) → title 14.5px (done: `#5c5c62` + line-through) → optional time chip (parsed from description, e.g. `09:00`) → description preview line under the title (13px, muted; the first URL in a description renders the row title as a hyperlink in the goal's accent). Click row (not checkbox) opens the task editor. **Swipe/drag row left reveals a bin and deletes** with a smooth (not fast) slide-out animation.
- **"+ Добавить задачу"** row per group: dashed border `rgba(255,255,255,0.12)`, plus icon, `#7a7a80` text; opens the editor pre-set to that goal and the selected day.
- **"Застряли?" card** (bottom): coral-tinted bg `rgba(232,86,63,0.06)`, border `rgba(232,86,63,0.18)`. Lists stale tasks (title, goal + "N дней без движения") each with a "Разбить на шаги" button that opens the chat with a break-down request.

### 2. Task editor (create/edit)
Opened by clicking a task or "+ Добавить задачу". Fields: title; **description area** styled like iOS Notes — full-width, no visible box boundaries, scrollable when long, with a formatting toolbar docked at the **bottom** of the description zone (bold/italic/lists etc.); goal picker; day picker; delete (existing tasks). Behaviors:
- URLs in the description make the task's summary a hyperlink (opens externally, e.g. a Strava route).
- A time token in the description (e.g. `09:00`) is auto-extracted and shown as the task's time in lists; there is **no separate time field**.
- Tasks are ordered by time within a group when times exist.

### 3. Неделя (Weekly board) — `data-screen-label="Week"`
- **Week switcher** (top-left): `‹ [6 – 12 июля / Текущая неделя] ›` + a coral "Текущая" reset button. Badge reads Прошлая/Текущая/Будущая неделя. Weeks are offset-based; each week holds its own tasks. Top-right hint: "Перетащите задачу между днями".
- **7 columns** (Пн–Вс), CSS grid `repeat(7,1fr)` gap 12px. Column: radius 14px, min-height 440px, padding 12px 10px; normal bg `rgba(255,255,255,0.02)` border `rgba(255,255,255,0.05)`; today (only in current week): coral tint bg `rgba(232,86,63,0.06)` + border `rgba(232,86,63,0.25)`, date badge solid coral; weekend columns slightly dimmer. **Clicking a column's day header navigates to the Daily view for that day.**
- **Task cards**: mini rows (12px text) with 15px checkbox or goal-colored dot; click opens the task editor; `draggable` — **drag onto another column moves the task to that day** (drop target shows dashed coral border + `rgba(232,86,63,0.12)` bg). "+ Добавить задачу" per column creates a task on that day/week.
- **Аналитика недели card** (below board, Пн–Пт scope): header with "N из M задач · P%". Two-column grid: left — per-goal progress bars (goal dot, title, `d/t` count, 7px bar in goal color); right — "ВЫПОЛНЕНИЕ ПО ДНЯМ" mini bar chart, 5 vertical bars (Пн–Пт), coral gradient fill, height = % done, 120px tall.
- **"Идеи для отдыха на выходные" card** (below analytics): subtle coral gradient bg. Header: Claude mark, title, location line "Санкт-Петербург · подобрано под ваши интересы: театр, природа, музыка, кофе", and an "Обновить подборку" refresh button. Body: two columns СУББОТА / ВОСКРЕСЕНЬЕ, each with suggestion cards (category dot + category label 11px, title 13.5px, venue/address 12px muted) and a "В задачи" button → adds the suggestion as a task on that weekend day under a dedicated "Отдых и баланс" goal, button becomes a coral "✓ В плане" badge. Refresh shows a spinner ("Ищу события поблизости…", ~1s) then a new suggestion set. **In the prototype this is mocked; in production it is a real web search** (see development plan).

### 4. Goal detail — `data-screen-label="Goal"`
Max-width 820px. Hero card `#141416` radius 18px: category chip; closeness phrase (22px/700, e.g. "Примерно на полпути") over "N из M этапов пройдено"; 72px conic-gradient progress ring with % in the center; **milestone stepper** — one flex-1 segment per milestone (6px, radius 3px; done `#E8563F`, active `rgba(232,86,63,0.5)`, todo `rgba(255,255,255,0.08)`) with 11px labels beneath; "Claude's take" strip (logo mark + 13.5px/1.55 conversational assessment). Below: milestones with status chips (Завершён/В работе/Запланирован), `d/t` counts, and the same task rows as Daily.

### 5. Обзор (Review) — `data-screen-label="Review"`
Max-width 940px. (1) "Итоги недели от Claude" card: conversational summary + coral "Скорректировать план" button → opens chat. (2) 3-up grid of goal cards: dot + title, large % (30px/700), milestone count, mini stepper, closeness phrase; click → Goal detail. (3) "Застрявшие задачи" card: count badge, stale rows with "Разбить на шаги".

## Interactions & Behavior
- Checkbox click toggles done instantly; all progress (day bar, goal bars, ring, stepper, analytics) recomputes live.
- Task row click ≠ checkbox click (checkbox stops propagation).
- Swipe-to-delete on daily rows: horizontal drag, bin reveal, smooth ease-out removal.
- Drag & drop between week columns (HTML5 DnD in prototype; use a proper DnD lib in production).
- Chat: Enter or send button; canned assistant replies in the prototype — production streams from Claude. Suggestion chips send preset messages. "Разбить на шаги" pre-fills a break-down request and routes to the relevant goal's chat thread (chat history is per-goal).
- Hovers: rows `#1e1e22`, cards `#17171a`. Transitions ~120–300ms.

## State Management (observed in prototype)
- `view: today|week|goal|review`, `activeGoalId`, `dayIndex (0–6)`, `weekOffset (int, 0 = current)`, `chatOpen`, `ed` (task editor draft), `chats` (per-goal message arrays), `dragOverDay`, leisure `{seed, loading, added}`.
- Task: `{ id, goalId, mId, title, desc, done, day (0–6), week (offset) }`. Time is derived from `desc`, not stored.
- Goal: `{ id, title, category, dotColor, milestones[{id,title,status:done|active|todo}], closenessLabel, claudeTake }`.
- Progress = pure functions over task `done` flags; closeness = milestone-based.

## Design Tokens
Colors:
- Backgrounds: app `#0d0d0f`; sidebar/chat `#0a0a0c`; card `#141416`; row `#161618`; row hover `#1e1e22`; card hover `#17171a`
- Borders: `rgba(255,255,255,0.05)` / `0.06` / `0.08–0.09` (inputs); dashed add-row `rgba(255,255,255,0.12)`
- Accent (coral): `#E8563F`; gradient partner `#f0855f`; tints `rgba(232,86,63,0.06/0.12/0.13/0.14/0.16/0.18/0.25/0.28/0.3)`
- Text: primary `#f2f2f3`; secondary `#b4b4b9`; muted `#8a8a90`; faint `#7a7a80` / `#6f6f75`; disabled/done `#5c5c62`; ghost `#4c4c52`
- Goal palette: Здоровье `#E8563F`; Развитие `oklch(0.7 0.13 250)` (blue); Карьера `oklch(0.72 0.15 150)` (green); Досуг `oklch(0.7 0.13 300)` (purple); success dot `oklch(0.72 0.15 150)`
Typography: system stack (`-apple-system, 'SF Pro Display', system-ui, 'Segoe UI', sans-serif`). Sizes used: 11 / 11.5 / 12 / 12.5 / 13 / 13.5 / 14 / 14.5 / 15 / 15.5 / 16 / 18 / 19 / 22 / 30px. Weights 500/600/700. Headings letter-spacing −0.2…−0.3px; section labels +0.5–0.6px uppercase.
Radii: chips/pills 16–20px; buttons/inputs 9–12px; rows 12–13px; cards 16px; hero cards 18px; bars 2–5px.
Scrollbars: 9px, thumb `rgba(255,255,255,0.09)`.

## Assets
No external images. All icons are inline SVG (17px nav, 13–16px inline; stroke-based, stroke-width 1.8–2.4). Claude/logo mark = rounded square with coral gradient `linear-gradient(135deg,#E8563F,#f0855f)` containing a white rotated square. Recreate as components.

## Files
- `design/Planner Desktop.dc.html` — the full interactive prototype (markup + behavioral logic + all styles inline). **Source of truth.**
- `design/support.js` — prototype runtime; needed only to open the prototype locally, not part of the app.
- `DEVELOPMENT_PLAN.md` — updated build plan for Claude Code.

## Not yet designed
The Define phase (goal creation: clarifying chat → plan generation → review/edit → accept), Settings screen (API key), light theme, empty states, and error states. Follow the shell's visual vocabulary when building them.
