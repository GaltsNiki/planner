import { describe, it, expect } from 'vitest'
import { migrate, DATA_VERSION } from '../migrate'
import { currentWeekIndex } from '../dates'
import type { PlannerData, Task, Habit } from '../types'

const now = new Date(2026, 6, 15) // Wed, 15 Jul 2026
const base = currentWeekIndex(now)

const task = (over: Partial<Task>): Task => ({
  id: 't', goalId: 'g1', mId: 'm1', title: 't', desc: '', done: false, day: 0, week: 0, ...over
})
const habit = (done: string[]): Habit => ({ id: 'h', title: 'h', done })

const preMigration: PlannerData = {
  goals: [], stale: [], chats: {}, settings: {},
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
