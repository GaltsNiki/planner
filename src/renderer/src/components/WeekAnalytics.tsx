import React from 'react'
import { usePlanner } from '../store'
import { GoalDot } from './primitives'
import { goalStats, weekAnalytics } from '@shared/progress'
import { DAY_SHORT } from '@shared/dates'
import { LEISURE_GOAL_ID } from '@shared/leisure'
import { COLORS } from '../tokens'
import type { Goal, Task } from '@shared/types'

export function WeekAnalytics(): React.JSX.Element {
  const { goals, tasks, weekOffset } = usePlanner()
  const a = weekAnalytics(goals, tasks, weekOffset)
  const shown = goals.filter((g) => g.id !== LEISURE_GOAL_ID && g.milestones.length > 0)

  return (
    <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border06}`, borderRadius: 16, padding: '16px 20px', marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Аналитика недели</div>
        <div style={{ fontSize: 12, color: COLORS.textFaint2 }}>Этапы целей · Пн–Вс</div>
        <div style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600 }}><span style={{ color: COLORS.accent }}>{a.done}</span> из {a.total} задач · {a.pct}%</div>
      </div>

      {/* Left: goal stage steppers · Right: per-day completion — separate columns. */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          {shown.length === 0
            ? <div style={{ fontSize: 12.5, color: COLORS.textFaint2 }}>Добавьте этапы к целям, чтобы видеть прогресс.</div>
            : shown.map((g) => <GoalStepper key={g.id} goal={g} tasks={tasks} />)}
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', color: COLORS.textMuted, marginBottom: 10 }}>ВЫПОЛНЕНИЕ ПО ДНЯМ</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7, height: 96 }}>
            {a.bars.map((b) => (
              <div key={b.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, height: '100%' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: b.total ? COLORS.textMuted : COLORS.textDisabled, fontVariantNumeric: 'tabular-nums' }} title={`${b.done} из ${b.total} задач`}>
                  {b.total ? `${b.done}/${b.total}` : '—'}
                </div>
                <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{ width: '100%', borderRadius: '5px 5px 2px 2px', background: b.pct ? 'linear-gradient(180deg,#f0855f,#E8563F)' : 'rgba(255,255,255,0.06)', height: Math.max(b.pct, 4) + '%', transition: 'height .3s' }} />
                </div>
                <div style={{ fontSize: 11, color: COLORS.textMuted }}>{DAY_SHORT[b.day]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** One goal: title + a compact horizontal stage bar (fill = completion) with labels under it. */
function GoalStepper({ goal, tasks }: { goal: Goal; tasks: Task[] }): React.JSX.Element {
  const st = goalStats(goal, tasks)
  const segs = goal.milestones.map((m) => {
    const ts = tasks.filter((t) => t.goalId === goal.id && t.mId === m.id)
    const total = ts.length
    const done = ts.filter((t) => t.done).length
    const pct = total ? Math.round((done / total) * 100) : m.status === 'done' ? 100 : 0
    return { m, pct }
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <GoalDot color={goal.dotColor} size={8} />
        <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{goal.title}</div>
        <div style={{ fontSize: 11, color: COLORS.textFaint2, fontVariantNumeric: 'tabular-nums' }}>{st.mDone}/{st.mTotal} · {st.pct}%</div>
      </div>

      {/* Segment tracks — the active stage's bar is taller so it stands out. */}
      <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end', marginBottom: 5 }}>
        {segs.map(({ m, pct }) => {
          const active = m.status === 'active'
          return (
            <div key={m.id} style={{ flex: 1, height: active ? 8 : 5, borderRadius: 3, background: COLORS.border06, overflow: 'hidden', boxShadow: active ? `0 0 0 1px ${COLORS.accent35}` : 'none' }}>
              <div style={{ height: '100%', borderRadius: 3, width: pct + '%', background: active ? COLORS.accentGrad : COLORS.accent, transition: 'width .3s' }} />
            </div>
          )
        })}
      </div>

      {/* Stage labels — coloured like the goal view (no red text); the active bar
          above carries the emphasis. */}
      <div style={{ display: 'flex', gap: 5 }}>
        {segs.map(({ m }) => {
          const active = m.status === 'active'
          return (
            <div key={m.id} style={{ flex: 1, fontSize: 11, lineHeight: 1.25, color: m.status === 'todo' ? COLORS.textDisabled : COLORS.textSecondary, fontWeight: active ? 600 : 500, overflow: 'hidden' }}>
              {m.title}
            </div>
          )
        })}
      </div>
    </div>
  )
}
