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
  const { dayIndex, todayIndex, weekOffset, setDay, shiftWeek } = usePlanner()
  const [calendarAnchor, setCalendarAnchor] = useState<{ x: number; y: number } | null>(null)

  const currentDate = offsetToDate(weekOffset, dayIndex)
  const previousDate = offsetToDate(weekOffset, dayIndex - 1)
  const nextDate = offsetToDate(weekOffset, dayIndex + 1)
  const todayDate = offsetToDate(0, todayIndex)

  // Step across week boundaries so nav isn't clamped inside a single week.
  const step = (delta: number): void => {
    const targetDayIndex = dayIndex + delta
    if (targetDayIndex < 0) { shiftWeek(-1); setDay(6) }
    else if (targetDayIndex > 6) { shiftWeek(1); setDay(0) }
    else setDay(targetDayIndex)
  }
  const pickDate = (date: Date): void => {
    const offset = dateToOffset(date)
    if (offset.weekOffset !== weekOffset) shiftWeek(offset.weekOffset - weekOffset)
    setDay(offset.dayIndex)
    setCalendarAnchor(null)
  }

  const arrowButtonStyle: React.CSSProperties = { width: 30, height: 30, borderRadius: 9, background: COLORS.rowBg, border: `1px solid ${COLORS.border08}`, color: COLORS.textSecondary, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }
  const dateLabelStyle: React.CSSProperties = { color: COLORS.textFaint2, fontSize: 13.5, cursor: 'pointer' }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 22 }}>
      <div onClick={() => step(-1)} style={{ ...dateLabelStyle, minWidth: 58, textAlign: 'right' }}>{fmtDay(previousDate)}</div>
      <button onClick={() => step(-1)} style={arrowButtonStyle}>‹</button>
      <div
        onClick={(e) => setCalendarAnchor({ x: e.currentTarget.getBoundingClientRect().left, y: e.currentTarget.getBoundingClientRect().bottom })}
        title="Открыть календарь"
        style={{ textAlign: 'center', minWidth: 118, cursor: 'pointer' }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px' }}>{fmtDay(currentDate)}</div>
        <div style={{ fontSize: 12, color: COLORS.textFaint, marginTop: 1 }}>{DAY_FULL[dayIndex]}</div>
      </div>
      <button onClick={() => step(1)} style={arrowButtonStyle}>›</button>
      <div onClick={() => step(1)} style={{ ...dateLabelStyle, minWidth: 58, textAlign: 'left' }}>{fmtDay(nextDate)}</div>

      {calendarAnchor && (
        <Calendar selected={currentDate} today={todayDate} anchor={calendarAnchor} onPick={pickDate} onClose={() => setCalendarAnchor(null)} />
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

  const goalGroups = goals
    .map((goal) => {
      const goalTasks = todayTasks.filter((task) => task.goalId === goal.id).slice().sort(byTime)
      if (!goalTasks.length) return null
      const stats = goalStats(goal, tasks)
      return { goal, goalTasks, stats }
    })
    .filter((group): group is NonNullable<typeof group> => group !== null)

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

      {goalGroups.map(({ goal, goalTasks, stats }) => (
        <div key={goal.id} style={{ marginBottom: 26 }}>
          <div
            onClick={() => selectGoal(goal.id)}
            onContextMenu={menu.open([
              { label: 'Открыть цель', onClick: () => selectGoal(goal.id) },
              { label: 'Изменить цель', onClick: () => openEditGoal(goal.id) },
              { label: 'Удалить цель', danger: true, onClick: () => deleteGoal(goal.id) }
            ])}
            style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '0 0 12px 2px', cursor: 'pointer' }}
          >
            <GoalDot color={goal.dotColor} size={9} />
            <div style={{ fontSize: 14.5, fontWeight: 600 }}>{goal.title}</div>
            <div style={{ fontSize: 12, color: COLORS.textFaint2 }}>{stats.mDone}/{stats.mTotal} этапа</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {goalTasks.map((task) => <TaskRow key={task.id} task={task} goal={goal} />)}
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
        <span>{goalGroups.length ? 'Добавить задачу' : 'На этот день пока нет задач — добавить'}</span>
      </div>

      <div style={{ background: COLORS.accent06, border: `1px solid ${COLORS.accent18}`, borderRadius: 16, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600 }}>Застряли?</div>
        </div>
        <div style={{ fontSize: 12.5, color: COLORS.textMuted, marginBottom: 14 }}>Эти задачи давно не двигаются. Claude может разбить их на маленькие шаги.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {staleList.map((staleTask) => (
            <div key={staleTask.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: COLORS.rowBg, border: `1px solid ${COLORS.border}`, borderRadius: 12 }}>
              <GoalDot color={staleTask.dotColor} size={8} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14 }}>{staleTask.title}</div>
                <div style={{ fontSize: 11.5, color: COLORS.textFaint2, marginTop: 2 }}>{staleTask.goalTitle} · {staleTask.daysLabel}</div>
              </div>
              <button onClick={() => void breakDown(staleTask.title, staleTask.goalId)} style={{ flex: 'none', padding: '7px 13px', borderRadius: 9, background: COLORS.accent14, border: `1px solid ${COLORS.accent28}`, color: COLORS.accent, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Разбить на шаги</button>
            </div>
          ))}
        </div>
      </div>

      {menu.element}
    </div>
  )
}
