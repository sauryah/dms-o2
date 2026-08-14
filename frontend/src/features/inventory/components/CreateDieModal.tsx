import React, { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
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
        <div className="flex flex-col items-center justify-center py-4 space-y-4 font-mono">
          <p className="text-xs text-[#6b7280] uppercase tracking-wider">Select geometric profile class</p>
          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
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
              className={`p-4 rounded-sm border transition-colors flex flex-col items-center justify-center space-y-2 cursor-pointer font-mono ${
                dieType === 'ROUND'
                  ? 'border-blue-500 bg-[#141414] text-blue-400'
                  : 'border-[#2a2a2a] bg-[#0a0a0a] text-[#6b7280] hover:text-[#e4e4e4]'
              }`}
            >
              <div className="h-10 w-10 rounded-none border border-current flex items-center justify-center font-bold text-base">
                Ø
              </div>
              <span className="text-xs uppercase tracking-wider font-medium">ROUND DIE</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDieType('FLAT')
                setOriginalSize('')
                setCurrentSize('')
              }}
              className={`p-4 rounded-sm border transition-colors flex flex-col items-center justify-center space-y-2 cursor-pointer font-mono ${
                dieType === 'FLAT'
                  ? 'border-purple-500 bg-[#141414] text-purple-400'
                  : 'border-[#2a2a2a] bg-[#0a0a0a] text-[#6b7280] hover:text-[#e4e4e4]'
              }`}
            >
              <div className="h-10 w-14 rounded-none border border-current flex items-center justify-center font-bold text-xs">
                W × T
              </div>
              <span className="text-xs uppercase tracking-wider font-medium">FLAT DIE</span>
            </button>
          </div>
        </div>
      )
    },
    {
      label: 'Identity',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2 font-mono">
          <div>
            <label htmlFor="form-die-id" className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">
              DIE ID (UNIQUE IDENTIFIER) <span className="text-red-400">*</span>
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
              className={`w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm py-1.5 px-2 text-xs text-[#e4e4e4] focus:outline-none uppercase ${
                getFieldError('die_id') ? 'border-red-500' : ''
              }`}
              placeholder="e.g. R-105"
              aria-invalid={!!getFieldError('die_id')}
            />
            {checkingUniqueness && (
              <p className="text-[10px] text-blue-400 mt-1 animate-pulse">VERIFYING ID UNIQUENESS...</p>
            )}
            {getFieldError('die_id') && (
              <p className="text-[10px] text-red-400 mt-1">{getFieldError('die_id')}</p>
            )}
          </div>

          <div>
            <label htmlFor="form-casing" className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">
              CASING SIZE (MM) <span className="text-red-400">*</span>
            </label>
            <input 
              id="form-casing"
              type="text" 
              required
              disabled={isSubmitting}
              placeholder="e.g. 25x10"
              value={casing}
              onChange={(e) => handleFieldChange('casing', e.target.value, setCasing)}
              className={`w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm py-1.5 px-2 text-xs text-[#e4e4e4] focus:outline-none uppercase ${
                getFieldError('casing') ? 'border-red-500' : ''
              }`}
              aria-invalid={!!getFieldError('casing')}
            />
            {getFieldError('casing') && (
              <p className="text-[10px] text-red-400 mt-1">{getFieldError('casing')}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="form-rack" className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">
                STORAGE RACK
              </label>
              <select 
                id="form-rack"
                value={rack}
                disabled={isSubmitting}
                onChange={(e) => handleFieldChange('rack', e.target.value, setRack)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm py-1.5 px-2 text-xs text-[#e4e4e4] focus:outline-none cursor-pointer uppercase font-mono"
              >
                <option value="">SELECT RACK...</option>
                {racks.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="form-shelf" className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">
                SHELF
              </label>
              <input 
                id="form-shelf"
                type="number"
                min="1"
                disabled={isSubmitting}
                value={shelf}
                onChange={(e) => handleFieldChange('shelf', e.target.value, setShelf)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm py-1.5 px-2 text-xs text-[#e4e4e4] focus:outline-none font-mono"
                placeholder="e.g. 3"
              />
            </div>
          </div>

          <div>
            <label htmlFor="form-remarks" className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">
              REMARKS
            </label>
            <input 
              id="form-remarks"
              type="text" 
              disabled={isSubmitting}
              value={remarks}
              onChange={(e) => handleFieldChange('remarks', e.target.value, setRemarks)}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm py-1.5 px-2 text-xs text-[#e4e4e4] focus:outline-none font-mono"
              placeholder="e.g. High tolerance die"
            />
          </div>
        </div>
      )
    },
    {
      label: 'Measurements',
      content: (
        <div className="py-2 font-mono">
          {dieType === 'ROUND' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="form-round-punched" className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">
                  NOMINAL / PUNCHED SIZE (MM) <span className="text-red-400">*</span>
                </label>
                <input 
                  id="form-round-punched"
                  type="number" 
                  step="0.001"
                  required
                  disabled={isSubmitting}
                  value={originalSize}
                  onChange={(e) => handleFieldChange('punched_size', e.target.value, setOriginalSize)}
                  className={`w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm py-1.5 px-2 text-xs text-[#e4e4e4] focus:outline-none font-mono ${
                    getFieldError('punched_size') ? 'border-red-500' : ''
                  }`}
                  placeholder="e.g. 2.400"
                  aria-invalid={!!getFieldError('punched_size')}
                />
                {getFieldError('punched_size') && (
                  <p className="text-[10px] text-red-400 mt-1">{getFieldError('punched_size')}</p>
                )}
              </div>
              <div>
                <label htmlFor="form-round-current" className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">
                  CURRENT MEASURED SIZE (MM) <span className="text-red-400">*</span>
                </label>
                <input 
                  id="form-round-current"
                  type="number" 
                  step="0.001"
                  required
                  disabled={isSubmitting}
                  value={currentSize}
                  onChange={(e) => handleFieldChange('current_size', e.target.value, setCurrentSize)}
                  className={`w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm py-1.5 px-2 text-xs text-[#e4e4e4] focus:outline-none font-mono ${
                    getFieldError('current_size') ? 'border-red-500' : ''
                  }`}
                  placeholder="e.g. 2.420"
                  aria-invalid={!!getFieldError('current_size')}
                />
                {getFieldError('current_size') && (
                  <p className="text-[10px] text-red-400 mt-1">{getFieldError('current_size')}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label htmlFor="form-flat-punched-width" className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">
                  PUNCHED WIDTH (MM) <span className="text-red-400">*</span>
                </label>
                <input 
                  id="form-flat-punched-width"
                  type="number" 
                  step="0.001"
                  required
                  disabled={isSubmitting}
                  value={originalWidth}
                  onChange={(e) => handleFieldChange('punched_width', e.target.value, setOriginalWidth)}
                  className={`w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm py-1.5 px-2 text-xs text-[#e4e4e4] focus:outline-none font-mono ${
                    getFieldError('punched_width') ? 'border-red-500' : ''
                  }`}
                  placeholder="e.g. 10.000"
                  aria-invalid={!!getFieldError('punched_width')}
                />
                {getFieldError('punched_width') && (
                  <p className="text-[10px] text-red-400 mt-1">{getFieldError('punched_width')}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="form-flat-curr-width" className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">
                  CURRENT WIDTH (MM) <span className="text-red-400">*</span>
                </label>
                <input 
                  id="form-flat-curr-width"
                  type="number" 
                  step="0.001"
                  required
                  disabled={isSubmitting}
                  value={currentWidth}
                  onChange={(e) => handleFieldChange('current_width', e.target.value, setCurrentWidth)}
                  className={`w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm py-1.5 px-2 text-xs text-[#e4e4e4] focus:outline-none font-mono ${
                    getFieldError('current_width') ? 'border-red-500' : ''
                  }`}
                  placeholder="e.g. 10.020"
                  aria-invalid={!!getFieldError('current_width')}
                />
                {getFieldError('current_width') && (
                  <p className="text-[10px] text-red-400 mt-1">{getFieldError('current_width')}</p>
                )}
              </div>

              <div>
                <label htmlFor="form-flat-punched-thick" className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">
                  PUNCHED THICK (MM) <span className="text-red-400">*</span>
                </label>
                <input 
                  id="form-flat-punched-thick"
                  type="number" 
                  step="0.001"
                  required
                  disabled={isSubmitting}
                  value={originalThickness}
                  onChange={(e) => handleFieldChange('punched_thickness', e.target.value, setOriginalThickness)}
                  className={`w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm py-1.5 px-2 text-xs text-[#e4e4e4] focus:outline-none font-mono ${
                    getFieldError('punched_thickness') ? 'border-red-500' : ''
                  }`}
                  placeholder="e.g. 3.000"
                  aria-invalid={!!getFieldError('punched_thickness')}
                />
                {getFieldError('punched_thickness') && (
                  <p className="text-[10px] text-red-400 mt-1">{getFieldError('punched_thickness')}</p>
                )}
              </div>

              <div>
                <label htmlFor="form-flat-curr-thick" className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">
                  CURRENT THICK (MM) <span className="text-red-400">*</span>
                </label>
                <input 
                  id="form-flat-curr-thick"
                  type="number" 
                  step="0.001"
                  required
                  disabled={isSubmitting}
                  value={currentThickness}
                  onChange={(e) => handleFieldChange('current_thickness', e.target.value, setCurrentThickness)}
                  className={`w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm py-1.5 px-2 text-xs text-[#e4e4e4] focus:outline-none font-mono ${
                    getFieldError('current_thickness') ? 'border-red-500' : ''
                  }`}
                  placeholder="e.g. 3.010"
                  aria-invalid={!!getFieldError('current_thickness')}
                />
                {getFieldError('current_thickness') && (
                  <p className="text-[10px] text-red-400 mt-1">{getFieldError('current_thickness')}</p>
                )}
              </div>

              <div>
                <label htmlFor="form-flat-radius" className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">
                  CORNER RADIUS (MM) <span className="text-red-400">*</span>
                </label>
                <input 
                  id="form-flat-radius"
                  type="number" 
                  step="0.001"
                  required
                  disabled={isSubmitting}
                  value={radius}
                  onChange={(e) => handleFieldChange('radius', e.target.value, setRadius)}
                  className={`w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm py-1.5 px-2 text-xs text-[#e4e4e4] focus:outline-none font-mono ${
                    getFieldError('radius') ? 'border-red-500' : ''
                  }`}
                  placeholder="e.g. 0.500"
                  aria-invalid={!!getFieldError('radius')}
                />
                {getFieldError('radius') && (
                  <p className="text-[10px] text-red-400 mt-1">{getFieldError('radius')}</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2 font-mono">
          <div>
            <label htmlFor="form-set" className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">
              SELECT PRODUCTION SET
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
              className="bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm py-1.5 px-2 text-xs text-[#e4e4e4] font-mono"
            />
            <p className="text-[9px] text-[#6b7280] mt-1 uppercase">Optional assignment to set. Click Next to bypass.</p>
          </div>
          <div>
            <label htmlFor="form-set-machine" className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">
              ASSIGNED MACHINE (READ-ONLY)
            </label>
            <input 
              id="form-set-machine"
              type="text" 
              readOnly
              value={machineName || 'Unassigned / Stand-alone'}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] text-[#6b7280] rounded-sm py-1.5 px-2 text-xs font-mono outline-none"
              placeholder="Machine name auto-populates"
            />
          </div>
        </div>
      )
    },
    {
      label: 'Review',
      content: (
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm overflow-hidden font-mono text-xs">
          <table className="w-full text-left border-collapse font-mono">
            <tbody>
              <tr className="border-b border-[#1a1a1a]">
                <td className="p-2.5 text-[#6b7280] uppercase text-[10px] w-1/3">DIE TYPE</td>
                <td className="p-2.5 font-mono text-[#e4e4e4]">{dieType}</td>
              </tr>
              <tr className="border-b border-[#1a1a1a]">
                <td className="p-2.5 text-[#6b7280] uppercase text-[10px]">DIE ID</td>
                <td className="p-2.5 font-mono text-[#e4e4e4] font-bold">{dieId}</td>
              </tr>
              <tr className="border-b border-[#1a1a1a]">
                <td className="p-2.5 text-[#6b7280] uppercase text-[10px]">CASING SIZE</td>
                <td className="p-2.5 font-mono text-[#e4e4e4]">{casing} mm</td>
              </tr>
              <tr className="border-b border-[#1a1a1a]">
                <td className="p-2.5 text-[#6b7280] uppercase text-[10px]">STATUS</td>
                <td className="p-2.5 text-[#e4e4e4]">{status}</td>
              </tr>
              <tr className="border-b border-[#1a1a1a]">
                <td className="p-2.5 text-[#6b7280] uppercase text-[10px]">LOCATION</td>
                <td className="p-2.5 text-[#e4e4e4]">{displayLocation}</td>
              </tr>
              {dieType === 'ROUND' ? (
                <>
                  <tr className="border-b border-[#1a1a1a]">
                    <td className="p-2.5 text-[#6b7280] uppercase text-[10px]">NOMINAL SIZE</td>
                    <td className="p-2.5 font-mono text-[#e4e4e4]">{originalSize} mm</td>
                  </tr>
                  <tr className="border-b border-[#1a1a1a]">
                    <td className="p-2.5 text-[#6b7280] uppercase text-[10px]">CURRENT SIZE</td>
                    <td className="p-2.5 font-mono text-[#e4e4e4]">{currentSize} mm</td>
                  </tr>
                </>
              ) : (
                <>
                  <tr className="border-b border-[#1a1a1a]">
                    <td className="p-2.5 text-[#6b7280] uppercase text-[10px]">PUNCHED W × T</td>
                    <td className="p-2.5 font-mono text-[#e4e4e4]">{originalWidth} × {originalThickness} mm</td>
                  </tr>
                  <tr className="border-b border-[#1a1a1a]">
                    <td className="p-2.5 text-[#6b7280] uppercase text-[10px]">CURRENT W × T</td>
                    <td className="p-2.5 font-mono text-[#e4e4e4]">{currentWidth} × {currentThickness} mm</td>
                  </tr>
                  <tr className="border-b border-[#1a1a1a]">
                    <td className="p-2.5 text-[#6b7280] uppercase text-[10px]">FILLET RADIUS</td>
                    <td className="p-2.5 font-mono text-[#e4e4e4]">{radius} mm</td>
                  </tr>
                </>
              )}
              <tr className="border-b border-[#1a1a1a]">
                <td className="p-2.5 text-[#6b7280] uppercase text-[10px]">SET ASSIGNMENT</td>
                <td className="p-2.5 text-[#e4e4e4]">
                  {selectedSetObj ? `${selectedSetObj.name} (${selectedSetObj.machine_name})` : 'Floor Stock (Unassigned)'}
                </td>
              </tr>
              {remarks && (
                <tr>
                  <td className="p-2.5 text-[#6b7280] uppercase text-[10px]">REMARKS</td>
                  <td className="p-2.5 text-[#6b7280] italic">{remarks}</td>
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
      className="fixed inset-0 bg-[#0a0a0a]/80 z-50 flex items-center justify-center p-4 overflow-y-auto font-mono"
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
        className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-sm max-w-2xl w-full my-6 relative animate-fadeIn font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#2a2a2a] flex justify-between items-center bg-[#0a0a0a]">
          <div>
            <h2 id="create-die-modal-title" className="text-xs font-medium text-[#e4e4e4] uppercase tracking-[0.05em]">
              01 REGISTER NEW DIE ASSET
            </h2>
            <p className="text-[9px] text-[#6b7280] uppercase mt-0.5">Multi-Step Precision Wizard</p>
          </div>
          <button 
            onClick={onClose} 
            disabled={isSubmitting}
            aria-label="Close modal"
            className="text-[#6b7280] hover:text-[#e4e4e4] p-1 rounded-sm transition-colors disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        {/* Form Body */}
        <div className="p-4">
          {error && (
            <div className="bg-[#141414] border border-red-500/30 text-red-400 rounded-sm p-3 text-xs mb-4 font-mono uppercase">
              {error}
            </div>
          )}
          
          {Object.keys(validationErrors).length > 0 && (
            <div className="bg-[#141414] border border-amber-500/30 text-amber-400 rounded-sm p-3 text-xs mb-4 font-mono">
              <p className="font-medium uppercase mb-1">VALIDATION ERRORS:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[#e4e4e4] text-[11px]">
                {Object.entries(validationErrors).map(([field, errorMsg]) => (
                  <li key={field}>
                    <span className="text-amber-400 uppercase">{field.replace('_', ' ')}</span>: {errorMsg}
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
