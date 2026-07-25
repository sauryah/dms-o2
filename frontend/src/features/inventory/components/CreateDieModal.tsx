import React, { useState, useEffect, useRef } from 'react'
import { X, Check } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '../../../hooks/useApi'
import { useAuth } from '../../../contexts/AuthContext'
import { validateDieCreate } from '../../../types/validation'
import { SearchableSelect } from '../../../components/SearchableSelect'
import { StepWizard } from '../../../components/ui/StepWizard'

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
  const { token } = useAuth()
  // Form states
  const [dieId, setDieId] = useState('')
  const [dieType, setDieType] = useState<string>('')
  const [casing, setCasing] = useState('')
  const [status, setStatus] = useState('AVAILABLE')
  const [rack, setRack] = useState('')
  const [shelf, setShelf] = useState('')
  const [remarks, setRemarks] = useState('')
  const [currentSet, setCurrentSet] = useState('')
  const [currentStep, setCurrentStep] = useState(0)

  const { request } = useApi()
  const { data: racksList } = useQuery({
    queryKey: ['racksList'],
    queryFn: () => request('/api/racks/'),
    enabled: isOpen
  })
  const racks = racksList || []
  
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

  // Uniqueness states
  const [dieIdExists, setDieIdExists] = useState(false)
  const [checkingUniqueness, setCheckingUniqueness] = useState(false)

  // Refs for accessibility and focus trap
  const modalRef = useRef<HTMLDivElement>(null)
  const firstInputRef = useRef<HTMLInputElement>(null)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setDieId('')
      setDieType('')
      setCasing('')
      setStatus('AVAILABLE')
      setRack('')
      setShelf('')
      setRemarks('')
      setCurrentSet('')
      setOriginalSize('')
      setCurrentSize('')
      setOriginalWidth('')
      setCurrentWidth('')
      setOriginalThickness('')
      setCurrentThickness('')
      setRadius('')
      setValidationErrors({})
      setDieIdExists(false)
      setCheckingUniqueness(false)
      setCurrentStep(0)
    }
  }, [isOpen])

  // Focus trap and Escape key listener
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose()
        return
      }

      if (e.key === 'Tab') {
        if (!modalRef.current) return
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex="0"]'
        )
        if (focusableElements.length === 0) return
        
        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus()
            e.preventDefault()
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus()
            e.preventDefault()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, isSubmitting])

  if (!isOpen) return null

  // Check uniqueness on blur of die_id field
  const handleDieIdBlur = async () => {
    const val = dieId.trim()
    if (!val) return
    setCheckingUniqueness(true)
    try {
      const res = await fetch(`/api/dies/${val}/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      if (res.status === 200) {
        setDieIdExists(true)
        setValidationErrors(prev => ({ ...prev, die_id: 'Die ID already exists in database' }))
      } else {
        setDieIdExists(false)
        setValidationErrors(prev => {
          const next = { ...prev }
          delete next.die_id
          return next
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setCheckingUniqueness(false)
    }
  }

  const handleFieldChange = (field: string, value: string, setter: (val: string) => void) => {
    setter(value)
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
    if (field === 'die_id') {
      setDieIdExists(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    setValidationErrors({})
    
    const selectedRack = racks.find((r: any) => String(r.id) === String(rack))
    const finalLocation = selectedRack && shelf ? `${selectedRack.name} - Shelf ${shelf}` : ''

    const payload: any = {
      die_id: dieId.trim(),
      die_type: dieType,
      casing: casing.trim(),
      status,
      location: finalLocation,
      rack: rack ? Number(rack) : null,
      shelf: shelf ? Number(shelf) : null,
      remarks: remarks.trim(),
      current_set: currentSet ? Number(currentSet) : null
    }

    if (dieType === 'ROUND') {
      payload.punched_size = originalSize
      payload.current_size = currentSize
    } else {
      payload.punched_width = originalWidth
      payload.current_width = currentWidth
      payload.punched_thickness = originalThickness
      payload.current_thickness = currentThickness
      payload.radius = radius
    }

    // Validate payload against schema
    const validation = validateDieCreate(payload)
    if (!validation.success) {
      setValidationErrors(validation.errors || {})
      const errFields = Object.keys(validation.errors || {})
      if (errFields.some(f => ['die_id', 'casing'].includes(f))) {
        setCurrentStep(1)
      } else if (errFields.some(f => ['punched_size', 'current_size', 'punched_width', 'current_width', 'punched_thickness', 'current_thickness', 'radius'].includes(f))) {
        setCurrentStep(2)
      } else {
        setCurrentStep(3)
      }
      return
    }

    onSubmit(validation.data)
  }

  const getFieldError = (fieldName: string) => validationErrors[fieldName]

  // Step validation helpers for Next button disabling
  const isStep1Valid = dieType !== ''
  const isStep2Valid = dieId.trim() !== '' && casing.trim() !== '' && !dieIdExists && !checkingUniqueness
  const isStep3Valid = dieType === 'ROUND'
    ? (originalSize.trim() !== '' && currentSize.trim() !== '')
    : (originalWidth.trim() !== '' && currentWidth.trim() !== '' && originalThickness.trim() !== '' && currentThickness.trim() !== '' && radius.trim() !== '')
  const isStep4Valid = true // Optional set assignment

  const selectedSetObj = setsList?.find((s: any) => String(s.id) === String(currentSet))
  const machineName = selectedSetObj ? (selectedSetObj.machine_name || 'No Machine') : ''
  const selectedRackObj = racks.find((r: any) => String(r.id) === String(rack))
  const displayLocation = selectedRackObj && shelf ? `${selectedRackObj.name} - Shelf ${shelf}` : 'Unassigned'

  // Steps definition for StepWizard
  const steps = [
    {
      label: 'Choose Type',
      content: (
        <div className="flex flex-col items-center justify-center py-6 space-y-6">
          <p className="text-sm font-semibold text-slate-300">Select the geometric profile class of this die asset</p>
          <div className="grid grid-cols-2 gap-6 w-full max-w-md">
            <button
              type="button"
              onClick={() => {
                setDieType('ROUND')
                setOriginalWidth('')
                setCurrentWidth('')
                setOriginalThickness('')
                setCurrentThickness('')
                setRadius('')
              }}
              className={`p-6 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center justify-center space-y-3 cursor-pointer ${
                dieType === 'ROUND'
                  ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10 text-white'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className={`h-12 w-12 rounded-full border-2 flex items-center justify-center font-bold font-mono ${
                dieType === 'ROUND' ? 'border-blue-400' : 'border-slate-700'
              }`}>
                Ø
              </div>
              <span className="text-sm font-bold uppercase tracking-wider">Round Die</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDieType('FLAT')
                setOriginalSize('')
                setCurrentSize('')
              }}
              className={`p-6 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center justify-center space-y-3 cursor-pointer ${
                dieType === 'FLAT'
                  ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/10 text-white'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className={`h-12 w-20 rounded border-2 flex items-center justify-center font-bold text-xs ${
                dieType === 'FLAT' ? 'border-purple-400' : 'border-slate-700'
              }`}>
                W × T
              </div>
              <span className="text-sm font-bold uppercase tracking-wider">Flat Die</span>
            </button>
          </div>
        </div>
      )
    },
    {
      label: 'Identity',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
          <div>
            <label htmlFor="form-die-id" className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Die ID (Unique Identifier) <span className="text-rose-500">*</span>
            </label>
            <input 
              id="form-die-id"
              ref={firstInputRef}
              type="text" 
              required
              disabled={isSubmitting}
              value={dieId}
              onChange={(e) => handleFieldChange('die_id', e.target.value, setDieId)}
              onBlur={handleDieIdBlur}
              className={`w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-white focus-ring ${
                getFieldError('die_id') ? 'border-rose-500 bg-rose-950/10 focus:border-rose-500' : ''
              }`}
              placeholder="e.g. R-105"
              aria-invalid={!!getFieldError('die_id')}
            />
            {checkingUniqueness && (
              <p className="text-xxs text-blue-400 mt-1.5 animate-pulse">Verifying ID uniqueness...</p>
            )}
            {getFieldError('die_id') && (
              <p className="text-xxs text-rose-400 mt-1.5 font-medium">{getFieldError('die_id')}</p>
            )}
          </div>

          <div>
            <label htmlFor="form-casing" className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Casing Size (mm) <span className="text-rose-500">*</span>
            </label>
            <input 
              id="form-casing"
              type="text" 
              required
              disabled={isSubmitting}
              placeholder="e.g. 25x10"
              value={casing}
              onChange={(e) => handleFieldChange('casing', e.target.value, setCasing)}
              className={`w-full bg-slate-955 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-white focus-ring ${
                getFieldError('casing') ? 'border-rose-500 bg-rose-950/10 focus:border-rose-500' : ''
              }`}
              aria-invalid={!!getFieldError('casing')}
            />
            {getFieldError('casing') && (
              <p className="text-xxs text-rose-400 mt-1.5 font-medium">{getFieldError('casing')}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="form-rack" className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Storage Rack (optional)
              </label>
              <select 
                id="form-rack"
                value={rack}
                disabled={isSubmitting}
                onChange={(e) => handleFieldChange('rack', e.target.value, setRack)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 focus-ring cursor-pointer"
              >
                <option value="">Select Rack...</option>
                {racks.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="form-shelf" className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Shelf (optional)
              </label>
              <input 
                id="form-shelf"
                type="number"
                min="1"
                disabled={isSubmitting}
                value={shelf}
                onChange={(e) => handleFieldChange('shelf', e.target.value, setShelf)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-white focus-ring"
                placeholder="e.g. 3"
              />
            </div>
          </div>

          <div>
            <label htmlFor="form-remarks" className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Remarks (optional)
            </label>
            <input 
              id="form-remarks"
              type="text" 
              disabled={isSubmitting}
              value={remarks}
              onChange={(e) => handleFieldChange('remarks', e.target.value, setRemarks)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-white focus-ring"
              placeholder="e.g. High tolerance wire drawing die"
            />
          </div>
        </div>
      )
    },
    {
      label: 'Measurements',
      content: (
        <div className="py-2">
          {dieType === 'ROUND' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
              <div>
                <label htmlFor="form-round-punched" className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Original / Punched Diameter (mm) <span className="text-rose-500">*</span>
                </label>
                <input 
                  id="form-round-punched"
                  type="number" 
                  step="0.001"
                  required
                  disabled={isSubmitting}
                  value={originalSize}
                  onChange={(e) => handleFieldChange('punched_size', e.target.value, setOriginalSize)}
                  className={`w-full bg-slate-955 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-white focus-ring font-mono ${
                    getFieldError('punched_size') ? 'border-rose-500 bg-rose-950/10 focus:border-rose-500' : ''
                  }`}
                  placeholder="e.g. 2.400"
                  aria-invalid={!!getFieldError('punched_size')}
                />
                {getFieldError('punched_size') && (
                  <p className="text-xxs text-rose-400 mt-1.5 font-medium">{getFieldError('punched_size')}</p>
                )}
              </div>
              <div>
                <label htmlFor="form-round-current" className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Current Measured Diameter (mm) <span className="text-rose-500">*</span>
                </label>
                <input 
                  id="form-round-current"
                  type="number" 
                  step="0.001"
                  required
                  disabled={isSubmitting}
                  value={currentSize}
                  onChange={(e) => handleFieldChange('current_size', e.target.value, setCurrentSize)}
                  className={`w-full bg-slate-955 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-white focus-ring font-mono ${
                    getFieldError('current_size') ? 'border-rose-500 bg-rose-950/10 focus:border-rose-500' : ''
                  }`}
                  placeholder="e.g. 2.420"
                  aria-invalid={!!getFieldError('current_size')}
                />
                {getFieldError('current_size') && (
                  <p className="text-xxs text-rose-400 mt-1.5 font-medium">{getFieldError('current_size')}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
              <div>
                <label htmlFor="form-flat-punched-width" className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Original / Punched Width (mm) <span className="text-rose-500">*</span>
                </label>
                <input 
                  id="form-flat-punched-width"
                  type="number" 
                  step="0.001"
                  required
                  disabled={isSubmitting}
                  value={originalWidth}
                  onChange={(e) => handleFieldChange('punched_width', e.target.value, setOriginalWidth)}
                  className={`w-full bg-slate-955 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-white focus-ring font-mono ${
                    getFieldError('punched_width') ? 'border-rose-500 bg-rose-950/10 focus:border-rose-500' : ''
                  }`}
                  placeholder="e.g. 10.000"
                  aria-invalid={!!getFieldError('punched_width')}
                />
                {getFieldError('punched_width') && (
                  <p className="text-xxs text-rose-400 mt-1.5 font-medium">{getFieldError('punched_width')}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="form-flat-curr-width" className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Current Measured Width (mm) <span className="text-rose-500">*</span>
                </label>
                <input 
                  id="form-flat-curr-width"
                  type="number" 
                  step="0.001"
                  required
                  disabled={isSubmitting}
                  value={currentWidth}
                  onChange={(e) => handleFieldChange('current_width', e.target.value, setCurrentWidth)}
                  className={`w-full bg-slate-955 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-white focus-ring font-mono ${
                    getFieldError('current_width') ? 'border-rose-500 bg-rose-950/10 focus:border-rose-500' : ''
                  }`}
                  placeholder="e.g. 10.020"
                  aria-invalid={!!getFieldError('current_width')}
                />
                {getFieldError('current_width') && (
                  <p className="text-xxs text-rose-400 mt-1.5 font-medium">{getFieldError('current_width')}</p>
                )}
              </div>

              <div>
                <label htmlFor="form-flat-punched-thick" className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Original / Punched Thickness (mm) <span className="text-rose-500">*</span>
                </label>
                <input 
                  id="form-flat-punched-thick"
                  type="number" 
                  step="0.001"
                  required
                  disabled={isSubmitting}
                  value={originalThickness}
                  onChange={(e) => handleFieldChange('punched_thickness', e.target.value, setOriginalThickness)}
                  className={`w-full bg-slate-955 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-white focus-ring font-mono ${
                    getFieldError('punched_thickness') ? 'border-rose-500 bg-rose-950/10 focus:border-rose-500' : ''
                  }`}
                  placeholder="e.g. 3.000"
                  aria-invalid={!!getFieldError('punched_thickness')}
                />
                {getFieldError('punched_thickness') && (
                  <p className="text-xxs text-rose-400 mt-1.5 font-medium">{getFieldError('punched_thickness')}</p>
                )}
              </div>

              <div>
                <label htmlFor="form-flat-curr-thick" className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Current Measured Thickness (mm) <span className="text-rose-500">*</span>
                </label>
                <input 
                  id="form-flat-curr-thick"
                  type="number" 
                  step="0.001"
                  required
                  disabled={isSubmitting}
                  value={currentThickness}
                  onChange={(e) => handleFieldChange('current_thickness', e.target.value, setCurrentThickness)}
                  className={`w-full bg-slate-955 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-white focus-ring font-mono ${
                    getFieldError('current_thickness') ? 'border-rose-500 bg-rose-950/10 focus:border-rose-500' : ''
                  }`}
                  placeholder="e.g. 3.010"
                  aria-invalid={!!getFieldError('current_thickness')}
                />
                {getFieldError('current_thickness') && (
                  <p className="text-xxs text-rose-400 mt-1.5 font-medium">{getFieldError('current_thickness')}</p>
                )}
              </div>

              <div>
                <label htmlFor="form-flat-radius" className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Corner Radius (mm) <span className="text-rose-500">*</span>
                </label>
                <input 
                  id="form-flat-radius"
                  type="number" 
                  step="0.001"
                  required
                  disabled={isSubmitting}
                  value={radius}
                  onChange={(e) => handleFieldChange('radius', e.target.value, setRadius)}
                  className={`w-full bg-slate-955 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-white focus-ring font-mono ${
                    getFieldError('radius') ? 'border-rose-500 bg-rose-950/10 focus:border-rose-500' : ''
                  }`}
                  placeholder="e.g. 0.500"
                  aria-invalid={!!getFieldError('radius')}
                />
                {getFieldError('radius') && (
                  <p className="text-xxs text-rose-400 mt-1.5 font-medium">{getFieldError('radius')}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      label: 'Assignment',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
          <div>
            <label htmlFor="form-set" className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Select Production Set
            </label>
            <SearchableSelect
              id="form-set"
              value={currentSet}
              disabled={isSubmitting}
              onChange={(val) => handleFieldChange('current_set', String(val), setCurrentSet)}
              options={setsList?.map((s: any) => ({
                value: s.id,
                label: `${s.name} (${s.machine_name || 'No Machine'})`
              })) || []}
              placeholder="Assign to set (optional)..."
              emptyLabel="— Leave Unassigned —"
              className="bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 focus-ring"
            />
            <p className="text-[10px] text-slate-500 mt-2">Optional assignment to set. You can click Next or Skip to bypass.</p>
          </div>
          <div>
            <label htmlFor="form-set-machine" className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Assigned Machine Name (Read-Only)
            </label>
            <input 
              id="form-set-machine"
              type="text" 
              readOnly
              value={machineName || 'Unassigned / Stand-alone'}
              className="w-full bg-slate-955/50 border border-slate-800/80 text-slate-500 rounded-xl py-2.5 px-3.5 text-xs font-mono font-medium outline-none"
              placeholder="Machine name auto-populates"
            />
          </div>
        </div>
      )
    },
    {
      label: 'Review',
      content: (
        <div className="bg-slate-950/30 border border-slate-850 rounded-2xl overflow-hidden font-sans text-xs">
          <table className="w-full text-left border-collapse">
            <tbody>
              <tr className="border-b border-slate-850">
                <td className="p-3.5 font-bold text-[var(--color-muted)] w-1/3">Die Type</td>
                <td className="p-3.5 font-mono text-white">{dieType}</td>
              </tr>
              <tr className="border-b border-slate-850">
                <td className="p-3.5 font-bold text-[var(--color-muted)]">Die ID</td>
                <td className="p-3.5 font-mono text-white font-bold">{dieId}</td>
              </tr>
              <tr className="border-b border-slate-850">
                <td className="p-3.5 font-bold text-[var(--color-muted)]">Casing Size</td>
                <td className="p-3.5 font-mono text-white">{casing} mm</td>
              </tr>
              <tr className="border-b border-slate-850">
                <td className="p-3.5 font-bold text-[var(--color-muted)]">Status</td>
                <td className="p-3.5 text-white font-semibold">{status}</td>
              </tr>
              <tr className="border-b border-slate-850">
                <td className="p-3.5 font-bold text-[var(--color-muted)]">Physical Location</td>
                <td className="p-3.5 text-white font-semibold">{displayLocation}</td>
              </tr>
              {dieType === 'ROUND' ? (
                <>
                  <tr className="border-b border-slate-850">
                    <td className="p-3.5 font-bold text-[var(--color-muted)]">Nominal / Punched Size</td>
                    <td className="p-3.5 font-mono text-white">{originalSize} mm</td>
                  </tr>
                  <tr className="border-b border-slate-850">
                    <td className="p-3.5 font-bold text-[var(--color-muted)]">Current Size</td>
                    <td className="p-3.5 font-mono text-white">{currentSize} mm</td>
                  </tr>
                </>
              ) : (
                <>
                  <tr className="border-b border-slate-850">
                    <td className="p-3.5 font-bold text-[var(--color-muted)]">Punched Width × Thickness</td>
                    <td className="p-3.5 font-mono text-white">{originalWidth} × {originalThickness} mm</td>
                  </tr>
                  <tr className="border-b border-slate-850">
                    <td className="p-3.5 font-bold text-[var(--color-muted)]">Current Width × Thickness</td>
                    <td className="p-3.5 font-mono text-white">{currentWidth} × {currentThickness} mm</td>
                  </tr>
                  <tr className="border-b border-slate-850">
                    <td className="p-3.5 font-bold text-[var(--color-muted)]">Fillet Radius</td>
                    <td className="p-3.5 font-mono text-white">{radius} mm</td>
                  </tr>
                </>
              )}
              <tr className="border-b border-slate-850">
                <td className="p-3.5 font-bold text-[var(--color-muted)]">Production Assignment</td>
                <td className="p-3.5 text-white">
                  {selectedSetObj ? `${selectedSetObj.name} (${selectedSetObj.machine_name})` : 'Floor Stock (Unassigned)'}
                </td>
              </tr>
              {remarks && (
                <tr>
                  <td className="p-3.5 font-bold text-[var(--color-muted)]">Remarks</td>
                  <td className="p-3.5 text-slate-300 italic">{remarks}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )
    }
  ]

  return (
    <div 
      className="fixed inset-0 bg-slate-955/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-die-modal-title"
      aria-describedby="create-die-modal-description"
      onClick={() => {
        if (!isSubmitting) onClose()
      }}
    >
      <p id="create-die-modal-description" className="sr-only">
        Form to register a new production die with dimensional specifications.
      </p>
      
      <div 
        ref={modalRef}
        className="bg-slate-900 border border-slate-800/80 rounded-2xl max-w-2xl w-full my-8 shadow-2xl relative animate-fadeIn animate-duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800/40 flex justify-between items-center relative z-10">
          <div>
            <h2 id="create-die-modal-title" className="text-lg font-bold text-white tracking-tight font-heading">
              Register New Die Asset
            </h2>
            <p className="text-xxs text-slate-400 uppercase font-semibold tracking-wider mt-1">Multi-Step Precision wizard</p>
          </div>
          <button 
            onClick={onClose} 
            disabled={isSubmitting}
            aria-label="Close modal"
            className="text-slate-400 hover:text-white hover:bg-slate-800/50 p-2 rounded-xl transition duration-150 focus-ring disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Form Body */}
        <div className="p-6 relative z-10">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl p-4 text-xs font-medium mb-6 animate-fadeIn">
              {error}
            </div>
          )}
          
          {Object.keys(validationErrors).length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl p-4 text-xs mb-6 animate-fadeIn">
              <p className="font-bold mb-2">Please fix validation errors:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-300 font-mono">
                {Object.entries(validationErrors).map(([field, errorMsg]) => (
                  <li key={field}>
                    <span className="font-semibold text-amber-400 capitalize">{field.replace('_', ' ')}</span>: {errorMsg}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Integrate StepWizard */}
          <StepWizard
            steps={steps}
            currentStep={currentStep}
            onBack={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            onNext={() => setCurrentStep(prev => Math.min(steps.length - 1, prev + 1))}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            nextDisabled={
              currentStep === 0 ? !isStep1Valid : 
              currentStep === 1 ? !isStep2Valid : 
              currentStep === 2 ? !isStep3Valid : 
              currentStep === 3 ? !isStep4Valid : 
              false
            }
          />
        </div>
      </div>
    </div>
  )
}
