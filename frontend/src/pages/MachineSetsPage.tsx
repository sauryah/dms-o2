import React, { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Edit, Trash2 } from 'lucide-react'
import { useApi, useAuth } from '../App'

export function MachineSetsPage() {
  const { request } = useApi()
  const { role } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('categories') // categories | machines | sets

  // Queries
  const { data: categories, isLoading: isCatsLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => request('/api/categories/')
  })

  const { data: machines, isLoading: isMachsLoading } = useQuery({
    queryKey: ['machines'],
    queryFn: () => request('/api/machines/')
  })

  const { data: sets, isLoading: isSetsLoading } = useQuery({
    queryKey: ['sets'],
    queryFn: () => request('/api/sets/')
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
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Machines & Sets Manager</h1>
        <p className="text-slate-400 mt-1">Configure layout, structure machine profiles, and allocate toolsets.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-6 mb-8">
        <button 
          onClick={() => setActiveTab('categories')}
          className={`pb-4 text-md font-semibold border-b-2 transition-all ${
            activeTab === 'categories' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Machine Categories
        </button>
        <button 
          onClick={() => setActiveTab('machines')}
          className={`pb-4 text-md font-semibold border-b-2 transition-all ${
            activeTab === 'machines' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Machines
        </button>
        <button 
          onClick={() => setActiveTab('sets')}
          className={`pb-4 text-md font-semibold border-b-2 transition-all ${
            activeTab === 'sets' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-305'
          }`}
        >
          Tool Sets
        </button>
      </div>

      {/* Tab Contents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <>
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-4">Categories List</h2>
              
              {/* Search Bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Search categories..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none placeholder-slate-500 transition duration-200"
                />
              </div>

              {isCatsLoading ? (
                <div className="text-center py-6">Loading...</div>
              ) : filteredCategories.length === 0 ? (
                <p className="text-slate-500 text-sm py-4">No matching machine categories found.</p>
              ) : (
                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                  {filteredCategories.map((cat: any) => (
                    <div key={cat.id} className="flex justify-between items-center bg-slate-950/40 p-4 border border-slate-850 rounded-xl hover:border-slate-800 transition-all">
                      <span className="font-semibold text-slate-200">{cat.name}</span>
                      {isWritable && (
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => { setEditingCat(cat); setCatName(cat.name); }}
                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-900 rounded-lg transition"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => { if (window.confirm('Delete this category?')) deleteCategory.mutate(cat.id); }}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition"
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
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl h-fit">
                <h2 className="text-lg font-bold text-white mb-4">
                  {editingCat ? 'Edit Category' : 'Create Category'}
                </h2>
                <form onSubmit={handleCatSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Category Name</label>
                    <input 
                      type="text" 
                      required
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    {editingCat && (
                      <button 
                        type="button"
                        onClick={() => { setEditingCat(null); setCatName(''); }}
                        className="bg-slate-950 border border-slate-800 text-slate-305 px-4 py-2 rounded-xl text-sm"
                      >
                        Cancel
                      </button>
                    )}
                    <button 
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-505 text-white px-5 py-2 rounded-xl text-sm font-semibold transition"
                    >
                      {editingCat ? 'Save' : 'Create'}
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
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-4">Machines List</h2>

              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Search machines..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none placeholder-slate-500 transition duration-200"
                  />
                </div>
                {categories && (
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="bg-slate-955 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {isMachsLoading ? (
                <div className="text-center py-6">Loading...</div>
              ) : filteredMachines.length === 0 ? (
                <p className="text-slate-505 text-sm py-4">No matching machines found.</p>
              ) : (
                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                  {filteredMachines.map((mach: any) => (
                    <div key={mach.id} className="flex justify-between items-center bg-slate-955/40 p-4 border border-slate-850 rounded-xl hover:border-slate-800 transition-all">
                      <div>
                        <span className="font-semibold text-slate-200 block">{mach.name}</span>
                        <span className="text-xs text-slate-500">Category: {mach.category_name}</span>
                      </div>
                      {isWritable && (
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => { setEditingMach(mach); setMachName(mach.name); setMachCat(mach.category); }}
                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-900 rounded-lg transition"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => { if (window.confirm('Delete this machine?')) deleteMachine.mutate(mach.id); }}
                            className="p-1.5 text-slate-400 hover:text-rose-450 hover:bg-slate-900 rounded-lg transition"
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
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl h-fit">
                <h2 className="text-lg font-bold text-white mb-4">
                  {editingMach ? 'Edit Machine' : 'Create Machine'}
                </h2>
                <form onSubmit={handleMachSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-404 uppercase tracking-wider mb-2">
                      {editingMach ? 'Machine Name' : 'Machine Name(s)'}
                    </label>
                    {editingMach ? (
                      <input 
                        type="text" 
                        required
                        value={machName}
                        onChange={(e) => setMachName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                      />
                    ) : (
                      <textarea 
                        required
                        placeholder="e.g. Mach 1, Mach 2 (comma or newline separated)"
                        value={machName}
                        onChange={(e) => setMachName(e.target.value)}
                        rows={2}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Category</label>
                    <select 
                      required
                      value={machCat}
                      onChange={(e) => setMachCat(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                    >
                      <option value="">— Select Category —</option>
                      {categories?.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end space-x-2">
                    {editingMach && (
                      <button 
                        type="button"
                        onClick={() => { setEditingMach(null); setMachName(''); setMachCat(''); }}
                        className="bg-slate-950 border border-slate-805 text-slate-300 px-4 py-2 rounded-xl text-sm"
                      >
                        Cancel
                      </button>
                    )}
                    <button 
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-sm font-semibold transition"
                    >
                      {editingMach ? 'Save' : 'Create'}
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
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-4">Tool Sets List</h2>

              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-505" />
                  <input 
                    type="text" 
                    placeholder="Search tool sets..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none placeholder-slate-500 transition duration-200"
                  />
                </div>
                {machines && (
                  <select
                    value={filterMachine}
                    onChange={(e) => setFilterMachine(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 max-w-xs"
                  >
                    <option value="">All Machines</option>
                    {machines.map((mach: any) => (
                      <option key={mach.id} value={mach.id}>{mach.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {isSetsLoading ? (
                <div className="text-center py-6">Loading...</div>
              ) : filteredSets.length === 0 ? (
                <p className="text-slate-505 text-sm py-4">No matching tool sets found.</p>
              ) : (
                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                  {filteredSets.map((s: any) => (
                    <div key={s.id} className="flex justify-between items-center bg-slate-955/40 p-4 border border-slate-850 rounded-xl hover:border-slate-800 transition-all">
                      <div>
                        <span className="font-semibold text-slate-202 block">{s.name}</span>
                        <span className="text-xs text-slate-500">Machine: {s.machine_name} ({s.category_name})</span>
                      </div>
                      {isWritable && (
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => { setEditingSet(s); setNameSet(s.name); setMachineSet(s.machine); }}
                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-900 rounded-lg transition"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => { if (window.confirm('Delete this set?')) deleteSet.mutate(s.id); }}
                            className="p-1.5 text-slate-400 hover:text-rose-455 hover:bg-slate-905 rounded-lg transition"
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
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl h-fit">
                <h2 className="text-lg font-bold text-white mb-4">
                  {editingSet ? 'Edit Set' : 'Create Set'}
                </h2>
                <form onSubmit={handleSetSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-405 uppercase tracking-wider mb-2">
                      {editingSet ? 'Set Name' : 'Set Name(s)'}
                    </label>
                    {editingSet ? (
                      <input 
                        type="text" 
                        required
                        value={nameSet}
                        onChange={(e) => setNameSet(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                      />
                    ) : (
                      <textarea 
                        required
                        placeholder="e.g. Set A, Set B (comma or newline separated)"
                        value={nameSet}
                        onChange={(e) => setNameSet(e.target.value)}
                        rows={2}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Machine Profile</label>
                    <select 
                      required
                      value={machineSet}
                      onChange={(e) => setMachineSet(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                    >
                      <option value="">— Select Machine —</option>
                      {machines?.map((mach: any) => (
                        <option key={mach.id} value={mach.id}>{mach.name} ({mach.category_name})</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end space-x-2">
                    {editingSet && (
                      <button 
                        type="button"
                        onClick={() => { setEditingSet(null); setNameSet(''); setMachineSet(''); }}
                        className="bg-slate-950 border border-slate-805 text-slate-300 px-4 py-2 rounded-xl text-sm"
                      >
                        Cancel
                      </button>
                    )}
                    <button 
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-505 text-white px-5 py-2 rounded-xl text-sm font-semibold transition"
                    >
                      {editingSet ? 'Save' : 'Create'}
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
