import React, { forwardRef, useRef, useImperativeHandle } from 'react'
import { Search, X, Loader2 } from 'lucide-react'

export interface SearchBarProps {
  value: string
  onChange: (val: string) => void
  onClear?: () => void
  loading?: boolean
  placeholder?: string
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(function SearchBar(
  { value, onChange, onClear, loading = false, placeholder = 'Search...' },
  ref
) {
  const localInputRef = useRef<HTMLInputElement>(null)

  // Forward ref to allow parent to call focus()
  useImperativeHandle(ref, () => localInputRef.current!)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (onClear) onClear()
      localInputRef.current?.blur()
      e.stopPropagation()
    }
  }

  return (
    <div className="relative w-full">
      <div className="relative flex items-center">
        {/* Left Search Icon */}
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6b7280]">
          <Search className="h-4 w-4" />
        </span>

        {/* Input Field */}
        <input
          ref={localInputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-[#0f0f0f] border border-[#2a2a2a] focus:border-blue-500 rounded-sm pl-9 pr-9 py-2 text-[13px] text-[#e4e4e4] placeholder-[#404040] focus:outline-none transition-colors font-mono"
        />

        {/* Right Action container (Spinner / Clear button) */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center space-x-1.5">
          {loading && (
            <Loader2 className="animate-spin text-blue-500 h-4 w-4" />
          )}
          {!loading && value && onClear && (
            <button
              type="button"
              onClick={() => {
                onClear()
                localInputRef.current?.focus()
              }}
              className="text-[#6b7280] hover:text-[#e4e4e4] hover:bg-[#1f1f1f] p-1 rounded-sm transition"
              aria-label="Clear search input"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
})
