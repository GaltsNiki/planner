// Mock AI service. In production these would call the Anthropic SDK (streaming
// chat, structured plan extraction, web-search leisure). Here they resolve the
// shared canned logic after a short delay to emulate network latency.

import type { Goal, Task, LeisureSuggestion } from '@shared/types'
import {
  chatReply,
  breakDownReply,
  weeklyReview,
  leisureSuggestions
} from '@shared/mockAI'

const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

export async function chat(
  input: string,
  activeGoal: Goal,
  tasks: Task[]
): Promise<string> {
  await delay(420)
  return chatReply(input, activeGoal, tasks)
}

export async function breakDown(title: string): Promise<string> {
  await delay(420)
  return breakDownReply(title)
}

export async function review(goals: Goal[], tasks: Task[]): Promise<string> {
  await delay(420)
  return weeklyReview(goals, tasks)
}

export async function leisure(seed: number): Promise<LeisureSuggestion[]> {
  // Mock of the real web search — the design shows ~1s spinner.
  await delay(950)
  return leisureSuggestions(seed)
}
