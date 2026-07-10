// Preload bridge: exposes a minimal, typed `window.planner` API to the renderer
// via contextBridge. No Node, no secrets cross this boundary.

import { contextBridge, ipcRenderer } from 'electron'
import type { Goal, Task, PlannerData } from '@shared/types'
import { IPC, type PlannerApi } from '@shared/ipc'

const api: PlannerApi = {
  loadData: () => ipcRenderer.invoke(IPC.loadData),
  saveData: (data: PlannerData) => ipcRenderer.invoke(IPC.saveData, data),
  chat: (input: string, activeGoal: Goal, tasks: Task[]) =>
    ipcRenderer.invoke(IPC.chat, input, activeGoal, tasks),
  breakDown: (title: string) => ipcRenderer.invoke(IPC.breakDown, title),
  review: (goals: Goal[], tasks: Task[]) => ipcRenderer.invoke(IPC.review, goals, tasks),
  leisure: (seed: number, location?: string, interests?: string[]) =>
    ipcRenderer.invoke(IPC.leisure, seed, location, interests),
  hasKey: () => ipcRenderer.invoke(IPC.hasKey),
  setKey: (plain: string) => ipcRenderer.invoke(IPC.setKey, plain),
  clearKey: () => ipcRenderer.invoke(IPC.clearKey),
  clipboardRead: () => ipcRenderer.invoke(IPC.clipboardRead)
}

contextBridge.exposeInMainWorld('planner', api)
