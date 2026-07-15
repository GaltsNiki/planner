import { describe, it, expect } from 'vitest'
import { extractTime, extractLink, linkify, byTime, byDate, stripTime, escapeHtml } from '../taskMeta'

describe('escapeHtml', () => {
  it('neutralises markup so web-sourced text cannot execute', () => {
    expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe(
      '&lt;img src=x onerror=alert(1)&gt;'
    )
    expect(escapeHtml(`a & b "c" 'd'`)).toBe('a &amp; b &quot;c&quot; &#39;d&#39;')
  })
  it('is a no-op for plain text', () => {
    expect(escapeHtml('Кафе на Рубинштейна, 20')).toBe('Кафе на Рубинштейна, 20')
  })
})

describe('extractTime', () => {
  it('extracts an HH:MM token', () => {
    expect(extractTime('Созвон в 19:00. Тема — small talk')).toBe('19:00')
  })
  it('pads a single-digit hour', () => {
    expect(extractTime('Старт в 7:05, лёгкий темп')).toBe('07:05')
  })
  it('accepts a dot separator', () => {
    expect(extractTime('В 21.30 растяжка')).toBe('21:30')
  })
  it('ignores times inside URLs', () => {
    expect(extractTime('см https://x.io/12:00/route')).toBe('')
  })
  it('rejects out-of-range times', () => {
    expect(extractTime('код 25:99')).toBe('')
  })
  it('returns empty when none present', () => {
    expect(extractTime('Купить продукты')).toBe('')
    expect(extractTime('')).toBe('')
  })
})

describe('stripTime', () => {
  it('removes the time token shown in the chip from the description line', () => {
    expect(stripTime('19:00 Созвон с тьютором', '19:00')).toBe('Созвон с тьютором')
    expect(stripTime('Созвон в 19:00', '19:00')).toBe('Созвон в')
  })
  it('drops a leftover leading separator', () => {
    expect(stripTime('07:00 — пробежка', '07:00')).toBe('пробежка')
    expect(stripTime('7:05, лёгкий темп', '07:05')).toBe('лёгкий темп')
  })
  it('matches a single-digit hour against the padded chip time', () => {
    expect(stripTime('в 7:05 старт', '07:05')).toBe('в старт')
  })
  it('is a no-op when there is no time', () => {
    expect(stripTime('Купить продукты', '')).toBe('Купить продукты')
  })
})

describe('linkify / extractLink', () => {
  it('finds a bare url and its label', () => {
    const r = linkify('Маршрут https://www.strava.com/routes/3218764 по набережной')
    expect(r.primary?.href).toBe('https://www.strava.com/routes/3218764')
    expect(r.primary?.label).toBe('strava.com')
    expect(r.textOnly).toBe('Маршрут по набережной')
  })
  it('adds https:// to www links', () => {
    expect(extractLink('см www.ted.com/talks/x')?.href).toBe('https://www.ted.com/talks/x')
  })
  it('dedupes repeated urls', () => {
    const r = linkify('a https://x.io b https://x.io')
    expect(r.links).toHaveLength(1)
  })
  it('strips trailing punctuation', () => {
    expect(extractLink('ссылка https://x.io/page).')?.href).toBe('https://x.io/page')
  })
  it('returns null primary with no url', () => {
    expect(extractLink('без ссылок')).toBeNull()
  })
})

describe('byTime', () => {
  it('orders timed tasks earliest-first', () => {
    const arr = [{ desc: 'в 19:00' }, { desc: 'в 07:00' }, { desc: 'без времени' }]
    const sorted = [...arr].sort(byTime)
    expect(sorted[0].desc).toBe('в 07:00')
    expect(sorted[1].desc).toBe('в 19:00')
    expect(sorted[2].desc).toBe('без времени')
  })
})

describe('byDate', () => {
  it('orders by absolute date (week, then weekday) earliest-first', () => {
    const arr = [
      { week: 2, day: 0, desc: 'позже' }, // later week wins over earlier weekday
      { week: 1, day: 6, desc: 'раньше' },
      { week: 1, day: 0, desc: 'самая ранняя' }
    ]
    const sorted = [...arr].sort(byDate)
    expect(sorted.map((t) => t.desc)).toEqual(['самая ранняя', 'раньше', 'позже'])
  })
  it('breaks ties within the same day by derived time', () => {
    const arr = [
      { week: 3, day: 2, desc: 'встреча в 18:00' },
      { week: 3, day: 2, desc: 'зарядка в 07:30' }
    ]
    const sorted = [...arr].sort(byDate)
    expect(sorted[0].desc).toBe('зарядка в 07:30')
    expect(sorted[1].desc).toBe('встреча в 18:00')
  })
})
