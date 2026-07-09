import React from 'react'
import { usePlanner } from '../store'
import { ClaudeMark } from '../components/primitives'
import { goalStats } from '@shared/progress'
import { stepSegments } from '@shared/closeness'
import { COLORS } from '../tokens'
import type { Milestone, Task } from '@shared/types'

export function GoalDetail(): React.JSX.Element {
  const { goals, tasks, activeGoalId, toggleTask, openEditGoal, openNewGoal } = usePlanner()
  const ag = goals.find((g) => g.id === activeGoalId) || goals[0]

  if (!ag) {
    return (
      <div style={{ maxWidth: 820, margin: '60px auto 0', textAlign: 'center', color: COLORS.textMuted }}>
        <div style={{ fontSize: 15, marginBottom: 14 }}>Целей пока нет.</div>
        <button onClick={openNewGoal} style={{ padding: '10px 18px', borderRadius: 10, background: COLORS.accent, border: 'none', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>Создать цель</button>
      </div>
    )
  }

  const st = goalStats(ag, tasks)
  const segments = stepSegments(ag)
  const deg = st.pct * 3.6

  const chipFor = (m: Milestone): { label: string; bg: string; color: string } => {
    if (m.status === 'done') return { label: 'Завершён', bg: COLORS.accent14, color: COLORS.accent }
    if (m.status === 'active') return { label: 'В работе', bg: 'rgba(255,255,255,0.1)', color: COLORS.textPrimary }
    return { label: 'Запланирован', bg: COLORS.border06, color: COLORS.textMuted }
  }

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
            <div style={{ width: 72, height: 72, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `conic-gradient(#E8563F ${deg}deg, rgba(255,255,255,0.08) ${deg}deg)` }}>
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

        <div style={{ display: 'flex', gap: 11, background: 'rgba(255,255,255,0.03)', border: `1px solid ${COLORS.border06}`, borderRadius: 12, padding: '14px 15px' }}>
          <ClaudeMark size={26} radius={8} />
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: '#c9c9cd' }}>{ag.claudeTake}</div>
        </div>

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

      {ag.milestones.map((m) => {
        const mts = tasks.filter((t) => t.goalId === ag.id && t.mId === m.id)
        const md = mts.filter((t) => t.done).length
        const chip = chipFor(m)
        return (
          <div key={m.id} style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
              <div style={{ fontSize: 15.5, fontWeight: 600 }}>{m.title}</div>
              <div style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: chip.bg, color: chip.color }}>{chip.label}</div>
              <div style={{ marginLeft: 'auto', fontSize: 12.5, color: COLORS.textFaint2, fontVariantNumeric: 'tabular-nums' }}>{mts.length ? `${md}/${mts.length}` : '—'}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {mts.map((t) => <TaskLine key={t.id} task={t} onToggle={toggleTask} />)}
            </div>
          </div>
        )
      })}

      {/* Tasks whose milestone doesn't exist (e.g. goals with no milestones). */}
      {(() => {
        const mIds = new Set(ag.milestones.map((m) => m.id))
        const loose = tasks.filter((t) => t.goalId === ag.id && !mIds.has(t.mId))
        if (!loose.length) return null
        const done = loose.filter((t) => t.done).length
        return (
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
              <div style={{ fontSize: 15.5, fontWeight: 600 }}>{ag.milestones.length ? 'Прочие задачи' : 'Задачи'}</div>
              <div style={{ marginLeft: 'auto', fontSize: 12.5, color: COLORS.textFaint2, fontVariantNumeric: 'tabular-nums' }}>{done}/{loose.length}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {loose.map((t) => <TaskLine key={t.id} task={t} onToggle={toggleTask} />)}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

/** A single checkable task row on the goal detail page. */
function TaskLine({ task, onToggle }: { task: Task; onToggle: (id: string) => void }): React.JSX.Element {
  return (
    <div onClick={() => onToggle(task.id)} className="row-hover" style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 15px', background: COLORS.rowBg, border: `1px solid ${COLORS.border}`, borderRadius: 13, cursor: 'pointer', fontSize: 14.5 }}>
      {task.done ? (
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: COLORS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
        </div>
      ) : (
        <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.22)', flex: 'none' }} />
      )}
      <span style={{ color: task.done ? COLORS.textDisabled : COLORS.taskTitle, textDecoration: task.done ? 'line-through' : 'none' }}>{task.title}</span>
    </div>
  )
}
