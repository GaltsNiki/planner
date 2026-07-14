// Habit adherence analytics — pure functions over a habit's `done` keys.
//
// A habit stores completions as `"<weekOffset>:<dayIndex>"` strings (see Habit in
// types.ts). weekOffset is an absolute week index from WEEK_ANCHOR and dayIndex is
// 0 = Monday … 6 = Sunday, so every key maps to a real calendar date. That lets us
// compute streaks and rolling completion rates across week boundaries.

import type { Habit } from './types'
import { offsetToDate, dateToOffset, WEEK_ANCHOR } from './dates'

/** The completion key for a real date, matching Habit.done's format. */
export function habitKeyForDate(date: Date, anchor: Date = WEEK_ANCHOR): string {
  const { weekOffset, dayIndex } = dateToOffset(date, anchor)
  return `${weekOffset}:${dayIndex}`
}

/** Midnight of a date — whole-day granularity for streak/rate math. */
function atMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Whole days between two dates (b − a), ignoring the time of day. */
function daysBetween(a: Date, b: Date): number {
  return Math.round((atMidnight(b).getTime() - atMidnight(a).getTime()) / 86400000)
}

/**
 * One day of a habit's history, oldest → newest. `future` days (after today) are
 * marked so the UI can render them muted rather than as "missed".
 */
export interface HabitDay {
  date: Date
  key: string
  done: boolean
  /** True for dates after `today` — not yet actionable, so not a miss. */
  future: boolean
}

/**
 * The last `count` days ending on `today` (inclusive), oldest first — the series a
 * heatmap/trend strip renders. Also used as the basis for the rolling rates below.
 */
export function habitHistory(
  habit: Habit,
  count: number,
  today: Date = new Date(),
  anchor: Date = WEEK_ANCHOR
): HabitDay[] {
  const done = new Set(habit.done)
  const end = atMidnight(today)
  const days: HabitDay[] = []
  for (let back = count - 1; back >= 0; back--) {
    const date = new Date(end)
    date.setDate(end.getDate() - back)
    const key = habitKeyForDate(date, anchor)
    days.push({ date, key, done: done.has(key), future: false })
  }
  return days
}

/** Completed vs. total over the last `windowDays` ending today (inclusive). */
export interface HabitRate {
  done: number
  total: number
  pct: number
}

export function habitRate(
  habit: Habit,
  windowDays: number,
  today: Date = new Date(),
  anchor: Date = WEEK_ANCHOR
): HabitRate {
  const days = habitHistory(habit, windowDays, today, anchor)
  const done = days.filter((d) => d.done).length
  return { done, total: windowDays, pct: Math.round((done / windowDays) * 100) }
}

/**
 * Current streak: consecutive completed days counting back from today.
 * Today not being marked yet does not break the streak — a habit done every day
 * through yesterday still reads as a live streak until the day is over. So we start
 * at today if it's done, otherwise at yesterday, and count backwards until a gap.
 */
export function currentStreak(
  habit: Habit,
  today: Date = new Date(),
  anchor: Date = WEEK_ANCHOR
): number {
  const done = new Set(habit.done)
  const start = atMidnight(today)
  // If today isn't marked, begin the count at yesterday (a grace day for "today").
  let offset = done.has(habitKeyForDate(start, anchor)) ? 0 : 1
  let streak = 0
  // Cap the walk-back so a corrupt/empty habit can't loop unbounded.
  for (let guard = 0; guard < 3660; guard++) {
    const date = new Date(start)
    date.setDate(start.getDate() - offset)
    if (!done.has(habitKeyForDate(date, anchor))) break
    streak++
    offset++
  }
  return streak
}

/**
 * Longest run of consecutive completed days anywhere in the habit's history.
 * Sorts the completion dates and finds the longest gap-free chain.
 */
export function longestStreak(habit: Habit, anchor: Date = WEEK_ANCHOR): number {
  if (habit.done.length === 0) return 0
  const dates = habit.done
    .map((key) => {
      const [w, d] = key.split(':').map(Number)
      return atMidnight(offsetToDate(w, d, anchor)).getTime()
    })
    .sort((a, b) => a - b)
  let longest = 1
  let run = 1
  for (let i = 1; i < dates.length; i++) {
    const gap = daysBetween(new Date(dates[i - 1]), new Date(dates[i]))
    if (gap === 1) run++
    else if (gap > 1) run = 1
    // gap === 0 (duplicate) leaves the run unchanged.
    if (run > longest) longest = run
  }
  return longest
}

/** The full adherence summary the analytics section renders per habit. */
export interface HabitAnalytics {
  streak: number
  best: number
  week: HabitRate
  month: HabitRate
  history: HabitDay[]
}

export function habitAnalytics(
  habit: Habit,
  today: Date = new Date(),
  historyDays = 30,
  anchor: Date = WEEK_ANCHOR
): HabitAnalytics {
  return {
    streak: currentStreak(habit, today, anchor),
    best: longestStreak(habit, anchor),
    week: habitRate(habit, 7, today, anchor),
    month: habitRate(habit, 30, today, anchor),
    history: habitHistory(habit, historyDays, today, anchor)
  }
}

/** Mean completion rate over a window across every habit (0 when none). */
export function overallRate(
  habits: Habit[],
  windowDays: number,
  today: Date = new Date(),
  anchor: Date = WEEK_ANCHOR
): number {
  if (habits.length === 0) return 0
  const sum = habits.reduce((acc, h) => acc + habitRate(h, windowDays, today, anchor).pct, 0)
  return Math.round(sum / habits.length)
}
