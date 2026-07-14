import React, { useEffect, useState } from 'react'
import { usePlanner, GOAL_COLORS } from '../store'
import { ClaudeMark, GoalDot } from '../components/primitives'
import { goalStats, sphereStatsOf } from '@shared/progress'
import { stepSegments } from '@shared/closeness'
import { staleRows, computeStale } from '@shared/staleness'
import { resolveSphereId, UNSORTED_SPHERE_ID } from '@shared/spheres'
import type { Goal, Task } from '@shared/types'
import { COLORS } from '../tokens'

/**
 * A sphere's colour re-expressed as translucent tints, so the same accent can
 * paint a card's fill, border, header band and progress rail without hand-picking
 * a second colour per sphere. `color-mix` keeps it working for hex and oklch alike.
 */
function sphereTint(color: string): {
  fill: string; border: string; band: string; rail: string; softText: string
} {
  const mix = (pct: number, base = 'transparent'): string =>
    `color-mix(in oklab, ${color} ${pct}%, ${base})`
  return {
    fill: mix(5, COLORS.cardBg),      // card background — a whisper of the hue
    border: mix(22),                  // card outline
    band: mix(12, COLORS.cardBg),     // header strip behind the sphere name
    rail: mix(14),                    // track behind a progress fill
    softText: mix(78, '#ffffff')      // legible tinted text on the dark card
  }
}

