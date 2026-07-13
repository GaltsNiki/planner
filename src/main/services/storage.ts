// JSON document storage in the user-data directory. Durable writes on top of the
// pure (de)serialize helpers in @shared/persist: writes are atomic (temp file +
// rename) with a rolling .bak, and a corrupt file is preserved (never silently
// overwritten with seed data) so nothing is lost without a trace.

import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, renameSync, copyFileSync } from 'fs'
import type { PlannerData } from '@shared/types'
import { seedData } from '@shared/seed'
import { migrate, DATA_VERSION } from '@shared/migrate'
import { serialize, deserialize } from '@shared/persist'

function dataPath(): string {
  return join(app.getPath('userData'), 'planner-data.json')
}
function bakPath(): string {
  return dataPath() + '.bak'
}
function tmpPath(): string {
  return dataPath() + '.tmp'
}

// Re-export the pure helpers so existing imports keep working.
export { serialize, deserialize }

/** Try to load and parse a file, returning null if absent or unparseable. */
function tryLoad(path: string): PlannerData | null {
  if (!existsSync(path)) return null
  try {
    return deserialize(readFileSync(path, 'utf-8'))
  } catch {
    return null
  }
}

export function load(): PlannerData {
  const p = dataPath()

  if (!existsSync(p)) {
    const seed = seedData()
    save(seed)
    return seed
  }

  const parsed = tryLoad(p)
  if (parsed) {
    const migrated = migrate(parsed)
    // Persist the migration once so the conversion isn't recomputed each load.
    if (migrated !== parsed && (parsed.version ?? 0) < DATA_VERSION) save(migrated)
    return migrated
  }

  // Primary file is corrupt. Preserve it for forensics/recovery instead of
  // clobbering it, then try to fall back to the last good backup.
  const corruptPath = `${p}.corrupt-${Date.now()}`
  try {
    copyFileSync(p, corruptPath)
    console.error(`[storage] corrupt data file preserved at ${corruptPath}`)
  } catch (e) {
    console.error('[storage] failed to preserve corrupt data file:', e)
  }

  const fromBak = tryLoad(bakPath())
  if (fromBak) {
    console.error('[storage] recovered data from .bak')
    const migrated = migrate(fromBak)
    save(migrated) // restore the primary from the good backup
    return migrated
  }

  // Nothing recoverable — seed a fresh document. The corrupt copy is on disk.
  const seed = seedData()
  save(seed)
  return seed
}

export function save(data: PlannerData): void {
  const p = dataPath()
  // Always stamp the current version so renderer saves (which omit it) don't
  // regress the file back to a pre-migration state.
  const text = serialize({ ...data, version: DATA_VERSION })

  // Write to a temp file first, then atomically rename over the target so an
  // interrupted write can never leave a half-written primary file.
  writeFileSync(tmpPath(), text, 'utf-8')

  // Roll the current good file to .bak before replacing it, so a bad future
  // write still leaves one recoverable generation behind.
  if (existsSync(p)) {
    try {
      copyFileSync(p, bakPath())
    } catch (e) {
      console.error('[storage] failed to update .bak:', e)
    }
  }

  renameSync(tmpPath(), p)
}
