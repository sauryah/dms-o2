import { X, Code2, Cpu, Info } from 'lucide-react'
import { APP_VERSION } from '../version'

interface AboutModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn font-mono select-none"
      onClick={onClose}
    >
      <div
        className="relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl max-w-2xl w-full p-6 overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition cursor-pointer"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-6 border-b border-[var(--color-border)] pb-4">
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wide font-heading">
              System Information
            </h2>
            <p className="text-[10px] text-[var(--color-muted)] font-bold font-mono uppercase">
              DMS | Die Management System (v{APP_VERSION})
            </p>
          </div>
        </div>

        {/* Contributors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Sahil */}
          <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] text-blue-400 shrink-0">
                <Code2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider font-heading">
                  Sahil
                </h3>
                <p className="text-[10px] text-[var(--color-muted)] font-mono mt-0.5">
                  Lead Developer & Architect
                </p>
                <p className="text-xs text-[var(--color-muted)] mt-1.5 leading-relaxed font-mono">
                  Core architecture, Django backend APIs, PostgreSQL integration, and React client.
                </p>

                <div className="mt-3 flex items-center gap-1.5 font-mono">
                  <span className="px-2 py-0.5 text-[9px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded">
                    FOUNDER
                  </span>
                  <span className="px-2 py-0.5 text-[9px] font-bold text-[var(--color-muted)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded">
                    FULL-STACK
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Antigravity */}
          <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] text-emerald-400 shrink-0">
                <Cpu className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider font-heading">
                  Antigravity
                </h3>
                <p className="text-[10px] text-[var(--color-muted)] font-mono mt-0.5">
                  AI Engineering Assistant
                </p>
                <p className="text-xs text-[var(--color-muted)] mt-1.5 leading-relaxed font-mono">
                  Autonomous coding, design systems, test suites, and refactoring pair programmer.
                </p>

                <div className="mt-3 flex items-center gap-1.5 font-mono">
                  <span className="px-2 py-0.5 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded">
                    AI AGENT
                  </span>
                  <span className="px-2 py-0.5 text-[9px] font-bold text-[var(--color-muted)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded">
                    DEEPMIND
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info: Tech stack */}
        <div className="border-t border-[var(--color-border)] pt-4 font-mono">
          <h4 className="text-[10px] font-bold tracking-wider uppercase text-[var(--color-muted)] mb-2.5">
            Architecture Stack
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[var(--color-muted)] font-mono">
            <div className="p-3 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl">
              <span className="block text-[var(--color-text)] text-[10px] font-bold mb-0.5 uppercase">
                Frontend
              </span>
              React 18 • TypeScript • Vite • Tailwind
            </div>
            <div className="p-3 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl">
              <span className="block text-[var(--color-text)] text-[10px] font-bold mb-0.5 uppercase">
                Backend
              </span>
              Django 4.2 • REST Framework • PostgreSQL 18
            </div>
            <div className="p-3 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl">
              <span className="block text-[var(--color-text)] text-[10px] font-bold mb-0.5 uppercase">
                Search & Events
              </span>
              Go 1.22 • Meilisearch • Redis 7 • SSE
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
