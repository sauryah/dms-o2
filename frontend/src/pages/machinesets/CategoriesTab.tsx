import React, { useState, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Edit, Trash2, Folder, Plus } from 'lucide-react'
import { useApi } from '../../App'
import { ConfirmDialog } from '../../components/ConfirmDialog'

interface CategoriesTabProps {
  categories: any[] | undefined
  isCatsLoading: boolean
  isWritable: boolean
}

export function CategoriesTab({ categories, isCatsLoading, isWritable }: CategoriesTabProps) {
  const { request } = useApi()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [catName, setCatName] = useState('')
  const [editingCat, setEditingCat] = useState<any>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<any>(null)

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

  const filteredCategories = useMemo(() => {
    if (!categories) return []
    return categories.filter((cat: any) => 
      cat.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [categories, searchQuery])

  const handleCatSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingCat) {
      updateCategory.mutate({ id: editingCat.id, data: { name: catName } })
    } else {
      createCategory.mutate({ name: catName })
    }
  }

  return (
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
                      onClick={() => { setCategoryToDelete(cat) }}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900/50 rounded-lg transition"
                      aria-label={`Delete category ${cat.name}`}
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
                  className="bg-slate-955 hover:bg-slate-800 border border-slate-800 text-slate-400 px-4 py-2.5 rounded-xl text-xs font-medium transition"
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

      <ConfirmDialog
        isOpen={!!categoryToDelete}
        title="Delete Category"
        message={`Are you sure you want to permanently delete category "${categoryToDelete?.name}"? All associated machines under this category will be updated.`}
        confirmText="Delete Category"
        isDestructive={true}
        onConfirm={() => {
          if (categoryToDelete) {
            deleteCategory.mutate(categoryToDelete.id)
            setCategoryToDelete(null)
          }
        }}
        onCancel={() => setCategoryToDelete(null)}
      />
    </>
  )
}
