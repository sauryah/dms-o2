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
    <div className="flex flex-col space-y-1.5 select-none w-full">
      {/* Label sitting above both inputs */}
      <span className="text-[10px] font-medium uppercase tracking-wider text-[#6b7280] font-mono">
        {label}
      </span>

      {/* Two inputs with "to" text between them */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <input
            type="number"
            step="any"
            value={minValue}
            onChange={(e) => onMinChange(e.target.value)}
            placeholder="MIN"
            className="w-full bg-[#0f0f0f] border border-[#2a2a2a] focus:border-blue-500 rounded-sm py-1.5 px-2 pr-7 text-xs text-[#e4e4e4] placeholder-[#404040] focus:outline-none transition-colors font-mono"
          />
          {unit && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-[#6b7280] uppercase tracking-wider pointer-events-none select-none font-mono">
              {unit}
            </span>
          )}
        </div>

        <span className="text-[10px] text-[#6b7280] font-mono uppercase shrink-0 px-0.5">
          to
        </span>

        <div className="relative flex-1">
          <input
            type="number"
            step="any"
            value={maxValue}
            onChange={(e) => onMaxChange(e.target.value)}
            placeholder="MAX"
            className="w-full bg-[#0f0f0f] border border-[#2a2a2a] focus:border-blue-500 rounded-sm py-1.5 px-2 pr-7 text-xs text-[#e4e4e4] placeholder-[#404040] focus:outline-none transition-colors font-mono"
          />
          {unit && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-[#6b7280] uppercase tracking-wider pointer-events-none select-none font-mono">
              {unit}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
