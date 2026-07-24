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
        <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--color-muted)]">
          <Search className="h-5 w-5" />
        </span>

        {/* Input Field */}
        <input
          ref={localInputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] focus:bg-[var(--color-surface-2)] border border-[var(--color-border)] focus:border-blue-500/80 rounded-2xl pl-12 pr-12 py-3.5 text-sm sm:text-base text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:ring-4 focus:ring-blue-950/20 transition-all font-sans font-medium"
        />

        {/* Right Action container (Spinner / Clear button) */}
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center space-x-2">
          {loading && (
            <Loader2 className="h-4.5 w-4.5 animate-spin text-blue-400" />
          )}
          {!loading && value && onClear && (
            <button
              type="button"
              onClick={() => {
                onClear()
                localInputRef.current?.focus()
              }}
              className="text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]/40 p-1 rounded-lg transition"
              aria-label="Clear search input"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
})
