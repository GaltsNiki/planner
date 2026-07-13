import React, { useEffect } from 'react'
import { usePlanner } from './store'
import { Sidebar } from './components/Sidebar'
import { ChatPanel } from './components/ChatPanel'
import { ClaudeMark, Spinner } from './components/primitives'
import { TodayView } from './views/TodayView'
import { WeekView } from './views/WeekView'
import { GoalDetail } from './views/GoalDetail'
import { ReviewView } from './views/ReviewView'
import { HabitsView } from './views/HabitsView'
import { TaskEditor } from './components/TaskEditor'
import { GoalEditor } from './components/GoalEditor'
import { Settings } from './components/Settings'
import { ErrorBoundary } from './components/ErrorBoundary'
import { TextContextMenu } from './components/TextContextMenu'
import { COLORS } from './tokens'
import { weekModel, offsetToDate, DAY_FULL, currentWeekIndex } from '@shared/dates'
import { fmtDay } from './components/Calendar'

function useHeader(): { title: string; sub: string } {
  const { view, goals, activeGoalId, dayIndex, todayIndex, weekOffset } = usePlanner()
  const ag = goals.find((g) => g.id === activeGoalId) || goals[0]
  if (view === 'today') {
    return {
      title: weekOffset === currentWeekIndex() && dayIndex === todayIndex ? 'Сегодня' : DAY_FULL[dayIndex],
      sub: `${DAY_FULL[dayIndex]}, ${fmtDay(offsetToDate(weekOffset, dayIndex))}`
    }
  }
  if (view === 'week') return { title: 'Неделя', sub: weekModel(weekOffset).range }
  if (view === 'habits') return { title: 'Привычки', sub: 'Ежедневные привычки по дням недели' }
  if (view === 'review') return { title: 'Обзор', sub: 'Итоги недели' }
  return { title: ag?.title ?? '', sub: ag?.category ?? '' }
}

export function App(): React.JSX.Element {
  const { ready, hydrate, view, chatOpen, toggleChat, ed, sidebarCollapsed, toggleSidebar } = usePlanner()
  const header = useHeader()

  useEffect(() => { void hydrate() }, [hydrate])

  if (!ready) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: COLORS.appBg }}>
        <ClaudeMark size={40} radius={11} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: COLORS.textMuted, fontSize: 13.5 }}>
          <Spinner size={15} />
          Загрузка…
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden' }}>
      {!sidebarCollapsed && <Sidebar />}

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: COLORS.appBg }}>
        <div style={{ height: 64, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {sidebarCollapsed && (
              <button
                onClick={toggleSidebar}
                title="Показать панель"
                style={{ width: 32, height: 32, borderRadius: 9, background: COLORS.rowBg, border: `1px solid ${COLORS.border08}`, color: COLORS.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><line x1="9" y1="4" x2="9" y2="20" /><path d="M13 9l2 3-2 3" /></svg>
              </button>
            )}
            <div>
              <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.3px' }}>{header.title}</div>
              <div style={{ fontSize: 12.5, color: COLORS.textFaint, marginTop: 1 }}>{header.sub}</div>
            </div>
          </div>
          <button
            onClick={toggleChat}
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 15px', borderRadius: 11, background: COLORS.accent13, border: `1px solid ${COLORS.accent30}`, color: COLORS.accent, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
          >
            <ClaudeMark size={16} radius={5} />
            Спросить Claude
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
          <ErrorBoundary>
            {view === 'today' && <TodayView />}
            {view === 'week' && <WeekView />}
            {view === 'habits' && <HabitsView />}
            {view === 'goal' && <GoalDetail />}
            {view === 'review' && <ReviewView />}
          </ErrorBoundary>
        </div>
      </div>

      {chatOpen && <ChatPanel />}
      {ed && <TaskEditor />}
      <GoalEditor />
      <Settings />
      <TextContextMenu />
    </div>
  )
}
