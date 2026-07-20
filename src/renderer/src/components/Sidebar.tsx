import React from 'react'
import { usePlanner } from '../store'
import { goalStats } from '@shared/progress'
import { resolveSphereId, UNSORTED_SPHERE_ID } from '@shared/spheres'
import { useContextMenu } from './ContextMenu'
import { AI_FEATURES_ENABLED } from '../features'
import { COLORS } from '../tokens'
import type { View } from '@shared/types'

function NavItem({
  active, label, onClick, icon
}: { active: boolean; label: string; onClick: () => void; icon: React.JSX.Element }): React.JSX.Element {
  return (
    <div
      onClick={onClick}
      // `nav-item-active` disables the CSS hover-lift so the accent fill stays put.
      className={`nav-item${active ? ' nav-item-active' : ''}`}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
        background: active ? COLORS.accent13 : 'transparent',
        color: active ? COLORS.accent : COLORS.textSecondary,
        fontSize: 14, fontWeight: active ? 600 : 500
      }}
    >
      {/* Left indicator bar — a stronger, edge-anchored "you are here" marker than
          the fill alone, and it lines the active row up against the panel's edge. */}
      {active && (
        <span
          style={{
            position: 'absolute', left: -14, top: 8, bottom: 8, width: 3,
            borderRadius: '0 3px 3px 0', background: COLORS.accent
          }}
        />
      )}
      {icon}
      <span>{label}</span>
    </div>
  )
}

