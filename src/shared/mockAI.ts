// Mocked AI logic — canned/deterministic stand-ins for the real Claude calls.
// Kept pure and in shared/ so it is unit-testable and reused by the main service.

import type { Goal, Task, LeisureSuggestion } from './types'
import { goalStats } from './progress'
import { LEISURE_GOAL_ID } from './leisure'

/** A canned chat reply, grounded in the active goal's real progress. */
export function chatReply(input: string, activeGoal: Goal, tasks: Task[]): string {
  const t = input.toLowerCase()
  if (t.includes('успех') || t.includes('близ') || t.includes('прогресс')) {
    const done = tasks.filter((x) => x.done).length
    const mDone = goalStats(activeGoal, tasks).mDone
    return `Ты закрыл ${done} задач и прошёл ${mDone} этап. Темп ровный — так держать.`
  }
  if (t.includes('перенес') || t.includes('этап') || t.includes('сдвин')) {
    return 'Ок, могу сдвинуть текущий этап на неделю и перераспределить его задачи. Подтвердить?'
  }
  if (t.includes('разб') || t.includes('шаг') || t.includes('застр')) {
    return 'Разбил на 3 шага: 1) выбрать 6 лучших работ, 2) написать по 2 абзаца к каждой, 3) залить и оформить обложку. Добавить в план?'
  }
  return 'Понял. Могу скорректировать план под это — сказать, какие задачи добавить или перенести?'
}

/** A "break this task into steps" assistant response. */
export function breakDownReply(title: string): string {
  return `«${title}» — разбил на 3 небольших шага, каждый на 15–20 минут. Добавить их в план на эту неделю?`
}

/** A weekly-review summary paragraph, grounded in real done/total counts. */
export function weeklyReview(goals: Goal[], tasks: Task[]): string {
  const done = tasks.filter((t) => t.done).length
  const total = tasks.length
  const topGoal = goals
    .filter((g) => g.id !== LEISURE_GOAL_ID)
    .map((g) => ({ g, s: goalStats(g, tasks) }))
    .sort((a, b) => b.s.pct - a.s.pct)[0]
  const lead = topGoal
    ? `Лучше всего идёт «${topGoal.g.title}» — ${topGoal.s.pct}% задач закрыто. `
    : ''
  return (
    `За эту неделю выполнено ${done} из ${total} задач. ${lead}` +
    'Есть несколько застрявших задач — стоит разбить их на шаги или перенести. Скорректируем план?'
  )
}

// Two alternating leisure suggestion sets — mock of the web search.
const SET_A: LeisureSuggestion[] = [
  { id: 'a1', day: 5, cat: 'Театр', title: 'Сходить в театр им. Ленсовета на «Ревизора»', place: 'Владимирский пр., 12' },
  { id: 'a2', day: 5, cat: 'Кофе', title: 'Утренний кофе в «Больше кофе» на Рубинштейна', place: 'ул. Рубинштейна, 20' },
  { id: 'a3', day: 6, cat: 'Природа', title: 'Прогулка в Ботаническом саду им. Петра Первого', place: 'Аптекарский остров' },
  { id: 'a4', day: 6, cat: 'Музыка', title: 'Концерт в Филармонии им. Шостаковича', place: 'Михайловская ул., 2' }
]
const SET_B: LeisureSuggestion[] = [
  { id: 'b1', day: 5, cat: 'Искусство', title: 'Выставка в ЦВЗ «Манеж»', place: 'Исаакиевская пл., 1' },
  { id: 'b2', day: 5, cat: 'Природа', title: 'Велопрогулка по Крестовскому острову', place: 'Крестовский остров' },
  { id: 'b3', day: 6, cat: 'Театр', title: 'Спектакль в БДТ им. Товстоногова', place: 'наб. Фонтанки, 65' },
  { id: 'b4', day: 6, cat: 'Кофе', title: 'Воскресный бранч в «Сурф Кофе»', place: 'Казанская ул., 3' }
]

/** Category → dot colour, matching the design. */
export const LEISURE_CAT_COLOR: Record<string, string> = {
  'Театр': 'oklch(0.7 0.13 300)',
  'Кофе': 'oklch(0.72 0.1 60)',
  'Природа': 'oklch(0.72 0.15 150)',
  'Музыка': 'oklch(0.7 0.13 250)',
  'Искусство': '#E8563F'
}

/** Mock "web search" for weekend leisure — alternates sets by seed. */
export function leisureSuggestions(seed: number): LeisureSuggestion[] {
  return seed % 2 === 0 ? SET_A : SET_B
}
