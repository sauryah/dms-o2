import React, { useState, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Edit, Trash2, Layers, Plus } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { ConfirmDialog } from '../../components/ConfirmDialog'

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
  const [setToDelete, setSetToDelete] = useState<any>(null)

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
      <div className="lg:col-span-2 bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 font-mono">
        <h2 className="text-xs font-medium text-[#e4e4e4] uppercase tracking-[0.05em] mb-3">01 TOOL SETS DIRECTORY</h2>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#6b7280]" />
            <input 
              type="text" 
              placeholder="Search tool sets..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 pl-8 pr-3 text-xs text-[#e4e4e4] placeholder-[#404040] focus:border-blue-500 focus:outline-none uppercase font-mono"
            />
          </div>
          {machines && (
            <select
              value={filterMachine}
              onChange={(e) => setFilterMachine(e.target.value)}
              className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-3 py-1.5 text-xs text-[#e4e4e4] focus:outline-none focus:border-blue-500 uppercase font-mono max-w-xs cursor-pointer"
            >
              <option value="">ALL MACHINES</option>
              {machines.map((mach: any) => (
                <option key={mach.id} value={mach.id}>{mach.name}</option>
              ))}
            </select>
          )}
        </div>

        {isSetsLoading ? (
          <div className="text-center py-6 text-[#6b7280] text-xs">Loading tool sets...</div>
        ) : filteredSets.length === 0 ? (
          <p className="text-[#6b7280] text-xs py-4 text-center">No matching tool sets found.</p>
        ) : (
          <div className="space-y-1.5 max-h-[450px] overflow-y-auto pr-1">
            {filteredSets.map((s: any) => (
              <div key={s.id} className="bg-[#0a0a0a] flex justify-between items-center p-2.5 rounded-sm border border-[#1a1a1a] hover:border-[#2a2a2a] hover:bg-[#141414] transition-colors font-mono">
                <div className="flex items-center space-x-2">
                  <div className="p-1 bg-[#141414] text-purple-400 rounded-sm border border-[#2a2a2a]">
                    <Layers className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-[#e4e4e4] text-xs uppercase block">{s.name}</span>
                    <span className="text-[10px] text-[#6b7280] uppercase">
                      MACHINE: <span className="text-[#e4e4e4] font-medium">{s.machine_name}</span> <span className="text-[#404040]">({s.category_name})</span>
                    </span>
                  </div>
                </div>
                {isWritable && (
                  <div className="flex space-x-1">
                    <button 
                      onClick={() => { setEditingSet(s); setNameSet(s.name); setMachineSet(s.machine); }}
                      className="p-1 text-[#6b7280] hover:text-blue-400 hover:bg-[#1f1f1f] rounded-sm transition cursor-pointer"
                      title="Edit Set"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => { setSetToDelete(s) }}
                      className="p-1 text-[#6b7280] hover:text-red-400 hover:bg-[#1f1f1f] rounded-sm transition cursor-pointer"
                      aria-label={`Delete set ${s.name}`}
                      title="Delete Set"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {isWritable && (
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 h-fit border-l-2 border-l-purple-500 font-mono">
          <h2 className="text-xs font-medium text-[#e4e4e4] uppercase tracking-[0.05em] mb-3 flex items-center space-x-1.5">
            <Layers className="h-3.5 w-3.5 text-purple-400" />
            <span>{editingSet ? '02 EDIT TOOL SET' : '02 CREATE TOOL SET'}</span>
          </h2>
          <form onSubmit={handleSetSubmit} className="space-y-3 font-mono">
            <div>
              <label className="block text-[10px] text-[#6b7280] uppercase tracking-wider mb-1">
                {editingSet ? 'SET NAME' : 'SET NAME(S)'}
              </label>
              {editingSet ? (
                <input 
                  type="text" 
                  required
                  value={nameSet}
                  onChange={(e) => setNameSet(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-xs text-[#e4e4e4] placeholder-[#404040] focus:border-blue-500 focus:outline-none uppercase font-mono"
                  placeholder="e.g. Set-Alpha"
                />
              ) : (
                <textarea 
                  required
                  placeholder="e.g. Set-Alpha, Set-Beta (comma or newline separated)"
                  value={nameSet}
                  onChange={(e) => setNameSet(e.target.value)}
                  rows={2}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-xs text-[#e4e4e4] placeholder-[#404040] focus:border-blue-500 focus:outline-none uppercase font-mono"
                />
              )}
            </div>
            <div>
              <label className="block text-[10px] text-[#6b7280] uppercase tracking-wider mb-1">MACHINE PROFILE</label>
              <select 
                required
                value={machineSet}
                onChange={(e) => setMachineSet(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-xs text-[#e4e4e4] focus:border-blue-500 focus:outline-none uppercase font-mono cursor-pointer"
              >
                <option value="">— SELECT MACHINE —</option>
                {machines?.map((mach: any) => (
                  <option key={mach.id} value={mach.id}>{mach.name} ({mach.category_name})</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-2 pt-1">
              {editingSet && (
                <button 
                  type="button"
                  onClick={() => { setEditingSet(null); setNameSet(''); setMachineSet(''); }}
                  className="bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] text-[#6b7280] hover:text-[#e4e4e4] px-3 py-1 rounded-sm text-xs font-mono uppercase transition cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button 
                type="submit"
                className="bg-[#141414] hover:bg-[#1f1f1f] border border-purple-500/50 text-purple-400 hover:text-purple-300 px-3.5 py-1 rounded-sm text-xs font-mono uppercase transition flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                <span>{editingSet ? 'Save' : 'Create'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={!!setToDelete}
        title="Delete Toolset Profile"
        message={`Are you sure you want to permanently delete toolset "${setToDelete?.name}"? All associated dies under this set will be unassigned.`}
        confirmLabel="Delete Toolset"
        danger={true}
        onConfirm={() => {
          if (setToDelete) {
            deleteSet.mutate(setToDelete.id)
            setSetToDelete(null)
          }
        }}
        onCancel={() => setSetToDelete(null)}
      />
    </>
  )
}
