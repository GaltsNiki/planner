// Minimal .env loader for the main process (no dotenv dependency).
// Loads KEY=VALUE lines from the project root .env into process.env, once.

import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

let loaded = false

/** Candidate .env locations: packaged app dir and the dev project root. */
function candidatePaths(): string[] {
  const paths = [
    join(app.getAppPath(), '.env'),
    join(process.cwd(), '.env'),
    // out/main -> ../../.env in dev/build layout
    join(__dirname, '../../.env')
  ]
  return paths
}

export function loadEnv(): void {
  if (loaded) return
  loaded = true
  const file = candidatePaths().find((p) => existsSync(p))
  if (!file) return
  const text = readFileSync(file, 'utf-8')
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let val = line.slice(eq + 1).trim()
    // Strip surrounding quotes if present.
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (key && process.env[key] === undefined) process.env[key] = val
  }
}
