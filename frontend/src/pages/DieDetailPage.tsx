import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Trash2 } from 'lucide-react'
import { useApi, useAuth } from '../App'
import { DieBlueprint } from '../components/CadRenderer'
import { Timeline } from '../components/Timeline'

export function DieDetailPage() {
  const { id } = useParams()
  const { request } = useApi()
  const { role } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  
  const [isEditing, setIsEditing] = useState(false)
  const [statusVal, setStatusVal] = useState('')
  const [location, setLocation] = useState('')
  const [remarks, setRemarks] = useState('')
  const [currentSetId, setCurrentSetId] = useState('')
  
  // Custom subfields editing
  const [currentSize, setCurrentSize] = useState('')
  const [currentWidth, setCurrentWidth] = useState('')
  const [currentThickness, setCurrentThickness] = useState('')

  // Query details
  const { data: die, isLoading, error } = useQuery({
    queryKey: ['die', id],
    queryFn: () => request(`/api/dies/${id}/`),
  })

  // Populate form states once data loads or changes
  useEffect(() => {
    if (die) {
      setStatusVal(die.status || 'AVAILABLE')
      setLocation(die.location || '')
      setRemarks(die.remarks || '')
      setCurrentSetId(die.current_set || '')
      setCurrentSize(die.current_size || '')
      setCurrentWidth(die.current_width || '')
      setCurrentThickness(die.current_thickness || '')
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['die', id] })
      queryClient.invalidateQueries({ queryKey: ['dies'] })
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
    const payload: any = {
      status: statusVal,
      location,
      remarks,
      current_set: currentSetId || null
    }
    if (die.die_type === 'ROUND') {
      payload.current_size = currentSize
    } else {
      payload.current_width = currentWidth
      payload.current_thickness = currentThickness
    }
    updateMutation.mutate(payload)
  }

  const handleDelete = () => {
    if (window.confirm('Are you absolutely sure you want to delete this die? This action is irreversible.')) {
      deleteMutation.mutate()
    }
  }

  if (isLoading) return (
    <div className="flex justify-center items-center py-24">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  )

  if (error) return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="text-center py-12 bg-rose-500/10 border border-rose-500/20 rounded-xl">
        <p className="text-rose-400 font-semibold">Error: {error.message}</p>
        <Link to="/inventory" className="text-blue-400 hover:underline mt-4 inline-block">Back to Inventory</Link>
      </div>
    </div>
  )

  const canEdit = role === 'ROOT' || role === 'ADMIN'

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumbs */}
      <div className="flex items-center space-x-2 text-sm text-slate-500 mb-6">
        <Link to="/inventory" className="hover:text-slate-300">Inventory</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-slate-300">{die.die_id}</span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-slate-950 p-8 border-b border-slate-800 flex justify-between items-start gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                {die.die_type} DIE
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white mt-3">{die.die_id}</h1>
            <p className="text-slate-400 text-sm mt-1">Casing: {die.casing}</p>
          </div>
          
          {canEdit && (
            <div className="flex space-x-2">
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="bg-slate-950 hover:bg-slate-800 text-white border border-slate-800 hover:border-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300"
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
              <button 
                onClick={handleDelete}
                className="bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-400 p-2.5 rounded-xl transition-all duration-300"
              >
                <Trash2 className="h-4.5 w-4.5" />
              </button>
            </div>
          )}
        </div>

        <div className="p-8">
          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Status</label>
                  <select 
                    value={statusVal}
                    onChange={(e) => setStatusVal(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="RUNNING">Running</option>
                    <option value="CLEANING">Cleaning</option>
                    <option value="POLISHING">Polishing</option>
                    <option value="DAMAGED">Damaged</option>
                    <option value="SCRAPPED">Scrapped</option>
                    <option value="MISSING">Missing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Location</label>
                  <input 
                    type="text" 
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Assign Set</label>
                  <select 
                    value={currentSetId}
                    onChange={(e) => setCurrentSetId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">— Unassigned —</option>
                    {setsList?.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.machine_name})</option>
                    ))}
                  </select>
                </div>
                {die.die_type === 'ROUND' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Current Size (mm)</label>
                    <input 
                      type="number"
                      step="0.001"
                      value={currentSize}
                      onChange={(e) => setCurrentSize(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Current Width (mm)</label>
                      <input 
                        type="number"
                        step="0.001"
                        value={currentWidth}
                        onChange={(e) => setCurrentWidth(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Current Thickness (mm)</label>
                      <input 
                        type="number"
                        step="0.001"
                        value={currentThickness}
                        onChange={(e) => setCurrentThickness(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Remarks</label>
                <textarea 
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800/80">
                <button 
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 px-5 py-2.5 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-2.5 rounded-xl font-semibold shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-300"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Specifications</h3>
                <div className="bg-slate-950/50 rounded-xl p-5 border border-slate-850 space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status</span>
                    <span className="font-semibold text-slate-200">{die.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Location</span>
                    <span className="font-semibold text-slate-200">{die.location || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Set Assignment</span>
                    <span className="font-semibold text-slate-200">{die.set_name || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Machine</span>
                    <span className="font-semibold text-slate-200">{die.machine_name || '—'}</span>
                  </div>

                  {die.die_type === 'ROUND' ? (
                    <>
                      <div className="flex justify-between border-t border-slate-800/80 pt-3">
                        <span className="text-slate-500">Original Size</span>
                        <span className="font-semibold text-slate-200">{die.original_size} mm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Current Size</span>
                        <span className="font-semibold text-slate-200">{die.current_size} mm</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between border-t border-slate-800/80 pt-3">
                        <span className="text-slate-500">Original Width × Thickness</span>
                        <span className="font-semibold text-slate-200">{die.original_width} × {die.original_thickness} mm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Current Width × Thickness</span>
                        <span className="font-semibold text-slate-200">{die.current_width} × {die.current_thickness} mm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Radius</span>
                        <span className="font-semibold text-slate-200">{die.radius} mm</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">CAD Blueprint</h3>
                <DieBlueprint die={die} />
              </div>

              <div className="md:col-span-2 lg:col-span-1">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Remarks</h3>
                <div className="bg-slate-950/50 rounded-xl p-5 border border-slate-850 h-[calc(100%-2rem)]">
                  <p className="text-slate-300 whitespace-pre-line text-sm leading-relaxed">
                    {die.remarks || 'No remarks recorded.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History timeline */}
      <Timeline history={die.history} />
    </div>
  )
}
