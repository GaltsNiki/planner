// "Routine" = a task not tied to any goal (cleaning, shopping, errands…).
// Modelled as an empty goalId. A neutral pseudo-goal lets the UI render such
// tasks with a consistent colour/label without special-casing everywhere.

import type { Goal } from './types'

/** Neutral slate accent for routine tasks (no goal colour). */
export const ROUTINE_COLOR = '#8a8f98'

/** A task with no goal is a routine task. */
export const isRoutine = (goalId: string): boolean => !goalId

/** Stand-in "goal" used to render routine tasks. */
export const ROUTINE_GOAL: Goal = {
  id: '',
  title: 'Рутина',
  category: 'Рутина',
  dotColor: ROUTINE_COLOR,
  milestones: [],
  closenessLabel: '',
  claudeTake: ''
}
