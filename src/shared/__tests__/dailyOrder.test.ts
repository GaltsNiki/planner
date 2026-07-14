import { describe, it, expect } from 'vitest'
import { dailyItems } from '../dailyOrder'
import { ROUTINE_GOAL } from '../routine'
import type { Goal, Task } from '../types'

const t = (goalId: string, mId: string, time: string, title: string): Task => ({
  id: title, goalId, mId, title, desc: time ? `в ${time}` : '', done: false, day: 0, week: 0
})
const goal = (id: string, stages: [string, string][] = [['m1', 'm1']]): Goal => ({
  id, title: id, category: 'C', dotColor: '#000',
  milestones: stages.map(([sid, title]) => ({ id: sid, title, status: 'active' as const })),
  closenessLabel: '', claudeTake: ''
})

describe('dailyItems', () => {
  it('orders all tasks strictly by time, across stages of a goal', () => {
    // The exact reported case: a 19:30 training in one stage must sit in sequence,
    // not after the active stage's 20:00/21:00 tasks.
    const goals = [goal('g1', [['s1', 'Питание'], ['s2', 'Тренировки']])]
    const tasks = [
      t('g1', 's1', '20:00', 'Ужин'),
      t('g1', 's2', '19:30', 'Тренировка'),
      t('g1', 's1', '07:00', 'Завтрак'),
      t('g1', 's1', '21:00', 'Витамины')
    ]
    expect(dailyItems(goals, tasks).map((i) => i.task.title)).toEqual([
      'Завтрак', 'Тренировка', 'Ужин', 'Витамины'
    ])
  })

  it('places a 07:00 routine task first, above later goal tasks', () => {
    const goals = [goal('g1')]
    const items = dailyItems(goals, [t('g1', 'm1', '08:00', 'GoalTask'), t('', '', '07:00', 'Routine1')])
    expect(items[0].task.title).toBe('Routine1')
    expect(items[0].isRoutine).toBe(true)
    expect(items[0].goal).toBe(ROUTINE_GOAL)
  })

  it('sorts across goals by time as one timeline', () => {
    const goals = [goal('g1'), goal('g2')]
    const items = dailyItems(goals, [
      t('g1', 'm1', '09:00', 'Late'),
      t('g2', 'm1', '06:30', 'Early'),
      t('', '', '08:00', 'RoutineMid')
    ])
    expect(items.map((i) => i.task.title)).toEqual(['Early', 'RoutineMid', 'Late'])
  })

  it('puts untimed tasks after timed ones, keeping their order', () => {
    const goals = [goal('g1')]
    const items = dailyItems(goals, [
      t('g1', 'm1', '', 'NoTimeA'),
      t('g1', 'm1', '09:00', 'Timed'),
      t('g1', 'm1', '', 'NoTimeB')
    ])
    expect(items.map((i) => i.task.title)).toEqual(['Timed', 'NoTimeA', 'NoTimeB'])
  })

  it('captions each row with stage · goal, and routine with its label', () => {
    const goals = [goal('g1', [['s1', 'Питание']])]
    const items = dailyItems(goals, [t('g1', 's1', '08:00', 'Завтрак'), t('', '', '09:00', 'Уборка')])
    expect(items[0].caption).toBe('Питание · g1')
    expect(items[1].caption).toBe(ROUTINE_GOAL.title)
  })

  it('falls back to the routine label for a task whose goal was deleted', () => {
    const items = dailyItems([goal('g1')], [t('gGONE', 'm1', '08:00', 'Orphan')])
    expect(items[0].isRoutine).toBe(true)
  })
})
