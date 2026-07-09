import React from 'react'

/** The Claude / logo mark — rounded square with coral gradient + white rotated square. */
export function ClaudeMark({ size = 16, radius = 5 }: { size?: number; radius?: number }): React.JSX.Element {
  const inner = Math.round(size * 0.38)
  return (
    <div
      style={{
        width: size, height: size, borderRadius: radius, flex: 'none',
        background: 'linear-gradient(135deg,#E8563F,#f0855f)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
    >
      <div style={{ width: inner, height: inner, background: '#fff', borderRadius: 1.5, transform: 'rotate(45deg)' }} />
    </div>
  )
}

export function GoalDot({ color, size = 9 }: { color: string; size?: number }): React.JSX.Element {
  return <div style={{ width: size, height: size, borderRadius: '50%', flex: 'none', background: color }} />
}

/** A thin progress bar; `track` toggles the faint background rail. */
export function Bar({
  pct, color, height = 3, radius = 2, track = true, gradient
}: {
  pct: number; color?: string; height?: number; radius?: number; track?: boolean; gradient?: string
}): React.JSX.Element {
  return (
    <div style={{ height, borderRadius: radius, background: track ? 'rgba(255,255,255,0.07)' : 'transparent', overflow: 'hidden' }}>
      <div style={{ height: '100%', borderRadius: radius, background: gradient || color, width: pct + '%', transition: 'width .3s' }} />
    </div>
  )
}

/** Spinner used by the leisure "search". */
export function Spinner({ size = 16 }: { size?: number }): React.JSX.Element {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.15)', borderTopColor: '#E8563F',
        animation: 'om-spin .7s linear infinite'
      }}
    />
  )
}
