import React, { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '../../../hooks/useApi'
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
  // Form states
  const [dieId, setDieId] = useState('')
  const [dieType, setDieType] = useState('ROUND')
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

  // Refs for accessibility and focus trap
  const modalRef = useRef<HTMLDivElement>(null)
  const firstInputRef = useRef<HTMLInputElement>(null)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setDieId('')
      setDieType('ROUND')
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
      setCurrentStep(0)
      
      // Autofocus first field
      const timer = setTimeout(() => {
        firstInputRef.current?.focus()
      }, 80)
      return () => clearTimeout(timer)
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

  const handleFieldChange = (field: string, value: string, setter: (val: string) => void) => {
    setter(value)
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const next = { ...prev }
        delete next[field]
        return next
      })
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
      // Check which step the validation error belongs to, and slide to that step
      const errFields = Object.keys(validation.errors || {})
      if (errFields.some(f => ['die_id', 'die_type', 'casing', 'status'].includes(f))) {
        setCurrentStep(0)
      } else if (errFields.some(f => ['punched_size', 'current_size', 'punched_width', 'current_width', 'punched_thickness', 'current_thickness', 'radius'].includes(f))) {
        setCurrentStep(1)
      } else {
        setCurrentStep(2)
      }
      return
    }

    onSubmit(validation.data)
  }

  const getFieldError = (fieldName: string) => validationErrors[fieldName]

  // Step validation helpers for Next button disabling
  const isStep1Valid = dieId.trim() !== '' && casing.trim() !== ''
  const isStep2Valid = dieType === 'ROUND'
    ? (originalSize.trim() !== '' && currentSize.trim() !== '')
    : (originalWidth.trim() !== '' && currentWidth.trim() !== '' && originalThickness.trim() !== '' && currentThickness.trim() !== '' && radius.trim() !== '')

  // Steps definition for StepWizard
  const steps = [
    {
      label: 'Identity Profile',
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
              className={`w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-white focus-ring ${
                getFieldError('die_id') ? 'border-rose-500 bg-rose-950/10 focus:border-rose-500' : ''
              }`}
              placeholder="e.g. R-105"
              aria-invalid={!!getFieldError('die_id')}
            />
            {getFieldError('die_id') && (
              <p className="text-xxs text-rose-400 mt-1.5 font-medium">{getFieldError('die_id')}</p>
            )}
          </div>

          <div>
            <label htmlFor="form-die-type" className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Geometric Type
            </label>
            <select 
              id="form-die-type"
              value={dieType}
              disabled={isSubmitting}
              onChange={(e) => handleFieldChange('die_type', e.target.value, setDieType)}
              className="w-full bg-slate-955 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 focus-ring cursor-pointer"
            >
              <option value="ROUND">Round Die</option>
              <option value="FLAT">Flat Die</option>
            </select>
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
              className={`w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-white focus-ring ${
                getFieldError('casing') ? 'border-rose-500 bg-rose-950/10 focus:border-rose-500' : ''
              }`}
              aria-invalid={!!getFieldError('casing')}
            />
            {getFieldError('casing') && (
              <p className="text-xxs text-rose-400 mt-1.5 font-medium">{getFieldError('casing')}</p>
            )}
          </div>

          <div>
            <label htmlFor="form-status" className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Initial Status
            </label>
            <select 
              id="form-status"
              value={status}
              disabled={isSubmitting}
              onChange={(e) => handleFieldChange('status', e.target.value, setStatus)}
              className="w-full bg-slate-955 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 focus-ring cursor-pointer"
            >
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
        </div>
      )
    },
    {
      label: 'Specifications Profile',
      content: (
        <div className="py-2">
          {dieType === 'ROUND' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
              <div>
                <label htmlFor="form-round-punched" className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Nominal/Punched Diameter (mm) <span className="text-rose-500">*</span>
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
                  placeholder="e.g. 2.500"
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
                  placeholder="e.g. 2.500"
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
                  Punched Width (mm) <span className="text-rose-500">*</span>
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
                  Current Width (mm) <span className="text-rose-500">*</span>
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
                  placeholder="e.g. 10.000"
                  aria-invalid={!!getFieldError('current_width')}
                />
                {getFieldError('current_width') && (
                  <p className="text-xxs text-rose-400 mt-1.5 font-medium">{getFieldError('current_width')}</p>
                )}
              </div>

              <div>
                <label htmlFor="form-flat-punched-thick" className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Punched Thickness (mm) <span className="text-rose-500">*</span>
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
                  Current Thickness (mm) <span className="text-rose-500">*</span>
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
                  placeholder="e.g. 3.000"
                  aria-invalid={!!getFieldError('current_thickness')}
                />
                {getFieldError('current_thickness') && (
                  <p className="text-xxs text-rose-400 mt-1.5 font-medium">{getFieldError('current_thickness')}</p>
                )}
              </div>

              <div>
                <label htmlFor="form-flat-radius" className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Fillet Corner Radius (mm) <span className="text-rose-500">*</span>
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
      label: 'Warehouse Mapping',
      content: (
        <div className="space-y-6 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="form-rack" className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Storage Rack
                </label>
                <select 
                  id="form-rack"
                  value={rack}
                  disabled={isSubmitting}
                  onChange={(e) => handleFieldChange('rack', e.target.value, setRack)}
                  className={`w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 focus-ring cursor-pointer ${
                    getFieldError('location') ? 'border-rose-500 bg-rose-950/10' : ''
                  }`}
                >
                  <option value="">Select Rack...</option>
                  {racks.map((r: any) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="form-shelf" className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Shelf Slot
                </label>
                <input 
                  id="form-shelf"
                  type="number" 
                  min="1"
                  disabled={isSubmitting}
                  value={shelf}
                  onChange={(e) => handleFieldChange('shelf', e.target.value, setShelf)}
                  className={`w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-white focus-ring ${
                    getFieldError('location') ? 'border-rose-500 bg-rose-950/10' : ''
                  }`}
                  placeholder="e.g. 3"
                />
              </div>
            </div>

            <div>
              <label htmlFor="form-set" className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Production Line Assignment
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
                placeholder="Select set to assign..."
                emptyLabel="— Stand-alone / Floor —"
                className="bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-202 focus-ring"
              />
            </div>
          </div>

          <div>
            <label htmlFor="form-remarks" className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Remarks & Quality Notes
            </label>
            <textarea 
              id="form-remarks"
              rows={3}
              disabled={isSubmitting}
              value={remarks}
              onChange={(e) => handleFieldChange('remarks', e.target.value, setRemarks)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-white focus-ring resize-y min-h-[80px]"
              placeholder="Enter optional remark logs..."
            />
          </div>
        </div>
      )
    }
  ]

  return (
    <div 
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
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
        className="bg-slate-900 border border-slate-800/80 rounded-2xl max-w-2xl w-full my-8 shadow-2xl relative animate-fadeIn"
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
            nextDisabled={currentStep === 0 ? !isStep1Valid : currentStep === 1 ? !isStep2Valid : false}
          />
        </div>
      </div>
    </div>
  )
}
