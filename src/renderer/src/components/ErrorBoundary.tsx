import React from 'react'
import { COLORS } from '../tokens'

interface Props {
  children: React.ReactNode
}
interface State {
  error: Error | null
}

/**
 * Catches render exceptions in the view area so a single bad render shows a
 * recoverable message instead of a permanent white screen. "Попробовать снова"
 * clears the error and re-renders the current view.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[render error]', error, info)
  }

  render(): React.ReactNode {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.textPrimary }}>Что-то пошло не так на этом экране</div>
        <div style={{ fontSize: 13, color: COLORS.textMuted, maxWidth: 420, lineHeight: 1.5 }}>
          Данные в безопасности. Можно попробовать открыть экран заново.
        </div>
        <button
          onClick={() => this.setState({ error: null })}
          style={{ padding: '10px 18px', borderRadius: 10, background: COLORS.accent, border: 'none', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
        >
          Попробовать снова
        </button>
      </div>
    )
  }
}
