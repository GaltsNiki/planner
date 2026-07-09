import React, { useEffect, useState } from 'react'
import { usePlanner } from '../store'
import { ClaudeMark, Spinner } from './primitives'
import { LEISURE_CAT_COLOR } from '@shared/mockAI'
import { COLORS } from '../tokens'
import type { LeisureSuggestion } from '@shared/types'

function SuggestionCard({ s }: { s: LeisureSuggestion }): React.JSX.Element {
  const { added, addSuggestion, removeSuggestion } = usePlanner()
  const [hover, setHover] = useState(false)
  const isAdded = !!added[s.id]
  const color = LEISURE_CAT_COLOR[s.cat] || COLORS.accent

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '13px 14px', background: COLORS.rowBg, border: `1px solid ${COLORS.border}`, borderRadius: 12 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', flex: 'none', background: color, marginTop: 5 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, marginBottom: 2 }}>{s.cat}</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.4 }}>{s.title}</div>
        <div style={{ fontSize: 12, color: COLORS.textFaint, marginTop: 3 }}>{s.place}</div>
      </div>
      {isAdded ? (
        // Once added, the chip flips to "Убрать" on hover so it can be moved back out.
        <button
          onClick={() => removeSuggestion(s.id)}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          title="Убрать из плана"
          style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 600, border: `1px solid ${hover ? 'rgba(240,113,92,0.4)' : 'transparent'}`, background: hover ? 'rgba(240,113,92,0.12)' : COLORS.accent16, color: hover ? '#f0715c' : COLORS.accent }}
        >
          {hover ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              Убрать
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
              В плане
            </>
          )}
        </button>
      ) : (
        <button onClick={() => addSuggestion(s)} className="row-hover" style={{ flex: 'none', padding: '7px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: `1px solid ${COLORS.borderDash}`, color: '#dcdce0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>В задачи</button>
      )}
    </div>
  )
}

export function WeekendIdeas(): React.JSX.Element {
  const { leisureSeed, leisureLoading, refreshLeisure, settings } = usePlanner()
  const [items, setItems] = useState<LeisureSuggestion[]>([])

  // Fetch the current set from the (mock) service whenever the seed changes.
  useEffect(() => {
    let active = true
    void window.planner.leisure(leisureSeed).then((res) => { if (active) setItems(res) })
    return () => { active = false }
  }, [leisureSeed])

  const sat = items.filter((s) => s.day === 5)
  const sun = items.filter((s) => s.day === 6)
  const interests = settings.interests?.join(', ') || 'театр, природа, музыка, кофе'
  const location = settings.location || 'Санкт-Петербург'

  return (
    <div style={{ background: 'linear-gradient(180deg,rgba(232,86,63,0.05),rgba(255,255,255,0.02))', border: `1px solid ${COLORS.border06}`, borderRadius: 16, padding: '20px 22px', marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
        <ClaudeMark size={30} radius={9} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Идеи для отдыха на выходные</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: COLORS.textMuted, marginTop: 3 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
            {location} · подобрано под ваши интересы: {interests}
          </div>
        </div>
        <button onClick={() => void refreshLeisure()} className="row-hover" style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 7, padding: '8px 13px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#dcdce0', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v5h-5" /></svg>
          Обновить подборку
        </button>
      </div>

      {leisureLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11, padding: 34, color: COLORS.textMuted, fontSize: 13.5 }}>
          <Spinner size={16} />
          Ищу события поблизости…
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.textSecondary, marginBottom: 10 }}>СУББОТА</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {sat.map((s) => <SuggestionCard key={s.id} s={s} />)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.textSecondary, marginBottom: 10 }}>ВОСКРЕСЕНЬЕ</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {sun.map((s) => <SuggestionCard key={s.id} s={s} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
