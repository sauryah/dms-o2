import React from 'react'

export interface RangeFilterProps {
  label: string
  minValue: string
  maxValue: string
  onMinChange: (val: string) => void
  onMaxChange: (val: string) => void
  unit?: string
}

export function RangeFilter({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  unit = 'mm'
}: RangeFilterProps) {
  return (
    <div className="flex flex-col space-y-2 select-none w-full">
      {/* Label sitting above both inputs */}
      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] font-mono">
        {label}
      </span>

      {/* Two inputs with "to" text between them */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="number"
            step="any"
            value={minValue}
            onChange={(e) => onMinChange(e.target.value)}
            placeholder="Min"
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-blue-500 rounded-xl py-2 px-3 pr-8 text-xs text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-blue-950/20 transition-all font-mono"
          />
          {unit && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-[var(--color-muted)] uppercase tracking-wider pointer-events-none select-none font-mono">
              {unit}
            </span>
          )}
        </div>

        <span className="text-xxs font-bold text-[var(--color-muted)] font-mono uppercase tracking-widest shrink-0 px-0.5">
          to
        </span>

        <div className="relative flex-1">
          <input
            type="number"
            step="any"
            value={maxValue}
            onChange={(e) => onMaxChange(e.target.value)}
            placeholder="Max"
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-blue-500 rounded-xl py-2 px-3 pr-8 text-xs text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-blue-950/20 transition-all font-mono"
          />
          {unit && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-[var(--color-muted)] uppercase tracking-wider pointer-events-none select-none font-mono">
              {unit}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
