// Life-spheres group goals into areas of life (career, health, sport, …). A goal
// points at its sphere via `sphereId`. Centralised here — like leisure.ts — so the
// fallback sphere's id isn't copy-pasted around and a missing/deleted sphere is
// handled in one place.

import type { Goal, Sphere } from './types'

/** Fixed id of the always-present "uncategorised" sphere. Orphan goals live here. */
export const UNSORTED_SPHERE_ID = 'sphere-unsorted'
export const UNSORTED_SPHERE_TITLE = 'Разное'

/** Neutral colour for the uncategorised sphere. */
export const UNSORTED_SPHERE_COLOR = '#8a8f98'

/**
 * The sphere a goal belongs to. A missing `sphereId`, or one pointing at a sphere
 * that no longer exists, falls back to the UNSORTED sphere so a goal is never lost.
 */
export function resolveSphereId(goal: Goal, spheres: Sphere[]): string {
  if (goal.sphereId && spheres.some((s) => s.id === goal.sphereId)) return goal.sphereId
  return UNSORTED_SPHERE_ID
}
