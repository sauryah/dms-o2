import React, { useState, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Edit, Trash2, Layers, Plus } from 'lucide-react'
import { useApi } from '../../App'

interface SetsTabProps {
  sets: any[] | undefined
  machines: any[] | undefined
  isSetsLoading: boolean
  isWritable: boolean
}

export function SetsTab({ sets, machines, isSetsLoading, isWritable }: SetsTabProps) {
  const { request } = useApi()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterMachine, setFilterMachine] = useState('')
  const [nameSet, setNameSet] = useState('')
  const [machineSet, setMachineSet] = useState<any>('')
  const [editingSet, setEditingSet] = useState<any>(null)

  const createSet = useMutation({
    mutationFn: (data: any) => request('/api/sets/', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sets'] })
      queryClient.invalidateQueries({ queryKey: ['setsDropdownList'] })
      queryClient.invalidateQueries({ queryKey: ['setsDropdownDetail'] })
    }
  })

  const updateSet = useMutation({
    mutationFn: ({ id, data }: { id: any, data: any }) => request(`/api/sets/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sets'] })
      queryClient.invalidateQueries({ queryKey: ['setsDropdownList'] })
      queryClient.invalidateQueries({ queryKey: ['setsDropdownDetail'] })
      setNameSet('')
      setMachineSet('')
      setEditingSet(null)
    }
  })

  const deleteSet = useMutation({
    mutationFn: (id: any) => request(`/api/sets/${id}/`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sets'] })
      queryClient.invalidateQueries({ queryKey: ['setsDropdownList'] })
      queryClient.invalidateQueries({ queryKey: ['setsDropdownDetail'] })
    }
  })

  const filteredSets = useMemo(() => {
    if (!sets) return []
    return sets.filter((s: any) => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (s.machine_name && s.machine_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (s.category_name && s.category_name.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesMachine = filterMachine ? String(s.machine) === String(filterMachine) : true
      return matchesSearch && matchesMachine
    })
  }, [sets, searchQuery, filterMachine])

  const handleSetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingSet) {
      const payload = { name: nameSet.trim(), machine: machineSet }
      updateSet.mutate({ id: editingSet.id, data: payload })
    } else {
      const payloadMachine = machineSet
      const names = nameSet.split(/[\n,]+/).map(n => n.trim()).filter(Boolean)
      try {
        for (const name of names) {
          await createSet.mutateAsync({ name, machine: payloadMachine })
        }
        setNameSet('')
        setMachineSet('')
      } catch (err) {
        console.error(err)
      }
    }
  }

  return (
    <>
      <div className="lg:col-span-2 glass-panel rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <h2 className="text-lg font-bold text-white mb-6">Tool Sets List</h2>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search tool sets..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full glass-input rounded-xl py-3 pl-11 pr-4 text-xs text-white focus:outline-none placeholder-slate-505"
            />
          </div>
          {machines && (
            <select
              value={filterMachine}
              onChange={(e) => setFilterMachine(e.target.value)}
              className="glass-input rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none max-w-xs"
            >
              <option value="">All Machines</option>
              {machines.map((mach: any) => (
                <option key={mach.id} value={mach.id}>{mach.name}</option>
              ))}
            </select>
          )}
        </div>

        {isSetsLoading ? (
          <div className="text-center py-6 text-slate-400">Loading tool sets...</div>
        ) : filteredSets.length === 0 ? (
          <p className="text-slate-505 text-sm py-4 text-center">No matching tool sets found.</p>
        ) : (
          <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
            {filteredSets.map((s: any) => (
              <div key={s.id} className="glass-card flex justify-between items-center p-4 rounded-xl border border-slate-800/40 hover:border-indigo-500/30 hover:bg-slate-800/20 hover:-translate-y-0.5 transition-all duration-300 shadow-sm hover:shadow-[0_0_15px_rgba(99,102,241,0.1)]">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-500/5 text-indigo-400 rounded-lg border border-indigo-500/10">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-200 block">{s.name}</span>
                    <span className="text-xs text-slate-455">Machine: <span className="text-slate-300 font-medium">{s.machine_name}</span> <span className="text-slate-500">({s.category_name})</span></span>
                  </div>
                </div>
                {isWritable && (
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => { setEditingSet(s); setNameSet(s.name); setMachineSet(s.machine); }}
                      className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-900/50 rounded-lg transition"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => { if (window.confirm('Delete this set?')) deleteSet.mutate(s.id); }}
                      className="p-1.5 text-slate-400 hover:text-rose-455 hover:bg-slate-900/50 rounded-lg transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {isWritable && (
        <div className="glass-panel rounded-2xl p-6 shadow-xl h-fit border-l-2 border-l-indigo-500/50">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center space-x-2">
            <Layers className="h-5 w-5 text-indigo-400" />
            <span>{editingSet ? 'Edit Set' : 'Create Set'}</span>
          </h2>
          <form onSubmit={handleSetSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {editingSet ? 'Set Name' : 'Set Name(s)'}
              </label>
              {editingSet ? (
                <input 
                  type="text" 
                  required
                  value={nameSet}
                  onChange={(e) => setNameSet(e.target.value)}
                  className="w-full glass-input rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none"
                  placeholder="e.g. Set-Alpha"
                />
              ) : (
                <textarea 
                  required
                  placeholder="e.g. Set-Alpha, Set-Beta (comma or newline separated)"
                  value={nameSet}
                  onChange={(e) => setNameSet(e.target.value)}
                  rows={2}
                  className="w-full glass-input rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none placeholder-slate-600"
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Machine Profile</label>
              <select 
                required
                value={machineSet}
                onChange={(e) => setMachineSet(e.target.value)}
                className="w-full glass-input rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none"
              >
                <option value="">— Select Machine —</option>
                {machines?.map((mach: any) => (
                  <option key={mach.id} value={mach.id}>{mach.name} ({mach.category_name})</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              {editingSet && (
                <button 
                  type="button"
                  onClick={() => { setEditingSet(null); setNameSet(''); setMachineSet(''); }}
                  className="bg-slate-950/50 hover:bg-slate-900 border border-slate-800 text-slate-400 px-4 py-2.5 rounded-xl text-xs font-medium transition"
                >
                  Cancel
                </button>
              )}
              <button 
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition btn-glow glow-indigo flex items-center space-x-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{editingSet ? 'Save' : 'Create'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
