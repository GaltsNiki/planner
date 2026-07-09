import React from 'react'
import { usePlanner } from '../store'
import { ClaudeMark } from '../components/primitives'
import { goalStats } from '@shared/progress'
import { stepSegments } from '@shared/closeness'
import { COLORS } from '../tokens'
import type { Milestone } from '@shared/types'

export function GoalDetail(): React.JSX.Element {
  const { goals, tasks, activeGoalId, toggleTask } = usePlanner()
  const ag = goals.find((g) => g.id === activeGoalId) || goals[0]
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
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px' }}>{ag.closenessLabel}</div>
            <div style={{ fontSize: 13.5, color: COLORS.textMuted, marginTop: 5 }}>{st.mDone} из {st.mTotal} этапов пройдено</div>
          </div>
          <div style={{ width: 72, height: 72, borderRadius: '50%', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `conic-gradient(#E8563F ${deg}deg, rgba(255,255,255,0.08) ${deg}deg)` }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: COLORS.cardBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>{st.pct}%</div>
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
              {mts.map((t) => (
                <div key={t.id} onClick={() => toggleTask(t.id)} className="row-hover" style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 15px', background: COLORS.rowBg, border: `1px solid ${COLORS.border}`, borderRadius: 13, cursor: 'pointer', fontSize: 14.5 }}>
                  {t.done ? (
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: COLORS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                    </div>
                  ) : (
                    <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.22)', flex: 'none' }} />
                  )}
                  <span style={{ color: t.done ? COLORS.textDisabled : COLORS.taskTitle, textDecoration: t.done ? 'line-through' : 'none' }}>{t.title}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
