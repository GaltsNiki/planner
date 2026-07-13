import React, { useState } from 'react'
import { usePlanner } from '../store'
import { DAY_SHORT, weekModel, weekBadge, currentWeekIndex } from '@shared/dates'
import { COLORS } from '../tokens'
import type { Habit } from '@shared/types'

// name | 7 day cells | week count | delete
const GRID = '220px repeat(7, 32px) 46px 30px'
const CELL = 20 // small square marker, centered in each day column

export function HabitsView(): React.JSX.Element {
  // Share the app-wide week offset so switching tabs keeps you on the same week.
  const { habits, addHabit, todayIndex, weekOffset: wk, shiftWeek } = usePlanner()
  const model = weekModel(wk)

  const navBtn: React.CSSProperties = { width: 32, height: 32, borderRadius: 9, background: COLORS.rowBg, border: `1px solid ${COLORS.border08}`, color: COLORS.textSecondary, fontSize: 17, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      {/* Week navigator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <button className="row-hover" onClick={() => shiftWeek(-1)} style={navBtn}>‹</button>
        <div style={{ minWidth: 150, textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{model.range}</div>
          <div style={{ fontSize: 11.5, color: COLORS.textFaint, marginTop: 1 }}>{weekBadge(wk)}</div>
        </div>
        <button className="row-hover" onClick={() => shiftWeek(1)} style={navBtn}>›</button>
      </div>

      <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border06}`, borderRadius: 16, padding: '16px 18px 18px' }}>
        {/* Header: day columns */}
        <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 6, alignItems: 'end', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', color: COLORS.textFaint, paddingLeft: 2 }}>ПРИВЫЧКА</div>
          {DAY_SHORT.map((d, i) => {
            const isToday = wk === currentWeekIndex() && i === todayIndex
            return (
              <div key={d} style={{ textAlign: 'center', lineHeight: 1.2 }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: isToday ? COLORS.accent : COLORS.textMuted }}>{d}</div>
                <div style={{ fontSize: 11, color: isToday ? COLORS.accent : COLORS.textFaint2, fontVariantNumeric: 'tabular-nums' }}>{model.days[i].num}</div>
              </div>
            )
          })}
          <div style={{ fontSize: 10.5, fontWeight: 600, color: COLORS.textFaint2, textAlign: 'center' }}>ИТОГ</div>
          <div />
        </div>

        {habits.length === 0 ? (
          <div style={{ padding: '26px 16px', textAlign: 'center', color: COLORS.textFaint2, fontSize: 13.5 }}>
            Пока нет привычек. Добавьте первую — и отмечайте выполнение по дням.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {habits.map((h) => <HabitRow key={h.id} habit={h} weekOffset={wk} />)}
          </div>
        )}

        {/* Add habit */}
        <button
          onClick={addHabit}
          className="row-hover"
          style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', justifyContent: 'center', marginTop: 12, padding: '11px 15px', border: `1px dashed ${COLORS.borderDash}`, borderRadius: 12, background: 'transparent', color: COLORS.textFaint, fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 6v12M6 12h12" /></svg>
          Добавить привычку
        </button>
      </div>
    </div>
  )
}

function HabitRow({ habit, weekOffset }: { habit: Habit; weekOffset: number }): React.JSX.Element {
  const { toggleHabitDay, renameHabit, deleteHabit, todayIndex } = usePlanner()
  const [hover, setHover] = useState(false)
  const [binHover, setBinHover] = useState(false)

  const doneCount = [0, 1, 2, 3, 4, 5, 6].filter((i) => habit.done.includes(`${weekOffset}:${i}`)).length

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ display: 'grid', gridTemplateColumns: GRID, gap: 6, alignItems: 'center' }}
    >
      <input
        value={habit.title}
        onChange={(e) => renameHabit(habit.id, e.target.value)}
        placeholder="Название привычки"
        style={{ minWidth: 0, background: 'transparent', border: 'none', color: COLORS.textPrimary, fontSize: 14, fontWeight: 500, outline: 'none', padding: '2px 2px' }}
      />

      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const key = `${weekOffset}:${i}`
        const done = habit.done.includes(key)
        const isToday = weekOffset === currentWeekIndex() && i === todayIndex
        return (
          <div
            key={i}
            onClick={() => toggleHabitDay(habit.id, key)}
            title={done ? 'Отметить невыполненной' : 'Отметить выполненной'}
            className={done ? 'habit-cell-done' : 'habit-cell-empty'}
            style={{
              width: CELL, height: CELL, borderRadius: 6, justifySelf: 'center', cursor: 'pointer', transition: 'background .12s, border-color .12s',
              background: done ? COLORS.accent : 'rgba(255,255,255,0.04)',
              border: done ? `1px solid ${COLORS.accent}` : `1px solid ${isToday ? COLORS.accent35 : COLORS.border08}`
            }}
          />
        )
      })}

      <div style={{ textAlign: 'center', fontSize: 12.5, fontWeight: 600, color: doneCount ? COLORS.accentPartner : COLORS.textFaint2, fontVariantNumeric: 'tabular-nums' }}>
        {doneCount}/7
      </div>

      <button
        onClick={() => deleteHabit(habit.id)}
        onMouseEnter={() => setBinHover(true)}
        onMouseLeave={() => setBinHover(false)}
        title="Удалить привычку"
        style={{ width: 28, height: 28, borderRadius: 8, background: binHover ? 'rgba(240,113,92,0.12)' : 'transparent', border: 'none', color: binHover ? '#f0715c' : COLORS.textFaint, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: hover ? 1 : 0.28, transition: 'opacity .12s, color .12s, background .12s' }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /></svg>
      </button>
    </div>
  )
}
