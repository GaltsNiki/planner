import React, { useEffect, useRef } from 'react'
import { usePlanner } from '../store'
import { ClaudeMark } from './primitives'
import { COLORS } from '../tokens'

export function ChatPanel(): React.JSX.Element {
  const {
    goals, activeGoalId, chats, draft, setDraft, send, toggleChat, chatSending, hasApiKey
  } = usePlanner()

  const ag = goals.find((g) => g.id === activeGoalId) || goals[0]
  const msgs = (chats[activeGoalId] || [])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs.length, chatSending])

  const chips = [
    { label: 'Как мои успехи?', msg: 'Как мои успехи?' },
    { label: 'Перенести этап', msg: 'Помоги перенести этап' },
    { label: 'Разбить задачу', msg: 'Разбей застрявшую задачу на шаги' }
  ]

  return (
    <div style={{ width: 360, flex: 'none', display: 'flex', flexDirection: 'column', background: COLORS.sidebarBg, borderLeft: `1px solid ${COLORS.border}` }}>
      <div style={{ height: 64, flex: 'none', display: 'flex', alignItems: 'center', gap: 11, padding: '0 16px', borderBottom: `1px solid ${COLORS.border}` }}>
        <ClaudeMark size={28} radius={8} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Claude</div>
            {!hasApiKey && (
              <span title="Нет API-ключа — ответы генерирует заглушка" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3px', color: COLORS.textMuted, background: 'rgba(255,255,255,0.06)', border: `1px solid ${COLORS.border08}`, borderRadius: 6, padding: '1px 6px' }}>ДЕМО</span>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: COLORS.textFaint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ag?.title}</div>
        </div>
        <button onClick={toggleChat} style={{ width: 28, height: 28, borderRadius: 8, background: 'transparent', border: 'none', color: COLORS.textFaint, fontSize: 19, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div
              style={
                m.role === 'user'
                  ? { maxWidth: '84%', padding: '10px 13px', borderRadius: '14px 14px 4px 14px', background: COLORS.accent18, border: `1px solid ${COLORS.accent30}`, color: COLORS.textPrimary, fontSize: 13.5, lineHeight: 1.5 }
                  : { maxWidth: '88%', padding: '10px 13px', borderRadius: '14px 14px 14px 4px', background: COLORS.rowBg, border: `1px solid ${COLORS.border06}`, color: '#e6e6e8', fontSize: 13.5, lineHeight: 1.5 }
              }
            >
              {m.text}
            </div>
          </div>
        ))}
        {chatSending && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '10px 13px', borderRadius: '14px 14px 14px 4px', background: COLORS.rowBg, border: `1px solid ${COLORS.border06}`, color: COLORS.textMuted, fontSize: 13.5 }}>Claude печатает…</div>
          </div>
        )}
      </div>

      <div style={{ padding: '12px 14px 14px', borderTop: `1px solid ${COLORS.border}` }}>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 11 }}>
          {chips.map((c) => (
            <button
              key={c.label}
              onClick={() => void send(c.msg)}
              style={{ padding: '6px 11px', borderRadius: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: '#c9c9cd', fontSize: 12, cursor: 'pointer' }}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: COLORS.rowBg, border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: '5px 5px 5px 14px' }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !chatSending) void send() }}
            placeholder="Спросить Claude…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: COLORS.textPrimary, fontSize: 14 }}
          />
          <button
            onClick={() => void send()}
            disabled={chatSending}
            style={{ width: 34, height: 34, flex: 'none', borderRadius: 9, background: COLORS.accent, border: 'none', cursor: chatSending ? 'default' : 'pointer', opacity: chatSending ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
