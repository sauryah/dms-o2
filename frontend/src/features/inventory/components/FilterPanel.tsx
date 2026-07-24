import React from 'react'
import { RangeFilter } from '../../../components/ui/RangeFilter'
import { Layers, Activity, Box, MapPin, Hash, Sparkles } from 'lucide-react'

export interface FilterPanelProps {
  dieType: string
  statusVal: string
  casing: string
  sizeMin: string
  sizeMax: string
  widthMin: string
  widthMax: string
  thickMin: string
  thickMax: string
  locationQuery: string
  onDieTypeChange: (value: string) => void
  onStatusChange: (value: string) => void
  onCasingChange: (value: string) => void
  onSizeMinChange: (value: string) => void
  onSizeMaxChange: (value: string) => void
  onWidthMinChange: (value: string) => void
  onWidthMaxChange: (value: string) => void
  onThickMinChange: (value: string) => void
  onThickMaxChange: (value: string) => void
  onLocationChange: (value: string) => void
}

export function FilterPanel({
  dieType,
  statusVal,
  casing,
  sizeMin,
  sizeMax,
  widthMin,
  widthMax,
  thickMin,
  thickMax,
  locationQuery,
  onDieTypeChange,
  onStatusChange,
  onCasingChange,
  onSizeMinChange,
  onSizeMaxChange,
  onWidthMinChange,
  onWidthMaxChange,
  onThickMinChange,
  onThickMaxChange,
  onLocationChange,
}: FilterPanelProps) {
  
  const handleDieTypeChange = (newType: string) => {
    onDieTypeChange(newType)
    // Clear sub-range filters on type swap
    onSizeMinChange('')
    onSizeMaxChange('')
    onWidthMinChange('')
    onWidthMaxChange('')
    onThickMinChange('')
    onThickMaxChange('')
  }

  const statuses = [
    { value: 'AVAILABLE', label: 'Available', color: 'var(--color-available)' },
    { value: 'RUNNING', label: 'Running', color: 'var(--color-running)' },
    { value: 'CLEANING', label: 'Cleaning', color: 'var(--color-cleaning)' },
    { value: 'POLISHING', label: 'Polishing', color: 'var(--color-polishing)' },
    { value: 'DAMAGED', label: 'Damaged', color: 'var(--color-damaged)' },
    { value: 'SCRAPPED', label: 'Scrapped', color: 'var(--color-scrapped)' },
    { value: 'MISSING', label: 'Missing', color: 'var(--color-missing)' },
    { value: 'MAINTENANCE', label: 'Maintenance', color: 'var(--color-cleaning)' }
  ]

  const handleStatusToggle = (status: string) => {
    if (statusVal === status) {
      onStatusChange('') // Clear if selected again
    } else {
      onStatusChange(status)
    }
  }

  return (
    <div className="flex flex-col space-y-6 w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 select-none shrink-0 font-sans">
      
      {/* 1. Die Type Toggles */}
      <div className="space-y-2.5">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] font-mono flex items-center">
          <Layers className="h-3.5 w-3.5 mr-1 text-blue-400" />
          <span>Die Type Class</span>
        </span>
        <div className="flex bg-slate-950 p-1 rounded-xl border border-[var(--color-border)]">
          <button
            type="button"
            onClick={() => handleDieTypeChange('')}
            className={`flex-1 py-1.5 rounded-lg text-xxs font-extrabold tracking-wider uppercase transition-all ${
              dieType === ''
                ? 'bg-slate-800 text-white shadow'
                : 'text-[var(--color-muted)] hover:text-white'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => handleDieTypeChange('ROUND')}
            className={`flex-1 py-1.5 rounded-lg text-xxs font-extrabold tracking-wider uppercase transition-all ${
              dieType === 'ROUND'
                ? 'bg-blue-600 text-white shadow'
                : 'text-[var(--color-muted)] hover:text-white'
            }`}
          >
            Round
          </button>
          <button
            type="button"
            onClick={() => handleDieTypeChange('FLAT')}
            className={`flex-1 py-1.5 rounded-lg text-xxs font-extrabold tracking-wider uppercase transition-all ${
              dieType === 'FLAT'
                ? 'bg-purple-600 text-white shadow'
                : 'text-[var(--color-muted)] hover:text-white'
            }`}
          >
            Flat
          </button>
        </div>
      </div>

      {/* 2. Status Checkbox List */}
      <div className="space-y-3">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] font-mono flex items-center">
          <Activity className="h-3.5 w-3.5 mr-1 text-emerald-500" />
          <span>Status Registry</span>
        </span>
        <div className="space-y-2">
          {statuses.map((item) => {
            const isChecked = statusVal === item.value
            return (
              <div 
                key={item.value} 
                onClick={() => handleStatusToggle(item.value)}
                className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition ${
                  isChecked 
                    ? 'bg-slate-950/40 border-[var(--color-border)] text-white' 
                    : 'border-transparent text-[var(--color-muted)] hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <span 
                    style={{ backgroundColor: item.color }} 
                    className="h-2 w-2 rounded-full shadow-sm shrink-0" 
                  />
                  <span className="text-xs font-semibold">{item.label}</span>
                </div>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {}} // Click handler on wrapper
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer pointer-events-none"
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* 3. Casing Text Input */}
      <div className="space-y-2">
        <label htmlFor="filter-casing" className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] font-mono flex items-center">
          <Box className="h-3.5 w-3.5 mr-1 text-indigo-400" />
          <span>Casing specs</span>
        </label>
        <input
          id="filter-casing"
          type="text"
          placeholder="e.g. 25x10"
          value={casing}
          onChange={(e) => onCasingChange(e.target.value)}
          className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl py-2 px-3 text-xs text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-blue-950/20 transition-all font-mono"
        />
      </div>

      {/* 4. Size & Dimension Ranges */}
      {dieType === 'ROUND' && (
        <RangeFilter
          label="Die Outer Size"
          minValue={sizeMin}
          maxValue={sizeMax}
          onMinChange={onSizeMinChange}
          onMaxChange={onSizeMaxChange}
          unit="mm"
        />
      )}

      {dieType === 'FLAT' && (
        <div className="space-y-5">
          <RangeFilter
            label="Die Plate Width"
            minValue={widthMin}
            maxValue={widthMax}
            onMinChange={onWidthMinChange}
            onMaxChange={onWidthMaxChange}
            unit="mm"
          />
          <RangeFilter
            label="Die Plate Thick"
            minValue={thickMin}
            maxValue={thickMax}
            onMinChange={onThickMinChange}
            onMaxChange={onThickMaxChange}
            unit="mm"
          />
        </div>
      )}

      {/* 5. Physical Location Input */}
      <div className="space-y-2">
        <label htmlFor="filter-location" className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] font-mono flex items-center">
          <MapPin className="h-3.5 w-3.5 mr-1 text-amber-500" />
          <span>Physical Location</span>
        </label>
        <div className="relative">
          <input
            id="filter-location"
            type="text"
            placeholder="e.g. Rack A"
            value={locationQuery}
            onChange={(e) => onLocationChange(e.target.value)}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl py-2 px-3 text-xs text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-blue-950/20 transition-all"
          />
        </div>
      </div>

    </div>
  )
}
