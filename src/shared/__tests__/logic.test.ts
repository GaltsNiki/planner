import { describe, it, expect } from 'vitest'
import { stepSegments, deriveClosenessLabel, patchMilestones } from '../closeness'
import { staleRows, isStale, computeStale } from '../staleness'
import { chatReply, breakDownReply, leisureSuggestions, weeklyReview } from '../mockAI'
import { seedData } from '../seed'
import type { Goal, Task, Milestone } from '../types'

const DAY_MS = 86400000
const mkTask = (over: Partial<Task>): Task => ({
  id: 't', goalId: 'g1', mId: 'm1', title: 'T', desc: '', done: false, day: 0, week: 0, ...over
})

const goal: Goal = {
  id: 'g1', title: 'G', category: 'C', dotColor: '#E8563F',
  milestones: [
    { id: 'm1', title: 'a', status: 'done' },
    { id: 'm2', title: 'b', status: 'active' },
    { id: 'm3', title: 'c', status: 'todo' }
  ],
  closenessLabel: 'half', claudeTake: ''
}

describe('stepSegments', () => {
  it('colours segments by status', () => {
    const s = stepSegments(goal)
    expect(s[0].color).toBe('#E8563F')
    expect(s[1].color).toBe('rgba(232,86,63,0.5)')
    expect(s[2].muted).toBe(true)
  })
})

describe('deriveClosenessLabel', () => {
  const ms = (statuses: ('done' | 'active' | 'todo')[]): { status: 'done' | 'active' | 'todo' }[] =>
    statuses.map((status) => ({ status }))
  it('handles the empty and just-started cases', () => {
    expect(deriveClosenessLabel([])).toBe('Цель только поставлена')
    expect(deriveClosenessLabel(ms(['todo', 'todo', 'todo']))).toBe('В начале пути')
  })
  it('scales with completion', () => {
    expect(deriveClosenessLabel(ms(['done', 'active', 'todo']))).toBe('Первые шаги сделаны') // 1/3 ≈ 0.33
    expect(deriveClosenessLabel(ms(['done', 'done', 'todo', 'todo']))).toBe('Примерно на полпути') // 2/4 = 0.5
    expect(deriveClosenessLabel(ms(['done', 'done', 'done', 'todo']))).toBe('На финишной прямой') // 3/4 = 0.75
    expect(deriveClosenessLabel(ms(['done', 'done']))).toBe('Цель достигнута') // 2/2 = 1
  })
})

describe('staleness', () => {
  it('flags by threshold', () => {
    expect(isStale(7)).toBe(true)
    expect(isStale(6)).toBe(false)
  })
  it('decorates rows with goal title and label', () => {
    const rows = staleRows(
      [{ id: 's1', goalId: 'g1', title: 'X', days: 9 }],
      [goal]
    )
    expect(rows[0].goalTitle).toBe('G')
    expect(rows[0].daysLabel).toBe('9 дней без движения')
  })
})

describe('computeStale', () => {
  const now = 1_000 * DAY_MS
  it('flags incomplete tasks untouched for >= threshold days, most-stale first', () => {
    const tasks = [
      mkTask({ id: 'fresh', updatedAt: now - 2 * DAY_MS }),
      mkTask({ id: 'stuck', updatedAt: now - 10 * DAY_MS }),
      mkTask({ id: 'stuckMore', updatedAt: now - 20 * DAY_MS })
    ]
    const rows = computeStale(tasks, now)
    expect(rows.map((r) => r.id)).toEqual(['stuckMore', 'stuck'])
    expect(rows[0].days).toBe(20)
  })
  it('ignores done tasks and tasks with no updatedAt (treated as fresh)', () => {
    const tasks = [
      mkTask({ id: 'done', done: true, updatedAt: now - 30 * DAY_MS }),
      mkTask({ id: 'legacy' }) // no updatedAt
    ]
    expect(computeStale(tasks, now)).toEqual([])
  })
})

describe('patchMilestones (single active)', () => {
  const ms: Milestone[] = [
    { id: 'm1', title: 'a', status: 'active' },
    { id: 'm2', title: 'b', status: 'todo' },
    { id: 'm3', title: 'c', status: 'todo' }
  ]
  it('demotes a previously-active stage when another becomes active', () => {
    const next = patchMilestones(ms, 'm3', { status: 'active' })
    expect(next.find((m) => m.id === 'm1')!.status).toBe('todo')
    expect(next.find((m) => m.id === 'm3')!.status).toBe('active')
    expect(next.filter((m) => m.status === 'active')).toHaveLength(1)
  })
  it('leaves other stages untouched for non-active patches', () => {
    const next = patchMilestones(ms, 'm2', { title: 'renamed' })
    expect(next.find((m) => m.id === 'm1')!.status).toBe('active')
    expect(next.find((m) => m.id === 'm2')!.title).toBe('renamed')
  })
})

describe('mockAI', () => {
  const data = seedData()
  it('grounds a progress reply in real counts', () => {
    const r = chatReply('Как мои успехи?', data.goals[0], data.tasks)
    expect(r).toMatch(/закрыл \d+ задач/)
  })
  it('routes reschedule intent', () => {
    expect(chatReply('перенести этап', data.goals[0], data.tasks)).toMatch(/сдвинуть/)
  })
  it('breakDown mentions the task title', () => {
    expect(breakDownReply('Обновить Behance')).toContain('Обновить Behance')
  })
  it('weeklyReview reports done/total', () => {
    expect(weeklyReview(data.goals, data.tasks)).toMatch(/выполнено \d+ из \d+/)
  })
  it('alternates leisure sets by seed', () => {
    expect(leisureSuggestions(0)[0].id).toBe('a1')
    expect(leisureSuggestions(1)[0].id).toBe('b1')
  })
})
