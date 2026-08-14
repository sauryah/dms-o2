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
  emptyMessage?: string
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
  emptyMessage = 'No matching items found',
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

  const baseId = id || 'ss'
  const activeDescendantId = highlightedIndex >= 0
    ? (!searchQuery
        ? (highlightedIndex === 0 ? `${baseId}-opt-empty` : `${baseId}-opt-${filteredOptions[highlightedIndex - 1].value}`)
        : `${baseId}-opt-${filteredOptions[highlightedIndex].value}`)
    : undefined

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
    <div ref={containerRef} className="relative w-full font-mono" onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center justify-between w-full text-left transition-colors outline-none bg-[#0f0f0f] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-xs text-[#e4e4e4] ${className} ${
          disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:border-[#3b82f6]'
        }`}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={placeholder}
        aria-activedescendant={activeDescendantId || ''}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 ml-1.5 transition-transform duration-150 text-[#6b7280] shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 z-50 rounded-sm border border-[#2a2a2a] bg-[#0f0f0f] overflow-hidden animate-fadeIn max-h-[280px] flex flex-col font-mono">
          {/* Search Input Box */}
          <div className="p-1.5 border-b border-[#2a2a2a] flex items-center gap-1.5 bg-[#0a0a0a]">
            <Search className="w-3 h-3 text-[#6b7280] shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value)
                setHighlightedIndex(-1)
              }}
              className="w-full bg-transparent border-0 outline-none text-xs text-[#e4e4e4] placeholder-[#404040] py-0.5"
              onClick={e => e.stopPropagation()}
              aria-label="Search options"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-0.5 hover:bg-[#141414] rounded-sm transition text-[#6b7280] hover:text-[#e4e4e4]"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div ref={listRef} className="overflow-y-auto py-0.5 flex-1 max-h-[200px]" role="listbox" aria-label={placeholder}>
            {/* Show "Unassigned" default option only if search query is empty */}
            {!searchQuery && (
              <button
                type="button"
                id={`${baseId}-opt-empty`}
                onClick={() => handleSelect('')}
                role="option"
                aria-selected={value === ''}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                  value === '' 
                    ? 'bg-[#141414] text-blue-400 font-medium' 
                    : highlightedIndex === 0
                      ? 'bg-[#1a1a1a] text-[#e4e4e4]'
                      : 'text-[#6b7280] hover:bg-[#1a1a1a] hover:text-[#e4e4e4]'
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
                    id={`${baseId}-opt-${opt.value}`}
                    onClick={() => handleSelect(opt.value)}
                    role="option"
                    aria-selected={isSelected}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                      isSelected
                        ? 'bg-[#141414] text-blue-400 font-medium border-l-2 border-blue-500'
                        : isHighlighted
                          ? 'bg-[#1a1a1a] text-[#e4e4e4]'
                          : 'text-[#e4e4e4] hover:bg-[#1a1a1a]'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })
            ) : (
              <div className="px-3 py-2 text-[10px] text-center text-[#6b7280]">
                {emptyMessage}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
