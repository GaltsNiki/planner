import { describe, it, expect } from 'vitest'
import { migrate, DATA_VERSION } from '../migrate'
import { currentWeekIndex } from '../dates'
import { GOAL_COLORS } from '../palette'
import { UNSORTED_SPHERE_ID } from '../spheres'
import type { PlannerData, Task, Habit, Goal } from '../types'

const now = new Date(2026, 6, 15) // Wed, 15 Jul 2026
const base = currentWeekIndex(now)

const task = (over: Partial<Task>): Task => ({
  id: 't', goalId: 'g1', mId: 'm1', title: 't', desc: '', done: false, day: 0, week: 0, ...over
})
const habit = (done: string[]): Habit => ({ id: 'h', title: 'h', done })
const goal = (over: Partial<Goal>): Goal => ({
  id: 'g', title: 'g', category: '', dotColor: '#fff', milestones: [], closenessLabel: '', claudeTake: '', ...over
})

const preMigration: PlannerData = {
  goals: [], spheres: [], stale: [], chats: {}, settings: {},
  tasks: [task({ week: 0, day: 2 }), task({ id: 't2', week: 1, day: 0 }), task({ id: 't3', week: -1, day: 5 })],
  habits: [habit(['0:2', '1:0', '-1:6'])]
}

describe('migrate v1: relative → absolute weeks (freeze)', () => {
  it('shifts relative task offsets onto absolute indices at the current week', () => {
    const m = migrate(preMigration, now)
    expect(m.tasks.map((t) => t.week)).toEqual([base, base + 1, base - 1])
    // day is untouched
    expect(m.tasks.map((t) => t.day)).toEqual([2, 0, 5])
  })

  it('rewrites habit completion keys to absolute weeks', () => {
    const m = migrate(preMigration, now)
    expect(m.habits[0].done).toEqual([`${base}:2`, `${base + 1}:0`, `${base - 1}:6`])
  })

  it('stamps the schema version', () => {
    expect(migrate(preMigration, now).version).toBe(DATA_VERSION)
  })

  it('is idempotent — already-migrated data is unchanged', () => {
    const once = migrate(preMigration, now)
    expect(migrate(once, now)).toEqual(once)
  })

  it('does not drift: a migrated task keeps its absolute week as the calendar advances', () => {
    // The bug was that a task's week re-interpreted against a moving "current week".
    const m = migrate({ ...preMigration, tasks: [task({ week: 0 })] }, now)
    const fixedWeek = m.tasks[0].week
    expect(fixedWeek).toBe(currentWeekIndex(now))
    // A week later, the SAME stored index is now the *previous* week, not current.
    const weekLater = new Date(now.getTime() + 7 * 86400000)
    expect(fixedWeek).toBe(currentWeekIndex(weekLater) - 1)
    // Re-running migration later is a no-op (version already current) — no further shift.
    expect(migrate(m, weekLater).tasks[0].week).toBe(fixedWeek)
  })
})

describe('migrate v2: derive life-spheres from goal categories', () => {
  const withGoals: PlannerData = {
    goals: [
      goal({ id: 'g1', category: 'Карьера' }),
      goal({ id: 'g2', category: 'Здоровье' }),
      goal({ id: 'g3', category: ' карьера ' }), // same sphere as g1 (case/whitespace)
      goal({ id: 'g4', category: '' })            // no category → UNSORTED
    ],
    spheres: [], tasks: [], stale: [], chats: {}, settings: {}, habits: []
  }

  it('collapses goals with the same category into one sphere', () => {
    const m = migrate(withGoals, now)
    const g1 = m.goals.find((g) => g.id === 'g1')!
    const g3 = m.goals.find((g) => g.id === 'g3')!
    expect(g1.sphereId).toBe(g3.sphereId)
    // Two named spheres (Карьера, Здоровье) + the UNSORTED fallback = 3.
    expect(m.spheres).toHaveLength(3)
  })

  it('points each goal at the sphere matching its category', () => {
    const m = migrate(withGoals, now)
    const byId = (id: string): (typeof m.spheres)[number] | undefined =>
      m.spheres.find((s) => s.id === m.goals.find((g) => g.id === id)!.sphereId)
    expect(byId('g1')!.title).toBe('Карьера')
    expect(byId('g2')!.title).toBe('Здоровье')
  })

  it('routes an empty-category goal to the UNSORTED sphere', () => {
    const m = migrate(withGoals, now)
    expect(m.goals.find((g) => g.id === 'g4')!.sphereId).toBe(UNSORTED_SPHERE_ID)
  })

  it('colours derived spheres from the palette', () => {
    const m = migrate(withGoals, now)
    const named = m.spheres.filter((s) => s.id !== UNSORTED_SPHERE_ID)
    for (const s of named) expect(GOAL_COLORS).toContain(s.color)
  })

  it('stamps version 2', () => {
    expect(migrate(withGoals, now).version).toBe(2)
    expect(DATA_VERSION).toBe(2)
  })

  it('is idempotent — goals with a sphereId are left untouched', () => {
    const once = migrate(withGoals, now)
    expect(migrate(once, now)).toEqual(once)
  })
})
