// Stale-task detection driving the "Застряли?" and Review cards.

import type { Goal, StaleTask } from './types'

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
