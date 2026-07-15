import React, { useState } from 'react'
import { usePlanner } from '../store'
import { GoalDot } from './primitives'
import { goalStats, weekAnalytics } from '@shared/progress'
import { DAY_SHORT } from '@shared/dates'
import { LEISURE_GOAL_ID } from '@shared/leisure'
import { COLORS } from '../tokens'
import type { Goal, Task } from '@shared/types'
import type { WeekDayStat } from '@shared/progress'

/** Russian plural: forms = [one, few, many], e.g. ['задача','задачи','задач']. */
function plural(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs >= 11 && abs <= 14) return forms[2]
  if (last === 1) return forms[0]
  if (last >= 2 && last <= 4) return forms[1]
  return forms[2]
}

const TASKS: [string, string, string] = ['задача', 'задачи', 'задач']

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

      {/* ── Body: completion + progress on the left (half width) · a taller
             day-activity panel fills the right column top-to-bottom ───────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 28, alignItems: 'stretch' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <CompletionTile done={a.done} total={a.total} pct={a.pct} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SectionLabel>Прогресс</SectionLabel>
            {shown.length === 0 ? (
              <div style={{ fontSize: 12.5, color: COLORS.textFaint2 }}>Добавьте этапы к целям, чтобы видеть прогресс.</div>
            ) : (
              shown.map((g) => <GoalStepper key={g.id} goal={g} tasks={tasks} />)
            )}
          </div>
        </div>

        {/* Right column stretches to the left column's height, so the chart —
            which flexes to fill — is now much taller. Highlights sit at the bottom. */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <SectionLabel>Активность по дням</SectionLabel>
          <div style={{ flex: 1, minHeight: 200, display: 'flex' }}>
            <DayDistribution bars={a.bars} />
          </div>
          <WeekHighlights bars={a.bars} done={a.done} />
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

/** A thin progress meter — the shared visual proportion used across the tiles. */
function Meter({ pct, color }: { pct: number; color: string }): React.JSX.Element {
  return (
    <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginTop: 8 }}>
      <div style={{ height: '100%', borderRadius: 3, width: Math.min(pct, 100) + '%', background: color, transition: 'width .3s' }} />
    </div>
  )
}

/* ───────────────────────── KPI tiles ─────────────────────────── */

/** Tasks completed this week — the count leads, the meter carries the proportion. */
function CompletionTile({ done, total, pct }: { done: number; total: number; pct: number }): React.JSX.Element {
  const empty = total === 0
  return (
    <Tile>
      <TileLabel>Выполнено за неделю</TileLabel>
      {empty ? (
        <>
          <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.1, color: COLORS.textDisabled }}>—</div>
          <div style={{ fontSize: 12.5, color: COLORS.textFaint }}>нет задач на этой неделе</div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em', color: COLORS.textPrimary }}>{done}</span>
            <span style={{ fontSize: 19, fontWeight: 600, color: COLORS.textMuted }}>/ {total}</span>
            <span style={{ fontSize: 12.5, color: COLORS.textFaint }}>задач</span>
          </div>
          <Meter pct={pct} color={COLORS.accentGrad} />
        </>
      )}
    </Tile>
  )
}

/* ───────────────── 7-day activity distribution ───────────────── */

/**
 * Columns of daily completion. Height (and fill intensity) carry the rate, so the
 * chart reads at a glance even without the numbers. Weekend days are marked in the
 * axis label; hovering a column reveals the exact count. Fills the column height.
 */
function DayDistribution({ bars }: { bars: WeekDayStat[] }): React.JSX.Element {
  const [hover, setHover] = useState<number | null>(null)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, width: '100%', height: '100%', minHeight: 120 }}>
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
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', position: 'relative' }}
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

            {/* Hover tooltip — the day and its exact count. */}
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
                {DAY_SHORT[b.day]} · {b.done} из {b.total}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * Two at-a-glance facts under the day chart — they use the otherwise empty lower
 * half of the right column and add insight the raw counts don't: which day went
 * best, and the average tasks finished per active day.
 */
function WeekHighlights({ bars, done }: { bars: WeekDayStat[]; done: number }): React.JSX.Element {
  const activeDays = bars.filter((b) => b.has)
  // "Best day" = most tasks finished, tie-broken by the higher completion rate.
  const best = activeDays.reduce<WeekDayStat | null>((top, b) => {
    if (!top) return b
    if (b.done > top.done) return b
    if (b.done === top.done && b.pct > top.pct) return b
    return top
  }, null)
  const pace = activeDays.length ? Math.round(done / activeDays.length) : 0

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${COLORS.border06}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <HighlightRow label="Лучший день" value={best && best.done > 0 ? `${DAY_SHORT[best.day]} · ${best.done}/${best.total}` : '—'} />
      <HighlightRow label="Средний темп" value={activeDays.length ? `${pace} ${plural(pace, TASKS)} в день` : '—'} />
    </div>
  )
}

function HighlightRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ fontSize: 12, color: COLORS.textMuted }}>{label}</span>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.textSecondary, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{value}</span>
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
        <div style={{ fontSize: 11.5, color: COLORS.textFaint2, fontVariantNumeric: 'tabular-nums' }}>{st.mDone}/{st.mTotal} этапов</div>
      </div>

      {/* Stage bars — filled in the goal's own colour, so each goal reads at a glance. */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
        {segs.map(({ m, pct }) => (
          <div key={m.id} style={{ flex: 1, height: 6, borderRadius: 3, background: COLORS.border06, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 3, width: pct + '%', background: goal.dotColor, transition: 'width .3s' }} />
          </div>
        ))}
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
