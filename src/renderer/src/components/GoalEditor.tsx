import React, { useEffect, useRef, useState } from 'react'
import { usePlanner } from '../store'
import { GoalDot } from './primitives'
import { Calendar, fmtDay } from './Calendar'
import { COLORS } from '../tokens'
import type { MilestoneStatus } from '@shared/types'

const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', color: COLORS.textMuted, margin: '16px 0 7px', display: 'flex', alignItems: 'center', gap: 8 }
const inputStyle: React.CSSProperties = { width: '100%', background: COLORS.appBg, border: `1px solid ${COLORS.border08}`, borderRadius: 10, padding: '10px 12px', color: COLORS.textPrimary, fontSize: 14, outline: 'none' }
const hintStyle: React.CSSProperties = { fontSize: 11.5, fontWeight: 400, color: COLORS.textFaint2, letterSpacing: 0 }

/** A single-letter SMART badge. */
function SmartBadge({ letter }: { letter: string }): React.JSX.Element {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 5, background: COLORS.accent14, color: COLORS.accent, fontSize: 11, fontWeight: 800 }}>{letter}</span>
  )
}

const STATUS_LABEL: Record<MilestoneStatus, string> = {
  todo: 'Запланирован',
  active: 'В работе',
  done: 'Завершён'
}
/** Status → dot/pill colours for the stage rows. */
const STATUS_STYLE: Record<MilestoneStatus, { dot: string; bg: string; fg: string }> = {
  todo: { dot: 'rgba(255,255,255,0.25)', bg: COLORS.border06, fg: COLORS.textMuted },
  active: { dot: COLORS.accent, bg: COLORS.accent14, fg: COLORS.accent },
  done: { dot: 'oklch(0.72 0.15 150)', bg: 'oklch(0.72 0.15 150 / 0.14)', fg: 'oklch(0.78 0.15 150)' }
}
/** Click order for cycling a stage's status. */
const NEXT_STATUS: Record<MilestoneStatus, MilestoneStatus> = { todo: 'active', active: 'done', done: 'todo' }

