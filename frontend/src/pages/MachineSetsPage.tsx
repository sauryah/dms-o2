import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Folder, Cpu, Layers } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useApi } from '../hooks/useApi'
import { Skeleton } from '../components/ui/Skeleton'
import { CategoriesTab } from './machinesets/CategoriesTab'
import { MachinesTab } from './machinesets/MachinesTab'
import { SetsTab } from './machinesets/SetsTab'

export function MachineSetsPage() {
  const { request } = useApi()
  const { role } = useAuth()
  const [activeTab, setActiveTab] = useState<'categories' | 'machines' | 'sets'>('categories')

  // Queries
  const { data: categories, isLoading: isCatsLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => request('/api/categories/'),
  })

  const { data: machines, isLoading: isMachsLoading } = useQuery({
    queryKey: ['machines'],
    queryFn: () => request('/api/machines/'),
  })

  const { data: sets, isLoading: isSetsLoading } = useQuery({
    queryKey: ['sets'],
    queryFn: () => request('/api/sets/'),
  })

  const isWritable = role === 'ROOT' || role === 'ADMIN'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 font-mono space-y-6">
      {/* Page Header */}
      <div className="border-b border-[var(--color-border)] pb-4">
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted)] font-bold uppercase tracking-wider mb-0.5">
          <Cpu className="h-3.5 w-3.5 text-blue-400" />
          <span>Machine & Set Registry</span>
        </div>
        <h1 className="text-base md:text-lg font-bold text-[var(--color-text)] uppercase tracking-wide font-heading">
          Machines & Sets
        </h1>
        <p className="text-[var(--color-muted)] text-xs mt-0.5">
          Configure machine taxonomy, set allocations, and tooling assignments.
        </p>
      </div>

      {/* Stats Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 flex justify-between items-center shadow-sm">
          <div>
            <p className="text-[10px] text-[var(--color-muted)] font-bold uppercase tracking-wider">
              Total Categories
            </p>
            {isCatsLoading ? (
              <Skeleton width="w-12" height="h-6" />
            ) : (
              <h3 className="text-xl font-bold text-[var(--color-text)] mt-0.5 tabular-nums font-mono">
                {categories?.length || 0}
              </h3>
            )}
          </div>
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <Folder className="h-4 w-4" />
          </div>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 flex justify-between items-center shadow-sm">
          <div>
            <p className="text-[10px] text-[var(--color-muted)] font-bold uppercase tracking-wider">
              Total Machines
            </p>
            {isMachsLoading ? (
              <Skeleton width="w-12" height="h-6" />
            ) : (
              <h3 className="text-xl font-bold text-[var(--color-text)] mt-0.5 tabular-nums font-mono">
                {machines?.length || 0}
              </h3>
            )}
          </div>
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Cpu className="h-4 w-4" />
          </div>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 flex justify-between items-center shadow-sm">
          <div>
            <p className="text-[10px] text-[var(--color-muted)] font-bold uppercase tracking-wider">
              Active Tool Sets
            </p>
            {isSetsLoading ? (
              <Skeleton width="w-12" height="h-6" />
            ) : (
              <h3 className="text-xl font-bold text-[var(--color-text)] mt-0.5 tabular-nums font-mono">
                {sets?.length || 0}
              </h3>
            )}
          </div>
          <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
            <Layers className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex bg-[var(--color-surface)] p-1.5 border border-[var(--color-border)] rounded-2xl space-x-1.5 max-w-fit overflow-x-auto shadow-sm">
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-3.5 py-1.5 text-xs uppercase font-mono font-bold rounded-xl transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'
          }`}
        >
          <Folder className="h-3.5 w-3.5" />
          <span>Categories</span>
          <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-white/20 text-white tabular-nums">
            {categories?.length || 0}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('machines')}
          className={`px-3.5 py-1.5 text-xs uppercase font-mono font-bold rounded-xl transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'machines'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'
          }`}
        >
          <Cpu className="h-3.5 w-3.5" />
          <span>Machines</span>
          <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-white/20 text-white tabular-nums">
            {machines?.length || 0}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('sets')}
          className={`px-3.5 py-1.5 text-xs uppercase font-mono font-bold rounded-xl transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'sets'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Tool Sets</span>
          <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-white/20 text-white tabular-nums">
            {sets?.length || 0}
          </span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono">
        {activeTab === 'categories' && (
          <CategoriesTab
            categories={categories}
            isCatsLoading={isCatsLoading}
            isWritable={isWritable}
          />
        )}
        {activeTab === 'machines' && (
          <MachinesTab
            machines={machines}
            categories={categories}
            isMachsLoading={isMachsLoading}
            isWritable={isWritable}
          />
        )}
        {activeTab === 'sets' && (
          <SetsTab
            sets={sets}
            machines={machines}
            isSetsLoading={isSetsLoading}
            isWritable={isWritable}
          />
        )}
      </div>
    </div>
  )
}
