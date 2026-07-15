import React, { useState } from 'react'
import { usePlanner } from '../store'
import { DAY_SHORT, weekModel, weekBadge, currentWeekIndex } from '@shared/dates'
import { habitAnalytics, type HabitDay } from '@shared/habits'
import { COLORS } from '../tokens'
import type { Habit } from '@shared/types'

// Board grid: name | 7 day cells | streak | week count | delete
const GRID = '1fr repeat(7, 34px) 58px 48px 30px'
const CELL = 22 // day marker square, centred in its column

// Analytics grid: habit name | 30-day consistency strip
const GRID_A = '160px 1fr'

/** Russian plural for a day count: 1 день · 2 дня · 5 дней. */
function pluralDays(n: number): string {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs >= 11 && abs <= 14) return 'дней'
  if (last === 1) return 'день'
  if (last >= 2 && last <= 4) return 'дня'
  return 'дней'
}

export function HabitsView(): React.JSX.Element {
  // Share the app-wide week offset so switching tabs keeps you on the same week.
  const { habits, addHabit, todayIndex, weekOffset: wk, shiftWeek } = usePlanner()
  const model = weekModel(wk)
  const isCurrentWeek = wk === currentWeekIndex()

  const navBtn: React.CSSProperties = {
    width: 34, height: 34, borderRadius: 10, background: COLORS.rowBg,
    border: `1px solid ${COLORS.border08}`, color: COLORS.textSecondary, fontSize: 18,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Week navigator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <button className="row-hover" onClick={() => shiftWeek(-1)} style={navBtn} title="Прошлая неделя">‹</button>
        <div style={{ minWidth: 168, textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.2px' }}>{model.range}</div>
          <div style={{ fontSize: 11.5, color: isCurrentWeek ? COLORS.accentPartner : COLORS.textFaint, marginTop: 2, fontWeight: 600 }}>{weekBadge(wk)}</div>
        </div>
        <button className="row-hover" onClick={() => shiftWeek(1)} style={navBtn} title="Следующая неделя">›</button>
      </div>

      {/* ── Weekly board ─────────────────────────────────────────── */}
      <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border06}`, borderRadius: 16, padding: '18px 20px 14px' }}>
        {/* Header: day columns */}
        <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 6, alignItems: 'end', marginBottom: 6 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.7px', color: COLORS.textFaint, paddingLeft: 4 }}>ПРИВЫЧКА</div>
          {DAY_SHORT.map((d, i) => {
            const isToday = isCurrentWeek && i === todayIndex
            return (
              <div key={d} style={{ textAlign: 'center', lineHeight: 1.25 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: isToday ? COLORS.accent : COLORS.textMuted }}>{d}</div>
                <div style={{ fontSize: 11, color: isToday ? COLORS.accentPartner : COLORS.textFaint2, fontVariantNumeric: 'tabular-nums', marginTop: 1 }}>{model.days[i].num}</div>
              </div>
            )
          })}
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.4px', color: COLORS.textFaint2, textAlign: 'center' }}>СЕРИЯ</div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.4px', color: COLORS.textFaint2, textAlign: 'center' }}>ИТОГ</div>
          <div />
        </div>

        {habits.length === 0 ? (
          <div style={{ padding: '30px 16px', textAlign: 'center', color: COLORS.textFaint2, fontSize: 13.5, lineHeight: 1.5 }}>
            Пока нет привычек. Добавьте первую — и отмечайте выполнение по дням.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {habits.map((h) => <HabitRow key={h.id} habit={h} weekOffset={wk} isCurrentWeek={isCurrentWeek} />)}
          </div>
        )}

        {/* Add habit */}
        <button
          onClick={addHabit}
          className="row-hover"
          style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', justifyContent: 'center', marginTop: 12, padding: '11px 15px', border: `1px dashed ${COLORS.borderDash}`, borderRadius: 12, background: 'transparent', color: COLORS.textFaint, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 6v12M6 12h12" /></svg>
          Добавить привычку
        </button>
      </div>

      {/* ── Adherence analytics ──────────────────────────────────── */}
      {habits.length > 0 && <HabitsAnalytics habits={habits} />}
    </div>
  )
}

function HabitRow({ habit, weekOffset, isCurrentWeek }: { habit: Habit; weekOffset: number; isCurrentWeek: boolean }): React.JSX.Element {
  const { toggleHabitDay, renameHabit, deleteHabit, todayIndex } = usePlanner()
  const [hover, setHover] = useState(false)
  const [binHover, setBinHover] = useState(false)

  const doneCount = [0, 1, 2, 3, 4, 5, 6].filter((i) => habit.done.includes(`${weekOffset}:${i}`)).length
  // Current streak drives the flame badge beside each row — a live adherence cue.
  const streak = habitAnalytics(habit).streak

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ display: 'grid', gridTemplateColumns: GRID, gap: 6, alignItems: 'center', padding: '4px 4px', borderRadius: 10, background: hover ? COLORS.rowBg : 'transparent', transition: 'background .12s' }}
    >
      <input
        value={habit.title}
        onChange={(e) => renameHabit(habit.id, e.target.value)}
        placeholder="Название привычки"
        style={{ minWidth: 0, background: 'transparent', border: 'none', color: COLORS.textPrimary, fontSize: 14.5, fontWeight: 600, outline: 'none', padding: '4px 2px' }}
      />

      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const key = `${weekOffset}:${i}`
        const done = habit.done.includes(key)
        const isToday = isCurrentWeek && i === todayIndex
        return (
          <div
            key={i}
            onClick={() => toggleHabitDay(habit.id, key)}
            title={done ? 'Отметить невыполненной' : 'Отметить выполненной'}
            className={done ? 'habit-cell-done' : 'habit-cell-empty'}
            style={{
              width: CELL, height: CELL, borderRadius: 7, justifySelf: 'center', cursor: 'pointer', transition: 'background .12s, border-color .12s',
              background: done ? COLORS.accent : 'rgba(255,255,255,0.035)',
              border: done ? `1px solid ${COLORS.accent}` : `1px solid ${isToday ? COLORS.accent35 : COLORS.border08}`,
              boxShadow: done ? `0 1px 4px rgba(232,86,63,0.25)` : 'none'
            }}
          />
        )
      })}

      {/* Current streak — flame + day count, muted when zero. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }} title={streak ? `Серия: ${streak} ${pluralDays(streak)} подряд` : 'Пока нет серии'}>
        <FlameIcon active={streak > 0} />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: streak > 0 ? COLORS.accentPartner : COLORS.textDisabled, fontVariantNumeric: 'tabular-nums' }}>{streak}</span>
      </div>

      <div style={{ textAlign: 'center', fontSize: 12.5, fontWeight: 700, color: doneCount ? COLORS.textSecondary : COLORS.textFaint2, fontVariantNumeric: 'tabular-nums' }}>
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

/* ── Analytics section ──────────────────────────────────────────── */

function HabitsAnalytics({ habits }: { habits: Habit[] }): React.JSX.Element {
  return (
    <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border06}`, borderRadius: 16, padding: '18px 20px 20px', marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Аналитика привычек</div>
        <div style={{ fontSize: 12, color: COLORS.textFaint2 }}>Серии и постоянство</div>
      </div>

      {/* Board header — labels the consistency strip that follows. */}
      <div style={{ display: 'grid', gridTemplateColumns: GRID_A, gap: 18, marginBottom: 6, padding: '0 10px' }}>
        <div />
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', color: COLORS.textFaint2, textAlign: 'center' }}>30 ДНЕЙ</div>
      </div>

      {/* Per-habit adherence rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {habits.map((h) => <AnalyticsRow key={h.id} habit={h} />)}
      </div>

      {/* Heatmap legend — the strip's colour mapping. */}
      <div style={{ display: 'grid', gridTemplateColumns: GRID_A, gap: 18, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${COLORS.border06}` }}>
        <div />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'flex-end', fontSize: 11, color: COLORS.textFaint }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS.accent }} /> выполнено
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(255,255,255,0.05)' }} /> пропущено
          </span>
        </div>
      </div>
    </div>
  )
}

function AnalyticsRow({ habit }: { habit: Habit }): React.JSX.Element {
  const [hover, setHover] = useState(false)
  const a = habitAnalytics(habit)
  const title = habit.title.trim() || 'Без названия'

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ display: 'grid', gridTemplateColumns: GRID_A, gap: 18, alignItems: 'center', padding: '9px 10px', borderRadius: 10, background: hover ? COLORS.rowBg : 'transparent', transition: 'background .12s' }}
    >
      {/* Name + best streak */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
          <FlameIcon active={a.streak > 0} size={11} />
          <span style={{ fontSize: 11.5, fontWeight: 700, color: a.streak > 0 ? COLORS.accentPartner : COLORS.textDisabled, fontVariantNumeric: 'tabular-nums' }}>{a.streak}</span>
          <span style={{ fontSize: 11, color: COLORS.textFaint2 }}>{pluralDays(a.streak)}{a.best > a.streak ? ` · рекорд ${a.best}` : ''}</span>
        </div>
      </div>

      {/* 30-day consistency heatmap */}
      <Heatmap history={a.history} />
    </div>
  )
}

/**
 * 30-day consistency strip: one small cell per day, oldest → newest (today last).
 * Done days carry the accent; missed days a faint track. It reads left-to-right as
 * a timeline, so runs of completions show up as solid accent bands.
 *
 * The cells flex to share the column width (capped at 18px each) rather than taking a
 * fixed width — 30 fixed cells are wider than the column at the board's max width, so
 * a fixed size made the strip overflow past the card's right edge. `minWidth: 0` lets
 * the grid track shrink to its fair share instead of the strip's full intrinsic width.
 */
function Heatmap({ history }: { history: HabitDay[] }): React.JSX.Element {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center', justifyContent: 'flex-end', minWidth: 0 }}>
      {history.map((d) => {
        const dateLabel = d.date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
        return (
          <div
            key={d.key}
            title={`${dateLabel} — ${d.done ? 'выполнено' : 'пропущено'}`}
            style={{
              flex: '1 1 0', minWidth: 0, maxWidth: 18, height: 24, borderRadius: 4,
              background: d.done ? COLORS.accent : 'rgba(255,255,255,0.05)',
              boxShadow: d.done ? '0 1px 3px rgba(232,86,63,0.22)' : 'none'
            }}
          />
        )
      })}
    </div>
  )
}

/** Small flame glyph used for streaks; greys out when the streak is zero. */
function FlameIcon({ active, size = 13 }: { active: boolean; size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={active ? COLORS.accent : 'none'} stroke={active ? COLORS.accent : COLORS.textDisabled} strokeWidth="1.6" strokeLinejoin="round">
      <path d="M12 3c.6 3-1.8 4.2-3.2 6C7.5 10.6 7 12.2 7 13.8 7 17.2 9.2 20 12 20s5-2.8 5-6.2c0-2-1-3.7-2.3-5.2-.6.7-1.2 1.1-2 1.2C13.4 7.5 13 5 12 3z" />
    </svg>
  )
}
