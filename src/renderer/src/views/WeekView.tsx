import React, { useState } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDraggable, useDroppable,
  closestCenter, type DragEndEvent, type DragStartEvent
} from '@dnd-kit/core'
import { usePlanner } from '../store'
import { GoalDot } from '../components/primitives'
import { WeekAnalytics } from '../components/WeekAnalytics'
import { WeekendIdeas } from '../components/WeekendIdeas'
import { Calendar } from '../components/Calendar'
import { useContextMenu, type MenuItem } from '../components/ContextMenu'
import { weekModel, weekBadge, DAY_SHORT, offsetToDate, dateToOffset, currentWeekIndex } from '@shared/dates'
import { weekAnalytics } from '@shared/progress'
import { ROUTINE_GOAL } from '@shared/routine'
import { WEEKEND_IDEAS_ENABLED } from '../features'
import { COLORS } from '../tokens'
import type { Task, Goal } from '@shared/types'

/** Max cards shown before a column becomes internally scrollable. */
const MAX_VISIBLE = 8
const CARD_H = 40 // approx card height incl. gap, for the scroll cap

interface CardBodyProps {
  task: Task
  goal: Goal
  dragging?: boolean
  /** Drag listeners/attributes applied to the right-corner handle only. */
  handleProps?: React.HTMLAttributes<HTMLElement>
  onToggle?: () => void
  onOpen?: () => void
}

/**
 * The mini-card. Three zones:
 *   left corner  → toggle done
 *   center       → open the task
 *   right corner → drag handle (grip)
 * Shared by the in-column card and the drag overlay.
 */
