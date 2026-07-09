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
  // goal has milestones m1=done, m2=active, m3=todo
  it('tracks task counts but derives pct from milestone stages', () => {
    // 4 tasks all on m1; m2 (active) has none → activeShare 0 → 1 of 3 stages = 33%.
    const tasks = [mk({ done: true }), mk({ done: true }), mk({ done: false }), mk({ done: false })]
    const s = goalStats(goal, tasks)
    expect(s).toMatchObject({ done: 2, total: 4, pct: 33, mDone: 1, mTotal: 3 })
  })

  it('shows progress from a finished stage even with no tasks (the reported bug)', () => {
    expect(goalStats(goal, []).pct).toBe(33) // 1 of 3 stages done
  })

  it('adds a partial share for the active stage from its own tasks', () => {
    // m2 is active; give it 4 tasks, 2 done → activeShare 0.5 → (1 + 0.5)/3 = 50%.
    const tasks = [
      mk({ mId: 'm2', done: true }), mk({ mId: 'm2', done: true }),
      mk({ mId: 'm2', done: false }), mk({ mId: 'm2', done: false })
    ]
    expect(goalStats(goal, tasks).pct).toBe(50)
  })

  it('falls back to task completion when there are no milestones', () => {
    const g2: Goal = { ...goal, milestones: [] }
    expect(goalStats(g2, [mk({ done: true }), mk({ done: false })]).pct).toBe(50)
    expect(goalStats(g2, []).pct).toBe(0)
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
