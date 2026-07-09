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
import { weekModel, weekBadge, DAY_SHORT, offsetToDate, dateToOffset } from '@shared/dates'
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
  const isToday = weekOffset === 0 && dayIndex === todayIndex
  const isWeekend = dayIndex >= 5
  const goalOf = (t: Task): Goal => goals.find((g) => g.id === t.goalId) || goals[0]

  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'flex', flexDirection: 'column', gap: 8, borderRadius: 14, padding: '12px 10px', minHeight: 440, transition: 'background .12s,border-color .12s',
        background: isOver ? COLORS.accent12 : isToday ? COLORS.accent06 : isWeekend ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.02)',
        border: isOver ? '1px dashed rgba(232,86,63,0.6)' : isToday ? `1px solid ${COLORS.accent18}` : `1px solid ${COLORS.border}`,
        boxShadow: isToday ? `0 6px 26px rgba(232,86,63,0.06)` : 'none'
      }}
    >
      <div onClick={() => openDayInToday(dayIndex)} title="Открыть день" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: isToday ? COLORS.accent : isWeekend ? COLORS.textFaint : COLORS.textMuted }}>{DAY_SHORT[dayIndex]}</div>
          {isToday && <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.4px', color: COLORS.accent, textTransform: 'uppercase' }}>сегодня</div>}
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 24, height: 24, padding: '0 6px', borderRadius: 7, fontSize: 13, fontWeight: 700, background: isToday ? COLORS.accent : 'transparent', color: isToday ? '#fff' : COLORS.textPrimary }}>{wm.days[dayIndex].num}</div>
      </div>

      {/* Cap the list at ~8 rows; overflow scrolls within the column. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: tasks.length > MAX_VISIBLE ? MAX_VISIBLE * CARD_H : 'none', overflowY: tasks.length > MAX_VISIBLE ? 'auto' : 'visible', margin: tasks.length > MAX_VISIBLE ? '0 -4px' : 0, padding: tasks.length > MAX_VISIBLE ? '0 4px' : 0 }}>
        {tasks.map((t) => <MiniCard key={t.id} task={t} goal={goalOf(t)} onMenu={onMenu(t)} />)}
      </div>

      <div onClick={() => openNew(null, dayIndex, weekOffset)} className="row-hover" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px', border: `1px dashed ${COLORS.borderDash}`, borderRadius: 9, cursor: 'pointer', color: COLORS.textFaint, fontSize: 11.5 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" strokeLinecap="round" /></svg>
        <span>Добавить задачу</span>
      </div>
    </div>
  )
}

export function WeekView(): React.JSX.Element {
  const { goals, tasks, weekOffset, todayIndex, shiftWeek, moveTask, reorderTask, deleteTask, selectGoal, deleteGoal } = usePlanner()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const [dragId, setDragId] = useState<string | null>(null)
  const [cal, setCal] = useState<{ x: number; y: number } | null>(null)
  const menu = useContextMenu()

  const cardMenu = (t: Task): ((e: React.MouseEvent) => void) => {
    const items: MenuItem[] = [
      { label: 'Изменить', onClick: () => usePlanner.getState().openEditor(t.id) },
      { label: 'Удалить задачу', danger: true, onClick: () => deleteTask(t.id) }
    ]
    const g = goals.find((x) => x.id === t.goalId)
    if (g) {
      items.push({ label: 'Открыть цель', onClick: () => selectGoal(g.id) })
      items.push({ label: 'Изменить цель', onClick: () => usePlanner.getState().openEditGoal(g.id) })
      items.push({ label: `Удалить цель «${g.title}»`, danger: true, onClick: () => deleteGoal(g.id) })
    }
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
  const today = offsetToDate(0, todayIndex)
  const pickWeek = (d: Date): void => {
    const o = dateToOffset(d)
    shiftWeek(o.weekOffset - weekOffset)
    setCal(null)
  }

  const btn: React.CSSProperties = { width: 32, height: 32, borderRadius: 9, background: COLORS.rowBg, border: `1px solid ${COLORS.border08}`, color: COLORS.textSecondary, fontSize: 17, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <button className="row-hover" onClick={() => shiftWeek(-1)} style={btn}>‹</button>
        <div
          onClick={(e) => setCal({ x: e.currentTarget.getBoundingClientRect().left, y: e.currentTarget.getBoundingClientRect().bottom })}
          title="Открыть календарь"
          style={{ minWidth: 150, textAlign: 'center', cursor: 'pointer' }}
        >
          <div style={{ fontSize: 15, fontWeight: 700 }}>{weekModel(weekOffset).range}</div>
          <div style={{ fontSize: 11.5, color: COLORS.textFaint, marginTop: 1 }}>{weekBadge(weekOffset)}</div>
        </div>
        <button className="row-hover" onClick={() => shiftWeek(1)} style={btn}>›</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', color: COLORS.textFaint2, fontSize: 12 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 9l4 4 2-2 4 4 5-6" /></svg>
          Перетащите задачу между днями или измените порядок внутри дня
        </div>
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

      <WeekAnalytics />
      <WeekendIdeas />

      {cal && (
        <Calendar selected={rangeDate} today={today} weekMode anchor={cal} onPick={pickWeek} onClose={() => setCal(null)} />
      )}
      {menu.element}
    </div>
  )
}
