// Progress math — pure functions over task `done` flags.

import type { Goal, Task } from './types'
import { LEISURE_GOAL_ID } from './leisure'

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
  const mDone = goal.milestones.filter((m) => m.status === 'done').length
  const mTotal = goal.milestones.length

  // Goal progress tracks the goal's stages (milestones). A finished stage
  // counts even with no tasks. The active stage contributes a partial amount
  // from its own task completion so the ring isn't static between stages.
  let pct: number
  if (mTotal) {
    const active = goal.milestones.find((m) => m.status === 'active')
    let activeShare = 0
    if (active) {
      const mts = ts.filter((t) => t.mId === active.id)
      activeShare = mts.length ? mts.filter((t) => t.done).length / mts.length : 0
    }
    pct = Math.round(((mDone + activeShare) / mTotal) * 100)
  } else {
    // No stages defined — fall back to plain task completion.
    pct = ts.length ? Math.round((done / ts.length) * 100) : 0
  }

  return { done, total: ts.length, pct, mDone, mTotal }
}

/** Percentage of tasks done among a set. */
export function pctDone(tasks: Task[]): number {
  if (!tasks.length) return 0
  return Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100)
}

export interface SphereStats {
  pct: number
  goalCount: number
}

/**
 * Aggregate progress for a sphere: the mean of its goals' goalStats().pct.
 * The caller passes the goals already grouped into this sphere. Empty ⇒ 0.
 */
export function sphereStatsOf(sphereGoals: Goal[], tasks: Task[]): SphereStats {
  if (!sphereGoals.length) return { pct: 0, goalCount: 0 }
  const sum = sphereGoals.reduce((acc, g) => acc + goalStats(g, tasks).pct, 0)
  return { pct: Math.round(sum / sphereGoals.length), goalCount: sphereGoals.length }
}

export interface WeekGoalStat {
  goalId: string
  title: string
  /** The goal's active ("В работе") stage title, or null if none is active. */
  stageTitle: string | null
  dotColor: string
  done: number
  total: number
  pct: number
}

export interface WeekDayStat {
  /** 0 = Mon … 6 = Sun */
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
 * Week analytics over the full week (Mon–Sun) for a given week offset.
 * Excludes the leisure goal (g4) from the per-goal breakdown, matching the design.
 */
export function weekAnalytics(
  goals: Goal[],
  tasks: Task[],
  weekOffset: number,
  leisureGoalId = LEISURE_GOAL_ID
): WeekAnalytics {
  const bizTasks = tasks.filter((t) => (t.week || 0) === weekOffset)
  const done = bizTasks.filter((t) => t.done).length
  const total = bizTasks.length

  const goalStatsList: WeekGoalStat[] = goals
    .filter((g) => g.id !== leisureGoalId)
    .map((g) => {
      // Track the active stage's tasks for the week, not the whole goal's — a stage
      // spans weeks, so a full week's stage tasks can be done without the stage being done.
      const active = g.milestones.find((m) => m.status === 'active')
      const ts = active
        ? bizTasks.filter((t) => t.goalId === g.id && t.mId === active.id)
        : bizTasks.filter((t) => t.goalId === g.id)
      return {
        goalId: g.id,
        title: g.title,
        stageTitle: active ? active.title : null,
        dotColor: g.dotColor,
        done: ts.filter((t) => t.done).length,
        total: ts.length,
        pct: pctDone(ts)
      }
    })

  const bars: WeekDayStat[] = [0, 1, 2, 3, 4, 5, 6].map((day) => {
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
