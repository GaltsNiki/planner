import React from 'react'
import { usePlanner } from '../store'
import { GoalDot } from './primitives'
import { weekAnalytics } from '@shared/progress'
import { DAY_SHORT } from '@shared/dates'
import { COLORS } from '../tokens'

export function WeekAnalytics(): React.JSX.Element {
  const { goals, tasks, weekOffset } = usePlanner()
  const a = weekAnalytics(goals, tasks, weekOffset)

  return (
    <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border06}`, borderRadius: 16, padding: '20px 22px', marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Аналитика недели</div>
        <div style={{ fontSize: 12, color: COLORS.textFaint2 }}>Пн–Вс · прогресс по этапам</div>
        <div style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600 }}><span style={{ color: COLORS.accent }}>{a.done}</span> из {a.total} задач · {a.pct}%</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 26 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {a.goals.map((g) => (
            <div key={g.goalId}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
                <GoalDot color={g.dotColor} size={9} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.stageTitle || g.title}</div>
                  {g.stageTitle && (
                    <div style={{ fontSize: 11.5, color: COLORS.textFaint2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>{g.title}</div>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: COLORS.textMuted, fontVariantNumeric: 'tabular-nums' }}>{g.done}/{g.total}</div>
              </div>
              <div style={{ height: 7, borderRadius: 4, background: COLORS.border06, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 4, background: g.dotColor, width: g.pct + '%', transition: 'width .3s' }} />
              </div>
            </div>
          ))}
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', color: COLORS.textMuted, marginBottom: 12 }}>ВЫПОЛНЕНИЕ ПО ДНЯМ</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 120 }}>
            {a.bars.map((b) => (
              <div key={b.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%' }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: b.total ? COLORS.textMuted : COLORS.textDisabled, fontVariantNumeric: 'tabular-nums' }} title={`${b.done} из ${b.total} задач`}>
                  {b.total ? `${b.done}/${b.total}` : '—'}
                </div>
                <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{ width: '100%', borderRadius: '6px 6px 3px 3px', background: b.pct ? 'linear-gradient(180deg,#f0855f,#E8563F)' : 'rgba(255,255,255,0.06)', height: Math.max(b.pct, 4) + '%', transition: 'height .3s' }} />
                </div>
                <div style={{ fontSize: 11.5, color: COLORS.textMuted }}>{DAY_SHORT[b.day]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
