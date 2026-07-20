import React, { useState } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDraggable, useDroppable,
  closestCenter, type DragEndEvent, type DragStartEvent
} from '@dnd-kit/core'
import { usePlanner } from '../store'
import { ClaudeMark } from '../components/primitives'
import { useContextMenu, type MenuItem } from '../components/ContextMenu'
import { goalStats } from '@shared/progress'
import { stepSegments } from '@shared/closeness'
import { byDate } from '@shared/taskMeta'
import { AI_FEATURES_ENABLED } from '../features'
import { COLORS } from '../tokens'
import type { Goal, Milestone, MilestoneStatus, Task } from '@shared/types'

/** Click order for cycling a stage's status. */
const NEXT_STATUS: Record<MilestoneStatus, MilestoneStatus> = { todo: 'active', active: 'done', done: 'todo' }

/** Status → label + pill colours (done is the only green — matches the design). */
function chipFor(status: MilestoneStatus): { label: string; bg: string; color: string } {
  if (status === 'done') return { label: 'Завершён', bg: COLORS.successBg, color: COLORS.successFg }
  if (status === 'active') return { label: 'В работе', bg: 'rgba(255,255,255,0.1)', color: COLORS.textPrimary }
  return { label: 'Запланирован', bg: COLORS.border06, color: COLORS.textMuted }
}