export function ReviewView(): React.JSX.Element {
  const {
    goals, spheres, tasks, selectGoal, openChat, breakDown, openNewGoal, deleteGoal,
    addSphere, renameSphere, recolorSphere, deleteSphere
  } = usePlanner()
  const [summary, setSummary] = useState('')

  // Which sphere title is being edited inline, and its working text.
  const [editingSphere, setEditingSphere] = useState<string | null>(null)
  const [sphereTitle, setSphereTitle] = useState('')
  // Which sphere's colour palette is currently open (only one at a time).
  const [recoloringSphere, setRecoloringSphere] = useState<string | null>(null)

  const startEditSphere = (id: string, title: string): void => {
    setEditingSphere(id)
    setSphereTitle(title)
  }
  const commitEditSphere = (): void => {
    if (editingSphere && sphereTitle.trim()) renameSphere(editingSphere, sphereTitle.trim())
    setEditingSphere(null)
    setSphereTitle('')
  }
  const cancelEditSphere = (): void => {
    setEditingSphere(null)
    setSphereTitle('')
  }
  const addAndEditSphere = (): void => {
    const id = addSphere('')
    startEditSphere(id, '')
  }

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

  // Group every goal under its sphere. The "Разное" fallback sphere only appears
  // when it actually holds orphan goals; every user-made sphere always shows so it
  // can be filled with goals right after it's created.
  const sphereGroups = spheres
    .map((sphere) => ({ sphere, own: goals.filter((g) => resolveSphereId(g, spheres) === sphere.id) }))
    .filter((grp) => grp.sphere.id !== UNSORTED_SPHERE_ID || grp.own.length > 0)

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

      {/* Spheres of life — a grid of sphere cards so the areas of life read as a
          group at a glance. Each card is painted in its sphere's colour (fill,
          border, header band, progress) and holds its own goals. Spheres are
          created, renamed, recoloured and deleted right here; goals are added
          straight into a sphere. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 2px 14px' }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Сферы жизни</div>
        <button
          onClick={addAndEditSphere}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 9, background: 'transparent', border: `1px solid ${COLORS.border08}`, color: COLORS.textSecondary, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 6v12M6 12h12" /></svg>
          Добавить сферу
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16, marginBottom: 24, alignItems: 'start' }}>
        {sphereGroups.map(({ sphere: sp, own }) => (
          <SphereCard
            key={sp.id}
            sphere={sp}
            goals={own}
            tasks={tasks}
            editing={editingSphere === sp.id}
            editingTitle={sphereTitle}
            recoloring={recoloringSphere === sp.id}
            permanent={sp.id === UNSORTED_SPHERE_ID}
            onEditTitle={setSphereTitle}
            onStartEdit={() => startEditSphere(sp.id, sp.title)}
            onCommitEdit={commitEditSphere}
            onCancelEdit={cancelEditSphere}
            onToggleRecolor={() => setRecoloringSphere(recoloringSphere === sp.id ? null : sp.id)}
            onPickColor={(c) => { recolorSphere(sp.id, c); setRecoloringSphere(null) }}
            onDeleteSphere={() => deleteSphere(sp.id)}
            onAddGoal={() => openNewGoal(sp.id)}
            onOpenGoal={selectGoal}
            onDeleteGoal={deleteGoal}
          />
        ))}
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

interface SphereCardProps {
  sphere: { id: string; title: string; color: string }
  goals: Goal[]
  tasks: Task[]
  editing: boolean
  editingTitle: string
  recoloring: boolean
  permanent: boolean
  onEditTitle: (v: string) => void
  onStartEdit: () => void
  onCommitEdit: () => void
  onCancelEdit: () => void
  onToggleRecolor: () => void
  onPickColor: (c: string) => void
  onDeleteSphere: () => void
  onAddGoal: () => void
  onOpenGoal: (id: string) => void
  onDeleteGoal: (id: string) => void
}

/**
 * One sphere of life as a self-contained card: a colour-tinted header carrying
 * the sphere name and its rolled-up progress, then the sphere's goals, then a
 * slim "add goal" row. Everything colour-coded in the sphere's own accent so the
 * card visibly reads as one group.
 */
function SphereCard(props: SphereCardProps): React.JSX.Element {
  const {
    sphere: sp, goals, tasks, editing, editingTitle, recoloring, permanent,
    onEditTitle, onStartEdit, onCommitEdit, onCancelEdit, onToggleRecolor,
    onPickColor, onDeleteSphere, onAddGoal, onOpenGoal, onDeleteGoal
  } = props
  const tint = sphereTint(sp.color)
  const roll = sphereStatsOf(goals, tasks)

  return (
    <section style={{ background: tint.fill, border: `1px solid ${tint.border}`, borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Header band — tinted in the sphere colour, with a solid colour spine on
          the left edge as an unmistakable "this is the sphere colour" marker. */}
      <div style={{ position: 'relative', background: tint.band, padding: '14px 16px 14px 18px', borderBottom: `1px solid ${tint.border}` }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: sp.color }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={onToggleRecolor}
            title="Изменить цвет"
            style={{ width: 16, height: 16, borderRadius: '50%', background: sp.color, border: 'none', cursor: 'pointer', flex: 'none', padding: 0, boxShadow: recoloring ? `0 0 0 2px ${COLORS.cardBg}, 0 0 0 3px ${sp.color}` : 'none' }}
          />
          {editing ? (
            <input
              autoFocus
              value={editingTitle}
              onChange={(e) => onEditTitle(e.target.value)}
              onBlur={onCommitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onCommitEdit()
                else if (e.key === 'Escape') onCancelEdit()
              }}
              placeholder="Название сферы"
              style={{ flex: 1, minWidth: 0, background: COLORS.appBg, border: `1px solid ${COLORS.border08}`, borderRadius: 8, padding: '6px 9px', color: COLORS.textPrimary, fontSize: 15, fontWeight: 700, outline: 'none' }}
            />
          ) : (
            <div
              onDoubleClick={onStartEdit}
              title="Двойной клик — переименовать"
              style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {sp.title}
            </div>
          )}
          <button
            onClick={onStartEdit}
            title="Переименовать"
            className="row-hover"
            style={{ width: 28, height: 28, borderRadius: 8, background: 'transparent', border: `1px solid ${COLORS.border08}`, color: COLORS.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', padding: 0 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
          </button>
          {!permanent && (
            <button
              onClick={onDeleteSphere}
              title="Удалить сферу — её цели перейдут в «Разное»"
              className="row-hover"
              style={{ width: 28, height: 28, borderRadius: 8, background: 'transparent', border: `1px solid ${COLORS.border08}`, color: COLORS.textFaint, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', padding: 0 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 14h10l1-14" /></svg>
            </button>
          )}
        </div>

        {/* Sphere rollup — count of goals + a mean-progress bar in the sphere
            colour, so the whole area's momentum reads at a glance. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: tint.softText, flex: 'none' }}>
            {roll.goalCount ? `${roll.goalCount} ${goalWord(roll.goalCount)}` : 'Нет целей'}
          </div>
          <div style={{ flex: 1, height: 6, borderRadius: 4, background: tint.rail, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 4, background: sp.color, width: roll.pct + '%', transition: 'width .3s' }} />
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: tint.softText, fontVariantNumeric: 'tabular-nums', flex: 'none', minWidth: 30, textAlign: 'right' }}>{roll.pct}%</div>
        </div>

        {/* Colour palette — revealed when the dot is clicked. Goals in the sphere
            share this colour. */}
        {recoloring && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {GOAL_COLORS.map((c) => (
              <div
                key={c}
                onClick={() => onPickColor(c)}
                title="Выбрать цвет"
                style={{ width: 20, height: 20, borderRadius: '50%', background: c, cursor: 'pointer', boxShadow: sp.color === c ? `0 0 0 2px ${COLORS.cardBg}, 0 0 0 3px ${c}` : 'none' }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Goals in this sphere, then a slim add-goal row. */}
      <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {goals.map((g) => (
          <GoalCard key={g.id} goal={g} sphereColor={sp.color} tasks={tasks} onOpen={() => onOpenGoal(g.id)} onDelete={() => onDeleteGoal(g.id)} />
        ))}
        <button
          onClick={onAddGoal}
          className="row-hover"
          style={{ background: 'transparent', border: `1px dashed ${tint.border}`, borderRadius: 11, padding: '10px 12px', color: tint.softText, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 6v12M6 12h12" /></svg>
          {goals.length ? 'Ещё цель' : 'Добавить цель'}
        </button>
      </div>
    </section>
  )
}

/** Russian plural for "goal" (1 цель / 2 цели / 5 целей). */
function goalWord(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'цель'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'цели'
  return 'целей'
}

/**
 * A single goal inside its sphere: title, percent, and a stage-progress bar —
 * all painted in the sphere's colour so the goal visibly belongs to its sphere.
 */
function GoalCard({
  goal, sphereColor, tasks, onOpen, onDelete
}: { goal: Goal; sphereColor: string; tasks: Task[]; onOpen: () => void; onDelete: () => void }): React.JSX.Element {
  const st = goalStats(goal, tasks)
  // Progress segments tinted in the sphere colour (not a fixed coral).
  const segments = stepSegments(goal, sphereColor)
  return (
    <div onClick={onOpen} className="card-hover" style={{ background: COLORS.rowBg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '12px 13px 13px', cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
        <GoalDot color={sphereColor} size={9} />
        <div style={{ fontSize: 14, fontWeight: 600, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{goal.title}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: sphereColor, fontVariantNumeric: 'tabular-nums', flex: 'none' }}>{st.pct}%</div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          title="Удалить цель — вместе с её задачами"
          className="row-hover"
          style={{ width: 24, height: 24, borderRadius: 7, background: 'transparent', border: `1px solid ${COLORS.border08}`, color: COLORS.textFaint, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', padding: 0 }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 14h10l1-14" /></svg>
        </button>
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {segments.map((s, i) => <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: s.color }} />)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 12, lineHeight: 1.4, color: COLORS.textMuted, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{goal.closenessLabel}</div>
        <div style={{ fontSize: 11.5, color: COLORS.textFaint2, flex: 'none' }}>{st.mDone}/{st.mTotal} этапов</div>
      </div>
    </div>
  )
}
