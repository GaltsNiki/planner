// Stale-task detection driving the "Застряли?" and Review cards.

import type { Goal, StaleTask, Task } from './types'

const DAY_MS = 86400000

export interface StaleRow extends StaleTask {
  goalTitle: string
  dotColor: string
  daysLabel: string
}

/** Threshold (days without movement) above which a task counts as stale. */
export const STALE_THRESHOLD = 7

/** Decorate stale tasks with their goal's title/colour and a display label. */
export function staleRows(stale: StaleTask[], goals: Goal[]): StaleRow[] {
  return stale.map((s) => {
    const g = goals.find((x) => x.id === s.goalId)
    return {
      ...s,
      goalTitle: g ? g.title : '',
      dotColor: g ? g.dotColor : '#E8563F',
      daysLabel: `${s.days} дней без движения`
    }
  })
}

/** Whether a given day-count qualifies as stale. */
export function isStale(days: number): boolean {
  return days >= STALE_THRESHOLD
}

/**
 * Compute genuinely-stale tasks from live data: incomplete tasks that haven't
 * been touched (created/edited/toggled/moved) in at least STALE_THRESHOLD days.
 * Tasks without an `updatedAt` (older data) are treated as fresh and skipped, so
 * the list only ever reflects real, observed inactivity. Most-stale first.
 */
export function computeStale(tasks: Task[], now: number = Date.now()): StaleTask[] {
  return tasks
    .filter((t) => !t.done && t.updatedAt != null && now - t.updatedAt >= STALE_THRESHOLD * DAY_MS)
    .map((t) => ({
      id: t.id,
      goalId: t.goalId,
      title: t.title,
      days: Math.floor((now - (t.updatedAt as number)) / DAY_MS)
    }))
    .sort((a, b) => b.days - a.days)
}
