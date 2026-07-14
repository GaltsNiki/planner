// One-time data migrations. The key one (v1) converts the old *relative* week
// model — where a task's `week` was an offset from the moving "current week", so
// everything drifted forward as the calendar advanced — into *absolute* week
// indices anchored to a fixed epoch (see EPOCH_MONDAY in dates.ts).

import type { PlannerData, Goal, Sphere } from './types'
import { currentWeekIndex } from './dates'
import { GOAL_COLORS } from './palette'
import { UNSORTED_SPHERE_ID, UNSORTED_SPHERE_TITLE, UNSORTED_SPHERE_COLOR } from './spheres'

/** Bump when a new migration step is added. */
export const DATA_VERSION = 2

/**
 * Bring a loaded document up to DATA_VERSION. Idempotent: running it on already
 * current data returns it unchanged. `now` is injectable for tests.
 */
export function migrate(data: PlannerData, now: Date = new Date()): PlannerData {
  let d = data
  if ((d.version ?? 0) < 1) d = toAbsoluteWeeks(d, now)
  if ((d.version ?? 0) < 2) d = deriveSpheres(d)
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

/**
 * v2: introduce life-spheres. Collapse each goal's free-text `category` into a
 * deduplicated set of Sphere records and stamp the goal's `sphereId`. Goals with
 * an empty category go to the UNSORTED sphere. Ids are deterministic (ordinal,
 * not Date.now()) so the migration is pure, repeatable, and collision-free.
 */
function deriveSpheres(data: PlannerData): PlannerData {
  // Idempotency: a v2 doc already carries spheres — start from those.
  const spheres: Sphere[] = data.spheres ? [...data.spheres] : []
  const byTitle = new Map<string, string>() // normalised title -> sphere id
  for (const s of spheres) byTitle.set(s.title.trim().toLowerCase(), s.id)

  let seq = spheres.length
  const ensureSphere = (rawTitle: string): string => {
    const title = rawTitle.trim()
    if (!title) return UNSORTED_SPHERE_ID
    const key = title.toLowerCase()
    const hit = byTitle.get(key)
    if (hit) return hit
    const id = 'sphere' + (seq + 1)
    spheres.push({ id, title, color: GOAL_COLORS[seq % GOAL_COLORS.length] })
    byTitle.set(key, id)
    seq++
    return id
  }

  const goals: Goal[] = data.goals.map((g) =>
    g.sphereId ? g : { ...g, sphereId: ensureSphere(g.category) }
  )

  // Always keep the UNSORTED sphere available as a home for orphan goals.
  if (!spheres.some((s) => s.id === UNSORTED_SPHERE_ID)) {
    spheres.unshift({ id: UNSORTED_SPHERE_ID, title: UNSORTED_SPHERE_TITLE, color: UNSORTED_SPHERE_COLOR })
  }

  return { ...data, goals, spheres }
}
