import React, { ReactNode, ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

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
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 flex items-center justify-center p-4">
            <div className="glass-panel border border-rose-500/30 rounded-2xl p-8 max-w-md w-full text-center shadow-lg">
              <div className="flex justify-center mb-6">
                <div className="bg-rose-500/20 p-4 rounded-full">
                  <AlertTriangle className="h-8 w-8 text-rose-400" />
                </div>
              </div>
              
              <h1 className="text-2xl font-black text-white mb-2">Something went wrong</h1>
              <p className="text-slate-400 text-sm mb-6">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-400 transition-colors">
                  Error Details
                </summary>
                <pre className="mt-3 bg-slate-900/80 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 overflow-auto max-h-40 text-left">
                  {this.state.error?.stack}
                </pre>
              </details>
              
              <button
                onClick={this.resetError}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="w-full mt-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2.5 px-4 rounded-lg transition-colors"
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
