import React, { useState, useEffect, useRef, Suspense } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Trash2, Printer, Download, Calendar, MapPin, Layers, Wrench } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { useToast } from '../../../contexts/ToastContext'
import { useApi } from '../../../hooks/useApi'
import { lazyWithRetry } from '../../../utils/lazyWithRetry'

const DieBlueprint = lazyWithRetry(() =>
  import('./CadRenderer').then(m => ({ default: m.DieBlueprint }))
);

const BlueprintSkeleton = () => (
  <div className="w-full h-[120px] flex items-center justify-center font-mono">
    <div className="w-6 h-6 border border-[#2a2a2a] border-t-blue-500 rounded-none animate-spin" />
  </div>
);
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Drawer } from '../../../components/ui/Drawer'
import { DataTable } from '../../../components/ui/DataTable'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Skeleton } from '../../../components/ui/Skeleton'
import { PageHeader } from '../../../components/ui/PageHeader'
import { SearchableSelect } from '../../../components/SearchableSelect'

function MaintenanceLogSection({ dieId, canAdd }: { dieId: string; canAdd: boolean }) {
  const { request } = useApi()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [note, setNote] = useState('')
  const [category, setCategory] = useState('INSPECTION')

  const { data: logs, isLoading } = useQuery({
    queryKey: ['maintenanceLogs', dieId],
    queryFn: () => request(`/api/dies/${dieId}/maintenance-logs/`),
  })

  const addLogMutation = useMutation({
    mutationFn: (data: any) => request(`/api/dies/${dieId}/maintenance-logs/`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceLogs', dieId] })
      setShowForm(false)
      setNote('')
      setCategory('INSPECTION')
      showToast('Maintenance log added', 'success')
    },
    onError: () => {
      showToast('Failed to add log. Please try again.', 'error')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!note.trim()) return
    addLogMutation.mutate({ note: note.trim(), category })
  }

  const categoryBadge = (cat: string) => {
    const colors: Record<string, string> = {
      INSPECTION: 'bg-[#141414] text-blue-400 border-blue-500/30',
      REPAIR: 'bg-[#141414] text-red-400 border-red-500/30',
      CLEANING: 'bg-[#141414] text-amber-400 border-amber-500/30',
      POLISHING: 'bg-[#141414] text-purple-400 border-purple-500/30',
      MEASUREMENT: 'bg-[#141414] text-emerald-400 border-emerald-500/30',
      OTHER: 'bg-[#141414] text-[#6b7280] border-[#2a2a2a]',
    }
    return colors[cat] || colors.OTHER
  }

  return (
    <div className="space-y-3 font-mono">
      {canAdd && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#141414] hover:bg-[#1f1f1f] text-[#e4e4e4] border border-[#2a2a2a] px-3 py-1 rounded-sm text-xs uppercase font-mono transition cursor-pointer"
        >
          + Add Log Entry
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[#0a0a0a] rounded-sm p-3 border border-[#2a2a2a] space-y-2 font-mono">
          <div className="flex gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-[#141414] border border-[#2a2a2a] rounded-sm py-1 px-2 text-xs text-[#e4e4e4] focus:border-blue-500 focus:outline-none uppercase font-mono"
            >
              <option value="INSPECTION">INSPECTION</option>
              <option value="REPAIR">REPAIR</option>
              <option value="CLEANING">CLEANING</option>
              <option value="POLISHING">POLISHING</option>
              <option value="MEASUREMENT">MEASUREMENT</option>
              <option value="OTHER">OTHER</option>
            </select>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-[#6b7280] hover:text-[#e4e4e4] text-xs px-2 uppercase font-mono cursor-pointer"
            >
              Cancel
            </button>
          </div>
          <textarea
            rows={3}
            placeholder="Describe maintenance activity..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full bg-[#141414] border border-[#2a2a2a] rounded-sm py-1.5 px-2 text-[#e4e4e4] placeholder-[#404040] focus:border-blue-500 focus:outline-none text-xs font-mono"
            required
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={addLogMutation.isPending || !note.trim()}
              className="bg-[#141414] hover:bg-[#1f1f1f] text-blue-400 border border-blue-500/50 px-3 py-1 rounded-sm uppercase text-xs font-mono transition disabled:opacity-40 cursor-pointer"
            >
              {addLogMutation.isPending ? 'Saving...' : 'Save Log'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-1.5 max-h-60 overflow-y-auto">
        {isLoading ? (
          <p className="text-[#6b7280] text-xs">Loading logs...</p>
        ) : !logs || logs.length === 0 ? (
          <p className="text-[#6b7280] text-xs italic">No maintenance logs recorded.</p>
        ) : (
          logs.map((log: any) => (
            <div key={log.id} className="bg-[#0a0a0a] rounded-sm p-2.5 border border-[#1a1a1a] font-mono">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className={`px-1.5 py-0.2 text-[9px] font-mono uppercase rounded-sm border ${categoryBadge(log.category)}`}>
                    {log.category || 'OTHER'}
                  </span>
                  <span className="text-[9px] text-[#6b7280]">{log.created_by_username || 'System'}</span>
                </div>
                <span className="text-[9px] text-[#6b7280] tabular-nums">{new Date(log.created_at).toLocaleString()}</span>
              </div>
              <p className="text-xs text-[#e4e4e4] whitespace-pre-line mt-1">{log.note}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export function DieDetailPage() {
  const params = useParams()
  const id = params['*']
  const { request } = useApi()
  const { role } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  
  const [isEditing, setIsEditing] = useState(false)
  const [statusVal, setStatusVal] = useState('')
  const [rack, setRack] = useState('')
  const [shelf, setShelf] = useState('')
  const [remarks, setRemarks] = useState('')
  const [currentSetId, setCurrentSetId] = useState('')
  
  const [dieIdVal, setDieIdVal] = useState('')
  const [casingVal, setCasingVal] = useState('')
  const [punchedSize, setPunchedSize] = useState('')
  const [punchedWidth, setPunchedWidth] = useState('')
  const [punchedThickness, setPunchedThickness] = useState('')
  
  // Custom subfields editing
  const [currentSize, setCurrentSize] = useState('')
  const [currentWidth, setCurrentWidth] = useState('')
  const [currentThickness, setCurrentThickness] = useState('')
  const [highlightedDim, setHighlightedDim] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)
  const [radiusVal, setRadiusVal] = useState('')
  const [showStatusConfirm, setShowStatusConfirm] = useState(false)
  const [pendingPayload, setPendingPayload] = useState<any>(null)

  const [isRecutOpen, setIsRecutOpen] = useState(false)
  const [newSize, setNewSize] = useState('')
  const [newWidth, setNewWidth] = useState('')
  const [newThickness, setNewThickness] = useState('')
  const [newRadius, setNewRadius] = useState('')
  const [recutNote, setRecutNote] = useState('')
  const [recutError, setRecutError] = useState<string | null>(null)

  // Query details
  const { data: die, isLoading, error } = useQuery({
    queryKey: ['die', id],
    queryFn: () => request(`/api/dies/${id}/`),
  })

  // Populate recut defaults when modal is opened or die changes
  useEffect(() => {
    if (die) {
      if (die.die_type === 'ROUND' && die.rounddie) {
        setNewSize(String(Number(die.rounddie.current_size) + 1.0))
      } else if (die.die_type === 'FLAT' && die.flatdie) {
        setNewWidth(String(Number(die.flatdie.current_width) + 1.0))
        setNewThickness(String(Number(die.flatdie.current_thickness) + 0.5))
        setNewRadius(String(die.flatdie.radius))
      }
    }
  }, [die, isRecutOpen])

  // Mutation for recutting die
  const recutMutation = useMutation({
    mutationFn: (data: any) => request(`/api/dies/${id}/recut/`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      showToast('Die recut successfully.', 'success')
      queryClient.invalidateQueries({ queryKey: ['die', id] })
      queryClient.invalidateQueries({ queryKey: ['dieDetail', id] })
      queryClient.invalidateQueries({ queryKey: ['dies'] })
      queryClient.invalidateQueries({ queryKey: ['searchDies'] })
      queryClient.invalidateQueries({ queryKey: ['allDiesStats'] })
      setIsRecutOpen(false)
      setRecutNote('')
      setRecutError(null)
    },
    onError: () => {
      setRecutError('An error occurred during recutting. Please try again.')
    }
  })

  const { data: racksList } = useQuery({
    queryKey: ['racksList'],
    queryFn: () => request('/api/racks/')
  })
  const racks = racksList || []

  // Populate form states only when navigating to a different die (not on refetch)
  const prevDieIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (die) {
      if (prevDieIdRef.current === String(die.die_id)) return
      prevDieIdRef.current = String(die.die_id)
      setDieIdVal(die.die_id || '')
      setCasingVal(die.casing || '')
      setStatusVal(die.status || 'AVAILABLE')
      setRack(die.rack ? String(die.rack) : '')
      setShelf(die.shelf ? String(die.shelf) : '')
      setRemarks(die.remarks || '')
      setCurrentSetId(die.current_set || '')
      setCurrentSize(die.current_size || '')
      setCurrentWidth(die.current_width || '')
      setCurrentThickness(die.current_thickness || '')
      setPunchedSize(die.punched_size || '')
      setPunchedWidth(die.punched_width || '')
      setPunchedThickness(die.punched_thickness || '')
      setRadiusVal(die.radius || '')
    }
  }, [die])

  // Fetch sets list for editing dropdown
  const { data: setsList } = useQuery({
    queryKey: ['setsDropdownDetail'],
    queryFn: () => request('/api/sets/')
  })

  // Mutation for updating die
  const updateMutation = useMutation({
    mutationFn: (data: any) => request(`/api/dies/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['die', id] })
      await queryClient.cancelQueries({ queryKey: ['dieDetail', id] })
      await queryClient.cancelQueries({ queryKey: ['dies'] })
      await queryClient.cancelQueries({ queryKey: ['searchDies'] })

      const previousDie = queryClient.getQueryData(['die', id])
      const previousDieDetail = queryClient.getQueryData(['dieDetail', id])
      const previousDiesQueries = queryClient.getQueriesData({ queryKey: ['dies'] })
      const previousSearchDiesQueries = queryClient.getQueriesData({ queryKey: ['searchDies'] })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queryClient.setQueryData(['die', id], (old: any) => old ? { ...old, ...data } : old)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queryClient.setQueryData(['dieDetail', id], (old: any) => old ? { ...old, ...data } : old)

      queryClient.setQueriesData({ queryKey: ['dies'] }, (old: any) => {
        if (!Array.isArray(old)) return old
        return old.map((d: any) => String(d.die_id) === String(id) ? { ...d, ...data } : d)
      })
      queryClient.setQueriesData({ queryKey: ['searchDies'] }, (old: any) => {
        if (!Array.isArray(old)) return old
        return old.map((d: any) => String(d.die_id) === String(id) ? { ...d, ...data } : d)
      })

      return { previousDie, previousDieDetail, previousDiesQueries, previousSearchDiesQueries }
    },
    onSuccess: (data: any) => {
      showToast('Die updated successfully.', 'success')
      if (data && data.die_id && String(data.die_id) !== String(id)) {
        navigate(`/dies/${data.die_id}`, { replace: true })
      }
    },
    onError: (err, data, context: any) => {
      if (context) {
        if (context.previousDie !== undefined) queryClient.setQueryData(['die', id], context.previousDie)
        if (context.previousDieDetail !== undefined) queryClient.setQueryData(['dieDetail', id], context.previousDieDetail)
        if (context.previousDiesQueries) {
          context.previousDiesQueries.forEach(([key, val]: any) => queryClient.setQueryData(key, val))
        }
        if (context.previousSearchDiesQueries) {
          context.previousSearchDiesQueries.forEach(([key, val]: any) => queryClient.setQueryData(key, val))
        }
      }
      showToast('Failed to update die. Please try again.', 'error')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['die', id] })
      queryClient.invalidateQueries({ queryKey: ['dieDetail', id] })
      queryClient.invalidateQueries({ queryKey: ['dies'] })
      queryClient.invalidateQueries({ queryKey: ['searchDies'] })
      queryClient.invalidateQueries({ queryKey: ['allDiesStats'] })
      setIsEditing(false)
    }
  })

  // Mutation for deleting die
  const deleteMutation = useMutation({
    mutationFn: () => request(`/api/dies/${id}/`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dies'] })
      queryClient.invalidateQueries({ queryKey: ['allDiesStats'] })
      navigate('/inventory')
    }
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedId = dieIdVal.trim()
    if (!trimmedId) {
      showToast("Die ID is required.", "error")
      return
    }
    if (!/^[a-zA-Z0-9_\-./]+$/.test(trimmedId)) {
      showToast("Die ID can only contain alphanumeric characters, hyphens, underscores, dots, and slashes.", "error")
      return
    }

    const payload: any = {
      die_id: trimmedId,
      casing: casingVal,
      status: statusVal,
      rack: rack ? Number(rack) : null,
      shelf: shelf ? Number(shelf) : null,
      remarks,
      current_set: currentSetId || null,
      version: die?.version
    }
    if (die.die_type === 'ROUND') {
      payload.current_size = currentSize
      payload.punched_size = punchedSize
    } else {
      payload.current_width = currentWidth
      payload.current_thickness = currentThickness
      payload.punched_width = punchedWidth
      payload.punched_thickness = punchedThickness
      payload.radius = radiusVal
    }

    const statusChanged = die && statusVal !== die.status
    if (statusChanged) {
      setPendingPayload(payload)
      setShowStatusConfirm(true)
    } else {
      updateMutation.mutate(payload)
    }
  }

  const handlePrint = () => {
    window.print();
  };

  const downloadSvg = () => {
    const svgEl = document.querySelector('.cad-svg-container svg') || document.querySelector('svg');
    if (!svgEl) {
      showToast('SVG blueprint not found', 'error');
      return;
    }
    const svgString = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    const safeDieId = (die?.die_id || 'die').replace(/\//g, '_');
    downloadLink.download = `dms_blueprint_${safeDieId}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    showToast('SVG blueprint downloaded successfully', 'success');
  };

  if (isLoading) return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4 font-mono">
      <Skeleton width="w-48" height="h-6" />
      <Skeleton width="w-full" height="h-16" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Skeleton width="w-full" height="h-36" />
        <Skeleton width="w-full" height="h-36" />
        <Skeleton width="w-full" height="h-36" />
      </div>
    </div>
  )

  if (error || !die) return (
    <div className="max-w-7xl mx-auto px-4 py-6 font-mono">
      <div className="text-center py-8 bg-[#0f0f0f] border border-red-500/30 rounded-sm">
        <p className="text-red-400 font-mono text-xs uppercase">An error occurred loading asset.</p>
        <Link to="/inventory" className="text-blue-400 hover:underline mt-2 inline-block text-xs uppercase font-mono">← Back to Inventory</Link>
      </div>
    </div>
  )

  const canEdit = role === 'ROOT' || role === 'ADMIN'

  const sortedHistory = [...(die.history || [])].sort(
    (a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
  const historyTotal = sortedHistory.length
  const paginatedHistory = sortedHistory.slice((historyPage - 1) * 20, historyPage * 20)

  const breadcrumbs = [
    { label: 'Inventory', href: '/inventory' },
    { label: `Die ${die.die_id}` }
  ]

  const historyColumns = [
    { key: 'timestamp', label: 'Timestamp', render: (row: any) => <span className="tabular-nums font-mono">{new Date(row.timestamp).toLocaleString()}</span> },
    { key: 'changed_by_username', label: 'User' },
    { key: 'field_name', label: 'Property', render: (row: any) => row.field_name.replace(/_/g, ' ').toUpperCase() },
    { key: 'old_value', label: 'Previous Value', render: (row: any) => <span className="font-mono text-red-400 tabular-nums">{row.old_value || '—'}</span> },
    { key: 'new_value', label: 'New Value', render: (row: any) => <span className="font-mono text-emerald-400 tabular-nums">{row.new_value || '—'}</span> }
  ]

  const headerActions = (
    <div className="flex items-center gap-1.5 print:hidden font-mono">
      <button 
        onClick={handlePrint}
        className="bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] text-[#6b7280] hover:text-[#e4e4e4] px-3 py-1 rounded-sm text-xs uppercase font-mono transition flex items-center gap-1.5 cursor-pointer"
      >
        <Printer className="h-3.5 w-3.5 text-blue-500" />
        Print
      </button>
      <button 
        onClick={downloadSvg}
        className="bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] text-[#6b7280] hover:text-[#e4e4e4] px-3 py-1 rounded-sm text-xs uppercase font-mono transition flex items-center gap-1.5 cursor-pointer"
      >
        <Download className="h-3.5 w-3.5 text-emerald-500" />
        Download SVG
      </button>
      {canEdit && (
        <button 
          onClick={() => setIsEditing(true)}
          className="bg-[#141414] hover:bg-[#1f1f1f] text-blue-400 hover:text-blue-300 border border-blue-500/50 px-3.5 py-1 rounded-sm text-xs uppercase font-mono transition flex items-center gap-1.5 cursor-pointer"
        >
          <Wrench className="h-3.5 w-3.5" />
          Edit Asset
        </button>
      )}
      {role === 'ROOT' && (
        <button 
          onClick={() => setShowDeleteConfirm(true)}
          className="bg-[#141414] hover:bg-[#1f1f1f] border border-red-500/40 text-red-400 hover:text-red-300 p-1 rounded-sm transition flex items-center cursor-pointer"
          title="Delete Asset"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4 print-container font-mono">
        <PageHeader 
          title={`Die Asset: ${die.die_id}`} 
          breadcrumbs={breadcrumbs}
          actions={headerActions}
        />

        {/* Double-column dashboard grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* LEFT COLUMN: Identity & Status (lg:span-5) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Identity Card */}
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 space-y-3 font-mono">
              <h3 className="text-[10px] font-medium text-[#6b7280] uppercase tracking-wider">01 ASSET IDENTITY</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[#1a1a1a]">
                  <span className="text-[#6b7280]">SYSTEM TAG</span>
                  <span className="font-mono text-[#e4e4e4] font-bold">{die.die_id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1a1a1a]">
                  <span className="text-[#6b7280]">GEOMETRY PROFILE</span>
                  <span className="font-bold text-[#e4e4e4]">{die.die_type}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#6b7280]">CASING PROFILE</span>
                  <span className="font-mono text-[#e4e4e4]">{die.casing || '—'}</span>
                </div>
              </div>
            </div>

            {/* Status Card */}
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 space-y-3 font-mono">
              <h3 className="text-[10px] font-medium text-[#6b7280] uppercase tracking-wider">02 OPERATIONS STATUS</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    die.status === 'AVAILABLE' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`} />
                  <span className="font-bold text-[#e4e4e4] text-xs uppercase">{die.status}</span>
                </div>
                <button 
                  onClick={() => setIsRecutOpen(true)}
                  className="bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] text-[#6b7280] hover:text-[#e4e4e4] px-2.5 py-1 rounded-sm text-[10px] uppercase font-mono transition flex items-center gap-1 cursor-pointer"
                >
                  <Wrench className="h-3 w-3" />
                  Recut / Re-bore
                </button>
              </div>
            </div>

            {/* Physical Location mapping */}
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 space-y-2 font-mono">
              <h3 className="text-[10px] font-medium text-[#6b7280] uppercase tracking-wider">03 WAREHOUSE MAPPING</h3>
              <div className="flex items-center gap-2.5 bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm p-2.5">
                <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
                <div>
                  <p className="text-[9px] text-[#6b7280] uppercase">STORAGE SLOT</p>
                  <p className="text-xs font-mono text-[#e4e4e4] mt-0.5">
                    {die.rack_name && die.shelf ? `${die.rack_name} — Shelf ${die.shelf}` : 'UNMAPPED / FLOOR'}
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Visualizer Blueprint & Dims (lg:span-7) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Visualizer Blueprint Canvas */}
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 flex flex-col items-center font-mono">
              <div className="flex justify-between items-center w-full mb-2">
                <h3 className="text-[10px] font-medium text-[#6b7280] uppercase tracking-wider">04 CAD VISUALIZER</h3>
                <span className="text-[9px] font-mono text-[#404040] uppercase">Orthographic Vector</span>
              </div>
              <div className="w-full flex justify-center py-2 bg-[#0a0a0a] rounded-sm border border-[#1a1a1a]">
                <Suspense fallback={<BlueprintSkeleton />}>
                  <DieBlueprint 
                    die={die} 
                    activeHighlight={highlightedDim}
                    onHoverDim={setHighlightedDim}
                  />
                </Suspense>
              </div>
            </div>

            {/* Dimensions Specifications Grid */}
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 space-y-2 font-mono">
              <h3 className="text-[10px] font-medium text-[#6b7280] uppercase tracking-wider">05 MEASUREMENTS PROFILE (MM)</h3>
              
              {die.die_type === 'ROUND' ? (
                <div className="grid grid-cols-2 gap-2">
                  <div 
                    className={`bg-[#0a0a0a] border rounded-sm p-2.5 transition-colors ${
                      highlightedDim === 'punched_size' ? 'border-purple-500/60 bg-[#141414]' : 'border-[#1a1a1a]'
                    }`}
                    onMouseEnter={() => setHighlightedDim('punched_size')}
                    onMouseLeave={() => setHighlightedDim(null)}
                  >
                    <span className="text-[9px] text-[#6b7280] uppercase">BASE PUNCHED</span>
                    <p className="text-base font-mono font-bold text-[#e4e4e4] mt-0.5 tabular-nums">{die.punched_size} mm</p>
                  </div>
                  <div 
                    className={`bg-[#0a0a0a] border rounded-sm p-2.5 transition-colors ${
                      highlightedDim === 'current_size' ? 'border-blue-500/60 bg-[#141414]' : 'border-[#1a1a1a]'
                    }`}
                    onMouseEnter={() => setHighlightedDim('current_size')}
                    onMouseLeave={() => setHighlightedDim(null)}
                  >
                    <span className="text-[9px] text-[#6b7280] uppercase">CURRENT DIAMETER</span>
                    <p className="text-base font-mono font-bold text-[#e4e4e4] mt-0.5 tabular-nums">{die.current_size} mm</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div 
                      className={`bg-[#0a0a0a] border rounded-sm p-2.5 transition-colors ${
                        highlightedDim === 'punched_width_thickness' ? 'border-purple-500/60 bg-[#141414]' : 'border-[#1a1a1a]'
                      }`}
                      onMouseEnter={() => setHighlightedDim('punched_width_thickness')}
                      onMouseLeave={() => setHighlightedDim(null)}
                    >
                      <span className="text-[9px] text-[#6b7280] uppercase">BASE PUNCHED W×T</span>
                      <p className="text-sm font-mono font-bold text-[#e4e4e4] mt-0.5 tabular-nums">
                        {die.punched_width} × {die.punched_thickness} mm
                      </p>
                    </div>
                    <div 
                      className={`bg-[#0a0a0a] border rounded-sm p-2.5 transition-colors ${
                        highlightedDim === 'width_thickness' ? 'border-blue-500/60 bg-[#141414]' : 'border-[#1a1a1a]'
                      }`}
                      onMouseEnter={() => setHighlightedDim('width_thickness')}
                      onMouseLeave={() => setHighlightedDim(null)}
                    >
                      <span className="text-[9px] text-[#6b7280] uppercase">CURRENT W×T</span>
                      <p className="text-sm font-mono font-bold text-[#e4e4e4] mt-0.5 tabular-nums">
                        {die.current_width} × {die.current_thickness} mm
                      </p>
                    </div>
                  </div>
                  <div 
                    className={`bg-[#0a0a0a] border rounded-sm p-2.5 transition-colors ${
                      highlightedDim === 'radius' ? 'border-blue-500/60 bg-[#141414]' : 'border-[#1a1a1a]'
                    }`}
                    onMouseEnter={() => setHighlightedDim('radius')}
                    onMouseLeave={() => setHighlightedDim(null)}
                  >
                    <span className="text-[9px] text-[#6b7280] uppercase">FILLET CORNER RADIUS</span>
                    <p className="text-xs font-mono font-bold text-[#e4e4e4] mt-0.5 tabular-nums">{die.radius} mm</p>
                  </div>
                </div>
              )}
            </div>

            {/* Set Assignment Info */}
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 space-y-2 font-mono">
              <h3 className="text-[10px] font-medium text-[#6b7280] uppercase tracking-wider">06 PRODUCTION LINE ASSIGNMENT</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm p-2.5">
                  <span className="text-[9px] text-[#6b7280] uppercase">ACTIVE SET</span>
                  <p className="text-xs font-bold text-[#e4e4e4] mt-0.5 uppercase">{die.set_name || 'STAND-ALONE'}</p>
                </div>
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm p-2.5">
                  <span className="text-[9px] text-[#6b7280] uppercase">MACHINE</span>
                  <p className="text-xs font-bold text-[#e4e4e4] mt-0.5 uppercase">{die.machine_name || 'UNASSIGNED'}</p>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Remarks Section */}
        {die.remarks && (
          <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-3.5 space-y-1 font-mono">
            <h3 className="text-[10px] font-medium text-[#6b7280] uppercase tracking-wider">07 REMARKS</h3>
            <p className="text-[#e4e4e4] text-xs whitespace-pre-line leading-normal">{die.remarks}</p>
          </div>
        )}

        {/* Maintenance Log Form & Records */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 space-y-3 font-mono">
          <h3 className="text-[10px] font-medium text-[#6b7280] uppercase tracking-wider">08 MAINTENANCE & CATEGORY LOG</h3>
          <MaintenanceLogSection dieId={die.die_id} canAdd={canEdit} />
        </div>

        {/* Industrial Audit Log (Paginated DataTable) */}
        {(role === 'ROOT' || role === 'ADMIN') && (
          <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 space-y-3 font-mono">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-medium text-[#6b7280] uppercase tracking-wider">09 CHANGE AUDIT HISTORY</h3>
              <span className="text-[9px] font-mono text-[#6b7280] tabular-nums">SHOWING {paginatedHistory.length} OF {historyTotal} UPDATES</span>
            </div>
            
            {historyTotal === 0 ? (
              <EmptyState 
                title="NO CHANGES RECORDED"
                description="This die asset has not undergone any custom modification or update events since register."
              />
            ) : (
              <div className="space-y-3">
                <DataTable columns={historyColumns} rows={paginatedHistory} />
                {historyTotal > 20 && (
                  <div className="flex justify-between items-center pt-2">
                    <button
                      disabled={historyPage === 1}
                      onClick={() => setHistoryPage(prev => Math.max(1, prev - 1))}
                      className="bg-[#141414] hover:bg-[#1f1f1f] disabled:opacity-40 border border-[#2a2a2a] text-[#6b7280] hover:text-[#e4e4e4] px-3 py-1 rounded-sm text-xs font-mono uppercase transition cursor-pointer"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-[#6b7280] font-mono tabular-nums">PAGE {historyPage} OF {Math.ceil(historyTotal / 20)}</span>
                    <button
                      disabled={historyPage * 20 >= historyTotal}
                      onClick={() => setHistoryPage(prev => prev + 1)}
                      className="bg-[#141414] hover:bg-[#1f1f1f] disabled:opacity-40 border border-[#2a2a2a] text-[#6b7280] hover:text-[#e4e4e4] px-3 py-1 rounded-sm text-xs font-mono uppercase transition cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Slide-out Edit Form Drawer */}
      <Drawer open={isEditing} onClose={() => setIsEditing(false)} title={`CONFIGURE DIE: ${die.die_id}`}>
        <form onSubmit={handleSave} className="space-y-4 pb-20 pr-1 pl-1 font-mono">
          <div>
            <label className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">DIE ID</label>
            <input 
              type="text"
              value={dieIdVal}
              onChange={(e) => setDieIdVal(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-[#e4e4e4] focus:border-blue-500 focus:outline-none text-xs font-mono uppercase"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">CASING SIZE</label>
            <input 
              type="text"
              value={casingVal}
              onChange={(e) => setCasingVal(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-[#e4e4e4] focus:border-blue-500 focus:outline-none text-xs font-mono uppercase"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">STATUS</label>
            <select 
              value={statusVal}
              onChange={(e) => setStatusVal(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-[#e4e4e4] focus:border-blue-500 focus:outline-none text-xs font-mono uppercase cursor-pointer"
            >
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="RUNNING">RUNNING</option>
              <option value="CLEANING">CLEANING</option>
              <option value="POLISHING">POLISHING</option>
              <option value="DAMAGED">DAMAGED</option>
              <option value="SCRAPPED">SCRAPPED</option>
              <option value="MISSING">MISSING</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">LOCATION SLOT</label>
            <div className="grid grid-cols-2 gap-2">
              <select 
                value={rack}
                onChange={(e) => setRack(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-[#e4e4e4] focus:border-blue-500 focus:outline-none text-xs font-mono uppercase cursor-pointer"
              >
                <option value="">SELECT RACK...</option>
                {racks.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <input 
                type="number" 
                min="1"
                placeholder="SHELF"
                value={shelf}
                onChange={(e) => setShelf(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-[#e4e4e4] focus:border-blue-500 focus:outline-none text-xs font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">SET ASSIGNMENT</label>
            <SearchableSelect
              value={currentSetId}
              onChange={(val) => setCurrentSetId(String(val))}
              options={setsList?.map((s: any) => ({
                value: s.id,
                label: `${s.name} (${s.machine_name || 'No Machine'})`
              })) || []}
              placeholder="Select set to assign..."
              emptyLabel="— Unassigned —"
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-[#e4e4e4] focus:border-blue-500 focus:outline-none text-xs font-mono"
            />
          </div>

          {die.die_type === 'ROUND' ? (
            <>
              <div>
                <label className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">PUNCHED DIAMETER (MM)</label>
                <input 
                  type="number"
                  step="0.001"
                  value={punchedSize}
                  onChange={(e) => setPunchedSize(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-[#e4e4e4] focus:border-blue-500 focus:outline-none font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">CURRENT DIAMETER (MM)</label>
                <input 
                  type="number"
                  step="0.001"
                  value={currentSize}
                  onChange={(e) => setCurrentSize(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-[#e4e4e4] focus:border-blue-500 focus:outline-none font-mono text-xs"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">PUNCHED WIDTH (MM)</label>
                <input 
                  type="number"
                  step="0.001"
                  value={punchedWidth}
                  onChange={(e) => setPunchedWidth(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-[#e4e4e4] focus:border-blue-500 focus:outline-none font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">CURRENT WIDTH (MM)</label>
                <input 
                  type="number"
                  step="0.001"
                  value={currentWidth}
                  onChange={(e) => setCurrentWidth(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-[#e4e4e4] focus:border-blue-500 focus:outline-none font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">PUNCHED THICKNESS (MM)</label>
                <input 
                  type="number"
                  step="0.001"
                  value={punchedThickness}
                  onChange={(e) => setPunchedThickness(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-[#e4e4e4] focus:border-blue-500 focus:outline-none font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">CURRENT THICKNESS (MM)</label>
                <input 
                  type="number"
                  step="0.001"
                  value={currentThickness}
                  onChange={(e) => setCurrentThickness(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-[#e4e4e4] focus:border-blue-500 focus:outline-none font-mono text-xs"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">REMARKS</label>
            <textarea 
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-[#e4e4e4] focus:border-blue-500 focus:outline-none text-xs font-mono"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-[#1a1a1a]">
            <button 
              type="button"
              onClick={() => setIsEditing(false)}
              className="bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] text-[#6b7280] hover:text-[#e4e4e4] px-3 py-1 rounded-sm uppercase text-xs font-mono cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={updateMutation.isPending}
              className="bg-[#141414] hover:bg-[#1f1f1f] border border-blue-500/50 text-blue-400 hover:text-blue-300 px-4 py-1 rounded-sm uppercase text-xs font-mono transition cursor-pointer"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </Drawer>

      {/* Confirm Action Dialogue */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Die Asset"
        message={`Are you absolutely sure you want to permanently delete die "${die?.die_id}"? This action is irreversible.`}
        confirmLabel="Delete Die"
        danger={true}
        onConfirm={() => {
          deleteMutation.mutate()
          setShowDeleteConfirm(false)
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmDialog
        open={showStatusConfirm}
        title="Confirm Status Change"
        message={`Are you sure you want to change the status of die "${die?.die_id}" from "${die?.status}" to "${statusVal}"?`}
        confirmLabel="Change Status"
        cancelLabel="Keep Current Status"
        danger={statusVal === 'SCRAPPED' || statusVal === 'DAMAGED'}
        onConfirm={() => {
          if (pendingPayload) {
            updateMutation.mutate(pendingPayload)
          }
          setShowStatusConfirm(false)
        }}
        onCancel={() => {
          setShowStatusConfirm(false)
          setPendingPayload(null)
          setStatusVal(die?.status || '')
        }}
      />

      {isRecutOpen && die && (
        <div className="fixed inset-0 z-50 overflow-y-auto font-mono" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen p-4 text-center">
            <div className="fixed inset-0 bg-[#0a0a0a]/80 transition-opacity" aria-hidden="true" onClick={() => setIsRecutOpen(false)}></div>
            <div className="relative bg-[#0f0f0f] border border-[#2a2a2a] rounded-sm text-left overflow-hidden max-w-md w-full p-4 font-mono z-10">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#1a1a1a]">
                <Wrench className="h-4 w-4 text-blue-500" />
                <h3 className="text-xs font-medium text-[#e4e4e4] uppercase tracking-[0.05em]" id="modal-title">
                  RECUT / RE-BORE DIE: {die.die_id}
                </h3>
              </div>

              <p className="text-[11px] text-[#6b7280] mb-3">
                Updates design base size (punched size) and resets current size. Status resets to AVAILABLE.
              </p>

              {recutError && (
                <div className="mb-3 p-2 bg-[#141414] border border-red-500/30 rounded-sm text-red-400 text-xs">
                  {recutError}
                </div>
              )}

              <div className="space-y-3">
                {die.die_type === 'ROUND' ? (
                  <div>
                    <label className="block text-[10px] text-[#6b7280] uppercase mb-1">NEW PUNCHED / CURRENT DIAMETER (MM)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={newSize}
                      onChange={(e) => setNewSize(e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2 text-[#e4e4e4] focus:border-blue-500 focus:outline-none text-xs font-mono"
                      placeholder="e.g. 12.000"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9px] text-[#6b7280] uppercase mb-1">WIDTH (MM)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={newWidth}
                        onChange={(e) => setNewWidth(e.target.value)}
                        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2 text-[#e4e4e4] focus:border-blue-500 focus:outline-none text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-[#6b7280] uppercase mb-1">THICK (MM)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={newThickness}
                        onChange={(e) => setNewThickness(e.target.value)}
                        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2 text-[#e4e4e4] focus:border-blue-500 focus:outline-none text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-[#6b7280] uppercase mb-1">RADIUS (MM)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={newRadius}
                        onChange={(e) => setNewRadius(e.target.value)}
                        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2 text-[#e4e4e4] focus:border-blue-500 focus:outline-none text-xs font-mono"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] text-[#6b7280] uppercase mb-1">MAINTENANCE NOTE</label>
                  <textarea
                    rows={2}
                    value={recutNote}
                    onChange={(e) => setRecutNote(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2 text-[#e4e4e4] placeholder-[#404040] focus:border-blue-500 focus:outline-none text-xs font-mono"
                    placeholder="Why is this die being recut?"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-[#1a1a1a]">
                <button
                  type="button"
                  onClick={() => setIsRecutOpen(false)}
                  className="px-3 py-1 bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] text-[#6b7280] hover:text-[#e4e4e4] text-xs uppercase font-mono rounded-sm transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={recutMutation.isPending}
                  onClick={() => {
                    const payload: any = { note: recutNote }
                    if (die.die_type === 'ROUND') {
                      payload.new_size = newSize
                    } else {
                      payload.new_width = newWidth
                      payload.new_thickness = newThickness
                      payload.new_radius = newRadius
                    }
                    recutMutation.mutate(payload)
                  }}
                  className="px-3 py-1 bg-[#141414] hover:bg-[#1f1f1f] text-blue-400 hover:text-blue-300 border border-blue-500/50 text-xs uppercase font-mono rounded-sm transition disabled:opacity-40 cursor-pointer"
                >
                  {recutMutation.isPending ? 'Processing...' : 'Confirm Recut'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
