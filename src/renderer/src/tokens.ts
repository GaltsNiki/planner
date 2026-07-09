// Design tokens — colours, from the README's token list.

export const COLORS = {
  appBg: '#0d0d0f',
  sidebarBg: '#0a0a0c',
  cardBg: '#141416',
  rowBg: '#161618',
  rowHover: '#1e1e22',
  cardHover: '#17171a',

  border: 'rgba(255,255,255,0.05)',
  border06: 'rgba(255,255,255,0.06)',
  border08: 'rgba(255,255,255,0.08)',
  borderDash: 'rgba(255,255,255,0.12)',

  accent: '#E8563F',
  accentGrad: 'linear-gradient(90deg,#E8563F,#f0855f)',
  accentPartner: '#f0855f',
  accent06: 'rgba(232,86,63,0.06)',
  accent12: 'rgba(232,86,63,0.12)',
  accent13: 'rgba(232,86,63,0.13)',
  accent14: 'rgba(232,86,63,0.14)',
  accent16: 'rgba(232,86,63,0.16)',
  accent18: 'rgba(232,86,63,0.18)',
  accent25: 'rgba(232,86,63,0.25)',
  accent28: 'rgba(232,86,63,0.28)',
  accent30: 'rgba(232,86,63,0.3)',
  accent35: 'rgba(232,86,63,0.35)',

  textPrimary: '#f2f2f3',
  textSecondary: '#b4b4b9',
  textMuted: '#8a8a90',
  textFaint: '#7a7a80',
  textFaint2: '#6f6f75',
  textDisabled: '#5c5c62',
  textGhost: '#4c4c52',
  taskTitle: '#eaeaec',

  success: 'oklch(0.72 0.15 150)'
} as const

export const FONT =
  "-apple-system,'SF Pro Display','SF Pro Text',system-ui,'Segoe UI',sans-serif"
