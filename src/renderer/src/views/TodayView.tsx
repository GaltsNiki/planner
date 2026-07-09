import React, { useState } from 'react'
import { usePlanner } from '../store'
import { TaskRow } from '../components/TaskRow'
import { GoalDot } from '../components/primitives'
import { Calendar, fmtDay } from '../components/Calendar'
import { useContextMenu } from '../components/ContextMenu'
import { goalStats } from '@shared/progress'
import { byTime } from '@shared/taskMeta'
import { staleRows } from '@shared/staleness'
import { DAY_FULL, offsetToDate, dateToOffset } from '@shared/dates'
import { COLORS } from '../tokens'

function DateNavigator(): React.JSX.Element {
  const { dayIndex: di, todayIndex, weekOffset, setDay, shiftWeek } = usePlanner()
  const [cal, setCal] = useState<{ x: number; y: number } | null>(null)

  const cur = offsetToDate(weekOffset, di)
  const prev = offsetToDate(weekOffset, di - 1)
  const next = offsetToDate(weekOffset, di + 1)
  const today = offsetToDate(0, todayIndex)

  // Step across week boundaries so nav isn't clamped inside a single week.
  const step = (delta: number): void => {
    const ni = di + delta
    if (ni < 0) { shiftWeek(-1); setDay(6) }
    else if (ni > 6) { shiftWeek(1); setDay(0) }
    else setDay(ni)
  }
  const pick = (d: Date): void => {
    const o = dateToOffset(d)
    if (o.weekOffset !== weekOffset) shiftWeek(o.weekOffset - weekOffset)
    setDay(o.dayIndex)
    setCal(null)
  }

  const btn: React.CSSProperties = { width: 30, height: 30, borderRadius: 9, background: COLORS.rowBg, border: `1px solid ${COLORS.border08}`, color: COLORS.textSecondary, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }
  const label: React.CSSProperties = { color: COLORS.textFaint2, fontSize: 13.5, cursor: 'pointer' }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 22 }}>
      <div onClick={() => step(-1)} style={{ ...label, minWidth: 58, textAlign: 'right' }}>{fmtDay(prev)}</div>
      <button onClick={() => step(-1)} style={btn}>‹</button>
      <div
        onClick={(e) => setCal({ x: e.currentTarget.getBoundingClientRect().left, y: e.currentTarget.getBoundingClientRect().bottom })}
        title="Открыть календарь"
        style={{ textAlign: 'center', minWidth: 118, cursor: 'pointer' }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px' }}>{fmtDay(cur)}</div>
        <div style={{ fontSize: 12, color: COLORS.textFaint, marginTop: 1 }}>{DAY_FULL[di]}</div>
      </div>
      <button onClick={() => step(1)} style={btn}>›</button>
      <div onClick={() => step(1)} style={{ ...label, minWidth: 58, textAlign: 'left' }}>{fmtDay(next)}</div>

      {cal && (
        <Calendar selected={cur} today={today} anchor={cal} onPick={pick} onClose={() => setCal(null)} />
      )}
    </div>
  )
}

export function TodayView(): React.JSX.Element {
  const { goals, tasks, stale, dayIndex, weekOffset, selectGoal, deleteGoal, openEditGoal, openNew, breakDown } = usePlanner()
  const menu = useContextMenu()

  const todayTasks = tasks.filter((t) => t.day === dayIndex && (t.week || 0) === weekOffset)
  const tDone = todayTasks.filter((t) => t.done).length
  const tTotal = todayTasks.length
  const todayPct = tTotal ? Math.round((tDone / tTotal) * 100) : 0

  const groups = goals
    .map((g) => {
      const ts = todayTasks.filter((t) => t.goalId === g.id).slice().sort(byTime)
      if (!ts.length) return null
      const st = goalStats(g, tasks)
      return { g, ts, st }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  const staleList = staleRows(stale, goals)

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <DateNavigator />

      <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border06}`, borderRadius: 16, padding: '18px 20px', marginBottom: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 14, color: COLORS.textSecondary, fontWeight: 500 }}>Прогресс дня</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}><span style={{ color: COLORS.accent }}>{tDone}</span> из {tTotal} задач</div>
        </div>
        <div style={{ height: 8, borderRadius: 5, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 5, background: COLORS.accentGrad, width: todayPct + '%', transition: 'width .3s' }} />
        </div>
      </div>

      {groups.map(({ g, ts, st }) => (
        <div key={g.id} style={{ marginBottom: 26 }}>
          <div
            onClick={() => selectGoal(g.id)}
            onContextMenu={menu.open([
              { label: 'Открыть цель', onClick: () => selectGoal(g.id) },
              { label: 'Изменить цель', onClick: () => openEditGoal(g.id) },
              { label: 'Удалить цель', danger: true, onClick: () => deleteGoal(g.id) }
            ])}
            style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '0 0 12px 2px', cursor: 'pointer' }}
          >
            <GoalDot color={g.dotColor} size={9} />
            <div style={{ fontSize: 14.5, fontWeight: 600 }}>{g.title}</div>
            <div style={{ fontSize: 12, color: COLORS.textFaint2 }}>{st.mDone}/{st.mTotal} этапа</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ts.map((t) => <TaskRow key={t.id} task={t} goal={g} />)}
            <div onClick={() => openNew(g.id, dayIndex, weekOffset)} className="row-hover" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 15px', border: `1px dashed ${COLORS.borderDash}`, borderRadius: 13, cursor: 'pointer', color: COLORS.textFaint, fontSize: 14 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" strokeLinecap="round" /></svg>
              <span>Добавить задачу</span>
            </div>
          </div>
        </div>
      ))}

      {/* Always-available add button — the fix for "no tasks left, nowhere to add". */}
      <div
        onClick={() => openNew(null, dayIndex, weekOffset)}
        className="row-hover"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '13px 15px', border: `1px dashed ${COLORS.borderDash}`, borderRadius: 13, cursor: 'pointer', color: COLORS.textFaint, fontSize: 14, marginBottom: 26 }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" strokeLinecap="round" /></svg>
        <span>{groups.length ? 'Новая задача' : 'На этот день пока нет задач — добавить'}</span>
      </div>

      <div style={{ background: COLORS.accent06, border: `1px solid ${COLORS.accent18}`, borderRadius: 16, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600 }}>Застряли?</div>
        </div>
        <div style={{ fontSize: 12.5, color: COLORS.textMuted, marginBottom: 14 }}>Эти задачи давно не двигаются. Claude может разбить их на маленькие шаги.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {staleList.map((s) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: COLORS.rowBg, border: `1px solid ${COLORS.border}`, borderRadius: 12 }}>
              <GoalDot color={s.dotColor} size={8} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14 }}>{s.title}</div>
                <div style={{ fontSize: 11.5, color: COLORS.textFaint2, marginTop: 2 }}>{s.goalTitle} · {s.daysLabel}</div>
              </div>
              <button onClick={() => void breakDown(s.title, s.goalId)} style={{ flex: 'none', padding: '7px 13px', borderRadius: 9, background: COLORS.accent14, border: `1px solid ${COLORS.accent28}`, color: COLORS.accent, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Разбить на шаги</button>
            </div>
          ))}
        </div>
      </div>

      {menu.element}
    </div>
  )
}
