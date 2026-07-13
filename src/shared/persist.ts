// Pure (de)serialization of the planner document. Kept free of any Node/Electron
// imports so it is unit-testable and shared between the storage layer and tests.

import type { PlannerData } from './types'
import { seedData } from './seed'

export function serialize(data: PlannerData): string {
  return JSON.stringify(data, null, 2)
}

/**
 * Parse a stored document. Returns `null` when the text is not valid JSON or is
 * not an object — the caller decides how to recover (backup/preserve), instead of
 * this function silently substituting seed data (which used to hide corruption).
 *
 * Missing top-level keys are backfilled from the seed so older docs stay loadable.
 * `version` is intentionally taken from the parsed doc (not the seed) so a
 * pre-migration file (no version) is still recognised as such by migrate().
 */
export function deserialize(raw: string): PlannerData | null {
  let parsed: Partial<PlannerData> | null
  try {
    parsed = JSON.parse(raw) as Partial<PlannerData>
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null

  const seed = seedData()
  return {
    goals: parsed.goals ?? seed.goals,
    tasks: parsed.tasks ?? seed.tasks,
    stale: parsed.stale ?? seed.stale,
    chats: parsed.chats ?? seed.chats,
    settings: parsed.settings ?? seed.settings,
    habits: parsed.habits ?? seed.habits,
    version: parsed.version
  }
}
