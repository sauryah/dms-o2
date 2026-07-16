import React, { useState } from 'react'
import { AboutModal } from './AboutModal'
import { Info } from 'lucide-react'

export function Footer() {
  const [isAboutOpen, setIsAboutOpen] = useState(false)

  return (
    <>
      <footer className="border-t border-slate-900/60 bg-slate-950/40 backdrop-blur-md py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-500">
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-300">DMS</span>
              <span className="text-slate-700">•</span>
              <span>Die Management System</span>
              <span className="text-slate-700">•</span>
              <span className="font-mono text-[10px] text-slate-500 bg-slate-900/50 border border-slate-800 px-1.5 py-0.5 rounded">v1.7.1</span>
            </div>
            <div className="flex items-center space-x-4">
              <span>
                Developed by{' '}
                <button 
                  onClick={() => setIsAboutOpen(true)}
                  className="text-slate-400 hover:text-blue-400 transition-colors font-bold underline decoration-blue-500/30 decoration-2 hover:decoration-blue-400 cursor-pointer"
                >
                  Sahil & Antigravity
                </button>
              </span>
              <span className="text-slate-850">|</span>
              <button 
                onClick={() => setIsAboutOpen(true)}
                className="flex items-center space-x-1 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                aria-label="About this application"
              >
                <Info className="h-3.5 w-3.5" />
                <span>About App</span>
              </button>
            </div>
          </div>
        </div>
      </footer>
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </>
  )
}
