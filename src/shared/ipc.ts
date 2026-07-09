// The typed IPC contract, shared by preload and main so both stay in sync.

import type { Goal, Task, PlannerData, LeisureSuggestion } from './types'

export interface PlannerApi {
  loadData(): Promise<PlannerData>
  saveData(data: PlannerData): Promise<void>

  // Mock AI
  chat(input: string, activeGoal: Goal, tasks: Task[]): Promise<string>
  breakDown(title: string): Promise<string>
  review(goals: Goal[], tasks: Task[]): Promise<string>
  leisure(seed: number): Promise<LeisureSuggestion[]>

  // API key
  hasKey(): Promise<boolean>
  setKey(plain: string): Promise<void>
  clearKey(): Promise<void>
}

export const IPC = {
  loadData: 'planner:loadData',
  saveData: 'planner:saveData',
  chat: 'ai:chat',
  breakDown: 'ai:breakDown',
  review: 'ai:review',
  leisure: 'ai:leisure',
  hasKey: 'key:has',
  setKey: 'key:set',
  clearKey: 'key:clear'
} as const
