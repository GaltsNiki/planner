// Week / date math — Monday start, offset-based, ru-RU genitive month names.

/** Genitive month names for range labels ("6 – 12 июля"). */
export const MONTHS_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
]

export const DAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
export const DAY_FULL = [
  'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'
]

/**
 * The Monday anchoring "week offset 0". The prototype fixes this to 2026-07-06
 * so the seeded data lines up; production would use the real current Monday.
 */
export const WEEK_ANCHOR = new Date(2026, 6, 6)

export interface WeekDay {
  num: number
  month: number
}

export interface WeekModel {
  days: WeekDay[]
  /** e.g. "6 – 12 июля" or "29 июня – 5 июля" when it spans two months. */
  range: string
}

/** The 7 days (Mon–Sun) and range label for a given week offset. */
export function weekModel(offset: number, anchor: Date = WEEK_ANCHOR): WeekModel {
  const base = new Date(anchor)
  base.setDate(base.getDate() + offset * 7)
  const days: WeekDay[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    days.push({ num: d.getDate(), month: d.getMonth() })
  }
  const a = days[0]
  const b = days[6]
  const range =
    a.month === b.month
      ? `${a.num} – ${b.num} ${MONTHS_GEN[b.month]}`
      : `${a.num} ${MONTHS_GEN[a.month]} – ${b.num} ${MONTHS_GEN[b.month]}`
  return { days, range }
}

export function weekBadge(offset: number): string {
  if (offset === 0) return 'Текущая неделя'
  return offset < 0 ? 'Прошлая неделя' : 'Будущая неделя'
}

/** Midnight of a date, for whole-day math. */
function atMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/**
 * Map a real calendar date to the app's (weekOffset, dayIndex) model.
 * dayIndex: 0 = Monday … 6 = Sunday. weekOffset is relative to WEEK_ANCHOR.
 */
export function dateToOffset(date: Date, anchor: Date = WEEK_ANCHOR): { weekOffset: number; dayIndex: number } {
  const MS = 86400000
  const diffDays = Math.round((atMidnight(date).getTime() - atMidnight(anchor).getTime()) / MS)
  // Floor division so days before the anchor land in earlier weeks correctly.
  const weekOffset = Math.floor(diffDays / 7)
  const dayIndex = ((diffDays % 7) + 7) % 7
  return { weekOffset, dayIndex }
}

/** Inverse of dateToOffset: the real Date for a given (weekOffset, dayIndex). */
export function offsetToDate(weekOffset: number, dayIndex: number, anchor: Date = WEEK_ANCHOR): Date {
  const d = new Date(anchor)
  d.setDate(d.getDate() + weekOffset * 7 + dayIndex)
  return d
}
