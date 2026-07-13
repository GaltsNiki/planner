// One-time data migrations. The key one (v1) converts the old *relative* week
// model — where a task's `week` was an offset from the moving "current week", so
// everything drifted forward as the calendar advanced — into *absolute* week
// indices anchored to a fixed epoch (see EPOCH_MONDAY in dates.ts).

import type { PlannerData } from './types'
import { currentWeekIndex } from './dates'

/** Bump when a new migration step is added. */
export const DATA_VERSION = 1

/**
 * Bring a loaded document up to DATA_VERSION. Idempotent: running it on already
 * current data returns it unchanged. `now` is injectable for tests.
 */
export function migrate(data: PlannerData, now: Date = new Date()): PlannerData {
  let d = data
  if ((d.version ?? 0) < 1) d = toAbsoluteWeeks(d, now)
  return { ...d, version: DATA_VERSION }
}

/**
 * v1: freeze in place. Reinterpret the stored relative offsets as absolute by
 * adding the current week index — so `week: 0` ("current week" when saved) stays
 * on the week it is showing now and never shifts again.
 */
function toAbsoluteWeeks(data: PlannerData, now: Date): PlannerData {
  const base = currentWeekIndex(now)
  return {
    ...data,
    tasks: data.tasks.map((t) => ({ ...t, week: base + (t.week ?? 0) })),
    habits: data.habits.map((h) => ({
      ...h,
      done: h.done.map((key) => {
        const [w, day] = key.split(':')
        return `${base + (Number(w) || 0)}:${day}`
      })
    }))
  }
}
