import React, { useEffect, useRef, useState } from 'react'
import { usePlanner } from '../store'
import { AI_FEATURES_ENABLED } from '../features'
import { COLORS } from '../tokens'

const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', color: COLORS.textMuted, margin: '18px 0 8px' }
const inputStyle: React.CSSProperties = { width: '100%', background: COLORS.appBg, border: `1px solid ${COLORS.border08}`, borderRadius: 10, padding: '10px 12px', color: COLORS.textPrimary, fontSize: 14, outline: 'none' }

/**
 * Settings modal: configure the Gemini API key (the missing UI that left .env as
 * the only way to set it) plus the location/interests used for weekend ideas.
 * The key is written through the main process and never read back into the
 * renderer — we only surface whether one is set.
 */
export function Settings(): React.JSX.Element | null {
  const { settingsOpen, closeSettings, hasApiKey, setApiKey, clearApiKey, settings, updateSettings } = usePlanner()
  const downOnBackdrop = useRef(false)
  const [keyDraft, setKeyDraft] = useState('')
  const [location, setLocation] = useState('')
  const [interests, setInterests] = useState('')
  const [busy, setBusy] = useState(false)

  // Seed the local fields whenever the modal opens.
  useEffect(() => {
    if (settingsOpen) {
      setKeyDraft('')
      setLocation(settings.location || '')
      setInterests((settings.interests || []).join(', '))
    }
  }, [settingsOpen, settings.location, settings.interests])

  useEffect(() => {
    if (!settingsOpen) return
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') closeSettings() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [settingsOpen, closeSettings])

  // The whole Settings modal only configures the AI features (API key + weekend
  // ideas), so it stays closed while those features are hidden.
  if (!settingsOpen || !AI_FEATURES_ENABLED) return null

  const saveKey = async (): Promise<void> => {
    if (!keyDraft.trim()) return
    setBusy(true)
    try { await setApiKey(keyDraft) ; setKeyDraft('') } finally { setBusy(false) }
  }
  const removeKey = async (): Promise<void> => {
    setBusy(true)
    try { await clearApiKey() } finally { setBusy(false) }
  }
  const savePrefs = (): void => {
    updateSettings({
      location: location.trim() || undefined,
      interests: interests.split(',').map((s) => s.trim()).filter(Boolean)
    })
    closeSettings()
  }

  return (
    <div
      onMouseDown={(e) => { downOnBackdrop.current = e.target === e.currentTarget }}
      onClick={(e) => { if (e.target === e.currentTarget && downOnBackdrop.current) closeSettings() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: 480, maxWidth: '92vw', maxHeight: '88vh', overflowY: 'auto', background: COLORS.cardBg, border: `1px solid ${COLORS.border08}`, borderRadius: 18, padding: '22px 24px 18px', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Настройки</div>
          <button onClick={closeSettings} style={{ width: 30, height: 30, borderRadius: 8, background: 'transparent', border: 'none', color: COLORS.textFaint, fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>

        <div style={labelStyle}>GEMINI API-КЛЮЧ</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: hasApiKey ? COLORS.success : COLORS.textDisabled, flex: 'none' }} />
          <div style={{ fontSize: 12.5, color: COLORS.textSecondary }}>
            {hasApiKey ? 'Ключ подключён — ответы Claude настоящие.' : 'Ключа нет — работает демо-режим (заглушки).'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="password"
            value={keyDraft}
            onChange={(e) => setKeyDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void saveKey() }}
            placeholder={hasApiKey ? 'Введите новый ключ, чтобы заменить' : 'Вставьте ключ AI Studio'}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={() => void saveKey()} disabled={busy || !keyDraft.trim()} style={{ flex: 'none', padding: '10px 15px', borderRadius: 10, background: keyDraft.trim() ? COLORS.accent : 'rgba(232,86,63,0.4)', border: 'none', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: keyDraft.trim() ? 'pointer' : 'default' }}>Сохранить</button>
        </div>
        {hasApiKey && (
          <button onClick={() => void removeKey()} disabled={busy} style={{ marginTop: 8, padding: '8px 13px', borderRadius: 9, background: 'transparent', border: '1px solid rgba(232,86,63,0.4)', color: COLORS.accent, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Удалить ключ</button>
        )}

        <div style={labelStyle}>ГОРОД (ДЛЯ ИДЕЙ НА ВЫХОДНЫЕ)</div>
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Санкт-Петербург" style={inputStyle} />

        <div style={labelStyle}>ИНТЕРЕСЫ <span style={{ fontWeight: 400, color: COLORS.textFaint2 }}>— через запятую</span></div>
        <input value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="театр, природа, музыка, кофе" style={inputStyle} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
          <button onClick={closeSettings} style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.border08}`, color: COLORS.textSecondary, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Закрыть</button>
          <button onClick={savePrefs} style={{ padding: '10px 18px', borderRadius: 10, background: COLORS.accent, border: 'none', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Готово</button>
        </div>
      </div>
    </div>
  )
}
