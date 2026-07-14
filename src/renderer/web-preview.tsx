// Browser-only preview harness (NOT shipped) — lets the real renderer run in a
// plain browser for screenshotting the Week view. Shims the Electron `window.planner`
// IPC bridge with in-memory seed data and the mock AI logic.
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './src/App'
import './src/styles.css'
import { seedData } from '@shared/seed'
import { chatReply, breakDownReply, weeklyReview, leisureSuggestions } from '@shared/mockAI'
import type { PlannerData } from '@shared/types'

let data: PlannerData = seedData()

// Minimal shim matching @shared/ipc PlannerApi so the store hydrates and runs.
;(window as unknown as { planner: unknown }).planner = {
  loadData: async () => data,
  saveData: async (d: PlannerData) => { data = d },
  chat: async (input: string, goal: any, tasks: any) => chatReply(input, goal, tasks),
  breakDown: async (title: string) => breakDownReply(title),
  review: async (goals: any, tasks: any) => weeklyReview(goals, tasks),
  leisure: async (seed: number) => leisureSuggestions(seed),
  hasKey: async () => false,
  setKey: async () => {},
  clearKey: async () => {},
  clipboardRead: async () => ''
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />)
