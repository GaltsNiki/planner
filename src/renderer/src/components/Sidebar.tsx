import React from 'react'
import { usePlanner } from '../store'
import { goalStats } from '@shared/progress'
import { GoalDot } from './primitives'
import { useContextMenu } from './ContextMenu'
import { COLORS } from '../tokens'
import type { View } from '@shared/types'

function NavItem({
  active, label, onClick, icon
}: { active: boolean; label: string; onClick: () => void; icon: React.JSX.Element }): React.JSX.Element {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', borderRadius: 10, cursor: 'pointer',
        background: active ? COLORS.accent13 : 'transparent',
        color: active ? COLORS.accent : COLORS.textSecondary,
        fontSize: 14, fontWeight: active ? 600 : 500
      }}
    >
      {icon}
      <span>{label}</span>
    </div>
  )
}

export function Sidebar(): React.JSX.Element {
  const { goals, tasks, view, activeGoalId, setView, selectGoal, deleteGoal, openNewGoal, openEditGoal, toggleSidebar } = usePlanner()

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
    )
  }

  const menu = useContextMenu()

  return (
    <div style={{ width: 264, flex: 'none', display: 'flex', flexDirection: 'column', background: COLORS.sidebarBg, borderRight: `1px solid ${COLORS.border}`, padding: '18px 14px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 8px 20px' }}>
        <img src="/icon.png" alt="Planner" width={28} height={28} style={{ flex: 'none', borderRadius: 7, boxShadow: '0 2px 8px rgba(232,86,63,0.35)' }} />
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <NavItem active={view === 'today'} label="Сегодня" onClick={() => setView('today')} icon={icons.today} />
        <NavItem active={view === 'week'} label="Неделя" onClick={() => setView('week')} icon={icons.week} />
        <NavItem active={view === 'review'} label="Обзор" onClick={() => setView('review')} icon={icons.review} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', margin: '22px 8px 8px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.6px', color: COLORS.textDisabled }}>МОИ ЦЕЛИ</div>
        <button
          onClick={openNewGoal}
          title="Новая цель"
          className="row-hover"
          style={{ marginLeft: 'auto', width: 22, height: 22, borderRadius: 6, background: 'transparent', border: `1px solid ${COLORS.border08}`, color: COLORS.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 6v12M6 12h12" /></svg>
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {goals.map((g) => {
          const st = goalStats(g, tasks)
          const active = view === 'goal' && activeGoalId === g.id
          return (
            <div
              key={g.id}
              onClick={() => selectGoal(g.id)}
              onContextMenu={menu.open([
                { label: 'Открыть цель', onClick: () => selectGoal(g.id) },
                { label: 'Изменить цель', onClick: () => openEditGoal(g.id) },
                { label: 'Удалить цель', danger: true, onClick: () => deleteGoal(g.id) }
              ])}
              style={{ padding: '9px 10px', borderRadius: 10, cursor: 'pointer', background: active ? 'rgba(255,255,255,0.05)' : 'transparent' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <GoalDot color={g.dotColor} size={9} />
                <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 500, color: '#e6e6e8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.title}</div>
                <div style={{ fontSize: 11.5, color: COLORS.textFaint2, fontVariantNumeric: 'tabular-nums' }}>{st.mDone}/{st.mTotal}</div>
              </div>
              <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.07)', marginTop: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 2, background: g.dotColor, width: st.pct + '%' }} />
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 12, borderTop: `1px solid ${COLORS.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', borderRadius: 10, cursor: 'pointer', color: COLORS.textSecondary, fontSize: 14, fontWeight: 500 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="8" x2="20" y2="8" /><circle cx="9" cy="8" r="2.4" fill="#0a0a0c" />
            <line x1="4" y1="16" x2="20" y2="16" /><circle cx="15" cy="16" r="2.4" fill="#0a0a0c" />
          </svg>
          <span>Настройки</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 11px', fontSize: 12, color: COLORS.textFaint }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: COLORS.success, boxShadow: '0 0 8px oklch(0.72 0.15 150 / 0.6)' }} />
          API-ключ подключён
        </div>
      </div>

      {menu.element}
    </div>
  )
}
