import React, { useState, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Edit, Trash2, Cpu, Plus } from 'lucide-react'
import { useApi } from '../../App'

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
      <div className="lg:col-span-2 glass-panel rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <h2 className="text-lg font-bold text-white mb-6">Machines List</h2>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search machines..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full glass-input rounded-xl py-3 pl-11 pr-4 text-xs text-white focus:outline-none placeholder-slate-500"
            />
          </div>
          {categories && (
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="glass-input rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((cat: any) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          )}
        </div>

        {isMachsLoading ? (
          <div className="text-center py-6 text-slate-400">Loading machines...</div>
        ) : filteredMachines.length === 0 ? (
          <p className="text-slate-505 text-sm py-4 text-center">No matching machines found.</p>
        ) : (
          <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
            {filteredMachines.map((mach: any) => (
              <div key={mach.id} className="glass-card flex justify-between items-center p-4 rounded-xl border border-slate-800/40 hover:border-emerald-500/30 hover:bg-slate-800/20 hover:-translate-y-0.5 transition-all duration-300 shadow-sm hover:shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-500/5 text-emerald-400 rounded-lg border border-emerald-500/10">
                    <Cpu className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-200 block">{mach.name}</span>
                    <span className="text-xs text-slate-450">Category: <span className="text-slate-300 font-medium">{mach.category_name}</span></span>
                  </div>
                </div>
                {isWritable && (
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => { setEditingMach(mach); setMachName(mach.name); setMachCat(mach.category); }}
                      className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-900/50 rounded-lg transition"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => { if (window.confirm('Delete this machine?')) deleteMachine.mutate(mach.id); }}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900/50 rounded-lg transition"
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
        <div className="glass-panel rounded-2xl p-6 shadow-xl h-fit border-l-2 border-l-emerald-500/50">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center space-x-2">
            <Cpu className="h-5 w-5 text-emerald-400" />
            <span>{editingMach ? 'Edit Machine' : 'Create Machine'}</span>
          </h2>
          <form onSubmit={handleMachSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {editingMach ? 'Machine Name' : 'Machine Name(s)'}
              </label>
              {editingMach ? (
                <input 
                  type="text" 
                  required
                  value={machName}
                  onChange={(e) => setMachName(e.target.value)}
                  className="w-full glass-input rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none"
                  placeholder="e.g. Press-01"
                />
              ) : (
                <textarea 
                  required
                  placeholder="e.g. Press-01, Press-02 (comma or newline separated)"
                  value={machName}
                  onChange={(e) => setMachName(e.target.value)}
                  rows={2}
                  className="w-full glass-input rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none placeholder-slate-650"
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Category</label>
              <select 
                required
                value={machCat}
                onChange={(e) => setMachCat(e.target.value)}
                className="w-full glass-input rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none"
              >
                <option value="">— Select Category —</option>
                {categories?.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              {editingMach && (
                <button 
                  type="button"
                  onClick={() => { setEditingMach(null); setMachName(''); setMachCat(''); }}
                  className="bg-slate-950/50 hover:bg-slate-900 border border-slate-800 text-slate-400 px-4 py-2.5 rounded-xl text-xs font-medium transition"
                >
                  Cancel
                </button>
              )}
              <button 
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition btn-glow glow-emerald flex items-center space-x-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{editingMach ? 'Save' : 'Create'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
