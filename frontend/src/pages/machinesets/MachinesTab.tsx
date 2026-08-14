import React, { useState, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Edit, Trash2, Cpu, Plus } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { ConfirmDialog } from '../../components/ConfirmDialog'

interface MachinesTabProps {
  machines: any[] | undefined
  categories: any[] | undefined
  isMachsLoading: boolean
  isWritable: boolean
}

export function MachinesTab({ machines, categories, isMachsLoading, isWritable }: MachinesTabProps) {
  const { request } = useApi()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [machName, setMachName] = useState('')
  const [machCat, setMachCat] = useState<any>('')
  const [editingMach, setEditingMach] = useState<any>(null)
  const [machineToDelete, setMachineToDelete] = useState<any>(null)

  const createMachine = useMutation({
    mutationFn: (data: any) => request('/api/machines/', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] })
    }
  })

  const updateMachine = useMutation({
    mutationFn: ({ id, data }: { id: any, data: any }) => request(`/api/machines/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] })
      setMachName('')
      setMachCat('')
      setEditingMach(null)
    }
  })

  const deleteMachine = useMutation({
    mutationFn: (id: any) => request(`/api/machines/${id}/`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['machines'] })
  })

  const filteredMachines = useMemo(() => {
    if (!machines) return []
    return machines.filter((mach: any) => {
      const matchesSearch = mach.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (mach.category_name && mach.category_name.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesCategory = filterCategory ? String(mach.category) === String(filterCategory) : true
      return matchesSearch && matchesCategory
    })
  }, [machines, searchQuery, filterCategory])

  const handleMachSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingMach) {
      const payload = { name: machName.trim(), category: machCat }
      updateMachine.mutate({ id: editingMach.id, data: payload })
    } else {
      const payloadCategory = machCat
      const names = machName.split(/[\n,]+/).map(n => n.trim()).filter(Boolean)
      try {
        for (const name of names) {
          await createMachine.mutateAsync({ name, category: payloadCategory })
        }
        setMachName('')
        setMachCat('')
      } catch (err) {
        console.error(err)
      }
    }
  }

  return (
    <>
      <div className="lg:col-span-2 bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 font-mono">
        <h2 className="text-xs font-medium text-[#e4e4e4] uppercase tracking-[0.05em] mb-3">01 MACHINES DIRECTORY</h2>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#6b7280]" />
            <input 
              type="text" 
              placeholder="Search machines..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 pl-8 pr-3 text-xs text-[#e4e4e4] placeholder-[#404040] focus:border-blue-500 focus:outline-none uppercase font-mono"
            />
          </div>
          {categories && (
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm px-3 py-1.5 text-xs text-[#e4e4e4] focus:outline-none focus:border-blue-500 uppercase font-mono cursor-pointer"
            >
              <option value="">ALL CATEGORIES</option>
              {categories.map((cat: any) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          )}
        </div>

        {isMachsLoading ? (
          <div className="text-center py-6 text-[#6b7280] text-xs">Loading machines...</div>
        ) : filteredMachines.length === 0 ? (
          <p className="text-[#6b7280] text-xs py-4 text-center">No matching machines found.</p>
        ) : (
          <div className="space-y-1.5 max-h-[450px] overflow-y-auto pr-1">
            {filteredMachines.map((mach: any) => (
              <div key={mach.id} className="bg-[#0a0a0a] flex justify-between items-center p-2.5 rounded-sm border border-[#1a1a1a] hover:border-[#2a2a2a] hover:bg-[#141414] transition-colors font-mono">
                <div className="flex items-center space-x-2">
                  <div className="p-1 bg-[#141414] text-emerald-400 rounded-sm border border-[#2a2a2a]">
                    <Cpu className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-[#e4e4e4] text-xs uppercase block">{mach.name}</span>
                    <span className="text-[10px] text-[#6b7280] uppercase">CATEGORY: <span className="text-[#e4e4e4] font-medium">{mach.category_name}</span></span>
                  </div>
                </div>
                {isWritable && (
                  <div className="flex space-x-1">
                    <button 
                      onClick={() => { setEditingMach(mach); setMachName(mach.name); setMachCat(mach.category); }}
                      className="p-1 text-[#6b7280] hover:text-blue-400 hover:bg-[#1f1f1f] rounded-sm transition cursor-pointer"
                      title="Edit Machine"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => { setMachineToDelete(mach) }}
                      className="p-1 text-[#6b7280] hover:text-red-400 hover:bg-[#1f1f1f] rounded-sm transition cursor-pointer"
                      aria-label={`Delete machine ${mach.name}`}
                      title="Delete Machine"
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
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 h-fit border-l-2 border-l-emerald-500 font-mono">
          <h2 className="text-xs font-medium text-[#e4e4e4] uppercase tracking-[0.05em] mb-3 flex items-center space-x-1.5">
            <Cpu className="h-3.5 w-3.5 text-emerald-400" />
            <span>{editingMach ? '02 EDIT MACHINE' : '02 CREATE MACHINE'}</span>
          </h2>
          <form onSubmit={handleMachSubmit} className="space-y-3 font-mono">
            <div>
              <label className="block text-[10px] text-[#6b7280] uppercase tracking-wider mb-1">
                {editingMach ? 'MACHINE NAME' : 'MACHINE NAME(S)'}
              </label>
              {editingMach ? (
                <input 
                  type="text" 
                  required
                  value={machName}
                  onChange={(e) => setMachName(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-xs text-[#e4e4e4] placeholder-[#404040] focus:border-blue-500 focus:outline-none uppercase font-mono"
                  placeholder="e.g. Press-01"
                />
              ) : (
                <textarea 
                  required
                  placeholder="e.g. Press-01, Press-02 (comma or newline separated)"
                  value={machName}
                  onChange={(e) => setMachName(e.target.value)}
                  rows={2}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-xs text-[#e4e4e4] placeholder-[#404040] focus:border-blue-500 focus:outline-none uppercase font-mono"
                />
              )}
            </div>
            <div>
              <label className="block text-[10px] text-[#6b7280] uppercase tracking-wider mb-1">CATEGORY</label>
              <select 
                required
                value={machCat}
                onChange={(e) => setMachCat(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-xs text-[#e4e4e4] focus:border-blue-500 focus:outline-none uppercase font-mono cursor-pointer"
              >
                <option value="">— SELECT CATEGORY —</option>
                {categories?.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-2 pt-1">
              {editingMach && (
                <button 
                  type="button"
                  onClick={() => { setEditingMach(null); setMachName(''); setMachCat(''); }}
                  className="bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] text-[#6b7280] hover:text-[#e4e4e4] px-3 py-1 rounded-sm text-xs font-mono uppercase transition cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button 
                type="submit"
                className="bg-[#141414] hover:bg-[#1f1f1f] border border-emerald-500/50 text-emerald-400 hover:text-emerald-300 px-3.5 py-1 rounded-sm text-xs font-mono uppercase transition flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                <span>{editingMach ? 'Save' : 'Create'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={!!machineToDelete}
        title="Delete Machine Profile"
        message={`Are you sure you want to permanently delete machine "${machineToDelete?.name}"? All associated sets under this machine will be unassigned.`}
        confirmLabel="Delete Machine"
        danger={true}
        onConfirm={() => {
          if (machineToDelete) {
            deleteMachine.mutate(machineToDelete.id)
            setMachineToDelete(null)
          }
        }}
        onCancel={() => setMachineToDelete(null)}
      />
    </>
  )
}
