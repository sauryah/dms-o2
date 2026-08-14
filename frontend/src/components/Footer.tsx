import { useState } from 'react'
import { AboutModal } from './AboutModal'
import { Info } from 'lucide-react'
import { APP_VERSION } from '../version'

export function Footer() {
  const [isAboutOpen, setIsAboutOpen] = useState(false)

  return (
    <>
      <footer role="contentinfo" className="border-t border-[#1a1a1a] bg-[#0a0a0a] py-3 mt-auto font-mono text-[11px] select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[#6b7280]">
            <div className="flex items-center space-x-2">
              <span className="text-[#e4e4e4] font-medium uppercase">DMS</span>
              <span className="text-[#2a2a2a]">/</span>
              <span>DIE MANAGEMENT SYSTEM</span>
              <span className="text-[#2a2a2a]">/</span>
              <span className="font-mono text-[10px] text-[#6b7280] bg-[#141414] border border-[#2a2a2a] px-1.5 py-0.2 rounded-sm">V{APP_VERSION}</span>
            </div>
            <div className="flex items-center space-x-3 text-[11px]">
              <span>
                ENGINEERING:{' '}
                <button 
                  onClick={() => setIsAboutOpen(true)}
                  className="text-[#e4e4e4] hover:text-blue-400 transition-colors uppercase font-mono cursor-pointer"
                >
                  SAHIL & ANTIGRAVITY
                </button>
              </span>
              <span className="text-[#2a2a2a]">|</span>
              <button 
                onClick={() => setIsAboutOpen(true)}
                className="flex items-center space-x-1 text-[#6b7280] hover:text-[#e4e4e4] transition-colors cursor-pointer uppercase"
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
