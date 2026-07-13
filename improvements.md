I. Code Review Findings & Improvement Plan
Context
Skeptical senior-engineer review of the Planner Electron app (c:\Claude_Projects\Planner, ~4.6k lines TS/TSX: Electron main + preload + React/Zustand renderer, Gemini AI integration, JSON file storage). Tests (51) pass, typecheck is clean. The verdict: the Electron security setup and shared pure-logic layer are genuinely good; the problems are one live credential leak, real data-loss paths in persistence, a handful of crash/correctness bugs, and a "stale tasks" feature that is actually hardcoded seed data.

Findings (ranked by severity)
CRITICAL

1. API credential leaked in public GitHub history. features.txt containing an AQ.… Google API token + GCP project number was committed (79dde88), then "removed" in commit f172e86 ("remove api key"). Deleting the file does not remove it from history — git show f172e86^:features.txt retrieves it, and the repo github.com/GaltsNiki/planner is public (API returns 200). Cost: anyone can burn the Gemini quota / bill on that key. Fix: rotate the key in Google AI Studio / Cloud Console (the only real fix); optionally rewrite history with git filter-repo + force-push, knowing GitHub may still cache the old commit.

HIGH 2. Data-loss by design in storage — storage.ts

save() uses a plain writeFileSync in place: a crash/power loss mid-write corrupts planner-data.json.
deserialize() catches any parse error and silently returns seed data; the next debounced save then overwrites the file with the seed. One corrupt write = all goals/tasks/habits/chats gone, silently. No backup, no versioned copies. Fix: atomic write (temp file + rename), keep a rolling .bak, and on parse failure move the corrupt file aside and surface an error instead of reseeding. 3. Debounced save with no flush on quit — store.ts:139-152 persist() waits 250 ms; closing the window inside that window drops the last edit. There is no before-quit/will-quit flush in main/index.ts and no flush on the renderer side. Cost: sporadic "my last change disappeared" — exactly the "don't lose progress on misclick" complaint in your own notes.

4. AI-sourced text injected as raw HTML — TaskEditor.tsx:40 notesRef.current.innerHTML = ed.desc re-injects stored desc as HTML. addSuggestion (store.ts:521) builds desc from Gemini + Google-Search-grounded output ('Место: ' + sug.place) with no escaping. Malicious/odd markup in a web-sourced suggestion executes in the renderer when the task is opened. Sandbox + contextIsolation limit the blast radius, but the renderer still has window.planner (can wipe/replace the API key, fire chat calls). Fix: HTML-escape external text when composing desc; sanitize before assigning innerHTML.

5. Crash in addSuggestion — store.ts:516-518 s.goals.find(g4) || s.goals[0] → undefined when the user has deleted all goals → g.milestones[0] throws; likewise a goal with zero milestones → m.id throws. Clicking "В задачи" on a weekend idea crashes the view. Related smell: the magic seed id 'g4' is hardcoded in 5 files (store, progress.ts, mockAI.ts, WeekAnalytics.tsx) — the "leisure goal" concept lives on a seed-data id the user can delete or never have.

MEDIUM 6. The "stale tasks" feature is fake — staleness.ts, seed data stale is seeded once and never recomputed. Nothing tracks days-without-movement on real tasks; STALE_THRESHOLD/isStale are dead logic. Users see the same 3 hardcoded rows in "Застряли?" and Review forever. Either compute it (needs a lastTouched timestamp on Task) or remove the cards.

7. Review view fires a paid Gemini call on every mutation — ReviewView.tsx:14-18 useEffect([goals, tasks]) → toggling any task while the Review tab is open triggers a fresh API round-trip. No debounce, no cancel of the actual request, no loading state distinction. Cost: quota + latency for nothing.

8. Silent mock fallback masquerades as real AI — ai.ts (all four functions) Any API error returns canned mock replies with zero indication. A user with a broken key gets confident-sounding fake "AI advice" and can't tell. Also: no key-settings UI exists — setKey/hasKey/clearKey are wired through IPC/preload but never called from the renderer (dead API surface); the only way to configure a key is the .env file.

9. clearKey() throws when only an env key exists — keychain.ts:53-55 hasKey() is true via GEMINI_API_KEY, but the file doesn't exist → rmSync throws ENOENT → IPC rejects. And clearing can never remove an env key, so hasKey() stays true afterwards. Latent until a settings UI exists, but wrong today.

