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
          <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 font-mono">
            <div className="bg-[#0f0f0f] border border-red-500/40 rounded-sm p-6 max-w-md w-full text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-[#141414] border border-red-500/30 p-2.5 rounded-sm">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
              </div>
              
              <h1 className="text-sm font-medium uppercase tracking-[0.05em] text-[#e4e4e4] mb-2 font-mono">
                {isChunkError ? 'New Update Available' : 'SYSTEM EXCEPTION OCCURRED'}
              </h1>
              <p className="text-[#6b7280] text-xs mb-4 font-mono">
                {isChunkError
                  ? 'A new version of the application was deployed. Please reload the page to load the latest components.'
                  : (this.state.error?.message || 'An unexpected error occurred')}
              </p>
              
              <details className="mb-4 text-left">
                <summary className="cursor-pointer text-[10px] font-medium text-[#6b7280] uppercase tracking-wider hover:text-[#e4e4e4] transition-colors font-mono">
                  Error Details
                </summary>
                <pre className="mt-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm p-2 text-[10px] text-[#6b7280] overflow-auto max-h-36 text-left font-mono">
                  {this.state.error?.stack}
                </pre>
              </details>
              
              <button
                onClick={() => (isChunkError ? window.location.reload() : this.resetError())}
                className="w-full bg-[#141414] hover:bg-[#1f1f1f] border border-red-500/60 text-red-400 font-mono text-xs uppercase tracking-wider py-2 px-3 rounded-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {isChunkError ? 'Reload Page' : 'Try Again'}
              </button>
              
              <button
                onClick={() => (window.location.href = '/')}
                className="w-full mt-2 bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] text-[#6b7280] hover:text-[#e4e4e4] font-mono text-xs uppercase tracking-wider py-2 px-3 rounded-sm transition-colors cursor-pointer"
              >
                Return Home
              </button>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}
