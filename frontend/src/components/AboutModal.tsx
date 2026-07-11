import React from 'react'
import { X, Code2, Cpu, Info } from 'lucide-react'

interface AboutModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="relative bg-slate-900/90 border border-slate-800 rounded-2xl max-w-2xl w-full p-8 shadow-2xl shadow-blue-500/5 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background glow effects */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-white hover:border-slate-700 transition duration-200 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3.5 mb-8">
          <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/15">
            <Info className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">CREDITS & CONTRIBUTORS</h2>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">DMS | Die Management System (v1.4.0)</p>
          </div>
        </div>

        {/* Contributors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Sahil */}
          <div className="relative group p-6 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-950/60 hover:border-blue-500/30 transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400 shrink-0">
                <Code2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">Sahil</h3>
                <p className="text-xs text-slate-405 font-medium mt-0.5">Lead Developer & Architect</p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">Responsible for core system architecture, Django backend APIs, PostgreSQL integration, and responsive React frontend components.</p>
                
                <div className="mt-4 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 text-[9px] font-bold text-blue-400 bg-blue-400/5 border border-blue-400/10 rounded">Founder</span>
                  <span className="px-2 py-0.5 text-[9px] font-bold text-slate-400 bg-slate-800/40 border border-slate-800 rounded">Full-Stack</span>
                </div>
              </div>
            </div>
          </div>

          {/* Antigravity */}
          <div className="relative group p-6 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-950/60 hover:border-indigo-500/30 transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400 shrink-0">
                <Cpu className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">Antigravity</h3>
                <p className="text-xs text-slate-405 font-medium mt-0.5">AI Assistant & Integration Partner</p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">Powered by Google DeepMind. Assists in code generation, test writing, performance optimizations, bug resolution, and real-time support.</p>
                
                <div className="mt-4 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 text-[9px] font-bold text-indigo-400 bg-indigo-400/5 border border-indigo-400/10 rounded">AI Engine</span>
                  <span className="px-2 py-0.5 text-[9px] font-bold text-slate-400 bg-slate-800/40 border border-slate-800 rounded">DeepMind</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info: Tech stack */}
        <div className="border-t border-slate-800 pt-6">
          <h4 className="text-[10px] font-bold tracking-wider uppercase text-slate-500 mb-3">System Stack & Components</h4>
          <div className="grid grid-cols-3 gap-4 text-xs font-medium text-slate-400 font-mono">
            <div>
              <span className="block text-slate-500 font-bold mb-1">FRONTEND</span>
              React v18 • TypeScript • Vite • TailwindCSS
            </div>
            <div>
              <span className="block text-slate-500 font-bold mb-1">BACKEND API</span>
              Django v4.2 • REST Framework • PostgreSQL
            </div>
            <div>
              <span className="block text-slate-500 font-bold mb-1">SEARCH & SSE</span>
              Go v1.22 • Meilisearch • Redis • SSE Sync
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
