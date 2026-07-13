import React, { useState } from 'react'
import { usePlanner } from '../store'
import { TaskRow } from '../components/TaskRow'
import { GoalDot } from '../components/primitives'
import { Calendar, fmtDay } from '../components/Calendar'
import { useContextMenu } from '../components/ContextMenu'
import { byTime } from '@shared/taskMeta'
import { ROUTINE_GOAL } from '@shared/routine'
import { staleRows, computeStale } from '@shared/staleness'
import { DAY_FULL, offsetToDate, dateToOffset, currentWeekIndex } from '@shared/dates'
import { COLORS } from '../tokens'

function DateNavigator(): React.JSX.Element {
  const { dayIndex, todayIndex, weekOffset, setDay, shiftWeek } = usePlanner()
  const [calendarAnchor, setCalendarAnchor] = useState<{ x: number; y: number } | null>(null)

  const currentDate = offsetToDate(weekOffset, dayIndex)
  const previousDate = offsetToDate(weekOffset, dayIndex - 1)
  const nextDate = offsetToDate(weekOffset, dayIndex + 1)
  const todayDate = offsetToDate(currentWeekIndex(), todayIndex)

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
  const { goals, tasks, dayIndex, weekOffset, selectGoal, deleteGoal, openEditGoal, openNew, breakDown } = usePlanner()
  const menu = useContextMenu()

  const todayTasks = tasks.filter((t) => t.day === dayIndex && (t.week || 0) === weekOffset)
  const tDone = todayTasks.filter((t) => t.done).length
  const tTotal = todayTasks.length
  const todayPct = tTotal ? Math.round((tDone / tTotal) * 100) : 0

  // Group today's tasks by their stage (milestone), so the header over the
  // tasks is the stage — not the goal (the goal name shows as a subtitle).
  const stageGroups = goals.flatMap((goal) => {
    const gTasks = todayTasks.filter((t) => t.goalId === goal.id)
    if (!gTasks.length) return []
    const mIds = new Set(goal.milestones.map((m) => m.id))
    const byStage = goal.milestones
      .map((m) => ({
        goal, key: `${goal.id}:${m.id}`, stageTitle: m.title as string | null,
        tasks: gTasks.filter((t) => t.mId === m.id).slice().sort(byTime)
      }))
      .filter((g) => g.tasks.length)
    // Tasks whose stage no longer exists fall back to a goal-titled group.
    const loose = gTasks.filter((t) => !mIds.has(t.mId)).slice().sort(byTime)
    if (loose.length) byStage.push({ goal, key: `${goal.id}:none`, stageTitle: null, tasks: loose })
    return byStage
  })

  // Routine tasks: not attached to any existing goal.
  const routineTasks = todayTasks
    .filter((t) => !goals.some((g) => g.id === t.goalId))
    .slice()
    .sort(byTime)

  const staleList = staleRows(computeStale(tasks), goals)

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

      {stageGroups.map(({ goal, key, stageTitle, tasks: groupTasks }) => (
        <div key={key} style={{ marginBottom: 26 }}>
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
            <div style={{ fontSize: 14.5, fontWeight: 600 }}>{stageTitle ?? goal.title}</div>
            {stageTitle && <div style={{ fontSize: 12, color: COLORS.textFaint2 }}>· {goal.title}</div>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {groupTasks.map((task) => <TaskRow key={task.id} task={task} goal={goal} />)}
          </div>
        </div>
      ))}

      {/* Routine — tasks without a goal (cleaning, shopping, errands…). */}
      {routineTasks.length > 0 && (
        <div style={{ marginBottom: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '0 0 12px 2px' }}>
            <GoalDot color={ROUTINE_GOAL.dotColor} size={9} />
            <div style={{ fontSize: 14.5, fontWeight: 600 }}>{ROUTINE_GOAL.title}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {routineTasks.map((task) => <TaskRow key={task.id} task={task} goal={ROUTINE_GOAL} />)}
          </div>
        </div>
      )}

      {/* Always-available add button — the fix for "no tasks left, nowhere to add". */}
      <div
        onClick={() => openNew(null, dayIndex, weekOffset)}
        className="row-hover"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '13px 15px', border: `1px dashed ${COLORS.borderDash}`, borderRadius: 13, cursor: 'pointer', color: COLORS.textFaint, fontSize: 14, marginBottom: 26 }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" strokeLinecap="round" /></svg>
        <span>{stageGroups.length || routineTasks.length ? 'Добавить задачу' : 'На этот день пока нет задач — добавить'}</span>
      </div>

      {staleList.length > 0 && (
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
      )}

      {menu.element}
    </div>
  )
}
