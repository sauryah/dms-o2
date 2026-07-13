import React, { useState, useEffect, useRef, useMemo } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

interface Option {
  value: string | number
  label: string
}

interface SearchableSelectProps {
  id?: string
  options: Option[]
  value: string | number
  onChange: (value: string | number) => void
  placeholder?: string
  emptyLabel?: string
  disabled?: boolean
  className?: string
}

export function SearchableSelect({
  id,
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  emptyLabel = '— None / Unassigned —',
  disabled = false,
  className = ''
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Find the selected option's label
  const selectedOption = useMemo(() => {
    return options.find(opt => String(opt.value) === String(value))
  }, [options, value])

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return options
    return options.filter(opt => opt.label.toLowerCase().includes(query))
  }, [options, searchQuery])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Auto-focus search input when opening
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
      setHighlightedIndex(-1)
      return () => clearTimeout(timer)
    } else {
      setSearchQuery('')
    }
  }, [isOpen])

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedEl = listRef.current.children[highlightedIndex] as HTMLElement
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIndex])

  const handleSelect = (val: string | number) => {
    onChange(val)
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setIsOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => {
          const next = prev + 1
          const totalLength = !searchQuery ? filteredOptions.length + 1 : filteredOptions.length
          return next >= totalLength ? 0 : next
        })
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => {
          const totalLength = !searchQuery ? filteredOptions.length + 1 : filteredOptions.length
          const next = prev - 1
          return next < 0 ? totalLength - 1 : next
        })
        break
      case 'Enter':
        e.preventDefault()
        const totalLength = !searchQuery ? filteredOptions.length + 1 : filteredOptions.length
        if (highlightedIndex >= 0 && highlightedIndex < totalLength) {
          if (!searchQuery) {
            if (highlightedIndex === 0) {
              handleSelect('')
            } else {
              handleSelect(filteredOptions[highlightedIndex - 1].value)
            }
          } else {
            handleSelect(filteredOptions[highlightedIndex].value)
          }
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        break
      case 'Tab':
        setIsOpen(false)
        break
      default:
        break
    }
  }

  return (
    <div ref={containerRef} className="relative w-full" onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center justify-between w-full text-left transition-all duration-300 outline-none ${className} ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-200 text-slate-400 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 z-[100] rounded-xl border border-slate-800 bg-slate-950/95 backdrop-blur-md shadow-2xl overflow-hidden animate-fadeIn max-h-[300px] flex flex-col">
          {/* Search Input Box */}
          <div className="p-2 border-b border-slate-900/60 flex items-center gap-2 bg-slate-900/20">
            <Search className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-1.5" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value)
                setHighlightedIndex(-1)
              }}
              className="w-full bg-transparent border-0 outline-none text-xs text-white placeholder-slate-500 py-1"
              onClick={e => e.stopPropagation()}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 hover:bg-slate-800 rounded-md transition text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div ref={listRef} className="overflow-y-auto py-1 flex-1 max-h-[220px]">
            {/* Show "Unassigned" default option only if search query is empty */}
            {!searchQuery && (
              <button
                type="button"
                onClick={() => handleSelect('')}
                className={`w-full text-left px-3.5 py-2 text-xs transition duration-150 ${
                  value === '' 
                    ? 'bg-blue-600/20 text-blue-400 font-semibold' 
                    : highlightedIndex === 0
                      ? 'bg-slate-800/60 text-slate-200'
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-350'
                }`}
              >
                {emptyLabel}
              </button>
            )}

            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, index) => {
                const actualIndex = !searchQuery ? index + 1 : index
                const isSelected = String(opt.value) === String(value)
                const isHighlighted = highlightedIndex === actualIndex

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full text-left px-3.5 py-2 text-xs transition duration-150 ${
                      isSelected
                        ? 'bg-blue-600/20 text-blue-400 font-semibold border-l-2 border-blue-500'
                        : isHighlighted
                          ? 'bg-slate-800/60 text-slate-200'
                          : 'text-slate-300 hover:bg-slate-800/40 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })
            ) : (
              <div className="px-3.5 py-3 text-xxs text-center text-slate-500">
                No matching sets found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
