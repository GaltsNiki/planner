// Main-process IPC handlers. Thin wrappers over the services; all secrets and
// network access live here, never in the renderer.

import { ipcMain } from 'electron'
import type { Goal, Task, PlannerData } from '@shared/types'
import { IPC } from '@shared/ipc'
import { load, save } from './services/storage'
import * as ai from './services/ai'
import { hasKey, setKey, clearKey } from './services/keychain'

export function registerIpc(): void {
  ipcMain.handle(IPC.loadData, () => load())
  ipcMain.handle(IPC.saveData, (_e, data: PlannerData) => save(data))

  ipcMain.handle(IPC.chat, (_e, input: string, activeGoal: Goal, tasks: Task[]) =>
    ai.chat(input, activeGoal, tasks)
  )
  ipcMain.handle(IPC.breakDown, (_e, title: string) => ai.breakDown(title))
  ipcMain.handle(IPC.review, (_e, goals: Goal[], tasks: Task[]) => ai.review(goals, tasks))
  ipcMain.handle(IPC.leisure, (_e, seed: number) => ai.leisure(seed))

  ipcMain.handle(IPC.hasKey, () => hasKey())
  ipcMain.handle(IPC.setKey, (_e, plain: string) => setKey(plain))
  ipcMain.handle(IPC.clearKey, () => clearKey())
}
