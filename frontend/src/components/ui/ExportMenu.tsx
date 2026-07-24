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
    <div ref={menuRef} className="relative inline-block text-left select-none z-30">
      {/* Dropdown Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition focus-ring cursor-pointer"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Download className="h-4 w-4 text-emerald-500 shrink-0" />
        <span>Export</span>
        <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
      </button>

      {/* Dropdown Options List */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-48 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl py-1.5 focus:outline-none z-50 animate-fadeIn"
          role="menu"
        >
          {options.map((option, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleOptionClick(option)}
              className="w-full text-left px-4 py-2 text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-colors duration-150"
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
