// API-key storage using Electron's safeStorage (OS-encrypted at rest).
// The key never leaves the main process; the renderer only learns whether one is set.

import { app, safeStorage } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, rmSync } from 'fs'

function keyPath(): string {
  return join(app.getPath('userData'), 'api-key.bin')
}

/** Whether the stored keychain file exists (not counting the env fallback). */
function hasStoredKey(): boolean {
  return existsSync(keyPath())
}

/** True if a key is available from either the keychain or the env var. */
export function hasKey(): boolean {
  return hasStoredKey() || !!process.env.GEMINI_API_KEY
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

/**
 * For main-process use only — never expose the plaintext over IPC.
 * Resolution order: OS-encrypted keychain file, then the GEMINI_API_KEY env var
 * (loaded from .env). This lets a .env key work without a Settings screen.
 */
export function getKey(): string | null {
  if (hasStoredKey()) {
    const buf = readFileSync(keyPath())
    try {
      const k = safeStorage.isEncryptionAvailable()
        ? safeStorage.decryptString(buf)
        : buf.toString('utf-8')
      if (k) return k
    } catch {
      // fall through to env
    }
  }
  return process.env.GEMINI_API_KEY || null
}

export function clearKey(): void {
  if (hasKey()) rmSync(keyPath())
}
