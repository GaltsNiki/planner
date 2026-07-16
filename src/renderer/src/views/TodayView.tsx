import React, { useState } from 'react'
import { usePlanner } from '../store'
import { TaskRow } from '../components/TaskRow'
import { GoalDot } from '../components/primitives'
import { Calendar, fmtDay } from '../components/Calendar'
import { dailyItems } from '@shared/dailyOrder'
import { staleRows, computeStale } from '@shared/staleness'
import { extractTime } from '@shared/taskMeta'
import { DAY_FULL, offsetToDate, dateToOffset, currentWeekIndex } from '@shared/dates'
import { AI_FEATURES_ENABLED } from '../features'
import { COLORS } from '../tokens'

/** Width of the left time-gutter that gives the agenda a scannable vertical spine. */
const TIME_GUTTER = 62

/**
 * Top toolbar for the day: a left-anchored day stepper (large targets, per Fitts's
 * law), the date label that opens the calendar, an optional "jump to today" chip,
 * and — pushed to the right edge — a compact day-progress meter. Grouping the
 * navigation and the day's summary into one toolbar establishes a clear top zone.
 */
function DayToolbar({
  done, total, pct
}: { done: number; total: number; pct: number }): React.JSX.Element {
  const { dayIndex, todayIndex, weekOffset, setDay, shiftWeek } = usePlanner()
  const [calendarAnchor, setCalendarAnchor] = useState<{ x: number; y: number } | null>(null)

  const currentDate = offsetToDate(weekOffset, dayIndex)
  const todayDate = offsetToDate(currentWeekIndex(), todayIndex)
  const isToday = weekOffset === currentWeekIndex() && dayIndex === todayIndex

  // Step across week boundaries so nav isn't clamped inside a single week.
  const step = (delta: number): void => {
    const targetDayIndex = dayIndex + delta
    if (targetDayIndex < 0) { shiftWeek(-1); setDay(6) }
    else if (targetDayIndex > 6) { shiftWeek(1); setDay(0) }
    else setDay(targetDayIndex)
  }
  const goToday = (): void => {
    if (weekOffset !== currentWeekIndex()) shiftWeek(currentWeekIndex() - weekOffset)
    setDay(todayIndex)
  }
  const pickDate = (date: Date): void => {
    const offset = dateToOffset(date)
    if (offset.weekOffset !== weekOffset) shiftWeek(offset.weekOffset - weekOffset)
    setDay(offset.dayIndex)
    setCalendarAnchor(null)
  }

  const arrowButtonStyle: React.CSSProperties = { width: 38, height: 38, borderRadius: 11, background: COLORS.rowBg, border: `1px solid ${COLORS.border08}`, color: COLORS.textSecondary, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      {/* Stepper — bigger arrows flanking the date, grouped tight (proximity). */}
      <button className="row-hover" onClick={() => step(-1)} title="Предыдущий день" style={arrowButtonStyle}>‹</button>
      <div
        onClick={(e) => setCalendarAnchor({ x: e.currentTarget.getBoundingClientRect().left, y: e.currentTarget.getBoundingClientRect().bottom })}
        className="row-hover"
        title="Открыть календарь"
        style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 132, height: 38, padding: '0 12px', borderRadius: 11, cursor: 'pointer' }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px', lineHeight: 1.1 }}>{fmtDay(currentDate)}</div>
        <div style={{ fontSize: 12, color: COLORS.textFaint, marginTop: 1 }}>{DAY_FULL[dayIndex]}</div>
      </div>
      <button className="row-hover" onClick={() => step(1)} title="Следующий день" style={arrowButtonStyle}>›</button>

      {/* Jump back to the real "today" — only shown when we've navigated away. */}
      {!isToday && (
        <button
          className="row-hover"
          onClick={goToday}
          style={{ height: 38, padding: '0 14px', borderRadius: 11, background: COLORS.accent13, border: `1px solid ${COLORS.accent30}`, color: COLORS.accent, fontSize: 13, fontWeight: 600, cursor: 'pointer', flex: 'none' }}
        >
          Сегодня
        </button>
      )}

      {/* Day progress, pinned to the right edge of the toolbar. */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, flex: 'none' }}>
        <div style={{ width: 128, height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 4, background: pct === 100 ? COLORS.success : COLORS.accentGrad, width: pct + '%', transition: 'width .3s' }} />
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.textSecondary, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          <span style={{ color: pct === 100 ? COLORS.success : COLORS.accent }}>{done}</span> / {total}
        </div>
      </div>

      {calendarAnchor && (
        <Calendar selected={currentDate} today={todayDate} anchor={calendarAnchor} onPick={pickDate} onClose={() => setCalendarAnchor(null)} />
      )}
    </div>
  )
}

/** Current wall-clock time as "HH:MM", used to place the "now" marker on today. */
function nowHHMM(now: Date = new Date()): string {
  return String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')
}

/**
 * Thin accent rule with a "сейчас" label, dropped into the agenda at the current
 * time so the most relevant part of the day — what's next — is easy to find.
 * Aligned to the same left gutter as the task times.
 */
