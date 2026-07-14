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
const TODO = 'rgba(255,255,255,0.08)'

/**
 * Segment fill for a milestone status, tinted with the goal's own accent so a
 * goal's progress bar reads in its sphere's colour (not a fixed coral):
 *   done   → full accent
 *   active → half-opacity accent (a hint the stage is in progress)
 *   todo   → neutral rail
 * `accent` accepts hex or oklch; the active tint is layered over it so any format
 * works without parsing. Defaults to the app's coral for callers that don't pass one.
 */
function segmentColor(status: MilestoneStatus, accent: string): string {
  if (status === 'done') return accent
  if (status === 'active') return `color-mix(in oklab, ${accent} 50%, transparent)`
  return TODO
}

/**
 * Stepper segments for a goal's milestones, matching the prototype's `steps()`.
 * Pass `accent` to colour the segments in the goal's / sphere's colour; omit it
 * to keep the historical coral accent (used where no sphere colour is at hand).
 */
export function stepSegments(goal: Goal, accent: string = ACCENT): StepSegment[] {
  return goal.milestones.map((m) => ({
    title: m.title,
    status: m.status,
    color: segmentColor(m.status, accent),
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
