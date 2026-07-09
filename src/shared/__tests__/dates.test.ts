import { describe, it, expect } from 'vitest'
import {
  weekModel, weekBadge, WEEK_ANCHOR, dateToOffset, offsetToDate,
  mondayOf, dayIndexOf, todayDayIndex
} from '../dates'

// Fixed anchor for deterministic tests (the app's live anchor is the real Monday).
const ANCHOR = new Date(2026, 6, 6) // Monday, 6 July 2026

describe('weekModel', () => {
  it('lists Mon–Sun for the anchor week', () => {
    const m = weekModel(0, ANCHOR)
    expect(m.days.map((d) => d.num)).toEqual([6, 7, 8, 9, 10, 11, 12])
    expect(m.range).toBe('6 – 12 июля')
  })
  it('shifts by whole weeks', () => {
    expect(weekModel(1, ANCHOR).days[0].num).toBe(13)
    expect(weekModel(-1, ANCHOR).days[0].num).toBe(29) // 29 June
  })
  it('spans two months in the label', () => {
    // Week starting 29 June 2026 → 29 июня – 5 июля
    expect(weekModel(-1, ANCHOR).range).toBe('29 июня – 5 июля')
  })
  it('the live anchor is a Monday', () => {
    expect(WEEK_ANCHOR.getDay()).toBe(1)
  })
})

describe('dayIndexOf / mondayOf', () => {
  it('maps weekdays Monday-first', () => {
    expect(dayIndexOf(new Date(2026, 6, 6))).toBe(0)  // Mon
    expect(dayIndexOf(new Date(2026, 6, 9))).toBe(3)  // Thu
    expect(dayIndexOf(new Date(2026, 6, 12))).toBe(6) // Sun
  })
  it('mondayOf returns the Monday of the week', () => {
    expect(mondayOf(new Date(2026, 6, 9))).toEqual(new Date(2026, 6, 6))
    expect(mondayOf(new Date(2026, 6, 6))).toEqual(new Date(2026, 6, 6))
    expect(mondayOf(new Date(2026, 6, 12))).toEqual(new Date(2026, 6, 6))
  })
  it('todayDayIndex derives from the given date', () => {
    expect(todayDayIndex(new Date(2026, 6, 9))).toBe(3)
  })
})

describe('weekBadge', () => {
  it('labels current/past/future', () => {
    expect(weekBadge(0)).toBe('Текущая неделя')
    expect(weekBadge(-1)).toBe('Прошлая неделя')
    expect(weekBadge(2)).toBe('Будущая неделя')
  })
})

describe('dateToOffset / offsetToDate', () => {
  it('maps the anchor Monday to offset 0, day 0', () => {
    expect(dateToOffset(new Date(2026, 6, 6), ANCHOR)).toEqual({ weekOffset: 0, dayIndex: 0 })
  })
  it('maps a Sunday in the anchor week to day 6', () => {
    expect(dateToOffset(new Date(2026, 6, 12), ANCHOR)).toEqual({ weekOffset: 0, dayIndex: 6 })
  })
  it('handles the next week and dates before the anchor (floor division)', () => {
    expect(dateToOffset(new Date(2026, 6, 13), ANCHOR)).toEqual({ weekOffset: 1, dayIndex: 0 })
    expect(dateToOffset(new Date(2026, 5, 29), ANCHOR)).toEqual({ weekOffset: -1, dayIndex: 0 })
    expect(dateToOffset(new Date(2026, 6, 5), ANCHOR)).toEqual({ weekOffset: -1, dayIndex: 6 })
  })
  it('round-trips through offsetToDate', () => {
    for (const [wo, di] of [[0, 0], [0, 6], [1, 3], [-2, 4]] as const) {
      expect(dateToOffset(offsetToDate(wo, di, ANCHOR), ANCHOR)).toEqual({ weekOffset: wo, dayIndex: di })
    }
  })
})
