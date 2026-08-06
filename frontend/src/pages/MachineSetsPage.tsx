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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Machines & Sets Manager</h1>
        <p className="text-slate-400 mt-1">Configure layout, structure machine profiles, and allocate toolsets.</p>
      </div>

      {/* Stats Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#0b0f19]/90 border border-slate-800/80 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Total Categories</p>
              {isCatsLoading ? <Skeleton width="w-16" height="h-8" /> : <h3 className="text-2xl font-bold text-white mt-1 font-mono tracking-tight">{categories?.length || 0}</h3>}
            </div>
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Folder className="h-5 w-5" />
            </div>
          </div>
        </div>
        
        <div className="bg-[#0b0f19]/90 border border-slate-800/80 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Total Machines</p>
              {isMachsLoading ? <Skeleton width="w-16" height="h-8" /> : <h3 className="text-2xl font-bold text-white mt-1 font-mono tracking-tight">{machines?.length || 0}</h3>}
            </div>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Cpu className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="bg-[#0b0f19]/90 border border-slate-800/80 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Active Tool Sets</p>
              {isSetsLoading ? <Skeleton width="w-16" height="h-8" /> : <h3 className="text-2xl font-bold text-white mt-1 font-mono tracking-tight">{sets?.length || 0}</h3>}
            </div>
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Layers className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher - Linear / Vercel Style */}
      <div className="flex bg-[#0b0f19]/90 p-1 border border-slate-800/80 rounded-xl space-x-1 mb-8 max-w-fit overflow-x-auto scrollbar-none shadow-sm">
        <button 
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'categories' ? 'bg-slate-900 text-white border border-slate-800/80 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
          }`}
        >
          <Folder className="h-3.5 w-3.5" />
          <span>Machine Categories</span>
          <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full transition-all ${
            activeTab === 'categories' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800/50 text-slate-400'
          }`}>
            {categories?.length || 0}
          </span>
        </button>
        <button 
          onClick={() => setActiveTab('machines')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'machines' ? 'bg-slate-900 text-white border border-slate-800/80 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
          }`}
        >
          <Cpu className="h-3.5 w-3.5" />
          <span>Machines</span>
          <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full transition-all ${
            activeTab === 'machines' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800/50 text-slate-400'
          }`}>
            {machines?.length || 0}
          </span>
        </button>
        <button 
          onClick={() => setActiveTab('sets')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'sets' ? 'bg-slate-900 text-white border border-slate-800/80 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Tool Sets</span>
          <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full transition-all ${
            activeTab === 'sets' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800/50 text-slate-400'
          }`}>
            {sets?.length || 0}
          </span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
