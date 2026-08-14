import React, { useState, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Edit, Trash2, Folder, Plus } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
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
      <div className="lg:col-span-2 bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 font-mono">
        <h2 className="text-xs font-medium text-[#e4e4e4] uppercase tracking-[0.05em] mb-3">01 CATEGORIES DIRECTORY</h2>
        
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#6b7280]" />
          <input 
            type="text" 
            placeholder="Search categories..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 pl-8 pr-3 text-xs text-[#e4e4e4] placeholder-[#404040] focus:border-blue-500 focus:outline-none font-mono uppercase"
          />
        </div>

        {isCatsLoading ? (
          <div className="text-center py-6 text-[#6b7280] text-xs">Loading categories...</div>
        ) : filteredCategories.length === 0 ? (
          <p className="text-[#6b7280] text-xs py-4 text-center">No matching machine categories found.</p>
        ) : (
          <div className="space-y-1.5 max-h-[450px] overflow-y-auto pr-1">
            {filteredCategories.map((cat: any) => (
              <div key={cat.id} className="bg-[#0a0a0a] flex justify-between items-center p-2.5 rounded-sm border border-[#1a1a1a] hover:border-[#2a2a2a] hover:bg-[#141414] transition-colors font-mono">
                <div className="flex items-center space-x-2">
                  <div className="p-1 bg-[#141414] text-blue-400 rounded-sm border border-[#2a2a2a]">
                    <Folder className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-[#e4e4e4] uppercase">{cat.name}</span>
                </div>
                {isWritable && (
                  <div className="flex space-x-1">
                    <button 
                      onClick={() => { setEditingCat(cat); setCatName(cat.name); }}
                      className="p-1 text-[#6b7280] hover:text-blue-400 hover:bg-[#1f1f1f] rounded-sm transition cursor-pointer"
                      title="Edit Category"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => { setCategoryToDelete(cat) }}
                      className="p-1 text-[#6b7280] hover:text-red-400 hover:bg-[#1f1f1f] rounded-sm transition cursor-pointer"
                      aria-label={`Delete category ${cat.name}`}
                      title="Delete Category"
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
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 h-fit border-l-2 border-l-blue-500 font-mono">
          <h2 className="text-xs font-medium text-[#e4e4e4] uppercase tracking-[0.05em] mb-3 flex items-center space-x-1.5">
            <Folder className="h-3.5 w-3.5 text-blue-400" />
            <span>{editingCat ? '02 EDIT CATEGORY' : '02 CREATE CATEGORY'}</span>
          </h2>
          <form onSubmit={handleCatSubmit} className="space-y-3 font-mono">
            <div>
              <label className="block text-[10px] text-[#6b7280] uppercase tracking-wider mb-1">CATEGORY NAME</label>
              <input 
                type="text" 
                required
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-xs text-[#e4e4e4] placeholder-[#404040] focus:border-blue-500 focus:outline-none uppercase font-mono"
                placeholder="e.g. Press Machine"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-1">
              {editingCat && (
                <button 
                  type="button"
                  onClick={() => { setEditingCat(null); setCatName(''); }}
                  className="bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] text-[#6b7280] hover:text-[#e4e4e4] px-3 py-1 rounded-sm text-xs font-mono uppercase transition cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button 
                type="submit"
                className="bg-[#141414] hover:bg-[#1f1f1f] border border-blue-500/50 text-blue-400 hover:text-blue-300 px-3.5 py-1 rounded-sm text-xs font-mono uppercase transition flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                <span>{editingCat ? 'Save' : 'Create'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={!!categoryToDelete}
        title="Delete Category"
        message={`Are you sure you want to permanently delete category "${categoryToDelete?.name}"? All associated machines under this category will be updated.`}
        confirmLabel="Delete Category"
        danger={true}
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
