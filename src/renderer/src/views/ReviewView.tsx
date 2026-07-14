import React, { useEffect, useState } from 'react'
import { usePlanner, GOAL_COLORS } from '../store'
import { ClaudeMark, GoalDot } from '../components/primitives'
import { goalStats } from '@shared/progress'
import { stepSegments } from '@shared/closeness'
import { staleRows, computeStale } from '@shared/staleness'
import { resolveSphereId, UNSORTED_SPHERE_ID } from '@shared/spheres'
import type { Goal, Task } from '@shared/types'
import { COLORS } from '../tokens'

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

      {/* Spheres of life — each sphere is a section grouping its own goals as
          progress cards. Spheres are created, renamed, recoloured and deleted
          right here; goals are added straight into a sphere. */}
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
        {sphereGroups.map(({ sphere: sp, own }) => {
          const editing = editingSphere === sp.id
          const recoloring = recoloringSphere === sp.id
          const permanent = sp.id === UNSORTED_SPHERE_ID
          return (
            <section key={sp.id} style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border06}`, borderRadius: 16, padding: '16px 18px 18px' }}>
              {/* Sphere header: colour dot, name (inline-editable), actions. */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => setRecoloringSphere(recoloring ? null : sp.id)}
                  title="Изменить цвет"
                  style={{ width: 16, height: 16, borderRadius: '50%', background: sp.color, border: 'none', cursor: 'pointer', flex: 'none', padding: 0, boxShadow: recoloring ? `0 0 0 2px ${COLORS.cardBg}, 0 0 0 3px ${sp.color}` : 'none' }}
                />
                {editing ? (
                  <input
                    autoFocus
                    value={sphereTitle}
                    onChange={(e) => setSphereTitle(e.target.value)}
                    onBlur={commitEditSphere}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEditSphere()
                      else if (e.key === 'Escape') cancelEditSphere()
                    }}
                    placeholder="Название сферы"
                    style={{ flex: 1, minWidth: 0, background: COLORS.appBg, border: `1px solid ${COLORS.border08}`, borderRadius: 8, padding: '6px 9px', color: COLORS.textPrimary, fontSize: 15, fontWeight: 600, outline: 'none' }}
                  />
                ) : (
                  <div
                    onDoubleClick={() => startEditSphere(sp.id, sp.title)}
                    title="Двойной клик — переименовать"
                    style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {sp.title}
                  </div>
                )}
                <button
                  onClick={() => startEditSphere(sp.id, sp.title)}
                  title="Переименовать"
                  className="row-hover"
                  style={{ width: 28, height: 28, borderRadius: 8, background: 'transparent', border: `1px solid ${COLORS.border08}`, color: COLORS.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', padding: 0 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                </button>
                {!permanent && (
                  <button
                    onClick={() => deleteSphere(sp.id)}
                    title="Удалить сферу — её цели перейдут в «Разное»"
                    className="row-hover"
                    style={{ width: 28, height: 28, borderRadius: 8, background: COLORS.accent14, border: `1px solid ${COLORS.accent28}`, color: COLORS.accent, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', padding: 0 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 14h10l1-14" /></svg>
                  </button>
                )}
              </div>

              {/* Colour palette — revealed when the dot is clicked. Goals in the
                  sphere share this colour. */}
              {recoloring && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {GOAL_COLORS.map((c) => (
                    <div
                      key={c}
                      onClick={() => { recolorSphere(sp.id, c); setRecoloringSphere(null) }}
                      title="Выбрать цвет"
                      style={{ width: 20, height: 20, borderRadius: '50%', background: c, cursor: 'pointer', boxShadow: sp.color === c ? `0 0 0 2px ${COLORS.cardBg}, 0 0 0 3px ${c}` : 'none' }}
                    />
                  ))}
                </div>
              )}

              {/* Goals in this sphere, plus an "add goal" card. */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginTop: 16 }}>
                {own.map((g) => <GoalCard key={g.id} goal={g} tasks={tasks} onOpen={() => selectGoal(g.id)} onDelete={() => deleteGoal(g.id)} />)}
                <button
                  onClick={() => openNewGoal(sp.id)}
                  className="card-hover"
                  style={{ background: 'transparent', border: `1px dashed ${COLORS.borderDash}`, borderRadius: 14, padding: '14px 16px', color: COLORS.textSecondary, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 120 }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 6v12M6 12h12" /></svg>
                  {own.length ? 'Ещё цель' : 'Добавить цель'}
                </button>
              </div>
            </section>
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

/** A single goal shown inside its sphere: percentage, stage progress, closeness. */
function GoalCard({ goal, tasks, onOpen, onDelete }: { goal: Goal; tasks: Task[]; onOpen: () => void; onDelete: () => void }): React.JSX.Element {
  const st = goalStats(goal, tasks)
  const segments = stepSegments(goal)
  return (
    <div onClick={onOpen} className="card-hover" style={{ background: COLORS.rowBg, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: '15px 16px 16px', cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
        <GoalDot color={goal.dotColor} size={9} />
        <div style={{ fontSize: 14, fontWeight: 600, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{goal.title}</div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          title="Удалить цель — вместе с её задачами"
          className="row-hover"
          style={{ width: 24, height: 24, borderRadius: 7, background: 'transparent', border: `1px solid ${COLORS.border08}`, color: COLORS.accent, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', padding: 0 }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 14h10l1-14" /></svg>
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 11 }}>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-1px' }}>{st.pct}%</div>
        <div style={{ fontSize: 12.5, color: COLORS.textFaint2 }}>{st.mDone}/{st.mTotal} этапов</div>
      </div>
      <div style={{ display: 'flex', gap: 5, marginBottom: 11 }}>
        {segments.map((s, i) => <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: s.color }} />)}
      </div>
      <div style={{ fontSize: 12.5, lineHeight: 1.45, color: COLORS.textMuted }}>{goal.closenessLabel}</div>
    </div>
  )
}
