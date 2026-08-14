import React from 'react'
import { RangeFilter } from '../../../components/ui/RangeFilter'
import { Layers, Activity, Box, MapPin } from 'lucide-react'

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
    { value: 'AVAILABLE', label: 'AVAILABLE', color: '#10b981' },
    { value: 'RUNNING', label: 'RUNNING', color: '#3b82f6' },
    { value: 'CLEANING', label: 'CLEANING', color: '#f59e0b' },
    { value: 'POLISHING', label: 'POLISHING', color: '#8b5cf6' },
    { value: 'DAMAGED', label: 'DAMAGED', color: '#f97316' },
    { value: 'SCRAPPED', label: 'SCRAPPED', color: '#ef4444' },
    { value: 'MISSING', label: 'MISSING', color: '#6b7280' },
    { value: 'MAINTENANCE', label: 'MAINTENANCE', color: '#f59e0b' }
  ]

  const handleStatusToggle = (status: string) => {
    if (statusVal === status) {
      onStatusChange('') // Clear if selected again
    } else {
      onStatusChange(status)
    }
  }

  return (
    <div className="flex flex-col space-y-4 w-full bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-3.5 shrink-0 font-mono text-xs">
      
      {/* 1. Die Type Toggles */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-[#6b7280] font-mono flex items-center">
          <Layers className="h-3 w-3 mr-1 text-blue-400" />
          <span>01 DIE TYPE</span>
        </span>
        <div className="flex bg-[#0a0a0a] p-0.5 rounded-sm border border-[#2a2a2a]">
          <button
            type="button"
            onClick={() => handleDieTypeChange('')}
            className={`flex-1 py-1 rounded-sm text-[10px] uppercase font-mono tracking-wider transition-colors ${
              dieType === ''
                ? 'bg-[#141414] text-[#e4e4e4] border border-[#2a2a2a]'
                : 'text-[#6b7280] hover:text-[#e4e4e4]'
            }`}
          >
            ALL
          </button>
          <button
            type="button"
            onClick={() => handleDieTypeChange('ROUND')}
            className={`flex-1 py-1 rounded-sm text-[10px] uppercase font-mono tracking-wider transition-colors ${
              dieType === 'ROUND'
                ? 'bg-[#141414] text-blue-400 border border-blue-500/40'
                : 'text-[#6b7280] hover:text-[#e4e4e4]'
            }`}
          >
            ROUND
          </button>
          <button
            type="button"
            onClick={() => handleDieTypeChange('FLAT')}
            className={`flex-1 py-1 rounded-sm text-[10px] uppercase font-mono tracking-wider transition-colors ${
              dieType === 'FLAT'
                ? 'bg-[#141414] text-purple-400 border border-purple-500/40'
                : 'text-[#6b7280] hover:text-[#e4e4e4]'
            }`}
          >
            FLAT
          </button>
        </div>
      </div>

      {/* 2. Status Checkbox List */}
      <div className="space-y-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-[#6b7280] font-mono flex items-center">
          <Activity className="h-3 w-3 mr-1 text-emerald-500" />
          <span>02 STATUS</span>
        </span>
        <div className="space-y-1">
          {statuses.map((item) => {
            const isChecked = statusVal === item.value
            return (
              <div 
                key={item.value} 
                onClick={() => handleStatusToggle(item.value)}
                className={`flex items-center justify-between p-1.5 rounded-sm border cursor-pointer transition-colors ${
                  isChecked 
                    ? 'bg-[#141414] border-[#2a2a2a] text-[#e4e4e4]' 
                    : 'border-transparent text-[#6b7280] hover:text-[#e4e4e4] hover:bg-[#141414]'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span 
                    style={{ backgroundColor: item.color }} 
                    className="h-1.5 w-1.5 rounded-full shrink-0" 
                  />
                  <span className="text-[11px] uppercase tracking-wider">{item.label}</span>
                </div>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {}} // Click handler on wrapper
                  className="h-3.5 w-3.5 rounded-sm border-[#2a2a2a] bg-[#0a0a0a] text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer pointer-events-none"
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* 3. Casing Text Input */}
      <div className="space-y-1.5">
        <label htmlFor="filter-casing" className="text-[10px] font-medium uppercase tracking-wider text-[#6b7280] font-mono flex items-center">
          <Box className="h-3 w-3 mr-1 text-indigo-400" />
          <span>03 CASING</span>
        </label>
        <input
          id="filter-casing"
          type="text"
          placeholder="e.g. 25x10"
          value={casing}
          onChange={(e) => onCasingChange(e.target.value)}
          className="w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm py-1.5 px-2 text-xs text-[#e4e4e4] placeholder-[#404040] focus:outline-none transition-colors font-mono uppercase"
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
        <div className="space-y-3">
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
      <div className="space-y-1.5">
        <label htmlFor="filter-location" className="text-[10px] font-medium uppercase tracking-wider text-[#6b7280] font-mono flex items-center">
          <MapPin className="h-3 w-3 mr-1 text-amber-500" />
          <span>04 LOCATION</span>
        </label>
        <div className="relative">
          <input
            id="filter-location"
            type="text"
            placeholder="e.g. Rack A"
            value={locationQuery}
            onChange={(e) => onLocationChange(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm py-1.5 px-2 text-xs text-[#e4e4e4] placeholder-[#404040] focus:outline-none transition-colors font-mono uppercase"
          />
        </div>
      </div>

    </div>
  )
}
