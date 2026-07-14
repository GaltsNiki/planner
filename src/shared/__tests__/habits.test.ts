import { describe, it, expect } from 'vitest'
import {
  habitKeyForDate, habitHistory, habitRate, currentStreak, longestStreak,
  habitAnalytics, overallRate
} from '../habits'
import { WEEK_ANCHOR } from '../dates'
import type { Habit } from '../types'

// A fixed "today" so the rolling-window math is deterministic. WEEK_ANCHOR is a
// Monday (6 Jan 2020); pick a Thursday a few weeks out as "today".
const TODAY = new Date(2020, 0, 30) // Thu, 30 Jan 2020

const mk = (done: string[]): Habit => ({ id: 'h', title: 'H', done })

/** Build a habit whose completions are the given real dates. */
function habitFromDates(dates: Date[]): Habit {
  return mk(dates.map((d) => habitKeyForDate(d, WEEK_ANCHOR)))
}

/** N days before TODAY. */
function daysAgo(n: number): Date {
  const d = new Date(TODAY)
  d.setDate(d.getDate() - n)
  return d
}

describe('habitKeyForDate', () => {
  it('maps the anchor Monday to week 0, day 0', () => {
    expect(habitKeyForDate(WEEK_ANCHOR, WEEK_ANCHOR)).toBe('0:0')
  })
  it('round-trips through a full week', () => {
    const sunday = new Date(2020, 0, 12) // Sun of the anchor week
    expect(habitKeyForDate(sunday, WEEK_ANCHOR)).toBe('0:6')
  })
})

describe('habitHistory', () => {
  it('returns `count` days ending today, oldest first', () => {
    const h = habitFromDates([TODAY, daysAgo(2)])
    const hist = habitHistory(h, 7, TODAY, WEEK_ANCHOR)
    expect(hist).toHaveLength(7)
    expect(hist[6].done).toBe(true)  // today, marked
    expect(hist[5].done).toBe(false) // yesterday, not marked
    expect(hist[4].done).toBe(true)  // 2 days ago, marked
    // Oldest first: the last element is today.
    expect(hist[6].date.getTime()).toBe(new Date(2020, 0, 30).getTime())
  })
})

describe('habitRate', () => {
  it('is done-over-window as a percentage', () => {
    // Done today, yesterday, and 3 days ago → 3 of the last 7 days = 43%.
    const h = habitFromDates([TODAY, daysAgo(1), daysAgo(3)])
    expect(habitRate(h, 7, TODAY, WEEK_ANCHOR)).toEqual({ done: 3, total: 7, pct: 43 })
  })
  it('ignores completions outside the window', () => {
    const h = habitFromDates([daysAgo(10)]) // older than a 7-day window
    expect(habitRate(h, 7, TODAY, WEEK_ANCHOR)).toEqual({ done: 0, total: 7, pct: 0 })
  })
  it('is 0 for an empty habit', () => {
    expect(habitRate(mk([]), 30, TODAY, WEEK_ANCHOR)).toEqual({ done: 0, total: 30, pct: 0 })
  })
})

describe('currentStreak', () => {
  it('counts consecutive days back from today', () => {
    const h = habitFromDates([TODAY, daysAgo(1), daysAgo(2)])
    expect(currentStreak(h, TODAY, WEEK_ANCHOR)).toBe(3)
  })
  it('does not break when only today is unmarked (grace day)', () => {
    // Yesterday and the day before are done; today not yet → streak still 2.
    const h = habitFromDates([daysAgo(1), daysAgo(2)])
    expect(currentStreak(h, TODAY, WEEK_ANCHOR)).toBe(2)
  })
  it('is 0 when yesterday and today are both missed', () => {
    const h = habitFromDates([daysAgo(2), daysAgo(3)])
    expect(currentStreak(h, TODAY, WEEK_ANCHOR)).toBe(0)
  })
  it('stops at the first gap', () => {
    // today, yesterday done; gap at 2 days ago; older run does not count.
    const h = habitFromDates([TODAY, daysAgo(1), daysAgo(3), daysAgo(4)])
    expect(currentStreak(h, TODAY, WEEK_ANCHOR)).toBe(2)
  })
  it('is 0 for an empty habit', () => {
    expect(currentStreak(mk([]), TODAY, WEEK_ANCHOR)).toBe(0)
  })
})

describe('longestStreak', () => {
  it('finds the longest gap-free run anywhere in history', () => {
    // A run of 2 (days 8,9 ago) and a run of 3 (days 1,2,3 ago) → 3.
    const h = habitFromDates([daysAgo(9), daysAgo(8), daysAgo(3), daysAgo(2), daysAgo(1)])
    expect(longestStreak(h, WEEK_ANCHOR)).toBe(3)
  })
  it('handles duplicate keys without inflating the run', () => {
    const h = mk(['1:0', '1:0', '1:1']) // Mon+Tue of week 1, Mon listed twice
    expect(longestStreak(h, WEEK_ANCHOR)).toBe(2)
  })
  it('is 0 for an empty habit and 1 for a single day', () => {
    expect(longestStreak(mk([]), WEEK_ANCHOR)).toBe(0)
    expect(longestStreak(habitFromDates([TODAY]), WEEK_ANCHOR)).toBe(1)
  })
})

describe('habitAnalytics', () => {
  it('bundles streak, best, week/month rates, and history', () => {
    const h = habitFromDates([TODAY, daysAgo(1), daysAgo(2)])
    const a = habitAnalytics(h, TODAY, 30, WEEK_ANCHOR)
    expect(a.streak).toBe(3)
    expect(a.best).toBe(3)
    expect(a.week).toEqual({ done: 3, total: 7, pct: 43 })
    expect(a.month.done).toBe(3)
    expect(a.history).toHaveLength(30)
  })
})

describe('overallRate', () => {
  it('averages each habit’s window rate', () => {
    // h1: 7/7 in the last 7 days = 100%. h2: 0% → mean 50%.
    const week = [0, 1, 2, 3, 4, 5, 6].map((n) => daysAgo(n))
    const h1 = habitFromDates(week)
    const h2 = mk([])
    expect(overallRate([h1, h2], 7, TODAY, WEEK_ANCHOR)).toBe(50)
  })
  it('is 0 when there are no habits', () => {
    expect(overallRate([], 7, TODAY, WEEK_ANCHOR)).toBe(0)
  })
})
