import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { validateDieCreate } from '../types/validation'

interface CreateDieModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: any) => void
  isSubmitting: boolean
  error: string | null
  setsList: any[]
}

export function CreateDieModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  error,
  setsList
}: CreateDieModalProps) {
  // Form states
  const [dieId, setDieId] = useState('')
  const [dieType, setDieType] = useState('ROUND')
  const [casing, setCasing] = useState('')
  const [status, setStatus] = useState('AVAILABLE')
  const [location, setLocation] = useState('')
  const [remarks, setRemarks] = useState('')
  const [currentSet, setCurrentSet] = useState('')
  
  // Round subfields
  const [originalSize, setOriginalSize] = useState('')
  const [currentSize, setCurrentSize] = useState('')
  
  // Flat subfields
  const [originalWidth, setOriginalWidth] = useState('')
  const [currentWidth, setCurrentWidth] = useState('')
  const [originalThickness, setOriginalThickness] = useState('')
  const [currentThickness, setCurrentThickness] = useState('')
  const [radius, setRadius] = useState('')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setDieId('')
      setDieType('ROUND')
      setCasing('')
      setStatus('AVAILABLE')
      setLocation('')
      setRemarks('')
      setCurrentSet('')
      setOriginalSize('')
      setCurrentSize('')
      setOriginalWidth('')
      setCurrentWidth('')
      setOriginalThickness('')
      setCurrentThickness('')
      setRadius('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setValidationErrors({})
    
    const payload: any = {
      die_id: dieId,
      die_type: dieType,
      casing,
      status,
      location,
      remarks,
      current_set: currentSet ? Number(currentSet) : null
    }

    if (dieType === 'ROUND') {
      payload.original_size = originalSize
      payload.current_size = currentSize
    } else {
      payload.original_width = originalWidth
      payload.current_width = currentWidth
      payload.original_thickness = originalThickness
      payload.current_thickness = currentThickness
      payload.radius = radius
    }

    // Validate payload against schema
    const validation = validateDieCreate(payload)
    if (!validation.success) {
      setValidationErrors(validation.errors || {})
      return
    }

    onSubmit(validation.data)
  }

  const getFieldError = (fieldName: string) => validationErrors[fieldName]

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-800/50 blueprint-grid relative">
        <div className="p-6 border-b border-slate-800/40 flex justify-between items-center relative z-10">
          <h2 className="text-xl font-bold text-white">Create Production Die</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 relative z-10">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl p-4 text-sm">
              {error}
            </div>
          )}
          
          {Object.keys(validationErrors).length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl p-4 text-sm">
              <p className="font-semibold mb-2">Please fix validation errors:</p>
              <ul className="list-disc list-inside space-y-1">
                {Object.entries(validationErrors).map(([field, error]) => (
                  <li key={field}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Die ID (Unique)</label>
              <input 
                type="text" 
                required
                value={dieId}
                onChange={(e) => setDieId(e.target.value)}
                className={`w-full glass-input rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none ${getFieldError('die_id') ? 'border-rose-500 bg-rose-950/10' : ''}`}
                placeholder="e.g. R-105"
              />
              {getFieldError('die_id') && (
                <p className="text-xs text-rose-400 mt-1">{getFieldError('die_id')}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Die Type</label>
              <select 
                value={dieType}
                onChange={(e) => setDieType(e.target.value)}
                className="w-full glass-input rounded-xl py-2.5 px-3.5 text-xs text-slate-350 focus:outline-none"
              >
                <option value="ROUND">Round</option>
                <option value="FLAT">Flat</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Casing</label>
              <input 
                type="text" 
                required
                placeholder="e.g. 25x10"
                value={casing}
                onChange={(e) => setCasing(e.target.value)}
                className={`w-full glass-input rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none ${getFieldError('casing') ? 'border-rose-500 bg-rose-950/10' : ''}`}
              />
              {getFieldError('casing') && (
                <p className="text-xs text-rose-400 mt-1">{getFieldError('casing')}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Status</label>
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full glass-input rounded-xl py-2.5 px-3.5 text-xs text-slate-350 focus:outline-none"
              >
                <option value="AVAILABLE">Available</option>
                <option value="RUNNING">Running</option>
                <option value="CLEANING">Cleaning</option>
                <option value="POLISHING">Polishing</option>
                <option value="DAMAGED">Damaged</option>
                <option value="SCRAPPED">Scrapped</option>
                <option value="MISSING">Missing</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="SCRAP">Scrap</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Location</label>
              <input 
                type="text" 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full glass-input rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none"
                placeholder="e.g. Rack A-1"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Assign Set</label>
              <select 
                value={currentSet}
                onChange={(e) => setCurrentSet(e.target.value)}
                className="w-full glass-input rounded-xl py-2.5 px-3.5 text-xs text-slate-350 focus:outline-none"
              >
                <option value="">— Unassigned —</option>
                {setsList?.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.machine_name})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Sizing Subfields */}
          <div className="border-t border-slate-800/40 pt-6">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Dimensions Specifications</h3>
            
            {dieType === 'ROUND' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Original Size (mm)</label>
                  <input 
                    type="number" 
                    step="0.001"
                    required
                    value={originalSize}
                    onChange={(e) => setOriginalSize(e.target.value)}
                    className={`w-full glass-input rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none ${getFieldError('original_size') ? 'border-rose-500 bg-rose-950/10' : ''}`}
                    placeholder="e.g. 2.5"
                  />
                  {getFieldError('original_size') && (
                    <p className="text-xs text-rose-400 mt-1">{getFieldError('original_size')}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Current Size (mm)</label>
                  <input 
                    type="number" 
                    step="0.001"
                    required
                    value={currentSize}
                    onChange={(e) => setCurrentSize(e.target.value)}
                    className={`w-full glass-input rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none ${getFieldError('current_size') ? 'border-rose-500 bg-rose-950/10' : ''}`}
                    placeholder="e.g. 2.5"
                  />
                  {getFieldError('current_size') && (
                    <p className="text-xs text-rose-400 mt-1">{getFieldError('current_size')}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Original Width (mm)</label>
                  <input 
                    type="number" 
                    step="0.001"
                    required
                    value={originalWidth}
                    onChange={(e) => setOriginalWidth(e.target.value)}
                    className={`w-full glass-input rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none ${getFieldError('original_width') ? 'border-rose-500 bg-rose-950/10' : ''}`}
                  />
                  {getFieldError('original_width') && (
                    <p className="text-xs text-rose-400 mt-1">{getFieldError('original_width')}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Current Width (mm)</label>
                  <input 
                    type="number" 
                    step="0.001"
                    required
                    value={currentWidth}
                    onChange={(e) => setCurrentWidth(e.target.value)}
                    className={`w-full glass-input rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none ${getFieldError('current_width') ? 'border-rose-500 bg-rose-950/10' : ''}`}
                  />
                  {getFieldError('current_width') && (
                    <p className="text-xs text-rose-400 mt-1">{getFieldError('current_width')}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Original Thickness (mm)</label>
                  <input 
                    type="number" 
                    step="0.001"
                    required
                    value={originalThickness}
                    onChange={(e) => setOriginalThickness(e.target.value)}
                    className={`w-full glass-input rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none ${getFieldError('original_thickness') ? 'border-rose-500 bg-rose-950/10' : ''}`}
                  />
                  {getFieldError('original_thickness') && (
                    <p className="text-xs text-rose-400 mt-1">{getFieldError('original_thickness')}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Current Thickness (mm)</label>
                  <input 
                    type="number" 
                    step="0.001"
                    required
                    value={currentThickness}
                    onChange={(e) => setCurrentThickness(e.target.value)}
                    className={`w-full glass-input rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none ${getFieldError('current_thickness') ? 'border-rose-500 bg-rose-950/10' : ''}`}
                  />
                  {getFieldError('current_thickness') && (
                    <p className="text-xs text-rose-400 mt-1">{getFieldError('current_thickness')}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Radius (mm)</label>
                  <input 
                    type="number" 
                    step="0.001"
                    required
                    value={radius}
                    onChange={(e) => setRadius(e.target.value)}
                    className={`w-full glass-input rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none ${getFieldError('radius') ? 'border-rose-500 bg-rose-950/10' : ''}`}
                  />
                  {getFieldError('radius') && (
                    <p className="text-xs text-rose-400 mt-1">{getFieldError('radius')}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Remarks</label>
            <textarea 
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full glass-input rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none"
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-slate-800/40">
            <button 
              type="button" 
              onClick={onClose}
              className="bg-slate-950/40 border border-slate-800 hover:border-slate-700 text-slate-300 px-5 py-2.5 rounded-xl font-semibold text-xs transition"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-2.5 rounded-xl font-semibold text-xs btn-glow glow-blue flex items-center space-x-1"
            >
              <span>{isSubmitting ? 'Creating...' : 'Create Die'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
