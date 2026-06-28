import React from 'react'

interface FilterPanelProps {
  dieType: string
  statusVal: string
  casing: string
  sizeMin: string
  sizeMax: string
  widthMin: string
  widthMax: string
  thickMin: string
  thickMax: string
  onDieTypeChange: (value: string) => void
  onStatusChange: (value: string) => void
  onCasingChange: (value: string) => void
  onSizeMinChange: (value: string) => void
  onSizeMaxChange: (value: string) => void
  onWidthMinChange: (value: string) => void
  onWidthMaxChange: (value: string) => void
  onThickMinChange: (value: string) => void
  onThickMaxChange: (value: string) => void
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
  onDieTypeChange,
  onStatusChange,
  onCasingChange,
  onSizeMinChange,
  onSizeMaxChange,
  onWidthMinChange,
  onWidthMaxChange,
  onThickMinChange,
  onThickMaxChange,
}: FilterPanelProps) {
  const handleDieTypeChange = (newType: string) => {
    onDieTypeChange(newType)
    // Clear size filters when changing die type
    onSizeMinChange('')
    onSizeMaxChange('')
    onWidthMinChange('')
    onWidthMaxChange('')
    onThickMinChange('')
    onThickMaxChange('')
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-slate-800/40 relative z-10">
      {/* Die Type Select */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Die Type</label>
        <select
          value={dieType}
          onChange={(e) => handleDieTypeChange(e.target.value)}
          className="w-full glass-input rounded-xl py-2.5 px-3.5 text-slate-350 focus:outline-none text-xs"
        >
          <option value="">All Types</option>
          <option value="ROUND">Round</option>
          <option value="FLAT">Flat</option>
        </select>
      </div>

      {/* Status Select */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Status</label>
        <select
          value={statusVal}
          onChange={(e) => onStatusChange(e.target.value)}
          className="w-full glass-input rounded-xl py-2.5 px-3.5 text-slate-350 focus:outline-none text-xs"
        >
          <option value="">All Statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="RUNNING">Running</option>
          <option value="CLEANING">Cleaning</option>
          <option value="POLISHING">Polishing</option>
          <option value="DAMAGED">Damaged</option>
          <option value="SCRAPPED">Scrapped</option>
          <option value="MISSING">Missing</option>
          <option value="MAINTENANCE">Maintenance</option>
        </select>
      </div>

      {/* Casing Input */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Casing</label>
        <input
          type="text"
          placeholder="e.g. 25x10"
          value={casing}
          onChange={(e) => onCasingChange(e.target.value)}
          className="w-full glass-input rounded-xl py-2.5 px-3.5 text-slate-300 focus:outline-none text-xs"
        />
      </div>

      {/* ROUND Die Size Range */}
      {dieType === 'ROUND' && (
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Size Range (mm)</label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.001"
              placeholder="Min"
              value={sizeMin}
              onChange={(e) => onSizeMinChange(e.target.value)}
              className="w-1/2 glass-input rounded-xl py-2.5 px-3 text-slate-300 focus:outline-none text-xs"
            />
            <input
              type="number"
              step="0.001"
              placeholder="Max"
              value={sizeMax}
              onChange={(e) => onSizeMaxChange(e.target.value)}
              className="w-1/2 glass-input rounded-xl py-2.5 px-3 text-slate-300 focus:outline-none text-xs"
            />
          </div>
        </div>
      )}

      {/* FLAT Die Size Ranges */}
      {dieType === 'FLAT' && (
        <>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Width (mm)</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.001"
                placeholder="Min"
                value={widthMin}
                onChange={(e) => onWidthMinChange(e.target.value)}
                className="w-1/2 glass-input rounded-xl py-2.5 px-3 text-slate-300 focus:outline-none text-xs"
              />
              <input
                type="number"
                step="0.001"
                placeholder="Max"
                value={widthMax}
                onChange={(e) => onWidthMaxChange(e.target.value)}
                className="w-1/2 glass-input rounded-xl py-2.5 px-3 text-slate-300 focus:outline-none text-xs"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Thickness (mm)</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.001"
                placeholder="Min"
                value={thickMin}
                onChange={(e) => onThickMinChange(e.target.value)}
                className="w-1/2 glass-input rounded-xl py-2.5 px-3 text-slate-300 focus:outline-none text-xs"
              />
              <input
                type="number"
                step="0.001"
                placeholder="Max"
                value={thickMax}
                onChange={(e) => onThickMaxChange(e.target.value)}
                className="w-1/2 glass-input rounded-xl py-2.5 px-3 text-slate-300 focus:outline-none text-xs"
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
