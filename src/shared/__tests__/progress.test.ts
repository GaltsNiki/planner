import { describe, it, expect } from 'vitest'
import { goalStats, pctDone, weekAnalytics } from '../progress'
import type { Goal, Task } from '../types'

const goal: Goal = {
  id: 'g1', title: 'G', category: 'C', dotColor: '#000',
  milestones: [
    { id: 'm1', title: 'a', status: 'done' },
    { id: 'm2', title: 'b', status: 'active' },
    { id: 'm3', title: 'c', status: 'todo' }
  ],
  closenessLabel: '', claudeTake: ''
}

const mk = (over: Partial<Task>): Task => ({
  id: Math.random().toString(), goalId: 'g1', mId: 'm1', title: 't', desc: '',
  done: false, day: 0, week: 0, ...over
})

describe('goalStats', () => {
  it('computes done/total/pct and milestone counts', () => {
    const tasks = [mk({ done: true }), mk({ done: true }), mk({ done: false }), mk({ done: false })]
    const s = goalStats(goal, tasks)
    expect(s).toMatchObject({ done: 2, total: 4, pct: 50, mDone: 1, mTotal: 3 })
  })
  it('is 0% with no tasks', () => {
    expect(goalStats(goal, []).pct).toBe(0)
  })
})

describe('pctDone', () => {
  it('rounds', () => {
    expect(pctDone([mk({ done: true }), mk({ done: false }), mk({ done: false })])).toBe(33)
  })
  it('is 0 for empty', () => {
    expect(pctDone([])).toBe(0)
  })
})

describe('weekAnalytics', () => {
  const goals: Goal[] = [goal, { ...goal, id: 'g4', milestones: [] }]
  it('scopes to Mon–Fri and the given week, excludes leisure goal', () => {
    const tasks = [
      mk({ day: 0, done: true }),          // Mon, counts
      mk({ day: 4, done: false }),         // Fri, counts
      mk({ day: 5, done: true }),          // Sat, excluded from biz
      mk({ day: 0, week: 1, done: true }), // other week, excluded
      mk({ goalId: 'g4', day: 1, done: true }) // leisure goal, still in totals but not per-goal
    ]
    const a = weekAnalytics(goals, tasks, 0)
    expect(a.total).toBe(3) // Mon, Fri, and g4 Tue (day<=4, week 0)
    expect(a.done).toBe(2)
    expect(a.goals.map((g) => g.goalId)).toEqual(['g1']) // g4 excluded
    expect(a.bars).toHaveLength(5)
    expect(a.bars[0]).toMatchObject({ pct: 100, has: true }) // Mon: only the done g1 task
    expect(a.bars[1]).toMatchObject({ pct: 100, has: true }) // Tue: only the done g4 task
    expect(a.bars[4]).toMatchObject({ pct: 0, has: true }) // Fri: one undone task
    expect(a.bars[2]).toMatchObject({ has: false }) // Wed: empty
  })
})
