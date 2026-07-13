// Milestone-based closeness → stepper segment states + label.

import type { Goal, Milestone, MilestoneStatus } from './types'

/**
 * Apply a patch to the milestone `mId`, enforcing at most one `active` milestone:
 * activating one demotes any other active stage back to `todo`. Keeps a linear
 * stepper unambiguous (no two "В работе" stages, which also skewed goal progress).
 */
export function patchMilestones(
  milestones: Milestone[],
  mId: string,
  patch: Partial<Milestone>
): Milestone[] {
  const next = milestones.map((m) => (m.id === mId ? { ...m, ...patch } : m))
  if (patch.status !== 'active') return next
  return next.map((m) => (m.id !== mId && m.status === 'active' ? { ...m, status: 'todo' } : m))
}

export interface StepSegment {
  title: string
  status: MilestoneStatus
  /** Bar fill colour for this segment. */
  color: string
  /** Whether the label under the segment should be muted (todo). */
  muted: boolean
}

const ACCENT = '#E8563F'
const ACCENT_ACTIVE = 'rgba(232,86,63,0.5)'
const TODO = 'rgba(255,255,255,0.08)'

/** Stepper segments for a goal's milestones, matching the prototype's `steps()`. */
export function stepSegments(goal: Goal): StepSegment[] {
  return goal.milestones.map((m) => ({
    title: m.title,
    status: m.status,
    color: m.status === 'done' ? ACCENT : m.status === 'active' ? ACCENT_ACTIVE : TODO,
    muted: m.status === 'todo'
  }))
}

/** The goal's closeness label (from milestone progress; authored on the goal). */
export function closenessLabel(goal: Goal): string {
  return goal.closenessLabel
}

/**
 * Derive a closeness label from milestone completion — used for goals created
 * in-app (which have no hand-authored label).
 */
export function deriveClosenessLabel(milestones: { status: MilestoneStatus }[]): string {
  const total = milestones.length
  if (!total) return 'Цель только поставлена'
  const done = milestones.filter((m) => m.status === 'done').length
  const pct = done / total
  if (pct === 0) return 'В начале пути'
  if (pct < 0.34) return 'Первые шаги сделаны'
  if (pct < 0.67) return 'Примерно на полпути'
  if (pct < 1) return 'На финишной прямой'
  return 'Цель достигнута'
}
