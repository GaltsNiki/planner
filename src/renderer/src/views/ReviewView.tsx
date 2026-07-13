import React, { useEffect, useState } from 'react'
import { usePlanner } from '../store'
import { ClaudeMark, GoalDot } from '../components/primitives'
import { goalStats } from '@shared/progress'
import { stepSegments } from '@shared/closeness'
import { staleRows, computeStale } from '@shared/staleness'
import { COLORS } from '../tokens'

export function ReviewView(): React.JSX.Element {
  const { goals, tasks, selectGoal, openChat, breakDown } = usePlanner()
  const [summary, setSummary] = useState('')

  // The weekly summary comes from the Claude "review" call. Debounced so that
  // toggling tasks on this screen doesn't fire a fresh (paid) request per click.
  useEffect(() => {
    let active = true
    const id = setTimeout(() => {
      void window.planner.review(goals, tasks).then((r) => { if (active) setSummary(r) })
    }, 800)
    return () => { active = false; clearTimeout(id) }
  }, [goals, tasks])

  const staleList = staleRows(computeStale(tasks), goals)

  return (
    <div style={{ maxWidth: 940, margin: '0 auto' }}>
      <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border06}`, borderRadius: 18, padding: '22px 24px', marginBottom: 24, display: 'flex', gap: 16 }}>
        <ClaudeMark size={30} radius={9} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Итоги недели от Claude</div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: '#c9c9cd', maxWidth: 640, minHeight: 44 }}>{summary || 'Собираю итоги недели…'}</div>
          <button onClick={openChat} style={{ marginTop: 14, padding: '9px 16px', borderRadius: 10, background: COLORS.accent, border: 'none', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Скорректировать план</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        {goals.map((g) => {
          const st = goalStats(g, tasks)
          const segments = stepSegments(g)
          return (
            <div key={g.id} onClick={() => selectGoal(g.id)} className="card-hover" style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border06}`, borderRadius: 16, padding: '18px 18px 20px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                <GoalDot color={g.dotColor} size={9} />
                <div style={{ fontSize: 14, fontWeight: 600, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.title}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
                <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-1px' }}>{st.pct}%</div>
                <div style={{ fontSize: 12.5, color: COLORS.textFaint2 }}>{st.mDone}/{st.mTotal} этапов</div>
              </div>
              <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
                {segments.map((s, i) => <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: s.color }} />)}
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.45, color: COLORS.textMuted }}>{g.closenessLabel}</div>
            </div>
          )
        })}
      </div>

      <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border06}`, borderRadius: 16, padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Застрявшие задачи</div>
          <div style={{ fontSize: 12, color: '#fff', background: 'rgba(232,86,63,0.9)', borderRadius: 20, padding: '1px 8px', fontWeight: 600 }}>{staleList.length}</div>
        </div>
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
    </div>
  )
}