10. Test coverage is inverted — src/shared/**tests**/ (365 lines) Only the trivial pure helpers are tested. The 544-line store (all mutation logic: reorderTask, saveGoalEd status rules, deleteGoal cascade, migration-on-load interplay), the storage layer, and IPC have zero tests. The bugs found in this review (#2, #5, #9) all live in untested code — that's the pattern.

LOW / tech debt 11. reorderTask mutates state in place — store.ts:224-225: moved.day = target.day mutates the object shared with previous state. Harmless today (no memoized children), a landmine if React.memo is ever added. 12. Inline styles everywhere. Hundreds of per-render style objects, raw rgba(...) literals duplicated despite tokens.ts existing. Maintainability cost (restyle = grep-and-pray), minor perf. 13. desc doubles as rich-text HTML and a metadata store. Time and links are regex-parsed out of HTML on every render (taskMeta.ts); document.execCommand is deprecated. Fragile, but tested and working — leave until it hurts. 14. No React error boundary — one render exception = permanent white screen (relevant given crash #5). 15. Week analytics totals are inconsistent: total includes leisure tasks but the per-goal breakdown excludes them, so numbers don't add up on screen. Test asserts this, so it's "intentional" — but it reads as a bug to a user.

Genuinely fine — no action needed
Electron security posture: contextIsolation, sandbox, no nodeIntegration, minimal typed preload bridge, external links forced to OS browser. Better than most hobby Electron apps.
The shared pure-logic layer (dates.ts, progress.ts, migrate.ts) is well-factored, documented, injectable-for-tests, and the absolute-week migration is correctly idempotent and version-stamped.
safeStorage for the key at rest, key never crossing IPC to the renderer.
Prioritized improvement plan

# Action Effort When

1 Rotate the leaked Google API key; optionally scrub history with git filter-repo 15 min (+30 for history rewrite) Today
2 Atomic save + .bak + no-silent-reseed in storage.ts ~1–2 h This week
3 Flush pending save on quit (renderer beforeunload → sync save, or main-side flush) ~30 min This week
4 Escape external text in addSuggestion desc; sanitize before innerHTML in TaskEditor ~1 h This week
5 Fix addSuggestion crash (guard missing goal/milestone); centralize the leisure-goal concept behind one helper instead of 'g4' literals ~1 h This week
6 Fix clearKey() ENOENT (rmSync(..., { force: true }) + honest env-key semantics) 15 min This week
7 Debounce/gate the Review-view API call; add loading + "mock fallback" indicator in AI replies ~2 h Next
8 Store tests: reorderTask, deleteGoal cascade, saveGoalEd status rules, persistence round-trip (storage serialize/deserialize/migrate already partially covered) ~3–4 h Next
9 Make staleness real (add lastTouched to Task, compute rows) — or delete the fake cards ~3 h / 30 min Next
10 Undo for destructive deletes (goal delete cascades tasks+chats with one click, no confirm) ~3 h Later
11 Style tokens consolidation, error boundary, immutable reorderTask opportunistic Later
Verification
After #2/#3: kill the app mid-write (task manager) and within 250 ms of an edit; relaunch — data intact, .bak present, corrupt file preserved aside.
After #4: create a task via a leisure suggestion whose place contains <img src=x onerror=alert(1)> (mock it) — must render as text.
After #5: delete all goals → click "В задачи" on a weekend idea — no crash.
npm run typecheck && npm test stays green; run the app (npm run dev) and exercise Today/Week/Review flows.

II. UI/UX Improvements
II. UX/UI Review (to append to improvements.md)
Actively hurting users (ranked)
Mouse-only UI — no Esc/Enter in TaskEditor/GoalEditor (Calendar/menus DO handle Esc — inconsistent); unfocusable <div onClick> controls; no focus styles. Fix: keydown handlers + autofocus. Quick (~2h).
No confirm/undo on destructive actions — goal delete cascades tasks+chats in one click; TaskRow trash sits beside the link chip. Fix: undo toast. Medium (~3h).
Contrast/legibility failures (computed): textDisabled #5c5c62 = 2.8:1 used for todo milestone titles (GoalDetail.tsx:66, WeekAnalytics.tsx:88); textFaint2 #6f6f75 = 3.7:1 at 10–12.5px metadata; white-on-accent buttons 3.6:1; 9.5–10px fonts in analytics. Fix tokens + 11px floor. Quick (~1h).
Chat: no pending state, double-send possible, and with zero goals send() dead-ends silently (activeGoal() undefined → main throws → reply never arrives, no error). store.ts:480, ChatPanel. Quick (~2h).
UI lies: «Настройки» is a dead button (no settings screen exists); «API-ключ подключён» green dot is hardcoded, never calls hasKey() (Sidebar.tsx:121-131); «Застряли?» cards are static seed rows. Medium (~4h for settings modal + real status).
Week view collapses with chat open: 1200px min window − 264 sidebar − 360 chat = 576px for 7 columns; chat is open by default. Auto-collapse chat on Week view. Quick (~2h).
Nav label mismatch: sidebar «Цели» opens the weekly review («Обзор»); actual goals are a separate «МОИ ЦЕЛИ» list. Rename. Trivial.
Habits week navigator is local state, unsynced with global weekOffset, resets on tab switch (HabitsView.tsx:13). Quick (~30min).
Polish tier
New stage/habit rows: empty title, no autofocus, borderless inputs don't look editable.
Multiple milestones can be «В работе»; analytics count only the first active → displayed % diverges.
Drag ergonomics: 20px handle, three zones per ~40px card, no end-of-list drop.
Week analytics totals include leisure but breakdown excludes it — numbers don't reconcile on screen.
First-run: plain «Загрузка…» splash; hidden overflow in day columns with near-invisible scrollbar.
Upgrade order
(1) modals/keyboard+autofocus → (2) undo toast → (3) contrast tokens → (4) chat states+guard → (5) settings modal/real key status → (6) chat auto-collapse on Week → (7) rename nav + sync habits week → (8) single-active milestone + reconcile totals → (9) drag ergonomics → (10) splash/empty states.

Verification
Run npm run dev: Esc/Enter round-trip a new task without touching the mouse; delete a goal → undo restores tasks+chat; zero-goal chat shows an error bubble instead of hanging; Week tab at 1200px window readable with chat previously open; habits tab opens on the week you were viewing.

I. Code Review (previous request — findings already delivered & copied by user into improvements.md §I)
Context
Skeptical senior-engineer review of the Planner Electron app (c:\Claude_Projects\Planner, ~4.6k lines TS/TSX: Electron main + preload + React/Zustand renderer, Gemini AI integration, JSON file storage). Tests (51) pass, typecheck is clean. The verdict: the Electron security setup and shared pure-logic layer are genuinely good; the problems are one live credential leak, real data-loss paths in persistence, a handful of crash/correctness bugs, and a "stale tasks" feature that is actually hardcoded seed data.

Findings (ranked by severity)
CRITICAL

1. API credential leaked in public GitHub history. features.txt containing an AQ.… Google API token + GCP project number was committed (79dde88), then "removed" in commit f172e86 ("remove api key"). Deleting the file does not remove it from history — git show f172e86^:features.txt retrieves it, and the repo github.com/GaltsNiki/planner is public (API returns 200). Cost: anyone can burn the Gemini quota / bill on that key. Fix: rotate the key in Google AI Studio / Cloud Console (the only real fix); optionally rewrite history with git filter-repo + force-push, knowing GitHub may still cache the old commit.

HIGH 2. Data-loss by design in storage — storage.ts

save() uses a plain writeFileSync in place: a crash/power loss mid-write corrupts planner-data.json.
deserialize() catches any parse error and silently returns seed data; the next debounced save then overwrites the file with the seed. One corrupt write = all goals/tasks/habits/chats gone, silently. No backup, no versioned copies. Fix: atomic write (temp file + rename), keep a rolling .bak, and on parse failure move the corrupt file aside and surface an error instead of reseeding. 3. Debounced save with no flush on quit — store.ts:139-152 persist() waits 250 ms; closing the window inside that window drops the last edit. There is no before-quit/will-quit flush in main/index.ts and no flush on the renderer side. Cost: sporadic "my last change disappeared" — exactly the "don't lose progress on misclick" complaint in your own notes.

4. AI-sourced text injected as raw HTML — TaskEditor.tsx:40 notesRef.current.innerHTML = ed.desc re-injects stored desc as HTML. addSuggestion (store.ts:521) builds desc from Gemini + Google-Search-grounded output ('Место: ' + sug.place) with no escaping. Malicious/odd markup in a web-sourced suggestion executes in the renderer when the task is opened. Sandbox + contextIsolation limit the blast radius, but the renderer still has window.planner (can wipe/replace the API key, fire chat calls). Fix: HTML-escape external text when composing desc; sanitize before assigning innerHTML.

5. Crash in addSuggestion — store.ts:516-518 s.goals.find(g4) || s.goals[0] → undefined when the user has deleted all goals → g.milestones[0] throws; likewise a goal with zero milestones → m.id throws. Clicking "В задачи" on a weekend idea crashes the view. Related smell: the magic seed id 'g4' is hardcoded in 5 files (store, progress.ts, mockAI.ts, WeekAnalytics.tsx) — the "leisure goal" concept lives on a seed-data id the user can delete or never have.

MEDIUM 6. The "stale tasks" feature is fake — staleness.ts, seed data stale is seeded once and never recomputed. Nothing tracks days-without-movement on real tasks; STALE_THRESHOLD/isStale are dead logic. Users see the same 3 hardcoded rows in "Застряли?" and Review forever. Either compute it (needs a lastTouched timestamp on Task) or remove the cards.

7. Review view fires a paid Gemini call on every mutation — ReviewView.tsx:14-18 useEffect([goals, tasks]) → toggling any task while the Review tab is open triggers a fresh API round-trip. No debounce, no cancel of the actual request, no loading state distinction. Cost: quota + latency for nothing.

8. Silent mock fallback masquerades as real AI — ai.ts (all four functions) Any API error returns canned mock replies with zero indication. A user with a broken key gets confident-sounding fake "AI advice" and can't tell. Also: no key-settings UI exists — setKey/hasKey/clearKey are wired through IPC/preload but never called from the renderer (dead API surface); the only way to configure a key is the .env file.

9. clearKey() throws when only an env key exists — keychain.ts:53-55 hasKey() is true via GEMINI_API_KEY, but the file doesn't exist → rmSync throws ENOENT → IPC rejects. And clearing can never remove an env key, so hasKey() stays true afterwards. Latent until a settings UI exists, but wrong today.

10. Test coverage is inverted — src/shared/**tests**/ (365 lines) Only the trivial pure helpers are tested. The 544-line store (all mutation logic: reorderTask, saveGoalEd status rules, deleteGoal cascade, migration-on-load interplay), the storage layer, and IPC have zero tests. The bugs found in this review (#2, #5, #9) all live in untested code — that's the pattern.

LOW / tech debt 11. reorderTask mutates state in place — store.ts:224-225: moved.day = target.day mutates the object shared with previous state. Harmless today (no memoized children), a landmine if React.memo is ever added. 12. Inline styles everywhere. Hundreds of per-render style objects, raw rgba(...) literals duplicated despite tokens.ts existing. Maintainability cost (restyle = grep-and-pray), minor perf. 13. desc doubles as rich-text HTML and a metadata store. Time and links are regex-parsed out of HTML on every render (taskMeta.ts); document.execCommand is deprecated. Fragile, but tested and working — leave until it hurts. 14. No React error boundary — one render exception = permanent white screen (relevant given crash #5). 15. Week analytics totals are inconsistent: total includes leisure tasks but the per-goal breakdown excludes them, so numbers don't add up on screen. Test asserts this, so it's "intentional" — but it reads as a bug to a user.

Genuinely fine — no action needed
Electron security posture: contextIsolation, sandbox, no nodeIntegration, minimal typed preload bridge, external links forced to OS browser. Better than most hobby Electron apps.
The shared pure-logic layer (dates.ts, progress.ts, migrate.ts) is well-factored, documented, injectable-for-tests, and the absolute-week migration is correctly idempotent and version-stamped.
safeStorage for the key at rest, key never crossing IPC to the renderer.
Prioritized improvement plan

# Action Effort When

1 Rotate the leaked Google API key; optionally scrub history with git filter-repo 15 min (+30 for history rewrite) Today
2 Atomic save + .bak + no-silent-reseed in storage.ts ~1–2 h This week
3 Flush pending save on quit (renderer beforeunload → sync save, or main-side flush) ~30 min This week
4 Escape external text in addSuggestion desc; sanitize before innerHTML in TaskEditor ~1 h This week
5 Fix addSuggestion crash (guard missing goal/milestone); centralize the leisure-goal concept behind one helper instead of 'g4' literals ~1 h This week
6 Fix clearKey() ENOENT (rmSync(..., { force: true }) + honest env-key semantics) 15 min This week
7 Debounce/gate the Review-view API call; add loading + "mock fallback" indicator in AI replies ~2 h Next
8 Store tests: reorderTask, deleteGoal cascade, saveGoalEd status rules, persistence round-trip (storage serialize/deserialize/migrate already partially covered) ~3–4 h Next
9 Make staleness real (add lastTouched to Task, compute rows) — or delete the fake cards ~3 h / 30 min Next
10 Undo for destructive deletes (goal delete cascades tasks+chats with one click, no confirm) ~3 h Later
11 Style tokens consolidation, error boundary, immutable reorderTask opportunistic Later
Verification
After #2/#3: kill the app mid-write (task manager) and within 250 ms of an edit; relaunch — data intact, .bak present, corrupt file preserved aside.
After #4: create a task via a leisure suggestion whose place contains <img src=x onerror=alert(1)> (mock it) — must render as text.
After #5: delete all goals → click "В задачи" on a weekend idea — no crash.
npm run typecheck && npm test stays green; run the app (npm run dev) and exercise Today/Week/Review flows.