function CardBody({ task, goal, dragging, handleProps, onToggle, onOpen }: CardBodyProps): React.JSX.Element {
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 5px 7px 8px', background: dragging ? '#26262b' : 'rgba(255,255,255,0.03)', border: `1px solid ${dragging ? COLORS.accent30 : COLORS.border06}`, borderRadius: 9, fontSize: 12, boxShadow: dragging ? '0 8px 22px rgba(0,0,0,0.45)' : 'none' }}
    >
      {/* LEFT — toggle done */}
      <div
        onClick={(e) => { e.stopPropagation(); onToggle?.() }}
        title={task.done ? 'Отметить невыполненной' : 'Отметить выполненной'}
        style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 22, cursor: onToggle ? 'pointer' : 'default', marginTop: 1 }}
      >
        {task.done ? (
          <div style={{ width: 15, height: 15, borderRadius: '50%', background: COLORS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
          </div>
        ) : (
          <GoalDot color={goal.dotColor} size={7} />
        )}
      </div>

      {/* CENTER — open editor */}
      <span
        onClick={(e) => { e.stopPropagation(); onOpen?.() }}
        className={onOpen ? 'mini-open' : undefined}
        style={{ flex: 1, minWidth: 0, lineHeight: 1.32, cursor: onOpen ? 'pointer' : 'default', color: task.done ? COLORS.textDisabled : COLORS.taskTitle, textDecoration: task.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
      >
        {task.title}
      </span>

      {/* RIGHT — drag handle */}
      <div
        {...handleProps}
        title="Перетащите, чтобы перенести"
        style={{ flex: 'none', alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, borderRadius: 6, color: COLORS.textFaint2, cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" /></svg>
      </div>
    </div>
  )
}

function MiniCard({ task, goal, onMenu }: { task: Task; goal: Goal; onMenu: (e: React.MouseEvent) => void }): React.JSX.Element {
  const { openEditor, toggleTask } = usePlanner()
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id: task.id })
  // Also a drop target so tasks can be reordered within a day (drop = insert before).
  const { setNodeRef: setDropRef, isOver, active } = useDroppable({ id: 'task-' + task.id })
  const showIndicator = isOver && active?.id !== task.id

  const setRefs = (node: HTMLElement | null): void => { setDragRef(node); setDropRef(node) }

  return (
    <div
      ref={setRefs}
      onContextMenu={onMenu}
      className="row-hover"
      style={{
        borderRadius: 9,
        opacity: isDragging ? 0.35 : 1,
        // Insertion line above the card that the drag is hovering over.
        boxShadow: showIndicator ? `inset 0 2px 0 ${COLORS.accent}` : 'none'
      }}
    >
      <CardBody
        task={task}
        goal={goal}
        handleProps={{ ...attributes, ...listeners }}
        onToggle={() => toggleTask(task.id)}
        onOpen={() => openEditor(task.id)}
      />
    </div>
  )
}

function DayColumn({ dayIndex, tasks, onMenu }: { dayIndex: number; tasks: Task[]; onMenu: (t: Task) => (e: React.MouseEvent) => void }): React.JSX.Element {
  const { goals, weekOffset, todayIndex, openNew, openDayInToday } = usePlanner()
  const { setNodeRef, isOver } = useDroppable({ id: 'day-' + dayIndex })

  const wm = weekModel(weekOffset)
  const isToday = weekOffset === currentWeekIndex() && dayIndex === todayIndex
  const isWeekend = dayIndex >= 5
  const goalOf = (t: Task): Goal => goals.find((g) => g.id === t.goalId) || ROUTINE_GOAL

  // Per-day completion, shown as a hairline meter under the header for at-a-glance scanning.
  const doneCount = tasks.filter((t) => t.done).length
  const dayPct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0

  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'flex', flexDirection: 'column', gap: 8, borderRadius: 14, padding: '12px 10px', minHeight: 440, transition: 'background .12s,border-color .12s',
        background: isOver ? COLORS.accent12 : isToday ? COLORS.accent06 : isWeekend ? 'rgba(255,255,255,0.012)' : 'rgba(255,255,255,0.025)',
        border: isOver ? '1px dashed rgba(232,86,63,0.6)' : isToday ? `1px solid ${COLORS.accent18}` : `1px solid ${COLORS.border}`,
        boxShadow: isToday ? `0 6px 26px rgba(232,86,63,0.06)` : 'none'
      }}
    >
      <div onClick={() => openDayInToday(dayIndex)} title="Открыть день" style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 8, marginBottom: 4, borderBottom: `1px solid ${isToday ? COLORS.accent18 : COLORS.border06}`, cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.2px', color: isToday ? COLORS.accent : isWeekend ? COLORS.textFaint : COLORS.textMuted }}>{DAY_SHORT[dayIndex]}</div>
            {isToday
              ? <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.4px', color: COLORS.accent, textTransform: 'uppercase' }}>сегодня</div>
              : isWeekend && <div style={{ width: 4, height: 4, borderRadius: '50%', background: COLORS.textGhost }} title="Выходной" />}
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 24, height: 24, padding: '0 6px', borderRadius: 7, fontSize: 13, fontWeight: 700, background: isToday ? COLORS.accent : 'transparent', color: isToday ? '#fff' : COLORS.textPrimary }}>{wm.days[dayIndex].num}</div>
        </div>

        {/* Hairline day meter + count — only when the day has tasks. */}
        {tasks.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 2, width: dayPct + '%', background: dayPct === 100 ? COLORS.success : COLORS.accent, transition: 'width .3s' }} />
            </div>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: COLORS.textFaint2, fontVariantNumeric: 'tabular-nums' }}>{doneCount}/{tasks.length}</div>
          </div>
        )}
      </div>

      {/* Cap the list at ~8 rows; overflow scrolls within the column. flex:1 lets
          the list take the slack so the add-task button anchors to the column's
          lower edge (a consistent, Fitts-friendly target across all seven days). */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: tasks.length > MAX_VISIBLE ? MAX_VISIBLE * CARD_H : 'none', overflowY: tasks.length > MAX_VISIBLE ? 'auto' : 'visible', margin: tasks.length > MAX_VISIBLE ? '0 -4px' : 0, padding: tasks.length > MAX_VISIBLE ? '0 4px' : 0 }}>
        {tasks.map((t) => <MiniCard key={t.id} task={t} goal={goalOf(t)} onMenu={onMenu(t)} />)}
      </div>

      <div onClick={() => openNew(null, dayIndex, weekOffset)} className="row-hover" style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', border: `1px dashed ${COLORS.borderDash}`, borderRadius: 9, cursor: 'pointer', color: COLORS.textFaint, fontSize: 11.5 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" strokeLinecap="round" /></svg>
        <span>Добавить задачу</span>
      </div>
    </div>
  )
}

