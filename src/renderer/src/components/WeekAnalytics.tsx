import React, { useState } from 'react'
import { usePlanner } from '../store'
import { GoalDot } from './primitives'
import { goalStats, weekAnalytics } from '@shared/progress'
import { DAY_SHORT } from '@shared/dates'
import { LEISURE_GOAL_ID } from '@shared/leisure'
import { COLORS } from '../tokens'
import type { Goal, Task } from '@shared/types'
import type { WeekDayStat } from '@shared/progress'

export function WeekAnalytics(): React.JSX.Element {
  const { goals, tasks, weekOffset } = usePlanner()
  const a = weekAnalytics(goals, tasks, weekOffset)
  const shown = goals.filter((g) => g.id !== LEISURE_GOAL_ID && g.milestones.length > 0)

  return (
    <section
      style={{
        background: COLORS.cardBg,
        border: `1px solid ${COLORS.border06}`,
        borderRadius: 16,
        padding: '20px 22px',
        marginTop: 20
      }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>Аналитика недели</h2>
        <div style={{ fontSize: 12, color: COLORS.textFaint2 }}>Пн–Вс</div>
      </header>

      {/* ── KPI band: completion rate + week-over-week ─────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 12,
          marginBottom: 20
        }}
      >
        <CompletionTile done={a.done} total={a.total} pct={a.pct} />
        <DeltaTile deltaPct={a.deltaPct} prevPct={a.prevPct} prevTotal={a.prevTotal} thisPct={a.pct} />
        <ActiveDaysTile bars={a.bars} />
      </div>

      {/* ── Body: goal steppers · 7-day distribution ──────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 28, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionLabel>Прогресс по этапам целей</SectionLabel>
          {shown.length === 0 ? (
            <div style={{ fontSize: 12.5, color: COLORS.textFaint2 }}>Добавьте этапы к целям, чтобы видеть прогресс.</div>
          ) : (
            shown.map((g) => <GoalStepper key={g.id} goal={g} tasks={tasks} />)
          )}
        </div>

        <div>
          <SectionLabel>Активность по дням</SectionLabel>
          <DayDistribution bars={a.bars} />
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── Shared bits ───────────────────────── */

/** Small uppercase section header used across the analytics card. */
function SectionLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.6px',
        textTransform: 'uppercase',
        color: COLORS.textMuted,
        marginBottom: 12
      }}
    >
      {children}
    </div>
  )
}

