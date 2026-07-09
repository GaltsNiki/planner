import { describe, it, expect } from 'vitest'
import { stepSegments } from '../closeness'
import { staleRows, isStale } from '../staleness'
import { chatReply, breakDownReply, leisureSuggestions, weeklyReview } from '../mockAI'
import { seedData } from '../seed'
import type { Goal } from '../types'

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