/**
 * Week-navigation control. The two arrows and the range label are bound into one
 * common region (shared surface) so they read as a single unit (Gestalt). The
 * arrows are large, edge-hugging hit targets (Fitts); the centre opens the
 * calendar. `onOpenCalendar` receives the anchor point below the label.
 */
function WeekNav({
  weekOffset, onPrev, onNext, onOpenCalendar
}: {
  weekOffset: number
  onPrev: () => void
  onNext: () => void
  onOpenCalendar: (anchor: { x: number; y: number }) => void
}): React.JSX.Element {
  const arrow: React.CSSProperties = {
    width: 40, height: 40, flex: 'none', borderRadius: 9, background: 'transparent', border: 'none',
    color: COLORS.textSecondary, fontSize: 19, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
  }
  return (
    <div style={{ display: 'inline-flex', alignItems: 'stretch', height: 48, borderRadius: 12, background: COLORS.rowBg, border: `1px solid ${COLORS.border08}`, overflow: 'hidden' }}>
      <button className="row-hover" onClick={onPrev} title="Предыдущая неделя" style={arrow}>‹</button>
      <div
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          onOpenCalendar({ x: r.left, y: r.bottom + 6 })
        }}
        title="Открыть календарь"
        style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 158, padding: '0 8px', textAlign: 'center', cursor: 'pointer', borderLeft: `1px solid ${COLORS.border06}`, borderRight: `1px solid ${COLORS.border06}` }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>{weekModel(weekOffset).range}</div>
        <div style={{ fontSize: 11.5, color: COLORS.textFaint, marginTop: 1 }}>{weekBadge(weekOffset)}</div>
      </div>
      <button className="row-hover" onClick={onNext} title="Следующая неделя" style={arrow}>›</button>
    </div>
  )
}

/**
 * Week-completion summary — the key overview metric, pulled up to the toolbar's
 * right corner so it reads above the fold, before the analytics panel. A single
 * grouped chip: count + inline meter.
 */
function WeekSummaryChip({ done, total, pct }: { done: number; total: number; pct: number }): React.JSX.Element {
  const empty = total === 0
  const complete = !empty && done === total
  return (
    <div style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 14, height: 48, padding: '0 18px', borderRadius: 12, background: COLORS.cardBg, border: `1px solid ${COLORS.border06}` }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: COLORS.textMuted }}>Выполнено</div>
      {empty ? (
        <div style={{ fontSize: 13, color: COLORS.textFaint }}>нет задач</div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span style={{ fontSize: 20, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em', color: COLORS.textPrimary, fontVariantNumeric: 'tabular-nums' }}>{done}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.textMuted, fontVariantNumeric: 'tabular-nums' }}>/ {total}</span>
          </div>
          <div style={{ width: 96, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 3, width: pct + '%', background: complete ? COLORS.success : COLORS.accentGrad, transition: 'width .3s' }} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: complete ? COLORS.successFg : COLORS.textSecondary, fontVariantNumeric: 'tabular-nums', minWidth: 34, textAlign: 'right' }}>{pct}%</div>
        </>
      )}
    </div>
  )
}

