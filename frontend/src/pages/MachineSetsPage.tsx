import React, { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Edit, Trash2, Folder, Cpu, Layers, Plus } from 'lucide-react'
import { useApi, useAuth } from '../App'

export function MachineSetsPage() {
  const { request } = useApi()
  const { role } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('categories') // categories | machines | sets

  // Queries
  const { data: categories, isLoading: isCatsLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => request('/api/categories/').then(data => Array.isArray(data) ? data : data.results)
  })

  const { data: machines, isLoading: isMachsLoading } = useQuery({
    queryKey: ['machines'],
    queryFn: () => request('/api/machines/').then(data => Array.isArray(data) ? data : data.results)
  })

  const { data: sets, isLoading: isSetsLoading } = useQuery({
    queryKey: ['sets'],
    queryFn: () => request('/api/sets/').then(data => Array.isArray(data) ? data : data.results)
  })

  // Mutators
  const createCategory = useMutation({
    mutationFn: (data: any) => request('/api/categories/', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setCatName('')
      setEditingCat(null)
    }
  })

  const updateCategory = useMutation({
    mutationFn: ({ id, data }: { id: any, data: any }) => request(`/api/categories/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setCatName('')
      setEditingCat(null)
    }
  })

  const deleteCategory = useMutation({
    mutationFn: (id: any) => request(`/api/categories/${id}/`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] })
  })

  const createMachine = useMutation({
    mutationFn: (data: any) => request('/api/machines/', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] })
      setMachName('')
      setMachCat('')
      setEditingMach(null)
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

  const createSet = useMutation({
    mutationFn: (data: any) => request('/api/sets/', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sets'] })
      queryClient.invalidateQueries({ queryKey: ['setsDropdownList'] })
      queryClient.invalidateQueries({ queryKey: ['setsDropdownDetail'] })
      setNameSet('')
      setMachineSet('')
      setEditingSet(null)
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

  // Local Form States
  const [catName, setCatName] = useState('')
  const [editingCat, setEditingCat] = useState<any>(null)

  const [machName, setMachName] = useState('')
  const [machCat, setMachCat] = useState<any>('')
  const [editingMach, setEditingMach] = useState<any>(null)

  const [nameSet, setNameSet] = useState('')
  const [machineSet, setMachineSet] = useState<any>('')
  const [editingSet, setEditingSet] = useState<any>(null)

  const isWritable = role === 'ROOT' || role === 'ADMIN'

  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterMachine, setFilterMachine] = useState('')

  useEffect(() => {
    setSearchQuery('')
    setFilterCategory('')
    setFilterMachine('')
  }, [activeTab])

  const filteredCategories = useMemo(() => {
    if (!categories) return []
    return categories.filter((cat: any) => 
      cat.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [categories, searchQuery])

  const filteredMachines = useMemo(() => {
    if (!machines) return []
    return machines.filter((mach: any) => {
      const matchesSearch = mach.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (mach.category_name && mach.category_name.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesCategory = filterCategory ? String(mach.category) === String(filterCategory) : true
      return matchesSearch && matchesCategory
    })
  }, [machines, searchQuery, filterCategory])

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

  // Form handlers
  const handleCatSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingCat) {
      updateCategory.mutate({ id: editingCat.id, data: { name: catName } })
    } else {
      createCategory.mutate({ name: catName })
    }
  }

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
      } catch (err) {
        console.error(err)
      }
    }
  }

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
      } catch (err) {
        console.error(err)
      }
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Machines & Sets Manager</h1>
        <p className="text-slate-400 mt-1">Configure layout, structure machine profiles, and allocate toolsets.</p>
      </div>

      {/* Stats Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden blueprint-grid glow-blue">
          <div className="flex justify-between items-center relative z-10">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Categories</p>
              <h3 className="text-2xl font-bold text-white mt-2 font-heading">{categories?.length || 0}</h3>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Folder className="h-6 w-6" />
            </div>
          </div>
        </div>
        
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden blueprint-grid glow-emerald">
          <div className="flex justify-between items-center relative z-10">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Machines</p>
              <h3 className="text-2xl font-bold text-white mt-2 font-heading">{machines?.length || 0}</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Cpu className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden blueprint-grid glow-indigo">
          <div className="flex justify-between items-center relative z-10">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Tool Sets</p>
              <h3 className="text-2xl font-bold text-white mt-2 font-heading">{sets?.length || 0}</h3>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Layers className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-6 mb-8 overflow-x-auto scrollbar-none">
        <button 
          onClick={() => setActiveTab('categories')}
          className={`pb-4 text-md font-semibold border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'categories' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-350'
          }`}
        >
          <Folder className="h-4 w-4" />
          <span>Machine Categories</span>
          <span className={`px-2 py-0.5 text-xs font-bold rounded-full transition-all ${
            activeTab === 'categories' ? 'bg-blue-500/20 text-blue-450' : 'bg-slate-800/40 text-slate-500'
          }`}>
            {categories?.length || 0}
          </span>
        </button>
        <button 
          onClick={() => setActiveTab('machines')}
          className={`pb-4 text-md font-semibold border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'machines' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-350'
          }`}
        >
          <Cpu className="h-4 w-4" />
          <span>Machines</span>
          <span className={`px-2 py-0.5 text-xs font-bold rounded-full transition-all ${
            activeTab === 'machines' ? 'bg-blue-500/20 text-blue-450' : 'bg-slate-800/40 text-slate-500'
          }`}>
            {machines?.length || 0}
          </span>
        </button>
        <button 
          onClick={() => setActiveTab('sets')}
          className={`pb-4 text-md font-semibold border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'sets' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-350'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Tool Sets</span>
          <span className={`px-2 py-0.5 text-xs font-bold rounded-full transition-all ${
            activeTab === 'sets' ? 'bg-blue-500/20 text-blue-450' : 'bg-slate-800/40 text-slate-500'
          }`}>
            {sets?.length || 0}
          </span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <>
            <div className="lg:col-span-2 glass-panel rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <h2 className="text-lg font-bold text-white mb-6">Categories List</h2>
              
              {/* Search Bar */}
              <div className="relative mb-6">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Search categories..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full glass-input rounded-xl py-3 pl-11 pr-4 text-xs text-white focus:outline-none placeholder-slate-500"
                />
              </div>

              {isCatsLoading ? (
                <div className="text-center py-6 text-slate-400">Loading categories...</div>
              ) : filteredCategories.length === 0 ? (
                <p className="text-slate-500 text-sm py-4 text-center">No matching machine categories found.</p>
              ) : (
                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                  {filteredCategories.map((cat: any) => (
                    <div key={cat.id} className="glass-card flex justify-between items-center p-4 rounded-xl border border-slate-800/40 hover:border-blue-500/30 hover:bg-slate-800/20 hover:-translate-y-0.5 transition-all duration-300 shadow-sm hover:shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-500/5 text-blue-400 rounded-lg border border-blue-500/10">
                          <Folder className="h-4 w-4" />
                        </div>
                        <span className="font-semibold text-slate-200">{cat.name}</span>
                      </div>
                      {isWritable && (
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => { setEditingCat(cat); setCatName(cat.name); }}
                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-900/50 rounded-lg transition"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => { if (window.confirm('Delete this category?')) deleteCategory.mutate(cat.id); }}
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
              <div className="glass-panel rounded-2xl p-6 shadow-xl h-fit border-l-2 border-l-blue-500/50">
                <h2 className="text-lg font-bold text-white mb-6 flex items-center space-x-2">
                  <Folder className="h-5 w-5 text-blue-400" />
                  <span>{editingCat ? 'Edit Category' : 'Create Category'}</span>
                </h2>
                <form onSubmit={handleCatSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Category Name</label>
                    <input 
                      type="text" 
                      required
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      className="w-full glass-input rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none"
                      placeholder="e.g. Press Machine"
                    />
                  </div>
                  <div className="flex justify-end space-x-2 pt-2">
                    {editingCat && (
                      <button 
                        type="button"
                        onClick={() => { setEditingCat(null); setCatName(''); }}
                        className="bg-slate-950/50 hover:bg-slate-900 border border-slate-800 text-slate-400 px-4 py-2.5 rounded-xl text-xs font-medium transition"
                      >
                        Cancel
                      </button>
                    )}
                    <button 
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition btn-glow glow-blue flex items-center space-x-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{editingCat ? 'Save' : 'Create'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}

        {/* Machines Tab */}
        {activeTab === 'machines' && (
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
                <p className="text-slate-500 text-sm py-4 text-center">No matching machines found.</p>
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
                            className="p-1.5 text-slate-400 hover:text-rose-450 hover:bg-slate-900/50 rounded-lg transition"
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
                    <label className="block text-xs font-semibold text-slate-455 uppercase tracking-wider mb-2">
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
                        className="w-full glass-input rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none placeholder-slate-600"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-450 uppercase tracking-wider mb-2">Category</label>
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
                        className="bg-slate-955/50 hover:bg-slate-900 border border-slate-800 text-slate-400 px-4 py-2.5 rounded-xl text-xs font-medium transition"
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
        )}

        {/* Tool Sets Tab */}
        {activeTab === 'sets' && (
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
                    className="w-full glass-input rounded-xl py-3 pl-11 pr-4 text-xs text-white focus:outline-none placeholder-slate-500"
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
                          <span className="text-xs text-slate-450">Machine: <span className="text-slate-300 font-medium">{s.machine_name}</span> <span className="text-slate-500">({s.category_name})</span></span>
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
                    <label className="block text-xs font-semibold text-slate-455 uppercase tracking-wider mb-2">
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
                        className="bg-slate-905/50 hover:bg-slate-900 border border-slate-800 text-slate-400 px-4 py-2.5 rounded-xl text-xs font-medium transition"
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
        )}
      </div>
    </div>
  )
}
