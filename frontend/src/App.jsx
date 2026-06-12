import React, { createContext, useContext, useState } from 'react'
import { 
  HashRouter as Router, 
  Routes, 
  Route, 
  Link, 
  useNavigate, 
  useParams 
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
  FileSpreadsheet
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
                Search Dies
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

// Search Dashboard Page
function SearchPage() {
  const { request } = useApi()
  const navigate = useNavigate()
  
  // Search parameters
  const [q, setQ] = useState('')
  const [dieType, setDieType] = useState('')
  const [statusVal, setStatusVal] = useState('')
  const [casing, setCasing] = useState('')
  
  // Custom ranges
  const [sizeMin, setSizeMin] = useState('')
  const [sizeMax, setSizeMax] = useState('')
  const [widthMin, setWidthMin] = useState('')
  const [widthMax, setWidthMax] = useState('')
  const [thickMin, setThickMin] = useState('')
  const [thickMax, setThickMax] = useState('')
  
  const [showFilters, setShowFilters] = useState(false)

  // React Query Fetcher (combines fuzzy Meilisearch and exact filters)
  const { data: dies, isLoading, error } = useQuery({
    queryKey: ['dies', q, dieType, statusVal, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax],
    queryFn: () => {
      let url = q ? '/api/search/' : '/api/dies/'
      const params = new URLSearchParams()
      
      if (q) params.append('q', q)
      if (dieType) params.append('die_type', dieType)
      if (statusVal) params.append('status', statusVal)
      if (casing) params.append('casing', casing)
      
      // Range query values
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Die Inventory</h1>
          <p className="text-slate-400 mt-1">Search, monitor, and update production dies.</p>
        </div>
      </div>

      {/* Search Bar & Primary Actions */}
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

        {/* Filters Panel */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-slate-800/80 animate-fadeIn">
            {/* Die Type */}
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

            {/* Status */}
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

            {/* Casing */}
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

            {/* Range queries based on type */}
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
      ) : dies?.length === 0 ? (
        <div className="text-center py-24 bg-slate-900 border border-slate-850 rounded-2xl">
          <p className="text-slate-500 text-lg">No dies found matching the search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dies?.map((die) => 
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
  
  // Custom subfields editing
  const [currentSize, setCurrentSize] = useState('')
  const [currentWidth, setCurrentWidth] = useState('')
  const [currentThickness, setCurrentThickness] = useState('')

  // Query details
  const { data: die, isLoading, error } = useQuery({
    queryKey: ['die', id],
    queryFn: () => request(`/api/dies/${id}/`),
    onSuccess: (data) => {
      setStatusVal(data.status)
      setLocation(data.location)
      setRemarks(data.remarks)
      setCurrentSize(data.current_size || '')
      setCurrentWidth(data.current_width || '')
      setCurrentThickness(data.current_thickness || '')
    }
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
      navigate('/')
    }
  })

  const handleSave = (e) => {
    e.preventDefault()
    const payload = {
      status: statusVal,
      location,
      remarks,
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
        <Link to="/" className="text-blue-400 hover:underline mt-4 inline-block">Back to Dashboard</Link>
      </div>
    </div>
  )

  const canEdit = role === 'ROOT' || role === 'ADMIN'

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumbs */}
      <div className="flex items-center space-x-2 text-sm text-slate-500 mb-6">
        <Link to="/" className="hover:text-slate-300">Inventory</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-slate-300">{die.die_id}</span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden mb-8">
        {/* Banner header */}
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

        {/* Content body */}
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
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 px-5 py-2.5 rounded-xl font-semibold transition-all duration-300"
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
              {/* Specifications block */}
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

              {/* Remarks block */}
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

// Bulk Import Page
function ImportPage() {
  const { request } = useApi()
  const [file, setFile] = useState(null)
  const [statusMsg, setStatusMsg] = useState(null)
  const [progress, setProgress] = useState(false)

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
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Bulk Import Dies</h1>
        <p className="text-slate-400 mt-1">Upload a CSV or XLSX spreadsheet containing die data.</p>
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
        <Route path="/" element={<SearchPage />} />
        <Route path="/dies/:id" element={<DieDetailPage />} />
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