export function Sidebar(): React.JSX.Element {
  const {
    goals, spheres, tasks, view, activeGoalId, setView, selectGoal, deleteGoal,
    openEditGoal, toggleSidebar, openSettings, hasApiKey
  } = usePlanner()

  const icons: Record<Exclude<View, 'goal'>, React.JSX.Element> = {
    today: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="17" rx="3" /><path d="M3 9h18" />
        <circle cx="8" cy="14" r="1.4" fill="currentColor" stroke="none" />
      </svg>
    ),
    week: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
        <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
      </svg>
    ),
    review: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" /><path d="M12 3 a9 9 0 0 1 9 9" strokeWidth="2.6" />
      </svg>
    ),
    habits: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="4" height="4" rx="1" /><rect x="10" y="4" width="4" height="4" rx="1" /><rect x="17" y="4" width="4" height="4" rx="1" />
        <rect x="3" y="11" width="4" height="4" rx="1" /><rect x="10" y="11" width="4" height="4" rx="1" /><rect x="17" y="11" width="4" height="4" rx="1" />
      </svg>
    )
  }

  const menu = useContextMenu()

  // Goals shown in the sidebar's lower zone — used for the section-header count so
  // the label reads as a real, quantified group rather than a bare caption.
  const totalGoals = goals.length

  return (
    <div style={{ width: 264, flex: 'none', display: 'flex', flexDirection: 'column', background: COLORS.sidebarBg, borderRight: `1px solid ${COLORS.border}`, padding: '16px 16px 12px' }}>
      {/* ── Top zone: brand + collapse (global chrome) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 4px 16px' }}>
        <img src="/icon.png" alt="Planner" width={28} height={28} style={{ flex: 'none', borderRadius: '50%', boxShadow: '0 2px 8px rgba(245,138,31,0.35)' }} />
        <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.2px' }}>Planner</div>
        <button
          onClick={toggleSidebar}
          title="Скрыть панель"
          className="row-hover"
          style={{ marginLeft: 'auto', width: 28, height: 28, borderRadius: 8, background: 'transparent', border: `1px solid ${COLORS.border08}`, color: COLORS.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><line x1="9" y1="4" x2="9" y2="20" /><path d="M15 9l-2 3 2 3" /></svg>
        </button>
      </div>

      {/* ── Navigation zone (the four main views) ── */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <NavItem active={view === 'today'} label="Сегодня" onClick={() => setView('today')} icon={icons.today} />
        <NavItem active={view === 'week'} label="Неделя" onClick={() => setView('week')} icon={icons.week} />
        <NavItem active={view === 'habits'} label="Привычки" onClick={() => setView('habits')} icon={icons.habits} />
        <NavItem active={view === 'review'} label="Цели" onClick={() => setView('review')} icon={icons.review} />
      </nav>

      {/* Divider binds navigation (above) apart from the goals list (below) as two
          distinct common regions, instead of two look-alike uppercase captions. */}
      <div style={{ height: 1, background: COLORS.border, margin: '16px 4px 4px' }} />

      {/* ── Goals zone header ── Shows a count of the goals listed below. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 8px 6px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.7px', color: COLORS.textMuted }}>МОИ ЦЕЛИ</div>
        {totalGoals > 0 && (
          <span style={{ fontSize: 10.5, fontWeight: 600, color: COLORS.textDisabled, fontVariantNumeric: 'tabular-nums' }}>{totalGoals}</span>
        )}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', margin: '0 -4px', padding: '0 4px' }}>
        {spheres
          .map((sp) => ({ sphere: sp, own: goals.filter((g) => resolveSphereId(g, spheres) === sp.id) }))
          // Hide the "Разное" fallback group unless it actually holds goals.
          .filter((grp) => grp.sphere.id !== UNSORTED_SPHERE_ID || grp.own.length > 0)
          .map(({ sphere: sp, own }) => {
            return (
              <div key={sp.id} style={{ marginBottom: 10 }}>
                {/* Sphere header — read-only here; spheres and their goals are
                    created in the «Сферы жизни» view, not from the sidebar. Lighter
                    weight than the «МОИ ЦЕЛИ» section label so the two roles differ. */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px 6px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: sp.color, flex: 'none', boxShadow: `0 0 6px ${sp.color}66` }} />
                  <div
                    style={{ flex: 1, minWidth: 0, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.6px', color: COLORS.textDisabled, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {sp.title.toUpperCase()}
                  </div>
                </div>

                {/* Goals in this sphere. A hairline rail on the left, in the sphere's
                    colour, binds a sphere's goals together as one group (common region)
                    and carries the sphere colour down into its goals (similarity). */}
                <div style={{ marginLeft: 12, paddingLeft: 10, borderLeft: `1px solid ${sp.color}33`, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {own.map((g) => {
                    const st = goalStats(g, tasks)
                    const active = view === 'goal' && activeGoalId === g.id
                    return (
                      <div
                        key={g.id}
                        onClick={() => selectGoal(g.id)}
                        className={`nav-goal${active ? ' nav-goal-active' : ''}`}
                        onContextMenu={menu.open([
                          { label: 'Открыть цель', onClick: () => selectGoal(g.id) },
                          { label: 'Изменить цель', onClick: () => openEditGoal(g.id) },
                          { label: 'Удалить цель', danger: true, onClick: () => deleteGoal(g.id) }
                        ])}
                        // Active goal is tinted in its own sphere colour so the
                        // selection is obvious and colour-consistent with the header.
                        style={{
                          padding: '8px 10px', borderRadius: 9, cursor: 'pointer',
                          background: active ? `${g.dotColor}1f` : 'transparent'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: active ? 600 : 500, color: active ? COLORS.textPrimary : '#dcdce0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.title}</div>
                          <div style={{ fontSize: 11.5, fontWeight: 600, color: active ? g.dotColor : COLORS.textFaint2, fontVariantNumeric: 'tabular-nums' }}>{st.pct}%</div>
                        </div>
                        <div style={{ height: 4, borderRadius: 3, background: 'rgba(255,255,255,0.06)', marginTop: 7, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 3, background: g.dotColor, width: st.pct + '%' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
      </div>

      {/* Settings + API-key status — both exist only to configure the AI
          integration, so the whole footer is hidden while it is off. */}
      {AI_FEATURES_ENABLED && (
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 12, borderTop: `1px solid ${COLORS.border}` }}>
          <div
            onClick={openSettings}
            className="row-hover"
            style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', borderRadius: 10, cursor: 'pointer', color: COLORS.textSecondary, fontSize: 14, fontWeight: 500 }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="8" x2="20" y2="8" /><circle cx="9" cy="8" r="2.4" fill="#0a0a0c" />
              <line x1="4" y1="16" x2="20" y2="16" /><circle cx="15" cy="16" r="2.4" fill="#0a0a0c" />
            </svg>
            <span>Настройки</span>
          </div>
          <div
            onClick={openSettings}
            title={hasApiKey ? 'API-ключ подключён' : 'Ключа нет — демо-режим. Открыть настройки'}
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 11px', fontSize: 12, color: COLORS.textFaint, cursor: 'pointer' }}
          >
            <div style={{ width: 7, height: 7, borderRadius: '50%', flex: 'none', background: hasApiKey ? COLORS.success : COLORS.textDisabled, boxShadow: hasApiKey ? '0 0 8px oklch(0.72 0.15 150 / 0.6)' : 'none' }} />
            {hasApiKey ? 'API-ключ подключён' : 'Демо-режим (нет ключа)'}
          </div>
        </div>
      )}

      {menu.element}
    </div>
  )
}