/** ISO yyyy-mm-dd ⇄ Date helpers (deadline is stored as ISO). */
function isoToDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}
function dateToIso(d: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function GoalEditor(): React.JSX.Element | null {
  const {
    goalEd: gd, goalEdField, goalEdPickSphere, closeGoalEd, saveGoalEd, deleteGoalEd,
    goalEdAddMilestone, goalEdUpdateMilestone, goalEdRemoveMilestone, goalEdMoveMilestone,
    spheres, addSphere
  } = usePlanner()
  const [cal, setCal] = useState<{ x: number; y: number } | null>(null)
  // Inline "new sphere" creation from within the picker.
  const [creatingSphere, setCreatingSphere] = useState(false)
  const [newSphereTitle, setNewSphereTitle] = useState('')
  // Guard against closing when a text-selection drag merely ends on the backdrop.
  const downOnBackdrop = useRef(false)

  // Esc closes; Cmd/Ctrl+Enter saves (when a title is present).
  useEffect(() => {
    if (!gd) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') closeGoalEd()
      else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && gd.title.trim()) saveGoalEd()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [gd, closeGoalEd, saveGoalEd])

  if (!gd) return null

  const canSave = gd.title.trim().length > 0
  const deadlineDate = isoToDate(gd.deadline)

  return (
    <div
      onMouseDown={(e) => { downOnBackdrop.current = e.target === e.currentTarget }}
      onClick={(e) => { if (e.target === e.currentTarget && downOnBackdrop.current) closeGoalEd() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: 560, maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto', background: COLORS.cardBg, border: `1px solid ${COLORS.border08}`, borderRadius: 18, padding: '22px 24px 18px', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{gd.isNew ? 'Новая цель' : 'Редактировать цель'}</div>
          <button onClick={closeGoalEd} style={{ width: 30, height: 30, borderRadius: 8, background: 'transparent', border: 'none', color: COLORS.textFaint, fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ fontSize: 12.5, color: COLORS.textFaint, marginBottom: 6 }}>Цель по методике SMART — конкретная, измеримая, достижимая, значимая и ограниченная по времени.</div>

        {/* S — Specific */}
        <div style={labelStyle}><SmartBadge letter="S" />КОНКРЕТНАЯ ЦЕЛЬ <span style={hintStyle}>— что именно вы хотите</span></div>
        <input
          value={gd.title}
          onChange={(e) => goalEdField('title', e.target.value)}
          placeholder="Напр. «Пробежать полумарафон»"
          autoFocus
          style={{ ...inputStyle, fontSize: 15.5, fontWeight: 600 }}
        />

        {/* Sphere of life — which life area this goal belongs to. */}
        <div style={labelStyle}>СФЕРА ЖИЗНИ <span style={hintStyle}>— область жизни, к которой относится цель</span></div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {spheres.map((sp) => {
            const sel = gd.sphereId === sp.id
            return (
              <button
                key={sp.id}
                onClick={() => goalEdPickSphere(sp.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 20,
                  background: sel ? COLORS.accent14 : COLORS.border06,
                  border: `1px solid ${sel ? COLORS.accent28 : COLORS.border08}`,
                  color: sel ? COLORS.accent : COLORS.textSecondary, fontSize: 13, fontWeight: 600, cursor: 'pointer'
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: sp.color, flex: 'none' }} />
                {sp.title}
              </button>
            )
          })}
          {creatingSphere ? (
            <input
              autoFocus
              value={newSphereTitle}
              onChange={(e) => setNewSphereTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newSphereTitle.trim()) {
                  const id = addSphere(newSphereTitle.trim())
                  goalEdPickSphere(id)
                  setCreatingSphere(false); setNewSphereTitle('')
                } else if (e.key === 'Escape') {
                  setCreatingSphere(false); setNewSphereTitle('')
                }
              }}
              onBlur={() => {
                if (newSphereTitle.trim()) {
                  const id = addSphere(newSphereTitle.trim())
                  goalEdPickSphere(id)
                }
                setCreatingSphere(false); setNewSphereTitle('')
              }}
              placeholder="Название сферы"
              style={{ ...inputStyle, width: 170 }}
            />
          ) : (
            <button
              onClick={() => setCreatingSphere(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 20, background: 'transparent', border: `1px dashed ${COLORS.borderDash}`, color: COLORS.textFaint, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 6v12M6 12h12" /></svg>
              Новая сфера
            </button>
          )}
        </div>

        {/* M — Measurable */}
        <div style={labelStyle}><SmartBadge letter="M" />ИЗМЕРИМОСТЬ <span style={hintStyle}>— как поймёте, что достигли</span></div>
        <input value={gd.measurable} onChange={(e) => goalEdField('measurable', e.target.value)} placeholder="Напр. «21.1 км за ≤ 2:15»" style={inputStyle} />

        {/* A — Achievable */}
        <div style={labelStyle}><SmartBadge letter="A" />ДОСТИЖИМОСТЬ <span style={hintStyle}>— почему это реально</span></div>
        <input value={gd.achievable} onChange={(e) => goalEdField('achievable', e.target.value)} placeholder="Напр. «Бегаю 3 раза в неделю, есть база 10 км»" style={inputStyle} />

        {/* R — Relevant */}
        <div style={labelStyle}><SmartBadge letter="R" />ЗНАЧИМОСТЬ <span style={hintStyle}>— почему это важно для вас</span></div>
        <input value={gd.relevant} onChange={(e) => goalEdField('relevant', e.target.value)} placeholder="Напр. «Хочу выносливость и энергию каждый день»" style={inputStyle} />

        {/* T — Time-bound */}
        <div style={labelStyle}><SmartBadge letter="T" />СРОК <span style={hintStyle}>— к какой дате</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              setCal({ x: r.left, y: r.bottom })
            }}
            style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={deadlineDate ? COLORS.accent : COLORS.textFaint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>
            <span style={{ color: deadlineDate ? COLORS.textPrimary : COLORS.textFaint }}>
              {deadlineDate ? fmtDay(deadlineDate) + ' ' + deadlineDate.getFullYear() : 'Выберите дату'}
            </span>
          </button>
          {gd.deadline && (
            <button onClick={() => goalEdField('deadline', '')} title="Убрать срок" style={{ width: 40, height: 40, flex: 'none', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.border08}`, color: COLORS.textFaint, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          )}
        </div>
        {cal && (
          <Calendar
            selected={deadlineDate ?? new Date()}
            today={new Date()}
            anchor={cal}
            onPick={(d) => { goalEdField('deadline', dateToIso(d)); setCal(null) }}
            onClose={() => setCal(null)}
          />
        )}

        {/* Milestones (the measurable checkpoints) — a connected step timeline. */}
        <div style={{ ...labelStyle, justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>ЭТАПЫ <span style={hintStyle}>— измеримые шаги к цели</span></span>
          {gd.milestones.length > 0 && (
            <span style={{ fontSize: 11, color: COLORS.textFaint2, letterSpacing: 0 }}>
              {gd.milestones.filter((m) => m.status === 'done').length}/{gd.milestones.length} завершено
            </span>
          )}
        </div>

        {gd.milestones.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '22px 16px', border: `1px dashed ${COLORS.borderDash}`, borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 12.5, color: COLORS.textFaint2, maxWidth: 300, lineHeight: 1.5 }}>Разбейте цель на измеримые этапы — так прогресс будет виден на каждом шаге.</div>
            <button onClick={goalEdAddMilestone} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, background: COLORS.accent14, border: `1px solid ${COLORS.accent28}`, color: COLORS.accent, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 6v12M6 12h12" /></svg>
              Добавить первый этап
            </button>
          </div>
        ) : (
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Vertical connector line behind the number badges. */}
            <div style={{ position: 'absolute', left: 15, top: 18, bottom: 18, width: 2, background: COLORS.border08 }} />
            {gd.milestones.map((m, i) => (
              <StageRow
                key={m.id}
                index={i}
                total={gd.milestones.length}
                title={m.title}
                status={m.status}
                onTitle={(v) => goalEdUpdateMilestone(m.id, { title: v })}
                onCycleStatus={() => goalEdUpdateMilestone(m.id, { status: NEXT_STATUS[m.status] })}
                onUp={() => goalEdMoveMilestone(m.id, -1)}
                onDown={() => goalEdMoveMilestone(m.id, 1)}
                onRemove={() => goalEdRemoveMilestone(m.id)}
              />
            ))}
            <button onClick={goalEdAddMilestone} className="row-hover" style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 40, padding: '9px 12px', borderRadius: 10, background: 'transparent', border: `1px dashed ${COLORS.borderDash}`, color: COLORS.textFaint, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 6v12M6 12h12" /></svg>
              Добавить этап
            </button>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 22 }}>
          {!gd.isNew && (
            <button onClick={deleteGoalEd} style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(240,113,92,0.1)', border: '1px solid rgba(240,113,92,0.3)', color: '#f0715c', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Удалить цель</button>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <button onClick={closeGoalEd} style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.border08}`, color: COLORS.textSecondary, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Отмена</button>
            <button
              onClick={saveGoalEd}
              disabled={!canSave}
              style={{ padding: '10px 18px', borderRadius: 10, background: canSave ? COLORS.accent : 'rgba(232,86,63,0.4)', border: 'none', color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: canSave ? 'pointer' : 'default' }}
            >
              {gd.isNew ? 'Создать цель' : 'Сохранить'}
            </button>
          </div>
        </div>

        {/* Live preview of the goal dot + title */}
        {gd.title.trim() && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${COLORS.border}` }}>
            <GoalDot color={gd.dotColor} size={9} />
            <span style={{ fontSize: 13, color: COLORS.textSecondary }}>{gd.title.trim()}</span>
            {deadlineDate && <span style={{ fontSize: 12, color: COLORS.textFaint2 }}>· до {fmtDay(deadlineDate)}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

interface StageRowProps {
  index: number
  total: number
  title: string
  status: MilestoneStatus
  onTitle: (v: string) => void
  onCycleStatus: () => void
  onUp: () => void
  onDown: () => void
  onRemove: () => void
}

/** A single stage in the goal editor's step timeline. */
function StageRow(props: StageRowProps): React.JSX.Element {
  const { index, total, title, status, onTitle, onCycleStatus, onUp, onDown, onRemove } = props
  const [hover, setHover] = useState(false)
  const s = STATUS_STYLE[status]
  const first = index === 0
  const last = index === total - 1

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 11, background: COLORS.rowBg, border: `1px solid ${status === 'active' ? COLORS.accent25 : COLORS.border}`, borderRadius: 12, padding: '9px 11px 9px 9px' }}
    >
      {/* Number badge (its status dot sits on the connector line) */}
      <div style={{ position: 'relative', flex: 'none', width: 24, height: 24 }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, background: status === 'done' ? s.dot : s.bg, color: status === 'done' ? '#fff' : s.fg, border: `2px solid ${COLORS.cardBg}` }}>
          {status === 'done' ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
          ) : index + 1}
        </div>
      </div>

      <input
        value={title}
        onChange={(e) => onTitle(e.target.value)}
        placeholder={`Этап ${index + 1}`}
        style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', color: COLORS.textPrimary, fontSize: 14, fontWeight: 500, outline: 'none', padding: '2px 0' }}
      />

      {/* Status pill — click to cycle todo → active → done */}
      <button
        onClick={onCycleStatus}
        title="Сменить статус"
        style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 20, background: s.bg, border: 'none', color: s.fg, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}
      >
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot }} />
        {STATUS_LABEL[status]}
      </button>

      {/* Reorder + delete controls (reveal on hover) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 'none', opacity: hover ? 1 : 0.32, transition: 'opacity .12s' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <button onClick={onUp} disabled={first} title="Выше" style={{ width: 22, height: 14, background: 'transparent', border: 'none', color: first ? COLORS.textGhost : COLORS.textFaint, cursor: first ? 'default' : 'pointer', fontSize: 9, padding: 0, lineHeight: 1 }}>▲</button>
          <button onClick={onDown} disabled={last} title="Ниже" style={{ width: 22, height: 14, background: 'transparent', border: 'none', color: last ? COLORS.textGhost : COLORS.textFaint, cursor: last ? 'default' : 'pointer', fontSize: 9, padding: 0, lineHeight: 1 }}>▼</button>
        </div>
        <button onClick={onRemove} title="Удалить этап" style={{ width: 28, height: 28, borderRadius: 8, background: 'transparent', border: 'none', color: COLORS.textFaint, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /></svg>
        </button>
      </div>
    </div>
  )
}