/** Shared shell for the three KPI tiles — a soft inset panel. */
function Tile({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '14px 16px',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid ${COLORS.border06}`,
        minWidth: 0
      }}
    >
      {children}
    </div>
  )
}

function TileLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <div style={{ fontSize: 11.5, fontWeight: 500, color: COLORS.textMuted }}>{children}</div>
}

/* ───────────────────────── KPI tiles ─────────────────────────── */

/** Headline completion rate for the week + a thin meter of the same value. */
function CompletionTile({ done, total, pct }: { done: number; total: number; pct: number }): React.JSX.Element {
  return (
    <Tile>
      <TileLabel>Выполнение за неделю</TileLabel>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em', color: COLORS.textPrimary }}>
          {pct}
          <span style={{ fontSize: 17, fontWeight: 600, color: COLORS.textMuted }}>%</span>
        </div>
        <div style={{ fontSize: 12.5, color: COLORS.textFaint }}>
          {done} из {total} задач
        </div>
      </div>
      {/* Meter: fill carries the rate, track is a faint step of the surface. */}
      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginTop: 6 }}>
        <div style={{ height: '100%', borderRadius: 3, width: pct + '%', background: COLORS.accentGrad, transition: 'width .3s' }} />
      </div>
    </Tile>
  )
}

/** Week-over-week change in completion rate, coloured by direction. */
function DeltaTile({
  deltaPct,
  prevPct,
  prevTotal,
  thisPct
}: {
  deltaPct: number
  prevPct: number
  prevTotal: number
  thisPct: number
}): React.JSX.Element {
  const hasPrev = prevTotal > 0
  const up = deltaPct > 0
  const flat = deltaPct === 0
  // Up is good → success green; down → muted accent; flat/no-data → neutral ink.
  const color = !hasPrev || flat ? COLORS.textMuted : up ? COLORS.successFg : COLORS.accentPartner

  return (
    <Tile>
      <TileLabel>Против прошлой недели</TileLabel>
      {hasPrev ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <TrendArrow direction={flat ? 'flat' : up ? 'up' : 'down'} color={color} />
            <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em', color }}>
              {up ? '+' : ''}
              {deltaPct}
              <span style={{ fontSize: 14, fontWeight: 600 }}> п.п.</span>
            </div>
          </div>
          <div style={{ fontSize: 12.5, color: COLORS.textFaint, marginTop: 2 }}>
            было {prevPct}% · стало {thisPct}%
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, color: COLORS.textDisabled }}>—</div>
          <div style={{ fontSize: 12.5, color: COLORS.textFaint, marginTop: 2 }}>нет данных за прошлую неделю</div>
        </>
      )}
    </Tile>
  )
}

/** How many of the 7 days had any planned activity — a scannability metric. */
function ActiveDaysTile({ bars }: { bars: WeekDayStat[] }): React.JSX.Element {
  const active = bars.filter((b) => b.has).length
  return (
    <Tile>
      <TileLabel>Дней с задачами</TileLabel>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em', color: COLORS.textPrimary }}>
          {active}
          <span style={{ fontSize: 17, fontWeight: 600, color: COLORS.textMuted }}> из 7</span>
        </div>
      </div>
      {/* Seven pips — filled where the day carries tasks. */}
      <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
        {bars.map((b) => (
          <div
            key={b.day}
            title={DAY_SHORT[b.day]}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              background: b.has ? COLORS.accent : 'rgba(255,255,255,0.08)'
            }}
          />
        ))}
      </div>
    </Tile>
  )
}

/** Up / down / flat trend glyph in a tinted circle. */
function TrendArrow({ direction, color }: { direction: 'up' | 'down' | 'flat'; color: string }): React.JSX.Element {
  const path =
    direction === 'up' ? 'M12 19V5M6 11l6-6 6 6' : direction === 'down' ? 'M12 5v14M6 13l6 6 6-6' : 'M5 12h14'
  return (
    <div
      style={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: color + '22'
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d={path} />
      </svg>
    </div>
  )
}

/* ───────────────── 7-day activity distribution ───────────────── */

/**
 * Columns of daily completion. Height (and fill intensity) carry the rate, so the
 * chart reads at a glance even without the numbers. Weekend days are marked in the
 * axis label; hovering a column reveals the exact count.
 */
function DayDistribution({ bars }: { bars: WeekDayStat[] }): React.JSX.Element {
  const [hover, setHover] = useState<number | null>(null)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 108 }}>
      {bars.map((b) => {
        const isWeekend = b.day >= 5
        const active = hover === b.day
        // Height floors at a visible stub so an all-todo day still shows a column.
        const fillPct = b.has ? Math.max(b.pct, 5) : 0

        return (
          <div
            key={b.day}
            onMouseEnter={() => setHover(b.day)}
            onMouseLeave={() => setHover(null)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', position: 'relative', cursor: b.has ? 'default' : 'default' }}
          >
            {/* Count label above the column. */}
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: b.has ? (active ? COLORS.textPrimary : COLORS.textMuted) : COLORS.textDisabled,
                fontVariantNumeric: 'tabular-nums',
                transition: 'color .12s'
              }}
            >
              {b.has ? `${b.done}/${b.total}` : '—'}
            </div>

            {/* Column track — the bar grows from a single baseline. */}
            <div style={{ flex: 1, width: '100%', maxWidth: 26, display: 'flex', alignItems: 'flex-end' }}>
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.045)',
                  display: 'flex',
                  alignItems: 'flex-end',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: fillPct + '%',
                    borderRadius: fillPct > 8 ? '6px 6px 5px 5px' : 5,
                    background: b.has ? COLORS.accentGrad : 'transparent',
                    filter: active ? 'brightness(1.12)' : 'none',
                    transition: 'height .3s, filter .12s'
                  }}
                />
              </div>
            </div>

            {/* Axis label — weekend days sit in a fainter ink. */}
            <div style={{ fontSize: 11, fontWeight: active ? 600 : 500, color: active ? COLORS.textSecondary : isWeekend ? COLORS.textFaint2 : COLORS.textMuted, transition: 'color .12s' }}>
              {DAY_SHORT[b.day]}
            </div>

            {/* Hover tooltip — exact rate for the day. */}
            {active && b.has && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  marginBottom: 6,
                  padding: '5px 9px',
                  borderRadius: 8,
                  background: '#232327',
                  border: `1px solid ${COLORS.border08}`,
                  boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: COLORS.textPrimary,
                  whiteSpace: 'nowrap',
                  zIndex: 5,
                  pointerEvents: 'none'
                }}
              >
                {b.pct}% · {b.done}/{b.total}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ───────────────────────── Goal steppers ─────────────────────── */

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
        <GoalDot color={goal.dotColor} size={8} />
        <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{goal.title}</div>
        <div style={{ fontSize: 11.5, color: COLORS.textFaint2, fontVariantNumeric: 'tabular-nums' }}>{st.mDone}/{st.mTotal} · {st.pct}%</div>
      </div>

      {/* Segment tracks — the active stage's bar is taller so it stands out. */}
      <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end', marginBottom: 6 }}>
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
            <div key={m.id} style={{ flex: 1, fontSize: 11, lineHeight: 1.3, color: m.status === 'todo' ? COLORS.textDisabled : COLORS.textSecondary, fontWeight: active ? 600 : 500, overflow: 'hidden' }}>
              {m.title}
            </div>
          )
        })}
      </div>
    </div>
  )
}
