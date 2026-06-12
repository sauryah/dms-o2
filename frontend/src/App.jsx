import React, { createContext, useContext, useState, useEffect } from 'react'
import { 
  HashRouter as Router, 
  Routes, 
  Route, 
  Link, 
  useNavigate, 
  useParams,
  useSearchParams
} from 'react-router-dom'
import { 
  QueryClient, 
  QueryClientProvider, 
  useQuery, 
  useMutation, 
  useQueryClient 
} from '@tanstack/react-query'
import { RoundDieCard } from './RoundDieCard'
import { FlatDieCard } from './FlatDieCard'
import { 
  Search, 
  Upload, 
  Layers, 
  Cpu, 
  Settings, 
  LogOut, 
  LogIn, 
  Activity, 
  History, 
  SlidersHorizontal,
  ChevronRight,
  Plus,
  Trash2,
  FileSpreadsheet,
  Edit,
  Sliders,
  Database,
  Calendar,
  Layers3,
  Wrench,
  X
} from 'lucide-react'

// React Query Client
const queryClient = new QueryClient()

// In-Memory Auth Context
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [role, setRole] = useState(null)
  const [username, setUsername] = useState(null)

  const login = (newToken, userRole, userN) => {
    setToken(newToken)
    setRole(userRole)
    setUsername(userN)
  }

  const logout = () => {
    setToken(null)
    setRole(null)
    setUsername(null)
  }

  return (
    <AuthContext.Provider value={{ token, role, username, login, logout, setToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

// API Fetch Helper
export const useApi = () => {
  const { token, setToken } = useAuth()
  
  const request = async (url, options = {}) => {
    const headers = { ...options.headers }
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    const res = await fetch(url, { ...options, headers })
    
    if (res.status === 401) {
      setToken(null)
      window.location.hash = '/login'
      throw new Error('Unauthorized')
    }
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData.detail || errorData.error || 'Request failed')
    }
    
    if (res.status === 204) return null
    return res.json()
  }

  return { request }
}

// Navbar Component
function Navbar() {
  const { username, role, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-3 text-white group">
              <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg group-hover:scale-105 transition-transform duration-300">
                <Layers className="h-5 w-5 text-white" />
              </div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                DMS
              </span>
            </Link>
            
            <div className="hidden sm:flex space-x-4">
              <Link to="/" className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Dashboard
              </Link>
              <Link to="/inventory" className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Die Inventory
              </Link>
              <Link to="/machines" className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Machine Sets
              </Link>
              {(role === 'ROOT' || role === 'ADMIN') && (
                <Link to="/import" className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Bulk Import
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {username ? (
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <span className="block text-sm font-semibold text-slate-200">{username}</span>
                  <span className="block text-xxs text-slate-500 font-mono tracking-wider uppercase">{role}</span>
                </div>
                <button 
                  onClick={() => { logout(); navigate('/login'); }}
                  className="flex items-center space-x-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white px-3.5 py-1.5 rounded-lg text-sm transition-all duration-300"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <Link 
                to="/login"
                className="flex items-center space-x-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-300"
              >
                <LogIn className="h-4 w-4" />
                <span>Login</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

// Dashboard Page
function DashboardPage() {
  const { request } = useApi()
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  // Fetch all dies to compute overall statistics
  const { data: allDies, isLoading: isStatsLoading } = useQuery({
    queryKey: ['allDiesStats'],
    queryFn: () => request('/api/dies/')
  })

  // Fetch fuzzy search results if search query exists
  const { data: searchDies, isLoading: isSearchLoading } = useQuery({
    queryKey: ['searchDiesDashboard', q],
    queryFn: () => {
      if (!q) return []
      return request(`/api/search/?q=${encodeURIComponent(q)}`)
    },
    enabled: !!q
  })

  const totalCount = allDies ? allDies.length : 0
  const stats = {
    AVAILABLE: 0,
    RUNNING: 0,
    CLEANING: 0,
    POLISHING: 0,
    DAMAGED: 0,
    SCRAPPED: 0,
    MISSING: 0
  }
  if (allDies) {
    allDies.forEach(d => {
      if (stats[d.status] !== undefined) {
        stats[d.status]++
      }
    })
  }

  const statusColors = {
    AVAILABLE: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5',
    RUNNING: 'border-blue-500/30 text-blue-400 bg-blue-500/5',
    CLEANING: 'border-amber-500/30 text-amber-400 bg-amber-500/5',
    POLISHING: 'border-purple-500/30 text-purple-400 bg-purple-500/5',
    DAMAGED: 'border-rose-500/30 text-rose-400 bg-rose-500/5',
    SCRAPPED: 'border-slate-500/30 text-slate-400 bg-slate-500/5',
    MISSING: 'border-red-500/30 text-red-400 bg-red-500/5',
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 text-center sm:text-left">
        <h1 className="text-4xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          Die Tracking Dashboard
        </h1>
        <p className="text-slate-400 mt-2">Overview of facility inventory and search portal.</p>
      </div>

      {isStatsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse bg-slate-900 border border-slate-800 rounded-xl h-24"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
          <div className="bg-gradient-to-tr from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 shadow-lg text-center flex flex-col justify-between min-h-[100px]">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Dies</span>
            <span className="text-3xl font-extrabold text-white block mt-1">{totalCount}</span>
          </div>
          {Object.entries(stats).map(([statusKey, count]) => (
            <div 
              key={statusKey}
              onClick={() => navigate(`/inventory?status=${statusKey}`)}
              className={`border rounded-2xl p-4 shadow-lg text-center flex flex-col justify-between min-h-[100px] cursor-pointer hover:scale-[1.02] transition-all duration-350 ${statusColors[statusKey]}`}
            >
              <span className="text-xs font-semibold uppercase tracking-wider opacity-80">{statusKey}</span>
              <span className="text-3xl font-extrabold block mt-1">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Clean search interface */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 mb-8 shadow-xl max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-white">Find a Die</h2>
          <p className="text-slate-400 text-sm mt-1">Type the Die ID, Casing, or Location to search instantly.</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-4 top-3.5 h-6 w-6 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search by Die ID, casing, location..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-3.5 pl-14 pr-4 text-white placeholder-slate-500 focus:outline-none transition-all duration-300 text-lg shadow-inner"
          />
        </div>
      </div>

      {q && (
        <div className="mt-8 border-t border-slate-800/80 pt-8">
          <div className="mb-6 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-300">
              Search Results for <span className="text-blue-400">"{q}"</span>
            </h3>
            <Link to={`/inventory?q=${encodeURIComponent(q)}`} className="text-sm text-blue-400 hover:underline">
              View in Inventory
            </Link>
          </div>

          {isSearchLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : searchDies?.length === 0 ? (
            <div className="text-center py-12 bg-slate-900 border border-slate-850 rounded-2xl">
              <p className="text-slate-500">No dies found matching "{q}".</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchDies?.map((die) => 
                die.die_type === 'ROUND' ? (
                  <RoundDieCard 
                    key={die.die_id} 
                    die={die} 
                    onClick={() => navigate(`/dies/${die.die_id}`)}
                  />
                ) : (
                  <FlatDieCard 
                    key={die.die_id} 
                    die={die} 
                    onClick={() => navigate(`/dies/${die.die_id}`)}
                  />
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Die Inventory & Advanced Filtering Page
function InventoryPage() {
  const { request } = useApi()
  const { role } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  // Search parameters states initialized from URL if present
  const [q, setQ] = useState(searchParams.get('q') || '')
  const [dieType, setDieType] = useState(searchParams.get('die_type') || '')
  const [statusVal, setStatusVal] = useState(searchParams.get('status') || '')
  const [casing, setCasing] = useState(searchParams.get('casing') || '')
  
  // Custom ranges
  const [sizeMin, setSizeMin] = useState('')
  const [sizeMax, setSizeMax] = useState('')
  const [widthMin, setWidthMin] = useState('')
  const [widthMax, setWidthMax] = useState('')
  const [thickMin, setThickMin] = useState('')
  const [thickMax, setThickMax] = useState('')
  
  const [showFilters, setShowFilters] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Fetch list of sets for the dropdown
  const { data: setsList } = useQuery({
    queryKey: ['setsDropdownList'],
    queryFn: () => request('/api/sets/')
  })

  // Fetch list of machines
  const { data: machinesList } = useQuery({
    queryKey: ['machinesList'],
    queryFn: () => request('/api/machines/')
  })

  // Tree expanded states
  const [expandedMachines, setExpandedMachines] = useState({})
  const [expandedSets, setExpandedSets] = useState({})
  const [expandedUnassigned, setExpandedUnassigned] = useState(true)

  const toggleMachine = (id) => {
    setExpandedMachines(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleSet = (id) => {
    setExpandedSets(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Create Die form states
  const [newDieId, setNewDieId] = useState('')
  const [newDieType, setNewDieType] = useState('ROUND')
  const [newCasing, setNewCasing] = useState('')
  const [newStatus, setNewStatus] = useState('AVAILABLE')
  const [newLocation, setNewLocation] = useState('')
  const [newRemarks, setNewRemarks] = useState('')
  const [newCurrentSet, setNewCurrentSet] = useState('')
  
  // Round subfields
  const [newOriginalSize, setNewOriginalSize] = useState('')
  const [newCurrentSize, setNewCurrentSize] = useState('')
  
  // Flat subfields
  const [newOriginalWidth, setNewOriginalWidth] = useState('')
  const [newCurrentWidth, setNewCurrentWidth] = useState('')
  const [newOriginalThickness, setNewOriginalThickness] = useState('')
  const [newCurrentThickness, setNewCurrentThickness] = useState('')
  const [newRadius, setNewRadius] = useState('')

  const [createError, setCreateError] = useState(null)

  // React Query Fetcher
  const { data: dies, isLoading, error } = useQuery({
    queryKey: ['dies', q, dieType, statusVal, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax],
    queryFn: () => {
      let url = q ? '/api/search/' : '/api/dies/'
      const params = new URLSearchParams()
      
      if (q) params.append('q', q)
      if (dieType) params.append('die_type', dieType)
      if (statusVal) params.append('status', statusVal)
      if (casing) params.append('casing', casing)
      
      if (sizeMin) params.append('size_min', sizeMin)
      if (sizeMax) params.append('size_max', sizeMax)
      if (widthMin) params.append('width_min', widthMin)
      if (widthMax) params.append('width_max', widthMax)
      if (thickMin) params.append('thick_min', thickMin)
      if (thickMax) params.append('thick_max', thickMax)
      
      if (params.toString()) {
        url += `?${params.toString()}`
      }
      return request(url)
    }
  })

  // Create die mutation
  const createDieMutation = useMutation({
    mutationFn: (payload) => request('/api/dies/', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['dies'])
      queryClient.invalidateQueries(['allDiesStats'])
      setIsCreateOpen(false)
      resetCreateForm()
    },
    onError: (err) => {
      setCreateError(err.message)
    }
  })

  const resetCreateForm = () => {
    setNewDieId('')
    setNewDieType('ROUND')
    setNewCasing('')
    setNewStatus('AVAILABLE')
    setNewLocation('')
    setNewRemarks('')
    setNewCurrentSet('')
    setNewOriginalSize('')
    setNewCurrentSize('')
    setNewOriginalWidth('')
    setNewCurrentWidth('')
    setNewOriginalThickness('')
    setNewCurrentThickness('')
    setNewRadius('')
    setCreateError(null)
  }

  const handleCreateSubmit = (e) => {
    e.preventDefault()
    setCreateError(null)
    
    const payload = {
      die_id: newDieId,
      die_type: newDieType,
      casing: newCasing,
      status: newStatus,
      location: newLocation,
      remarks: newRemarks,
      current_set: newCurrentSet || null
    }

    if (newDieType === 'ROUND') {
      payload.original_size = newOriginalSize
      payload.current_size = newCurrentSize
    } else {
      payload.original_width = newOriginalWidth
      payload.current_width = newCurrentWidth
      payload.original_thickness = newOriginalThickness
      payload.current_thickness = newCurrentThickness
      payload.radius = newRadius
    }

    createDieMutation.mutate(payload)
  }

  // Group dies into tree data structure
  const diesBySet = {}
  const unassignedDies = []
  
  dies?.forEach(die => {
    if (die.current_set) {
      if (!diesBySet[die.current_set]) {
        diesBySet[die.current_set] = []
      }
      diesBySet[die.current_set].push(die)
    } else {
      unassignedDies.push(die)
    }
  })

  const machinesWithData = (machinesList || []).map(machine => {
    const machineSets = (setsList || []).filter(s => s.machine === machine.id).map(set => {
      const setDies = diesBySet[set.id] || []
      return {
        ...set,
        dies: setDies
      }
    }).filter(set => set.dies.length > 0)

    return {
      ...machine,
      sets: machineSets,
      totalDies: machineSets.reduce((sum, s) => sum + s.dies.length, 0)
    }
  }).filter(m => m.totalDies > 0)

  const handleExpandAll = () => {
    const nextMachs = {}
    const nextSets = {}
    machinesWithData.forEach(m => {
      nextMachs[m.id] = true
      m.sets.forEach(s => {
        nextSets[s.id] = true
      })
    })
    setExpandedMachines(nextMachs)
    setExpandedSets(nextSets)
    setExpandedUnassigned(true)
  }

  const handleCollapseAll = () => {
    setExpandedMachines({})
    setExpandedSets({})
    setExpandedUnassigned(false)
  }

  const canCreate = role === 'ROOT' || role === 'ADMIN'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Die Registry Inventory</h1>
          <p className="text-slate-400 mt-1">Full access catalog with advanced sizing and category filters.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={handleExpandAll}
            className="bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-805 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300 shadow-sm"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={handleCollapseAll}
            className="bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-805 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300 shadow-sm"
          >
            Collapse All
          </button>
          {canCreate && (
            <button 
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-3 rounded-xl font-semibold shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-300"
            >
              <Plus className="h-5 w-5" />
              <span>Add New Die</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 shadow-xl">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by Die ID, casing, location, or machine..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none transition-all duration-300"
            />
          </div>
          
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center space-x-2 px-5 py-3.5 rounded-xl border font-semibold transition-all duration-300 ${
              showFilters 
                ? 'bg-blue-600/10 text-blue-400 border-blue-500/30' 
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            <SlidersHorizontal className="h-5 w-5" />
            <span>Filters</span>
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-slate-800/80">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Die Type</label>
              <select 
                value={dieType}
                onChange={(e) => { setDieType(e.target.value); setSizeMin(''); setSizeMax(''); setWidthMin(''); setWidthMax(''); setThickMin(''); setThickMax(''); }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-300 focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Types</option>
                <option value="ROUND">Round</option>
                <option value="FLAT">Flat</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Status</label>
              <select 
                value={statusVal}
                onChange={(e) => setStatusVal(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-300 focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="RUNNING">Running</option>
                <option value="CLEANING">Cleaning</option>
                <option value="POLISHING">Polishing</option>
                <option value="DAMAGED">Damaged</option>
                <option value="SCRAPPED">Scrapped</option>
                <option value="MISSING">Missing</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Casing</label>
              <input 
                type="text" 
                placeholder="e.g. 25x10"
                value={casing}
                onChange={(e) => setCasing(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-300 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {dieType === 'ROUND' && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Size Range (mm)</label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    step="0.001"
                    placeholder="Min"
                    value={sizeMin}
                    onChange={(e) => setSizeMin(e.target.value)}
                    className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-300 focus:outline-none"
                  />
                  <input 
                    type="number" 
                    step="0.001"
                    placeholder="Max"
                    value={sizeMax}
                    onChange={(e) => setSizeMax(e.target.value)}
                    className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-300 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {dieType === 'FLAT' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Width (mm)</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      step="0.001"
                      placeholder="Min"
                      value={widthMin}
                      onChange={(e) => setWidthMin(e.target.value)}
                      className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-300 focus:outline-none"
                    />
                    <input 
                      type="number" 
                      step="0.001"
                      placeholder="Max"
                      value={widthMax}
                      onChange={(e) => setWidthMax(e.target.value)}
                      className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-300 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Thickness (mm)</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      step="0.001"
                      placeholder="Min"
                      value={thickMin}
                      onChange={(e) => setThickMin(e.target.value)}
                      className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-300 focus:outline-none"
                    />
                    <input 
                      type="number" 
                      step="0.001"
                      placeholder="Max"
                      value={thickMax}
                      onChange={(e) => setThickMax(e.target.value)}
                      className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-300 focus:outline-none"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Results grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-rose-500/10 border border-rose-500/20 rounded-xl p-8">
          <p className="text-rose-400 font-semibold">Error: {error.message}</p>
        </div>
      ) : (machinesWithData.length === 0 && unassignedDies.length === 0) ? (
        <div className="text-center py-24 bg-slate-900 border border-slate-850 rounded-2xl">
          <p className="text-slate-500 text-lg">No dies found matching the search criteria.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Machines Tree */}
          {machinesWithData.map((machine) => {
            const isMachineExpanded = !!expandedMachines[machine.id]
            return (
              <div key={machine.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition-all duration-300">
                {/* Machine Header */}
                <div 
                  onClick={() => toggleMachine(machine.id)}
                  className="flex items-center justify-between p-5 bg-slate-900/80 hover:bg-slate-900 cursor-pointer transition-colors duration-200 select-none"
                >
                  <div className="flex items-center space-x-4">
                    <ChevronRight 
                      className={`h-5 w-5 text-slate-400 transform transition-transform duration-200 ${isMachineExpanded ? 'rotate-90' : ''}`}
                    />
                    <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                      <Cpu className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{machine.name}</h3>
                      <span className="text-xs text-slate-500 font-medium">{machine.category_name}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="bg-slate-800 text-slate-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-slate-700/50">
                      {machine.totalDies} {machine.totalDies === 1 ? 'Die' : 'Dies'}
                    </span>
                  </div>
                </div>

                {/* Machine Sets (Children) */}
                {isMachineExpanded && (
                  <div className="p-6 border-t border-slate-850 bg-slate-950/20 space-y-4">
                    {machine.sets.map((set) => {
                      const isSetExpanded = !!expandedSets[set.id]
                      return (
                        <div key={set.id} className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-900/20">
                          {/* Set Header */}
                          <div 
                            onClick={() => toggleSet(set.id)}
                            className="flex items-center justify-between p-4 bg-slate-900/50 hover:bg-slate-900/80 cursor-pointer transition-colors duration-200 select-none"
                          >
                            <div className="flex items-center space-x-3">
                              <ChevronRight 
                                className={`h-4.5 w-4.5 text-slate-400 transform transition-transform duration-200 ${isSetExpanded ? 'rotate-90' : ''}`}
                              />
                              <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                                <Layers className="h-4 w-4 text-indigo-400" />
                              </div>
                              <span className="font-bold text-slate-200 text-sm md:text-base">{set.name}</span>
                            </div>
                            <span className="bg-slate-950 text-indigo-400 text-xs font-medium px-2 py-0.5 rounded-full border border-slate-800">
                              {set.dies.length} {set.dies.length === 1 ? 'Die' : 'Dies'}
                            </span>
                          </div>

                          {/* Set Dies (Cards Grid) */}
                          {isSetExpanded && (
                            <div className="p-5 bg-slate-950/40 border-t border-slate-850">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {set.dies.map((die) => 
                                  die.die_type === 'ROUND' ? (
                                    <RoundDieCard 
                                      key={die.die_id} 
                                      die={die} 
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        navigate(`/dies/${die.die_id}`)
                                      }}
                                    />
                                  ) : (
                                    <FlatDieCard 
                                      key={die.die_id} 
                                      die={die} 
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        navigate(`/dies/${die.die_id}`)
                                      }}
                                    />
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {/* Standalone / Unassigned Dies */}
          {unassignedDies.length > 0 && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition-all duration-300">
              <div 
                onClick={() => setExpandedUnassigned(!expandedUnassigned)}
                className="flex items-center justify-between p-5 bg-slate-900/80 hover:bg-slate-900 cursor-pointer transition-colors duration-200 select-none"
              >
                <div className="flex items-center space-x-4">
                  <ChevronRight 
                    className={`h-5 w-5 text-slate-400 transform transition-transform duration-200 ${expandedUnassigned ? 'rotate-90' : ''}`}
                  />
                  <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <Sliders className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Unassigned / Standalone Dies</h3>
                    <span className="text-xs text-slate-500 font-medium">Dies not assigned to any set</span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="bg-slate-800 text-slate-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-slate-700/50">
                    {unassignedDies.length} {unassignedDies.length === 1 ? 'Die' : 'Dies'}
                  </span>
                </div>
              </div>

              {expandedUnassigned && (
                <div className="p-6 border-t border-slate-850 bg-slate-950/20">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {unassignedDies.map((die) => 
                      die.die_type === 'ROUND' ? (
                        <RoundDieCard 
                          key={die.die_id} 
                          die={die} 
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/dies/${die.die_id}`)
                          }}
                        />
                      ) : (
                        <FlatDieCard 
                          key={die.die_id} 
                          die={die} 
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/dies/${die.die_id}`)
                          }}
                        />
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Die Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Create Production Die</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-6">
              {createError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl p-4 text-sm">
                  {createError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Die ID (Unique)</label>
                  <input 
                    type="text" 
                    required
                    value={newDieId}
                    onChange={(e) => setNewDieId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Die Type</label>
                  <select 
                    value={newDieType}
                    onChange={(e) => setNewDieType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                  >
                    <option value="ROUND">Round</option>
                    <option value="FLAT">Flat</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Casing</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. 25x10"
                    value={newCasing}
                    onChange={(e) => setNewCasing(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Status</label>
                  <select 
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="RUNNING">Running</option>
                    <option value="CLEANING">Cleaning</option>
                    <option value="POLISHING">Polishing</option>
                    <option value="DAMAGED">Damaged</option>
                    <option value="SCRAPPED">Scrapped</option>
                    <option value="MISSING">Missing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Location</label>
                  <input 
                    type="text" 
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Assign Set</label>
                  <select 
                    value={newCurrentSet}
                    onChange={(e) => setNewCurrentSet(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                  >
                    <option value="">— Unassigned —</option>
                    {setsList?.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.machine_name})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Sizing Subfields */}
              <div className="border-t border-slate-800 pt-6">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Dimensions Specifications</h3>
                
                {newDieType === 'ROUND' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Original Size (mm)</label>
                      <input 
                        type="number" 
                        step="0.001"
                        required
                        value={newOriginalSize}
                        onChange={(e) => setNewOriginalSize(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Current Size (mm)</label>
                      <input 
                        type="number" 
                        step="0.001"
                        required
                        value={newCurrentSize}
                        onChange={(e) => setNewCurrentSize(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Original Width (mm)</label>
                      <input 
                        type="number" 
                        step="0.001"
                        required
                        value={newOriginalWidth}
                        onChange={(e) => setNewOriginalWidth(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Current Width (mm)</label>
                      <input 
                        type="number" 
                        step="0.001"
                        required
                        value={newCurrentWidth}
                        onChange={(e) => setNewCurrentWidth(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Original Thickness (mm)</label>
                      <input 
                        type="number" 
                        step="0.001"
                        required
                        value={newOriginalThickness}
                        onChange={(e) => setNewOriginalThickness(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Current Thickness (mm)</label>
                      <input 
                        type="number" 
                        step="0.001"
                        required
                        value={newCurrentThickness}
                        onChange={(e) => setNewCurrentThickness(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Radius (mm)</label>
                      <input 
                        type="number" 
                        step="0.001"
                        required
                        value={newRadius}
                        onChange={(e) => setNewRadius(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Remarks</label>
                <textarea 
                  rows="3"
                  value={newRemarks}
                  onChange={(e) => setNewRemarks(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setIsCreateOpen(false)}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 px-5 py-2.5 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={createDieMutation.isLoading}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-2.5 rounded-xl font-semibold"
                >
                  {createDieMutation.isLoading ? 'Creating...' : 'Create Die'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// Die Detail & Edit Page
function DieDetailPage() {
  const { id } = useParams()
  const { request } = useApi()
  const { role } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  
  const [isEditing, setIsEditing] = useState(false)
  const [statusVal, setStatusVal] = useState('')
  const [location, setLocation] = useState('')
  const [remarks, setRemarks] = useState('')
  const [currentSetId, setCurrentSetId] = useState('')
  
  // Custom subfields editing
  const [currentSize, setCurrentSize] = useState('')
  const [currentWidth, setCurrentWidth] = useState('')
  const [currentThickness, setCurrentThickness] = useState('')

  // Query details
  const { data: die, isLoading, error } = useQuery({
    queryKey: ['die', id],
    queryFn: () => request(`/api/dies/${id}/`),
  })

  // Populate form states once data loads or changes
  useEffect(() => {
    if (die) {
      setStatusVal(die.status || 'AVAILABLE')
      setLocation(die.location || '')
      setRemarks(die.remarks || '')
      setCurrentSetId(die.current_set || '')
      setCurrentSize(die.current_size || '')
      setCurrentWidth(die.current_width || '')
      setCurrentThickness(die.current_thickness || '')
    }
  }, [die])

  // Fetch sets list for editing dropdown
  const { data: setsList } = useQuery({
    queryKey: ['setsDropdownDetail'],
    queryFn: () => request('/api/sets/')
  })

  // Mutation for updating die
  const updateMutation = useMutation({
    mutationFn: (data) => request(`/api/dies/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['die', id])
      queryClient.invalidateQueries(['dies'])
      queryClient.invalidateQueries(['allDiesStats'])
      setIsEditing(false)
    }
  })

  // Mutation for deleting die
  const deleteMutation = useMutation({
    mutationFn: () => request(`/api/dies/${id}/`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['dies'])
      queryClient.invalidateQueries(['allDiesStats'])
      navigate('/inventory')
    }
  })

  const handleSave = (e) => {
    e.preventDefault()
    const payload = {
      status: statusVal,
      location,
      remarks,
      current_set: currentSetId || null
    }
    if (die.die_type === 'ROUND') {
      payload.current_size = currentSize
    } else {
      payload.current_width = currentWidth
      payload.current_thickness = currentThickness
    }
    updateMutation.mutate(payload)
  }

  const handleDelete = () => {
    if (window.confirm('Are you absolutely sure you want to delete this die? This action is irreversible.')) {
      deleteMutation.mutate()
    }
  }

  if (isLoading) return (
    <div className="flex justify-center items-center py-24">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  )

  if (error) return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="text-center py-12 bg-rose-500/10 border border-rose-500/20 rounded-xl">
        <p className="text-rose-400 font-semibold">Error: {error.message}</p>
        <Link to="/inventory" className="text-blue-400 hover:underline mt-4 inline-block">Back to Inventory</Link>
      </div>
    </div>
  )

  const canEdit = role === 'ROOT' || role === 'ADMIN'

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumbs */}
      <div className="flex items-center space-x-2 text-sm text-slate-500 mb-6">
        <Link to="/inventory" className="hover:text-slate-300">Inventory</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-slate-300">{die.die_id}</span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-slate-950 p-8 border-b border-slate-800 flex justify-between items-start gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                {die.die_type} DIE
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white mt-3">{die.die_id}</h1>
            <p className="text-slate-400 text-sm mt-1">Casing: {die.casing}</p>
          </div>
          
          {canEdit && (
            <div className="flex space-x-2">
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="bg-slate-950 hover:bg-slate-800 text-white border border-slate-800 hover:border-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300"
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
              <button 
                onClick={handleDelete}
                className="bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-400 p-2.5 rounded-xl transition-all duration-300"
              >
                <Trash2 className="h-4.5 w-4.5" />
              </button>
            </div>
          )}
        </div>

        <div className="p-8">
          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Status</label>
                  <select 
                    value={statusVal}
                    onChange={(e) => setStatusVal(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="RUNNING">Running</option>
                    <option value="CLEANING">Cleaning</option>
                    <option value="POLISHING">Polishing</option>
                    <option value="DAMAGED">Damaged</option>
                    <option value="SCRAPPED">Scrapped</option>
                    <option value="MISSING">Missing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Location</label>
                  <input 
                    type="text" 
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Assign Set</label>
                  <select 
                    value={currentSetId}
                    onChange={(e) => setCurrentSetId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">— Unassigned —</option>
                    {setsList?.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.machine_name})</option>
                    ))}
                  </select>
                </div>
                {die.die_type === 'ROUND' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Current Size (mm)</label>
                    <input 
                      type="number"
                      step="0.001"
                      value={currentSize}
                      onChange={(e) => setCurrentSize(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Current Width (mm)</label>
                      <input 
                        type="number"
                        step="0.001"
                        value={currentWidth}
                        onChange={(e) => setCurrentWidth(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Current Thickness (mm)</label>
                      <input 
                        type="number"
                        step="0.001"
                        value={currentThickness}
                        onChange={(e) => setCurrentThickness(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Remarks</label>
                <textarea 
                  rows="3"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800/80">
                <button 
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 px-5 py-2.5 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={updateMutation.isLoading}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-2.5 rounded-xl font-semibold shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-300"
                >
                  {updateMutation.isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Specifications</h3>
                <div className="bg-slate-950/50 rounded-xl p-5 border border-slate-850 space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status</span>
                    <span className="font-semibold text-slate-200">{die.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Location</span>
                    <span className="font-semibold text-slate-200">{die.location || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Set Assignment</span>
                    <span className="font-semibold text-slate-200">{die.set_name || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Machine</span>
                    <span className="font-semibold text-slate-200">{die.machine_name || '—'}</span>
                  </div>

                  {die.die_type === 'ROUND' ? (
                    <>
                      <div className="flex justify-between border-t border-slate-800/80 pt-3">
                        <span className="text-slate-500">Original Size</span>
                        <span className="font-semibold text-slate-200">{die.original_size} mm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Current Size</span>
                        <span className="font-semibold text-slate-200">{die.current_size} mm</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between border-t border-slate-800/80 pt-3">
                        <span className="text-slate-500">Original Width × Thickness</span>
                        <span className="font-semibold text-slate-200">{die.original_width} × {die.original_thickness} mm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Current Width × Thickness</span>
                        <span className="font-semibold text-slate-200">{die.current_width} × {die.current_thickness} mm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Radius</span>
                        <span className="font-semibold text-slate-200">{die.radius} mm</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Remarks</h3>
                <div className="bg-slate-950/50 rounded-xl p-5 border border-slate-850 h-[calc(100%-2rem)]">
                  <p className="text-slate-300 whitespace-pre-line text-sm leading-relaxed">
                    {die.remarks || 'No remarks recorded.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History timeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-8">
        <div className="flex items-center space-x-2.5 mb-6">
          <History className="h-5 w-5 text-slate-400" />
          <h3 className="text-lg font-bold text-white">Change History</h3>
        </div>

        {die.history && die.history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 pr-4">Timestamp</th>
                  <th className="pb-3 pr-4">Field Changed</th>
                  <th className="pb-3 pr-4">Change Log</th>
                  <th className="pb-3">Changed By</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-850">
                {die.history.map((hist, index) => (
                  <tr key={index} className="text-slate-300">
                    <td className="py-3.5 pr-4 text-slate-400 text-xs whitespace-nowrap">
                      {new Date(hist.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3.5 pr-4 font-semibold text-slate-200 uppercase text-xs tracking-wider">
                      {hist.field_name}
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="text-rose-400 font-mono text-xs">{hist.old_value || '—'}</span>
                      <span className="text-slate-500 mx-2">→</span>
                      <span className="text-emerald-400 font-mono text-xs">{hist.new_value || '—'}</span>
                    </td>
                    <td className="py-3.5 font-medium text-slate-400">
                      {hist.changed_by_username || 'System'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 bg-slate-950/40 border border-slate-850 rounded-xl">
            <p className="text-slate-500 text-sm">No changes recorded yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Machine & Set Management Page
function MachineSetsPage() {
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
    mutationFn: (data) => request('/api/categories/', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries(['categories'])
      setCatName('')
      setEditingCat(null)
    }
  })

  const updateCategory = useMutation({
    mutationFn: ({ id, data }) => request(`/api/categories/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries(['categories'])
      setCatName('')
      setEditingCat(null)
    }
  })

  const deleteCategory = useMutation({
    mutationFn: (id) => request(`/api/categories/${id}/`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries(['categories'])
  })

  const createMachine = useMutation({
    mutationFn: (data) => request('/api/machines/', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries(['machines'])
      setMachName('')
      setMachCat('')
      setEditingMach(null)
    }
  })

  const updateMachine = useMutation({
    mutationFn: ({ id, data }) => request(`/api/machines/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries(['machines'])
      setMachName('')
      setMachCat('')
      setEditingMach(null)
    }
  })

  const deleteMachine = useMutation({
    mutationFn: (id) => request(`/api/machines/${id}/`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries(['machines'])
  })

  const createSet = useMutation({
    mutationFn: (data) => request('/api/sets/', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries(['sets'])
      queryClient.invalidateQueries(['setsDropdownList'])
      queryClient.invalidateQueries(['setsDropdownDetail'])
      setNameSet('')
      setMachineSet('')
      setEditingSet(null)
    }
  })

  const updateSet = useMutation({
    mutationFn: ({ id, data }) => request(`/api/sets/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries(['sets'])
      queryClient.invalidateQueries(['setsDropdownList'])
      queryClient.invalidateQueries(['setsDropdownDetail'])
      setNameSet('')
      setMachineSet('')
      setEditingSet(null)
    }
  })

  const deleteSet = useMutation({
    mutationFn: (id) => request(`/api/sets/${id}/`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['sets'])
      queryClient.invalidateQueries(['setsDropdownList'])
      queryClient.invalidateQueries(['setsDropdownDetail'])
    }
  })

  // Local Form States
  const [catName, setCatName] = useState('')
  const [editingCat, setEditingCat] = useState(null)

  const [machName, setMachName] = useState('')
  const [machCat, setMachCat] = useState('')
  const [editingMach, setEditingMach] = useState(null)

  const [nameSet, setNameSet] = useState('')
  const [machineSet, setMachineSet] = useState('')
  const [editingSet, setEditingSet] = useState(null)

  const isWritable = role === 'ROOT' || role === 'ADMIN'

  // Form handlers
  const handleCatSubmit = (e) => {
    e.preventDefault()
    if (editingCat) {
      updateCategory.mutate({ id: editingCat.id, data: { name: catName } })
    } else {
      createCategory.mutate({ name: catName })
    }
  }

  const handleMachSubmit = (e) => {
    e.preventDefault()
    const payload = { name: machName, category: machCat }
    if (editingMach) {
      updateMachine.mutate({ id: editingMach.id, data: payload })
    } else {
      createMachine.mutate(payload)
    }
  }

  const handleSetSubmit = (e) => {
    e.preventDefault()
    const payload = { name: nameSet, machine: machineSet }
    if (editingSet) {
      updateSet.mutate({ id: editingSet.id, data: payload })
    } else {
      createSet.mutate(payload)
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
            activeTab === 'sets' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
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
              {isCatsLoading ? (
                <div className="text-center py-6">Loading...</div>
              ) : categories?.length === 0 ? (
                <p className="text-slate-500 text-sm">No machine categories found.</p>
              ) : (
                <div className="space-y-3">
                  {categories?.map(cat => (
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
                        className="bg-slate-950 border border-slate-800 text-slate-300 px-4 py-2 rounded-xl text-sm"
                      >
                        Cancel
                      </button>
                    )}
                    <button 
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-sm font-semibold transition"
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
              {isMachsLoading ? (
                <div className="text-center py-6">Loading...</div>
              ) : machines?.length === 0 ? (
                <p className="text-slate-500 text-sm">No machines found.</p>
              ) : (
                <div className="space-y-3">
                  {machines?.map(mach => (
                    <div key={mach.id} className="flex justify-between items-center bg-slate-950/40 p-4 border border-slate-850 rounded-xl hover:border-slate-800 transition-all">
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
                  {editingMach ? 'Edit Machine' : 'Create Machine'}
                </h2>
                <form onSubmit={handleMachSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Machine Name</label>
                    <input 
                      type="text" 
                      required
                      value={machName}
                      onChange={(e) => setMachName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                    />
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
                      {categories?.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end space-x-2">
                    {editingMach && (
                      <button 
                        type="button"
                        onClick={() => { setEditingMach(null); setMachName(''); setMachCat(''); }}
                        className="bg-slate-950 border border-slate-800 text-slate-300 px-4 py-2 rounded-xl text-sm"
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
              {isSetsLoading ? (
                <div className="text-center py-6">Loading...</div>
              ) : sets?.length === 0 ? (
                <p className="text-slate-500 text-sm">No tool sets found.</p>
              ) : (
                <div className="space-y-3">
                  {sets?.map(s => (
                    <div key={s.id} className="flex justify-between items-center bg-slate-950/40 p-4 border border-slate-850 rounded-xl hover:border-slate-800 transition-all">
                      <div>
                        <span className="font-semibold text-slate-200 block">{s.name}</span>
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
                  {editingSet ? 'Edit Set' : 'Create Set'}
                </h2>
                <form onSubmit={handleSetSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Set Name</label>
                    <input 
                      type="text" 
                      required
                      value={nameSet}
                      onChange={(e) => setNameSet(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                    />
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
                      {machines?.map(mach => (
                        <option key={mach.id} value={mach.id}>{mach.name} ({mach.category_name})</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end space-x-2">
                    {editingSet && (
                      <button 
                        type="button"
                        onClick={() => { setEditingSet(null); setNameSet(''); setMachineSet(''); }}
                        className="bg-slate-950 border border-slate-800 text-slate-300 px-4 py-2 rounded-xl text-sm"
                      >
                        Cancel
                      </button>
                    )}
                    <button 
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-sm font-semibold transition"
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

// Bulk Import Page
function ImportPage() {
  const { request } = useApi()
  const [file, setFile] = useState(null)
  const [statusMsg, setStatusMsg] = useState(null)
  const [progress, setProgress] = useState(false)

  const downloadTemplate = () => {
    const csvContent = 
      "die_id,die_type,casing,status,location,remarks,current_set_id,set_name,machine_name,original_size,current_size,original_width,current_width,original_thickness,current_thickness,radius\n" +
      "R-101,ROUND,25x10,AVAILABLE,Rack A - Shelf 3,Sample Round Die,,Set A,Machine 1,2.5,2.5,,,,,\n" +
      "F-201,FLAT,30x15,AVAILABLE,Rack B - Shelf 1,Sample Flat Die,,Set B,Machine 2,,,,30.0,30.0,15.0,15.0,1.5\n"

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "dms_die_import_template.csv")
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
    setStatusMsg(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return

    setProgress(true)
    setStatusMsg(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await request('/api/import/', {
        method: 'POST',
        body: formData
      })
      setStatusMsg({
        type: 'success',
        text: `Import complete: ${res.created} created, ${res.updated} updated, ${res.skipped} skipped.`,
        errors: res.errors || []
      })
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Import failed.'
      })
    } finally {
      setProgress(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Bulk Import Dies</h1>
          <p className="text-slate-400 mt-1">Upload a CSV or XLSX spreadsheet containing die data.</p>
        </div>
        <div>
          <button
            type="button"
            onClick={downloadTemplate}
            className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 shadow-md"
          >
            <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-500" />
            <span>Download Template (CSV)</span>
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-2xl p-10 text-center transition-all duration-300 bg-slate-950/40">
            <input 
              type="file" 
              accept=".csv,.xlsx" 
              onChange={handleFileChange}
              id="file-upload"
              className="hidden"
            />
            <label htmlFor="file-upload" className="cursor-pointer block">
              <div className="flex flex-col items-center">
                <FileSpreadsheet className="h-12 w-12 text-slate-500 mb-4" />
                <span className="text-slate-300 font-semibold mb-1">
                  {file ? file.name : 'Click to select spreadsheet'}
                </span>
                <span className="text-slate-500 text-xs">Supports CSV and XLSX formats</span>
              </div>
            </label>
          </div>

          <div className="flex justify-end">
            <button 
              type="submit"
              disabled={!file || progress}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-850 text-white disabled:text-slate-500 px-8 py-3.5 rounded-xl font-bold shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-300"
            >
              {progress ? 'Uploading & Processing...' : 'Upload File'}
            </button>
          </div>
        </form>

        {statusMsg && (
          <div className={`mt-8 p-6 rounded-xl border ${
            statusMsg.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}>
            <p className="font-semibold text-md">{statusMsg.text}</p>
            {statusMsg.errors && statusMsg.errors.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-800/80">
                <p className="text-slate-400 font-semibold text-sm mb-2">Row Errors:</p>
                <ul className="text-xs font-mono max-h-48 overflow-y-auto space-y-1.5 list-disc list-inside">
                  {statusMsg.errors.map((err, i) => (
                    <li key={i} className="text-rose-400">
                      Row {err.row}: {err.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Login Page
function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [usernameInput, setUsernameInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [errorMsg, setErrorMsg] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput })
      })
      if (!res.ok) {
        throw new Error('Invalid username or password')
      }
      const data = await res.json()
      login(data.token, data.role, usernameInput)
      navigate('/')
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-slate-900 border border-slate-850 p-10 rounded-2xl shadow-2xl">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-white">Sign In</h2>
          <p className="mt-2 text-sm text-slate-400">Enter your credentials to manage dies.</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Username</label>
              <input 
                type="text" 
                required
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-blue-500 focus:outline-none transition duration-300"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <input 
                type="password" 
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-blue-500 focus:outline-none transition duration-300"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl p-3 text-sm font-medium">
              {errorMsg}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3.5 rounded-xl font-bold shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition duration-300"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

// Main App Container
function AppContent() {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500 selection:text-white">
      <Navbar />
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/dies/:id" element={<DieDetailPage />} />
        <Route path="/machines" element={<MachineSetsPage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
