import React, { useState, useEffect, useRef } from 'react'
import { Download, ChevronDown } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'

export interface ExportOption {
  label: string
  onSelect: () => void
}

export interface ExportMenuProps {
  options: ExportOption[]
}

export function ExportMenu({ options }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()

  // Close menu on Escape or clicking outside
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('mousedown', handleClickOutside)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleOptionClick = (option: ExportOption) => {
    showToast('Preparing export...', 'info')
    setIsOpen(false)
    // Run the actual export callback after a slight delay to let the toast render
    setTimeout(() => {
      option.onSelect()
    }, 100)
  }

  return (
    <div ref={menuRef} className="relative inline-block text-left select-none z-30 font-mono">
      {/* Dropdown Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-[#141414] hover:bg-[#1f1f1f] text-[#e4e4e4] border border-[#2a2a2a] px-3 py-1.5 rounded-sm text-xs uppercase tracking-wider transition focus-ring cursor-pointer"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Download className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
        <span>Export</span>
        <ChevronDown className="h-3 w-3 text-[#6b7280] shrink-0" />
      </button>

      {/* Dropdown Options List */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-1 w-48 bg-[#0f0f0f] border border-[#2a2a2a] rounded-sm py-1 focus:outline-none z-50 animate-fadeIn font-mono"
          role="menu"
        >
          {options.map((option, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleOptionClick(option)}
              className="w-full text-left px-3 py-1.5 text-xs text-[#e4e4e4] hover:bg-[#1a1a1a] transition-colors"
              role="menuitem"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
