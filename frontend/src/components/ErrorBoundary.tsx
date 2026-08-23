import React, { ReactNode, ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { captureException } from '../utils/sentry'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    captureException(error, { componentStack: errorInfo.componentStack })
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      const isChunkError =
        this.state.error?.name === 'ChunkLoadError' ||
        /failed to fetch dynamically imported module/i.test(this.state.error?.message || '') ||
        /error loading dynamically imported module/i.test(this.state.error?.message || '') ||
        /importing a module script failed/i.test(this.state.error?.message || '')

      return (
        this.props.fallback || (
          <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4 font-mono">
            <div className="bg-[var(--color-surface)] border border-red-500/30 rounded-2xl p-6 max-w-md w-full text-center shadow-xl">
              <div className="flex justify-center mb-4">
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                </div>
              </div>

              <h1 className="text-sm font-bold uppercase tracking-wide text-[var(--color-text)] mb-2 font-heading">
                {isChunkError ? 'New Update Available' : 'Application Exception'}
              </h1>
              <p className="text-[var(--color-muted)] text-xs mb-4 font-mono leading-relaxed">
                {isChunkError
                  ? 'A new version of the application was deployed. Please reload the page to load the latest components.'
                  : this.state.error?.message || 'An unexpected error occurred.'}
              </p>

              <details className="mb-4 text-left">
                <summary className="cursor-pointer text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider hover:text-[var(--color-text)] transition font-mono">
                  Stack Trace Details
                </summary>
                <pre className="mt-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-2.5 text-[10px] text-[var(--color-muted)] overflow-auto max-h-36 text-left font-mono">
                  {this.state.error?.stack}
                </pre>
              </details>

              <button
                onClick={() => (isChunkError ? window.location.reload() : this.resetError())}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold uppercase tracking-wider py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{isChunkError ? 'Reload Page' : 'Try Again'}</span>
              </button>

              <button
                onClick={() => (window.location.href = '/')}
                className="w-full mt-2 bg-[var(--color-surface-2)] hover:bg-[var(--color-border)] border border-[var(--color-border)] text-[var(--color-text)] font-mono text-xs font-bold uppercase tracking-wider py-2.5 px-4 rounded-xl transition cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}
