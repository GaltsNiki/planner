// Progress math — pure functions over task `done` flags.

import type { Goal, Task } from './types'

export interface GoalStats {
  done: number
  total: number
  pct: number
  mDone: number
  mTotal: number
}

export function goalStats(goal: Goal, tasks: Task[]): GoalStats {
  const ts = tasks.filter((t) => t.goalId === goal.id)
  const done = ts.filter((t) => t.done).length
  const pct = ts.length ? Math.round((done / ts.length) * 100) : 0
  const mDone = goal.milestones.filter((m) => m.status === 'done').length
  return { done, total: ts.length, pct, mDone, mTotal: goal.milestones.length }
}

/** Percentage of tasks done among a set. */
export function pctDone(tasks: Task[]): number {
  if (!tasks.length) return 0
  return Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100)
}

export interface WeekGoalStat {
  goalId: string
  title: string
  dotColor: string
  done: number
  total: number
  pct: number
}

export interface WeekDayStat {
  /** 0 = Mon … 4 = Fri */
  day: number
  pct: number
  has: boolean
  done: number
  total: number
}

export interface WeekAnalytics {
  done: number
  total: number
  pct: number
  goals: WeekGoalStat[]
  /** Mon–Fri completion. */
  bars: WeekDayStat[]
}

/**
 * Week analytics over Mon–Fri (day <= 4) for a given week offset.
 * Excludes the leisure goal (g4) from the per-goal breakdown, matching the design.
 */
export function weekAnalytics(
  goals: Goal[],
  tasks: Task[],
  weekOffset: number,
  leisureGoalId = 'g4'
): WeekAnalytics {
  const wkTasks = tasks.filter((t) => (t.week || 0) === weekOffset)
  const bizTasks = wkTasks.filter((t) => t.day <= 4)
  const done = bizTasks.filter((t) => t.done).length
  const total = bizTasks.length

  const goalStatsList: WeekGoalStat[] = goals
    .filter((g) => g.id !== leisureGoalId)
    .map((g) => {
      const ts = bizTasks.filter((t) => t.goalId === g.id)
      return {
        goalId: g.id,
        title: g.title,
        dotColor: g.dotColor,
        done: ts.filter((t) => t.done).length,
        total: ts.length,
        pct: pctDone(ts)
      }
    })

  const bars: WeekDayStat[] = [0, 1, 2, 3, 4].map((day) => {
    const ts = bizTasks.filter((t) => t.day === day)
    return { day, pct: pctDone(ts), has: ts.length > 0, done: ts.filter((t) => t.done).length, total: ts.length }
  })

  return {
    done,
    total,
    pct: total ? Math.round((done / total) * 100) : 0,
    goals: goalStatsList,
    bars
  }
}
