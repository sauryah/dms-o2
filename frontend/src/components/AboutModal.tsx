import React from 'react'
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
      className="fixed inset-0 bg-[#0a0a0a]/80 z-[100] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn font-mono select-none"
      onClick={onClose}
    >
      <div 
        className="relative bg-[#0f0f0f] border border-[#2a2a2a] rounded-sm max-w-2xl w-full p-5 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1 rounded-sm border border-[#2a2a2a] bg-[#141414] text-[#6b7280] hover:text-[#e4e4e4] hover:border-[#3b82f6] transition duration-150 cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-5 border-b border-[#1a1a1a] pb-3">
          <div className="p-2 bg-[#141414] border border-[#2a2a2a] rounded-sm text-blue-400">
            <Info className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-[#e4e4e4] uppercase tracking-[0.05em] font-mono">01 CREDITS & SYSTEM ARCHITECTURE</h2>
            <p className="text-[10px] text-[#6b7280] mt-0.5 font-mono uppercase">DMS | DIE MANAGEMENT SYSTEM (V{APP_VERSION})</p>
          </div>
        </div>

        {/* Contributors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
          {/* Sahil */}
          <div className="p-3.5 rounded-sm border border-[#1a1a1a] bg-[#141414]">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#0f0f0f] rounded-sm border border-[#2a2a2a] text-blue-400 shrink-0">
                <Code2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-medium text-[#e4e4e4] uppercase tracking-wider">Sahil</h3>
                <p className="text-[10px] text-[#6b7280] font-mono mt-0.5">Lead Developer & Architect</p>
                <p className="text-[11px] text-[#6b7280] mt-1.5 leading-relaxed font-mono">Responsible for core system architecture, Django backend APIs, PostgreSQL integration, and React interface.</p>
                
                <div className="mt-3 flex items-center gap-1.5 font-mono">
                  <span className="px-1.5 py-0.5 text-[9px] font-medium text-blue-400 bg-[#0f0f0f] border border-blue-500/30 rounded-sm">FOUNDER</span>
                  <span className="px-1.5 py-0.5 text-[9px] font-medium text-[#6b7280] bg-[#0f0f0f] border border-[#2a2a2a] rounded-sm">FULL-STACK</span>
                </div>
              </div>
            </div>
          </div>

          {/* Antigravity */}
          <div className="p-3.5 rounded-sm border border-[#1a1a1a] bg-[#141414]">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#0f0f0f] rounded-sm border border-[#2a2a2a] text-emerald-400 shrink-0">
                <Cpu className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-medium text-[#e4e4e4] uppercase tracking-wider">Antigravity</h3>
                <p className="text-[10px] text-[#6b7280] font-mono mt-0.5">AI Assistant & Integration Partner</p>
                <p className="text-[11px] text-[#6b7280] mt-1.5 leading-relaxed font-mono">Powered by Google DeepMind. Assists in autonomous engineering, design systems, test suites, and real-time execution.</p>
                
                <div className="mt-3 flex items-center gap-1.5 font-mono">
                  <span className="px-1.5 py-0.5 text-[9px] font-medium text-emerald-400 bg-[#0f0f0f] border border-emerald-500/30 rounded-sm">AI ENGINE</span>
                  <span className="px-1.5 py-0.5 text-[9px] font-medium text-[#6b7280] bg-[#0f0f0f] border border-[#2a2a2a] rounded-sm">DEEPMIND</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info: Tech stack */}
        <div className="border-t border-[#1a1a1a] pt-3 font-mono">
          <h4 className="text-[10px] font-medium tracking-widest uppercase text-[#6b7280] mb-2">02 SYSTEM STACK & COMPONENTS</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[#6b7280] font-mono">
            <div className="p-2 bg-[#141414] border border-[#1a1a1a] rounded-sm">
              <span className="block text-[#e4e4e4] text-[10px] font-medium mb-0.5 uppercase">FRONTEND</span>
              React 18 • TypeScript • Vite • TailwindCSS
            </div>
            <div className="p-2 bg-[#141414] border border-[#1a1a1a] rounded-sm">
              <span className="block text-[#e4e4e4] text-[10px] font-medium mb-0.5 uppercase">BACKEND API</span>
              Django 4.2 • REST Framework • PostgreSQL 18
            </div>
            <div className="p-2 bg-[#141414] border border-[#1a1a1a] rounded-sm">
              <span className="block text-[#e4e4e4] text-[10px] font-medium mb-0.5 uppercase">SEARCH & SSE</span>
              Go 1.22 • Meilisearch • Redis 7 • SSE Sync
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