export function WeekView(): React.JSX.Element {
  const { goals, tasks, weekOffset, todayIndex, shiftWeek, thisWeek, moveTask, reorderTask, deleteTask } = usePlanner()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const [dragId, setDragId] = useState<string | null>(null)
  const [cal, setCal] = useState<{ x: number; y: number } | null>(null)
  const menu = useContextMenu()

  const cardMenu = (t: Task): ((e: React.MouseEvent) => void) => {
    const items: MenuItem[] = [
      { label: 'Изменить', onClick: () => usePlanner.getState().openEditor(t.id) },
      { label: 'Удалить задачу', danger: true, onClick: () => deleteTask(t.id) }
    ]
    return menu.open(items)
  }

  const onDragStart = (e: DragStartEvent): void => setDragId(String(e.active.id))
  const onDragEnd = (e: DragEndEvent): void => {
    setDragId(null)
    const active = String(e.active.id)
    const over = e.over?.id
    if (typeof over !== 'string') return
    // Dropped on a card → reorder within (or across) days; on empty column → move to that day.
    if (over.startsWith('task-')) {
      reorderTask(active, over.slice(5))
    } else if (over.startsWith('day-')) {
      moveTask(active, Number(over.slice(4)))
    }
  }

  const dragTask = dragId ? tasks.find((t) => t.id === dragId) : null
  const dragGoal = dragTask ? goals.find((g) => g.id === dragTask.goalId) || goals[0] : null

  const rangeDate = offsetToDate(weekOffset, 0)
  const today = offsetToDate(currentWeekIndex(), todayIndex)
  const pickWeek = (d: Date): void => {
    const o = dateToOffset(d)
    shiftWeek(o.weekOffset - weekOffset)
    setCal(null)
  }

  // The week's completion, surfaced in the top-right summary chip so the key
  // metric reads above the fold (before the analytics panel below).
  const wa = weekAnalytics(goals, tasks, weekOffset)
  const isCurrentWeek = weekOffset === currentWeekIndex()

  return (
    <div>
      {/* ── Toolbar (top zone) ────────────────────────────────────────────────
          Left: week-navigation bound into one common region (‹ range ›) plus a
          "Сегодня" jump. Right corner (a Fitts-friendly Z-pattern endpoint):
          the live week-completion summary. ─────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <WeekNav weekOffset={weekOffset} onPrev={() => shiftWeek(-1)} onNext={() => shiftWeek(1)} onOpenCalendar={setCal} />

        {!isCurrentWeek && (
          <button
            className="row-hover"
            onClick={() => thisWeek()}
            title="Вернуться к текущей неделе"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 40, padding: '0 14px', borderRadius: 10, background: COLORS.rowBg, border: `1px solid ${COLORS.border08}`, color: COLORS.textSecondary, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v4l2.5 1.5" /></svg>
            Сегодня
          </button>
        )}

        <WeekSummaryChip done={wa.done} total={wa.total} pct={wa.pct} />
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 12 }}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <DayColumn key={i} dayIndex={i} tasks={tasks.filter((t) => t.day === i && (t.week || 0) === weekOffset)} onMenu={cardMenu} />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {dragTask && dragGoal ? (
            <div style={{ width: 150 }}><CardBody task={dragTask} goal={dragGoal} dragging /></div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Drag hint sits just under the board it describes (action-result proximity),
          in a quiet ink so it never competes with the toolbar controls. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, color: COLORS.textFaint2, fontSize: 12 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 9l4 4 2-2 4 4 5-6" /></svg>
        Перетащите задачу между днями или измените порядок внутри дня
      </div>

      {/* Weekly analytics (compact, left) beside the weekend leisure ideas (right).
          minmax(0,…) lets both columns shrink so their inner content wraps/ellipsizes.
          With the weekend ideas off, they are hidden and analytics span the full
          width. */}
      {WEEKEND_IDEAS_ENABLED ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)', gap: 16, marginTop: 20, alignItems: 'start' }}>
          <WeekAnalytics />
          <WeekendIdeas />
        </div>
      ) : (
        <div style={{ marginTop: 20 }}>
          <WeekAnalytics />
        </div>
      )}

      {cal && (
        <Calendar selected={rangeDate} today={today} weekMode anchor={cal} onPick={pickWeek} onClose={() => setCal(null)} />
      )}
      {menu.element}
    </div>
  )
}
