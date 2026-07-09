import React, { useEffect, useState, useCallback } from 'react'
import { COLORS } from '../tokens'

export interface MenuItem {
  label: string
  onClick: () => void
  danger?: boolean
}

interface MenuState {
  x: number
  y: number
  items: MenuItem[]
}

/**
 * Right-click context menu. Returns an `onContextMenu` handler factory and the
 * menu element to render once near the app root.
 *
 * Usage:
 *   const menu = useContextMenu()
 *   <div onContextMenu={menu.open([{ label: 'Удалить', danger: true, onClick: ... }])} />
 *   {menu.element}
 */
export function useContextMenu(): {
  open: (items: MenuItem[]) => (e: React.MouseEvent) => void
  element: React.JSX.Element | null
} {
  const [state, setState] = useState<MenuState | null>(null)

  const close = useCallback(() => setState(null), [])

  useEffect(() => {
    if (!state) return
    const onDown = (): void => close()
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') close() }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('blur', close)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('blur', close)
    }
  }, [state, close])

  const open = useCallback(
    (items: MenuItem[]) => (e: React.MouseEvent): void => {
      e.preventDefault()
      e.stopPropagation()
      // Keep the menu on-screen by nudging left/up near edges.
      const w = 200
      const x = Math.min(e.clientX, window.innerWidth - w - 8)
      const y = Math.min(e.clientY, window.innerHeight - items.length * 40 - 8)
      setState({ x, y, items })
    },
    []
  )

  const element = state ? (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed', top: state.y, left: state.x, zIndex: 1000, minWidth: 180,
        background: '#1b1b1f', border: `1px solid ${COLORS.border08}`, borderRadius: 11,
        padding: 5, boxShadow: '0 10px 34px rgba(0,0,0,0.5)'
      }}
    >
      {state.items.map((it, i) => (
        <div
          key={i}
          className="row-hover"
          onClick={() => { it.onClick(); close() }}
          style={{
            display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px',
            borderRadius: 8, cursor: 'pointer', fontSize: 13.5,
            color: it.danger ? '#f0715c' : COLORS.textPrimary
          }}
        >
          {it.danger && (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /></svg>
          )}
          <span>{it.label}</span>
        </div>
      ))}
    </div>
  ) : null

  return { open, element }
}
