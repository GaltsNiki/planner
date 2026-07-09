import React, { useEffect, useRef, useState } from 'react'
import { MONTHS_GEN, DAY_SHORT } from '@shared/dates'
import { COLORS } from '../tokens'

const MONTHS_NOM = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
]

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Monday-first weekday index (0 = Mon … 6 = Sun) for a date. */
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7
}

interface CalendarProps {
  /** The currently selected date (highlighted). */
  selected: Date
  /** The real "today" to mark with a ring. */
  today?: Date
  /** Highlight the whole Mon–Sun week of the hovered/selected day. */
  weekMode?: boolean
  onPick: (date: Date) => void
  onClose: () => void
  /** Anchor position (screen coords of the trigger's bottom-left). */
  anchor: { x: number; y: number }
}

/** A small dropdown calendar rendered fixed near its trigger. */
export function Calendar({ selected, today, weekMode, onPick, onClose, anchor }: CalendarProps): React.JSX.Element {
  const [viewMonth, setViewMonth] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1))
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: PointerEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose() }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
  const lead = mondayIndex(first)
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate()

  const cells: (Date | null)[] = []
  for (let i = 0; i < lead; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d))
  while (cells.length % 7 !== 0) cells.push(null)

  const shift = (delta: number): void =>
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1))

  // Which Mon–Sun week the selected day sits in (for weekMode highlight).
  const selWeekStart = new Date(selected)
  selWeekStart.setDate(selected.getDate() - mondayIndex(selected))
  const inSelectedWeek = (d: Date): boolean => {
    const start = new Date(selWeekStart)
    const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()) / 86400000)
    return diff >= 0 && diff < 7
  }

  const navBtn: React.CSSProperties = { width: 26, height: 26, borderRadius: 7, background: COLORS.rowBg, border: `1px solid ${COLORS.border08}`, color: COLORS.textSecondary, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }

  const top = Math.min(anchor.y + 8, window.innerHeight - 320)
  const left = Math.min(anchor.x, window.innerWidth - 268)

  return (
    <div
      ref={ref}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed', top, left, zIndex: 1000, width: 256,
        background: '#1b1b1f', border: `1px solid ${COLORS.border08}`, borderRadius: 13,
        padding: 12, boxShadow: '0 14px 40px rgba(0,0,0,0.55)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button onClick={() => shift(-1)} style={navBtn}>‹</button>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>{MONTHS_NOM[viewMonth.getMonth()]} {viewMonth.getFullYear()}</div>
        <button onClick={() => shift(1)} style={navBtn}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
        {DAY_SHORT.map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 600, color: COLORS.textFaint2, padding: '2px 0' }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const isSel = weekMode ? inSelectedWeek(d) : sameDay(d, selected)
          const isToday = today ? sameDay(d, today) : false
          return (
            <div
              key={i}
              onClick={() => onPick(d)}
              className="row-hover"
              style={{
                height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12.5, cursor: 'pointer', borderRadius: weekMode ? 0 : 8,
                background: isSel ? COLORS.accent : 'transparent',
                color: isSel ? '#fff' : COLORS.textPrimary,
                fontWeight: isSel ? 700 : 500,
                boxShadow: isToday && !isSel ? `inset 0 0 0 1px ${COLORS.accent}` : 'none'
              }}
            >
              {d.getDate()}
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 8, textAlign: 'center' }}>
        <button
          onClick={() => onPick(today ?? new Date())}
          style={{ padding: '5px 12px', borderRadius: 8, background: COLORS.accent12, border: `1px solid ${COLORS.accent28}`, color: COLORS.accent, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
        >
          {weekMode ? 'Текущая неделя' : 'Сегодня'}
        </button>
      </div>
    </div>
  )
}

/** Format a date as "8 июля" for labels. */
export function fmtDay(d: Date): string {
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`
}
