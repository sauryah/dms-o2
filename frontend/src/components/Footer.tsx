import { useState } from 'react'
import { AboutModal } from './AboutModal'
import { Info } from 'lucide-react'
import { APP_VERSION } from '../version'

export function Footer() {
  const [isAboutOpen, setIsAboutOpen] = useState(false)

  return (
    <>
      <footer
        role="contentinfo"
        className="border-t border-[var(--color-border)] bg-[var(--color-bg)] py-3 mt-auto font-mono text-[11px] select-none"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[var(--color-muted)]">
            <div className="flex items-center space-x-2">
              <span className="text-[var(--color-text)] font-bold uppercase">DMS</span>
              <span className="text-[var(--color-border)]">/</span>
              <span>DIE MANAGEMENT SYSTEM</span>
              <span className="text-[var(--color-border)]">/</span>
              <span className="font-mono text-[10px] text-[var(--color-muted)] bg-[var(--color-surface)] border border-[var(--color-border)] px-1.5 py-0.5 rounded">
                v{APP_VERSION}
              </span>
            </div>
            <div className="flex items-center space-x-3 text-[11px]">
              <span>
                ENGINEERING:{' '}
                <button
                  onClick={() => setIsAboutOpen(true)}
                  className="text-[var(--color-text)] hover:text-blue-400 transition-colors uppercase font-mono font-bold cursor-pointer"
                >
                  SAHIL & ANTIGRAVITY
                </button>
              </span>
              <span className="text-[var(--color-border)]">|</span>
              <button
                onClick={() => setIsAboutOpen(true)}
                className="flex items-center space-x-1 text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer uppercase font-bold"
                aria-label="About this application"
              >
                <Info className="h-3 w-3" />
                <span>SYSINFO</span>
              </button>
            </div>
          </div>
        </div>
      </footer>
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </>
  )
}
