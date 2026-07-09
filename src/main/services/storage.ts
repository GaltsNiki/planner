// JSON document storage in the user-data directory. Pure (de)serialize on top
// of the filesystem; seeded on first run.

import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import type { PlannerData } from '@shared/types'
import { seedData } from '@shared/seed'

function dataPath(): string {
  return join(app.getPath('userData'), 'planner-data.json')
}

/** Parse a stored document, falling back to seed on any corruption. */
export function deserialize(raw: string): PlannerData {
  try {
    const parsed = JSON.parse(raw) as Partial<PlannerData>
    const seed = seedData()
    // Shallow-fill any missing top-level keys so older docs stay loadable.
    return {
      goals: parsed.goals ?? seed.goals,
      tasks: parsed.tasks ?? seed.tasks,
      stale: parsed.stale ?? seed.stale,
      chats: parsed.chats ?? seed.chats,
      settings: parsed.settings ?? seed.settings
    }
  } catch {
    return seedData()
  }
}

export function serialize(data: PlannerData): string {
  return JSON.stringify(data, null, 2)
}

export function load(): PlannerData {
  const p = dataPath()
  if (!existsSync(p)) {
    const seed = seedData()
    writeFileSync(p, serialize(seed), 'utf-8')
    return seed
  }
  return deserialize(readFileSync(p, 'utf-8'))
}

export function save(data: PlannerData): void {
  writeFileSync(dataPath(), serialize(data), 'utf-8')
}
