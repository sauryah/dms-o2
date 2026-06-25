import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Folder, Cpu, Layers } from 'lucide-react'
import { useApi, useAuth } from '../App'
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