export function GoalDetail(): React.JSX.Element {
  const { goals, tasks, activeGoalId, openEditGoal, openNewGoal, addStage, openNew, toggleTask, reorderStage } = usePlanner()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const [dragStageId, setDragStageId] = useState<string | null>(null)
  const ag = goals.find((g) => g.id === activeGoalId) || goals[0]

  if (!ag) {
    return (
      <div style={{ maxWidth: 820, margin: '60px auto 0', textAlign: 'center', color: COLORS.textMuted }}>
        <div style={{ fontSize: 15, marginBottom: 14 }}>Целей пока нет.</div>
        <button onClick={() => openNewGoal()} style={{ padding: '10px 18px', borderRadius: 10, background: COLORS.accent, border: 'none', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>Создать цель</button>
      </div>
    )
  }

  const st = goalStats(ag, tasks)
  // Colour the stage bar and the progress ring in the goal's (sphere's) colour,
  // so an opened goal keeps the same colour identity it has in the Обзор view.
  const segments = stepSegments(ag, ag.dotColor)
  const deg = st.pct * 3.6

  const onStageDragStart = (e: DragStartEvent): void => setDragStageId(String(e.active.id))
  const onStageDragEnd = (e: DragEndEvent): void => {
    setDragStageId(null)
    const over = e.over?.id
    // Drop target ids are prefixed so they can't collide with a stage's own draggable id.
    if (typeof over !== 'string' || !over.startsWith('stage-')) return
    reorderStage(ag.id, String(e.active.id), over.slice(6))
  }

  const dragStage = dragStageId ? ag.milestones.find((m) => m.id === dragStageId) : null
  const dragStageIndex = dragStage ? ag.milestones.findIndex((m) => m.id === dragStage.id) : -1

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border06}`, borderRadius: 18, padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, marginBottom: 22 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'inline-block', fontSize: 11.5, fontWeight: 600, color: COLORS.textMuted, background: COLORS.border06, padding: '3px 10px', borderRadius: 20, marginBottom: 12 }}>{ag.category}</div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px' }}>{ag.title}</div>
            <div style={{ fontSize: 13.5, color: COLORS.textMuted, marginTop: 5 }}>{ag.closenessLabel} · {st.mDone} из {st.mTotal} этапов{ag.deadline ? ` · до ${ag.deadline}` : ''}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 'none' }}>
            <button
              onClick={() => openEditGoal(ag.id)}
              title="Редактировать цель"
              className="row-hover"
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 13px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.border08}`, color: COLORS.textSecondary, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
              Изменить
            </button>
            <div style={{ width: 72, height: 72, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `conic-gradient(${ag.dotColor} ${deg}deg, rgba(255,255,255,0.08) ${deg}deg)` }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: COLORS.cardBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>{st.pct}%</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 9 }}>
          {segments.map((s, i) => <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: s.color }} />)}
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {segments.map((s, i) => <div key={i} style={{ flex: 1, fontSize: 11, lineHeight: 1.3, color: s.muted ? COLORS.textDisabled : COLORS.textSecondary }}>{s.title}</div>)}
        </div>

        {AI_FEATURES_ENABLED && (
          <div style={{ display: 'flex', gap: 11, background: 'rgba(255,255,255,0.03)', border: `1px solid ${COLORS.border06}`, borderRadius: 12, padding: '14px 15px' }}>
            <ClaudeMark size={26} radius={8} />
            <div style={{ fontSize: 13.5, lineHeight: 1.55, color: '#c9c9cd' }}>{ag.claudeTake}</div>
          </div>
        )}

        {(ag.measurable || ag.achievable || ag.relevant || ag.deadline) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
            {([
              ['M', 'Измеримость', ag.measurable],
              ['A', 'Достижимость', ag.achievable],
              ['R', 'Значимость', ag.relevant],
              ['T', 'Срок', ag.deadline]
            ] as const)
              .filter(([, , v]) => v)
              .map(([letter, title, v]) => (
                <div key={letter} style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${COLORS.border06}`, borderRadius: 11, padding: '11px 13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 17, height: 17, borderRadius: 5, background: COLORS.accent14, color: COLORS.accent, fontSize: 10.5, fontWeight: 800 }}>{letter}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: COLORS.textMuted }}>{title}</span>
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.45 }}>{v}</div>
                </div>
              ))}
          </div>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onStageDragStart} onDragEnd={onStageDragEnd}>
        {ag.milestones.map((m, i) => (
          <StageSection key={m.id} goal={ag} milestone={m} index={i} tasks={tasks} dragIndex={dragStageIndex} />
        ))}
        <DragOverlay dropAnimation={null}>
          {dragStage ? (
            <StageHeaderBody goal={ag} milestone={dragStage} index={dragStageIndex} tasks={tasks} dragging />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Add-stage button — always available on the goal page. */}
      <button
        onClick={() => addStage(ag.id)}
        className="row-hover"
        style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', justifyContent: 'center', padding: '12px 15px', marginBottom: 22, border: `1px dashed ${COLORS.borderDash}`, borderRadius: 13, background: 'transparent', color: COLORS.textFaint, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 6v12M6 12h12" /></svg>
        Добавить этап
      </button>

      {/* Tasks whose milestone doesn't exist (e.g. goals with no milestones). */}
      {(() => {
        const mIds = new Set(ag.milestones.map((m) => m.id))
        const loose = tasks.filter((t) => t.goalId === ag.id && !mIds.has(t.mId)).sort(byDate)
        const done = loose.filter((t) => t.done).length
        // Only worth showing when there are loose tasks, or when the goal has no stages at all.
        if (!loose.length && ag.milestones.length) return null
        return (
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
              <div style={{ fontSize: 15.5, fontWeight: 600 }}>{ag.milestones.length ? 'Прочие задачи' : 'Задачи'}</div>
              <div style={{ marginLeft: 'auto', fontSize: 12.5, color: COLORS.textFaint2, fontVariantNumeric: 'tabular-nums' }}>{loose.length ? `${done}/${loose.length}` : '—'}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {loose.map((t) => <TaskLine key={t.id} task={t} onToggle={toggleTask} goalId={ag.id} mId={t.mId} />)}
              <AddTaskRow onClick={() => openNew(ag.id, null, null)} />
            </div>
          </div>
        )
      })()}
    </div>
  )
}

interface StageHeaderBodyProps {
  goal: Goal
  milestone: Milestone
  index: number
  tasks: Task[]
  /** Rendered inside the drag overlay: static, no inputs to interact with. */
  dragging?: boolean
  /** Drag listeners/attributes — applied to the grip handle only. */
  handleProps?: React.HTMLAttributes<HTMLElement>
  /** Reveal the grip/delete controls (on hover, or while dragging). */
  showControls?: boolean
}

/**
 * A stage's header row: grip, editable title, status pill, count, delete.
 * Shared by the in-page stage and the drag overlay, so a dragged stage looks
 * exactly like the row it was lifted from.
 */
function StageHeaderBody({ goal, milestone: m, index, tasks, dragging, handleProps, showControls }: StageHeaderBodyProps): React.JSX.Element {
  const { updateStage, removeStage } = usePlanner()
  const mts = tasks.filter((t) => t.goalId === goal.id && t.mId === m.id)
  const md = mts.filter((t) => t.done).length
  const chip = chipFor(m.status)

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, borderRadius: 10,
        // The overlay gets a lifted card look; the in-page row stays flat.
        background: dragging ? '#26262b' : 'transparent',
        border: `1px solid ${dragging ? COLORS.accent30 : 'transparent'}`,
        padding: dragging ? '6px 10px' : 0,
        boxShadow: dragging ? '0 8px 22px rgba(0,0,0,0.45)' : 'none'
      }}
    >
      {/* Grip — drag to reorder the stage. */}
      <div
        {...handleProps}
        title="Перетащите, чтобы переставить этап"
        style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 24, color: COLORS.textFaint2, cursor: dragging ? 'grabbing' : 'grab', opacity: showControls ? 1 : 0.28, transition: 'opacity .12s', touchAction: 'none' }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" /></svg>
      </div>
      {dragging ? (
        <div style={{ flex: 1, minWidth: 0, color: COLORS.textPrimary, fontSize: 15.5, fontWeight: 600, padding: '2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {m.title || `Этап ${index + 1}`}
        </div>
      ) : (
        <input
          value={m.title}
          onChange={(e) => updateStage(goal.id, m.id, { title: e.target.value })}
          placeholder={`Этап ${index + 1}`}
          style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', color: COLORS.textPrimary, fontSize: 15.5, fontWeight: 600, outline: 'none', padding: '2px 0' }}
        />
      )}
      {/* Status pill — click to cycle Запланирован → В работе → Завершён. */}
      <button
        onClick={() => updateStage(goal.id, m.id, { status: NEXT_STATUS[m.status] })}
        title="Сменить статус"
        disabled={dragging}
        style={{ flex: 'none', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: chip.bg, color: chip.color, border: 'none', cursor: dragging ? 'grabbing' : 'pointer' }}
      >
        {chip.label}
      </button>
      <div style={{ fontSize: 12.5, color: COLORS.textFaint2, fontVariantNumeric: 'tabular-nums', minWidth: 30, textAlign: 'right' }}>{mts.length ? `${md}/${mts.length}` : '—'}</div>
      <button
        onClick={() => removeStage(goal.id, m.id)}
        title="Удалить этап"
        disabled={dragging}
        style={{ flex: 'none', width: 28, height: 28, borderRadius: 8, background: 'transparent', border: 'none', color: COLORS.textFaint, cursor: dragging ? 'grabbing' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: showControls ? 1 : 0.28, transition: 'opacity .12s' }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /></svg>
      </button>
    </div>
  )
}

interface StageSectionProps {
  goal: Goal
  milestone: Milestone
  index: number
  tasks: Task[]
  /** Index of the stage being dragged, or -1 when no drag is in progress. */
  dragIndex: number
}

/** One stage on the goal page: drag-to-reorder header, tasks + add-task. */
function StageSection({ goal, milestone: m, index, tasks, dragIndex }: StageSectionProps): React.JSX.Element {
  const { toggleTask, openNew } = usePlanner()
  const [hover, setHover] = useState(false)
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id: m.id })
  // Also a drop target: a dragged stage takes the slot of the stage it's dropped on.
  const { setNodeRef: setDropRef, isOver, active } = useDroppable({ id: 'stage-' + m.id })
  const showIndicator = isOver && active?.id !== m.id
  // Dragging downward the stage lands below this one, upward it lands above —
  // so the insertion line has to switch edges to show where it will actually go.
  const draggingDown = dragIndex >= 0 && dragIndex < index

  const setRefs = (node: HTMLElement | null): void => { setDragRef(node); setDropRef(node) }

  const mts = tasks.filter((t) => t.goalId === goal.id && t.mId === m.id).sort(byDate)

  return (
    <div
      ref={setRefs}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        marginBottom: 22,
        opacity: isDragging ? 0.35 : 1,
        boxShadow: showIndicator
          ? `inset 0 ${draggingDown ? -2 : 2}px 0 ${COLORS.accent}`
          : 'none'
      }}
    >
      <StageHeaderBody
        goal={goal}
        milestone={m}
        index={index}
        tasks={tasks}
        handleProps={{ ...attributes, ...listeners }}
        showControls={hover}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {mts.map((t) => <TaskLine key={t.id} task={t} onToggle={toggleTask} goalId={goal.id} mId={m.id} />)}
        <AddTaskRow onClick={() => openNew(goal.id, null, null, m.id)} pasteTo={{ goalId: goal.id, mId: m.id }} />
      </div>
    </div>
  )
}

/**
 * Dashed "add task" row used under each stage. Right-clicking it pastes a copied
 * task — the way to paste into a stage that has no tasks to right-click yet.
 * `pasteTo` is omitted where a paste has no stage to land in.
 */
function AddTaskRow({ onClick, pasteTo }: { onClick: () => void; pasteTo?: { goalId: string; mId: string } }): React.JSX.Element {
  const { pasteTask, clipboardTask } = usePlanner()
  const menu = useContextMenu()
  const canPaste = !!clipboardTask && !!pasteTo

  return (
    <div
      onClick={onClick}
      onContextMenu={canPaste ? menu.open([{ label: 'Вставить задачу', onClick: () => pasteTask(pasteTo.goalId, pasteTo.mId) }]) : undefined}
      className="row-hover"
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 15px', border: `1px dashed ${COLORS.borderDash}`, borderRadius: 13, cursor: 'pointer', color: COLORS.textFaint, fontSize: 14 }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" strokeLinecap="round" /></svg>
      <span>Добавить задачу</span>
      {menu.element}
    </div>
  )
}

/**
 * A task row on the goal page. Click the checkbox to toggle done; click the row
 * (or use the right-click menu) to open the editor and update the task.
 * `goalId`/`mId` say where a pasted copy should land — the stage this row sits in.
 */
function TaskLine({ task, onToggle, goalId, mId }: { task: Task; onToggle: (id: string) => void; goalId: string; mId: string }): React.JSX.Element {
  const { openEditor, deleteTask, copyTask, pasteTask, clipboardTask } = usePlanner()
  const menu = useContextMenu()
  const items: MenuItem[] = [
    { label: 'Изменить задачу', onClick: () => openEditor(task.id) },
    { label: 'Копировать задачу', onClick: () => copyTask(task.id) }
  ]
  if (clipboardTask) items.push({ label: 'Вставить задачу', onClick: () => pasteTask(goalId, mId) })
  items.push({ label: 'Удалить задачу', danger: true, onClick: () => deleteTask(task.id) })

  return (
    <div
      onClick={() => openEditor(task.id)}
      onContextMenu={menu.open(items)}
      className="row-hover"
      style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 15px', background: COLORS.rowBg, border: `1px solid ${COLORS.border}`, borderRadius: 13, cursor: 'pointer', fontSize: 14.5 }}
    >
      <div onClick={(e) => { e.stopPropagation(); onToggle(task.id) }} style={{ flex: 'none', display: 'flex' }}>
        {task.done ? (
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: COLORS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
          </div>
        ) : (
          <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.22)' }} />
        )}
      </div>
      <span style={{ flex: 1, minWidth: 0, color: task.done ? COLORS.textDisabled : COLORS.taskTitle, textDecoration: task.done ? 'line-through' : 'none' }}>{task.title}</span>
      {menu.element}
    </div>
  )
}