function NowMarker(): React.JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '2px 0' }}>
      <div style={{ width: TIME_GUTTER, flex: 'none', textAlign: 'right', paddingRight: 12, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: COLORS.accent }}>сейчас</div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: COLORS.accent, flex: 'none' }} />
        <div style={{ flex: 1, height: 2, borderRadius: 2, background: COLORS.accent30 }} />
      </div>
    </div>
  )
}

/**
 * One agenda entry: a fixed-width time in the left gutter (or a small dot when the
 * task has no time) followed by the task row. Aligning every time in the same
 * column gives the day a vertical "spine" you can scan top-to-bottom (F-pattern),
 * and keeps the time visually attached to the task it belongs to.
 */
function AgendaEntry({
  time, dotColor, children
}: { time: string; dotColor: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 4 }}>
      <div style={{ width: TIME_GUTTER, flex: 'none', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingTop: 15, paddingRight: 12 }}>
        {time ? (
          <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.textSecondary, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.2px' }}>{time}</span>
        ) : (
          <span style={{ marginTop: 2 }}><GoalDot color={dotColor} size={6} /></span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )
}

export function TodayView(): React.JSX.Element {
  const { goals, tasks, dayIndex, weekOffset, todayIndex, selectGoal, openNew, breakDown } = usePlanner()

  const todayTasks = tasks.filter((t) => t.day === dayIndex && (t.week || 0) === weekOffset)
  const tDone = todayTasks.filter((t) => t.done).length
  const tTotal = todayTasks.length
  const todayPct = tTotal ? Math.round((tDone / tTotal) * 100) : 0

  // The whole day is one strict-time agenda: every task (goal or routine) sorted
  // by its time, each row labelled with its stage · goal. So a 07:00 task is first
  // and a 19:30 task sits in sequence regardless of which stage it belongs to.
  const dayItems = dailyItems(goals, todayTasks)

  const staleList = staleRows(computeStale(tasks), goals)

  // Place the "now" marker only on the real today, and only among tasks that have
  // a time — before the first task later than now (or after the last timed task).
  const isRealToday = weekOffset === currentWeekIndex() && dayIndex === todayIndex
  const now = nowHHMM()
  let nowIndex = -1
  if (isRealToday) {
    const timed = dayItems.map((it) => extractTime(it.task.desc || ''))
    const hasTimed = timed.some((t) => t)
    if (hasTimed) {
      const firstLater = dayItems.findIndex((it, i) => timed[i] && timed[i] > now)
      // Anchor after the last timed task when everything scheduled is already past.
      let lastTimed = -1
      timed.forEach((t, i) => { if (t) lastTimed = i })
      nowIndex = firstLater === -1 ? lastTimed + 1 : firstLater
    }
  }

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <DayToolbar done={tDone} total={tTotal} pct={todayPct} />

      {dayItems.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {dayItems.map(({ task, goal, caption, isRoutine }, i) => (
            <React.Fragment key={task.id}>
              {i === nowIndex && <NowMarker />}
              <AgendaEntry time={extractTime(task.desc || '')} dotColor={goal.dotColor}>
                <TaskRow
                  task={task}
                  goal={goal}
                  caption={caption}
                  onCaption={isRoutine ? undefined : () => selectGoal(goal.id)}
                  hideTime
                />
              </AgendaEntry>
            </React.Fragment>
          ))}
          {nowIndex === dayItems.length && <NowMarker />}
        </div>
      ) : (
        // Friendly empty state so the day isn't a blank void — a centred prompt
        // that doubles as the add action.
        <div
          onClick={() => openNew(null, dayIndex, weekOffset)}
          className="row-hover"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '52px 20px', border: `1px dashed ${COLORS.borderDash}`, borderRadius: 16, cursor: 'pointer', textAlign: 'center', marginBottom: 14 }}
        >
          <div style={{ width: 48, height: 48, borderRadius: 14, background: COLORS.accent12, border: `1px solid ${COLORS.accent18}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.accent }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" strokeLinecap="round" /></svg>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.textSecondary }}>На этот день пока нет задач</div>
          <div style={{ fontSize: 13, color: COLORS.textFaint }}>Нажмите, чтобы добавить первую</div>
        </div>
      )}

      {/* Add button — attached to the end of the list it appends to (action–result
          proximity). Aligned to the agenda column, not the time gutter. Hidden in
          the empty state, where the placeholder above already adds. */}
      {dayItems.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 26 }}>
          <div style={{ width: TIME_GUTTER, flex: 'none' }} />
          <div
            onClick={() => openNew(null, dayIndex, weekOffset)}
            className="row-hover"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '13px 15px', border: `1px dashed ${COLORS.borderDash}`, borderRadius: 13, cursor: 'pointer', color: COLORS.textFaint, fontSize: 14 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" strokeLinecap="round" /></svg>
            <span>Добавить задачу</span>
          </div>
        </div>
      )}

      {/* "Stuck?" — offers to break stale tasks into steps via Claude, so it is
          hidden while the AI features are off. */}
      {AI_FEATURES_ENABLED && staleList.length > 0 && (
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
    </div>
  )
}
