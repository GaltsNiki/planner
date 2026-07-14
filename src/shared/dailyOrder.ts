// Ordering of the Daily view: a single strict-time agenda.
//
// Every task for the day — goal tasks and goal-less "routine" tasks alike — is
// sorted purely by its time (parsed from the description). Tasks without a time
// keep their existing relative order and fall to the end. Each item carries a
// caption naming its stage and goal so the flat list still shows context per row.

import type { Goal, Task } from './types'
import { byTime } from './taskMeta'
import { ROUTINE_GOAL } from './routine'

export interface DailyItem {
  task: Task
  /** The task's goal, or the routine pseudo-goal for goal-less/orphaned tasks. */
  goal: Goal
  /** "Stage · Goal", the goal title, or the routine label — shown on the row. */
  caption: string
  isRoutine: boolean
}

/** All of the day's tasks as one time-ordered list. `dayTasks` are already filtered to the day/week. */
export function dailyItems(goals: Goal[], dayTasks: Task[]): DailyItem[] {
  return dayTasks
    .slice()
    .sort(byTime)
    .map((task) => {
      const goal = goals.find((g) => g.id === task.goalId)
      if (!goal) {
        // No goal (routine) or the goal was deleted → render under the routine label.
        return { task, goal: ROUTINE_GOAL, caption: ROUTINE_GOAL.title, isRoutine: true }
      }
      const stage = goal.milestones.find((m) => m.id === task.mId)
      const caption = stage ? `${stage.title} · ${goal.title}` : goal.title
      return { task, goal, caption, isRoutine: false }
    })
}
