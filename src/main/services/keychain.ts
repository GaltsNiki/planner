// API-key storage using Electron's safeStorage (OS-encrypted at rest).
// The key never leaves the main process; the renderer only learns whether one is set.

import { app, safeStorage } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, rmSync } from 'fs'

function keyPath(): string {
  return join(app.getPath('userData'), 'api-key.bin')
}

export function hasKey(): boolean {
  return existsSync(keyPath())
}

export function setKey(plain: string): void {
  if (!plain) {
    clearKey()
    return
  }
  const enc = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(plain)
    : Buffer.from(plain, 'utf-8')
  writeFileSync(keyPath(), enc)
}

/** For main-process use only — never expose the plaintext over IPC. */
export function getKey(): string | null {
  if (!hasKey()) return null
  const buf = readFileSync(keyPath())
  try {
    return safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(buf)
      : buf.toString('utf-8')
  } catch {
    return null
  }
}

export function clearKey(): void {
  if (hasKey()) rmSync(keyPath())
}
