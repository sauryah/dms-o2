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

  const isWritable = role === 'ROOT' || role === 'ADMIN'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 font-mono">
      {/* Page Header */}
      <div className="mb-6 border-b border-[#2a2a2a] pb-4">
        <div className="flex items-center gap-1.5 text-xs text-[#6b7280] uppercase tracking-wider mb-0.5">
          <Cpu className="h-3.5 w-3.5 text-blue-500" />
          <span>01 INFRASTRUCTURE & TOOLING CONFIGURATION</span>
        </div>
        <h1 className="text-base md:text-lg font-medium text-[#e4e4e4] uppercase tracking-[0.05em]">Machines & Sets Manager</h1>
        <p className="text-[#6b7280] text-xs mt-0.5">Configure machine taxonomy, set allocations, and hardware hierarchy.</p>
      </div>

      {/* Stats Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-3.5 flex justify-between items-center">
          <div>
            <p className="text-[10px] text-[#6b7280] uppercase tracking-wider">01 TOTAL CATEGORIES</p>
            {isCatsLoading ? (
              <Skeleton width="w-12" height="h-6" />
            ) : (
              <h3 className="text-xl font-bold text-[#e4e4e4] mt-0.5 tabular-nums font-mono">{categories?.length || 0}</h3>
            )}
          </div>
          <div className="p-2 bg-[#141414] text-blue-400 rounded-sm border border-[#2a2a2a]">
            <Folder className="h-4 w-4" />
          </div>
        </div>
        
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-3.5 flex justify-between items-center">
          <div>
            <p className="text-[10px] text-[#6b7280] uppercase tracking-wider">02 TOTAL MACHINES</p>
            {isMachsLoading ? (
              <Skeleton width="w-12" height="h-6" />
            ) : (
              <h3 className="text-xl font-bold text-[#e4e4e4] mt-0.5 tabular-nums font-mono">{machines?.length || 0}</h3>
            )}
          </div>
          <div className="p-2 bg-[#141414] text-emerald-400 rounded-sm border border-[#2a2a2a]">
            <Cpu className="h-4 w-4" />
          </div>
        </div>

        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-3.5 flex justify-between items-center">
          <div>
            <p className="text-[10px] text-[#6b7280] uppercase tracking-wider">03 ACTIVE TOOL SETS</p>
            {isSetsLoading ? (
              <Skeleton width="w-12" height="h-6" />
            ) : (
              <h3 className="text-xl font-bold text-[#e4e4e4] mt-0.5 tabular-nums font-mono">{sets?.length || 0}</h3>
            )}
          </div>
          <div className="p-2 bg-[#141414] text-purple-400 rounded-sm border border-[#2a2a2a]">
            <Layers className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Tabs Switcher - Terminal Monospace */}
      <div className="flex bg-[#0a0a0a] p-1 border border-[#2a2a2a] rounded-sm space-x-1 mb-6 max-w-fit overflow-x-auto">
        <button 
          onClick={() => setActiveTab('categories')}
          className={`px-3 py-1 text-xs uppercase font-mono rounded-sm transition-colors flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-[#141414] text-blue-400 border border-blue-500/40 font-bold'
              : 'text-[#6b7280] hover:text-[#e4e4e4] border border-transparent'
          }`}
        >
          <Folder className="h-3.5 w-3.5" />
          <span>Categories</span>
          <span className="px-1.5 py-0.2 text-[10px] font-mono rounded-sm bg-[#0f0f0f] border border-[#2a2a2a] tabular-nums">
            {categories?.length || 0}
          </span>
        </button>
        <button 
          onClick={() => setActiveTab('machines')}
          className={`px-3 py-1 text-xs uppercase font-mono rounded-sm transition-colors flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'machines'
              ? 'bg-[#141414] text-emerald-400 border border-emerald-500/40 font-bold'
              : 'text-[#6b7280] hover:text-[#e4e4e4] border border-transparent'
          }`}
        >
          <Cpu className="h-3.5 w-3.5" />
          <span>Machines</span>
          <span className="px-1.5 py-0.2 text-[10px] font-mono rounded-sm bg-[#0f0f0f] border border-[#2a2a2a] tabular-nums">
            {machines?.length || 0}
          </span>
        </button>
        <button 
          onClick={() => setActiveTab('sets')}
          className={`px-3 py-1 text-xs uppercase font-mono rounded-sm transition-colors flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'sets'
              ? 'bg-[#141414] text-purple-400 border border-purple-500/40 font-bold'
              : 'text-[#6b7280] hover:text-[#e4e4e4] border border-transparent'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Tool Sets</span>
          <span className="px-1.5 py-0.2 text-[10px] font-mono rounded-sm bg-[#0f0f0f] border border-[#2a2a2a] tabular-nums">
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
