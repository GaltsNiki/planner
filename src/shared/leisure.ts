// The "leisure / balance" goal (seeded as g4) is special-cased in a few places:
// weekend ideas attach their tasks to it, and week analytics exclude it from the
// per-goal breakdown. Centralised here so the magic id isn't copy-pasted around
// and so a missing goal (deleted by the user) is handled in one place.

import type { Goal } from './types'

/** Seed id of the leisure goal. */
export const LEISURE_GOAL_ID = 'g4'

/** The leisure goal if it still exists, else undefined. */
export function findLeisureGoal(goals: Goal[]): Goal | undefined {
  return goals.find((g) => g.id === LEISURE_GOAL_ID)
}
