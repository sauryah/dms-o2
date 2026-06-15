import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react'
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
  ChevronLeft,
  Plus,
  Trash2,
  FileSpreadsheet,
  Edit,
  Sliders,
  Database,
  Calendar,
  Layers3,
  Wrench,
  X,
  Menu,
  ChevronDown,
  RefreshCw,
  AlertTriangle,
  Download
} from 'lucide-react'

// React Query Client
const queryClient = new QueryClient()

// Debounce hook for input text
function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])
  return debouncedValue
}

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
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-3 text-white group" onClick={() => setIsOpen(false)}>
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
              {role === 'ROOT' && (
                <Link to="/users" className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Users
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {username ? (
              <div className="hidden sm:flex items-center space-x-4">
                <div className="text-right">
                  <span className="block text-sm font-semibold text-slate-200">{username}</span>
                  <span className="block text-xxs text-slate-500 font-mono tracking-wider uppercase">{role}</span>
                </div>
                <button 
                  onClick={() => { logout(); navigate('/login'); setIsOpen(false); }}
                  className="flex items-center space-x-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white px-3.5 py-1.5 rounded-lg text-sm transition-all duration-300"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex">
                <Link 
                  to="/login"
                  className="flex items-center space-x-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-300"
                  onClick={() => setIsOpen(false)}
                >
                  <LogIn className="h-4 w-4" />
                  <span>Login</span>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <div className="flex sm:hidden">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 focus:outline-none transition-all duration-200"
                aria-expanded={isOpen}
              >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {isOpen && (
        <div className="sm:hidden border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-lg px-4 pt-2 pb-4 space-y-2.5">
          <Link 
            to="/" 
            className="block text-slate-300 hover:text-white px-3.5 py-2.5 rounded-xl text-base font-semibold hover:bg-slate-900 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            Dashboard
          </Link>
          <Link 
            to="/inventory" 
            className="block text-slate-300 hover:text-white px-3.5 py-2.5 rounded-xl text-base font-semibold hover:bg-slate-900 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            Die Inventory
          </Link>
          <Link 
            to="/machines" 
            className="block text-slate-300 hover:text-white px-3.5 py-2.5 rounded-xl text-base font-semibold hover:bg-slate-900 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            Machine Sets
          </Link>
          {(role === 'ROOT' || role === 'ADMIN') && (
            <Link 
              to="/import" 
              className="block text-slate-300 hover:text-white px-3.5 py-2.5 rounded-xl text-base font-semibold hover:bg-slate-900 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Bulk Import
            </Link>
          )}
          {role === 'ROOT' && (
            <Link 
              to="/users" 
              className="block text-slate-300 hover:text-white px-3.5 py-2.5 rounded-xl text-base font-semibold hover:bg-slate-900 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Users
            </Link>
          )}
          {username ? (
            <div className="pt-4 mt-2 border-t border-slate-800 flex flex-col space-y-3 px-3.5">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-200">{username}</span>
                <span className="text-xxs text-slate-500 font-mono tracking-wider uppercase">{role}</span>
              </div>
              <button 
                onClick={() => { logout(); navigate('/login'); setIsOpen(false); }}
                className="w-full flex items-center justify-center space-x-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 py-2.5 rounded-xl text-sm font-semibold transition"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="pt-4 mt-2 border-t border-slate-800 px-3.5">
              <Link 
                to="/login"
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-2.5 rounded-xl text-sm font-semibold transition"
                onClick={() => setIsOpen(false)}
              >
                <LogIn className="h-4 w-4" />
                <span>Login</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}


// Dashboard Page
function DashboardPage() {
  const { request } = useApi()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const debouncedQ = useDebounce(q, 300)
  const [dieType, setDieType] = useState('')
  const [statusVal, setStatusVal] = useState('')
  const [casing, setCasing] = useState('')
  
  const [sizeMin, setSizeMin] = useState('')
  const [sizeMax, setSizeMax] = useState('')
  const [widthMin, setWidthMin] = useState('')
  const [widthMax, setWidthMax] = useState('')
  const [thickMin, setThickMin] = useState('')
  const [thickMax, setThickMax] = useState('')
  
  const [showFilters, setShowFilters] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = React.useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch all dies to compute overall statistics
  const { data: allDies, isLoading: isStatsLoading } = useQuery({
    queryKey: ['allDiesStats'],
    queryFn: () => request('/api/dies/')
  })

  // Fetch fuzzy search results if search query or filters exist
  const { data: searchDies, isLoading: isSearchLoading } = useQuery({
    queryKey: ['searchDiesDashboard', debouncedQ, dieType, statusVal, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax],
    queryFn: () => {
      if (!debouncedQ && !dieType && !statusVal && !casing && !sizeMin && !sizeMax && !widthMin && !widthMax && !thickMin && !thickMax) return []
      
      let url = '/api/search/'
      const params = new URLSearchParams()
      if (debouncedQ) params.append('q', debouncedQ)
      if (dieType) params.append('die_type', dieType)
      if (statusVal) params.append('status', statusVal)
      if (casing) params.append('casing', casing)
      
      if (sizeMin) params.append('size_min', sizeMin)
      if (sizeMax) params.append('size_max', sizeMax)
      if (widthMin) params.append('width_min', widthMin)
      if (widthMax) params.append('width_max', widthMax)
      if (thickMin) params.append('thick_min', thickMin)
      if (thickMax) params.append('thick_max', thickMax)
      
      url += `?${params.toString()}`
      return request(url)
    },
    enabled: !!(debouncedQ || dieType || statusVal || casing || sizeMin || sizeMax || widthMin || widthMax || thickMin || thickMax)
  })

  const hasActiveFilter = !!(q || dieType || statusVal || casing || sizeMin || sizeMax || widthMin || widthMax || thickMin || thickMax)

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

      {/* Dashboard Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8 items-stretch">
        
        {/* Search Panel */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl h-full flex flex-col justify-center">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-white">Find a Die</h2>
              <p className="text-slate-400 text-sm mt-1">Type the Die ID, Casing, or Location to search instantly. Use double quotes (e.g. "2.500") for exact matches.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-grow" ref={searchRef}>
                <Search className="absolute left-4 top-3.5 h-6 w-6 text-slate-500" />
                <input 
                  type="text" 
                  placeholder='Search by Die ID, casing, location... (use quotes for exact match, e.g. "2.500")'
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-3.5 pl-14 pr-4 text-white placeholder-slate-500 focus:outline-none transition-all duration-300 text-lg shadow-inner"
                />

                {/* Search Dropdown Suggestions */}
                {showDropdown && q.trim() && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                    {isSearchLoading ? (
                      <div className="p-4 text-center text-slate-500 text-sm flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
                        <span>Searching...</span>
                      </div>
                    ) : !searchDies || searchDies.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 text-sm">
                        No matching dies found.
                      </div>
                    ) : (
                      <>
                        {searchDies.slice(0, 6).map((die) => {
                          const sizeStr = die.die_type === 'ROUND' 
                            ? `${die.size || die.rounddie?.current_size || '—'} mm` 
                            : `${die.width || die.flatdie?.current_width || '—'} × ${die.thickness || die.flatdie?.current_thickness || '—'} mm`
                          return (
                            <div 
                              key={die.die_id}
                              onClick={() => {
                                navigate(`/dies/${die.die_id}`)
                                setQ('')
                                setShowDropdown(false)
                              }}
                              className="p-4 hover:bg-slate-800 cursor-pointer flex justify-between items-center transition duration-150"
                            >
                              <div className="flex flex-col text-left">
                                <span className="font-bold text-white text-sm">{die.die_id}</span>
                                <span className="text-xs text-slate-400 mt-0.5">
                                  {die.die_type} • {sizeStr} • {die.location || 'No Location'}
                                </span>
                              </div>
                              <span className={`px-2 py-0.5 text-xxs font-bold rounded-full border ${
                                die.status === 'AVAILABLE' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                  : die.status === 'RUNNING'
                                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                  : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                              }`}>
                                {die.status}
                              </span>
                            </div>
                          )
                        })}
                        {searchDies.length > 6 && (
                          <div 
                            onClick={() => {
                              setShowDropdown(false)
                            }}
                            className="p-3 bg-slate-950/40 text-center text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                          >
                            Scroll down to view all {searchDies.length} results
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
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
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Type</label>
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
        </div>

        {/* Analytics Panel */}
        <div className="lg:col-span-1">
          <StatusDistributionChart stats={stats} />
        </div>
      </div>

      {hasActiveFilter && (
        <div className="mt-8 border-t border-slate-800/80 pt-8 border-dashed">
          <div className="mb-6 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-300">
              {q ? (
                <>Search Results for <span className="text-blue-400">"{q}"</span></>
              ) : (
                <>Filtered Search Results</>
              )}
            </h3>
            <Link 
              to={`/inventory?${new URLSearchParams({
                ...(q && { q }),
                ...(dieType && { die_type: dieType }),
                ...(statusVal && { status: statusVal }),
                ...(casing && { casing }),
                ...(sizeMin && { size_min: sizeMin }),
                ...(sizeMax && { size_max: sizeMax }),
                ...(widthMin && { width_min: widthMin }),
                ...(widthMax && { width_max: widthMax }),
                ...(thickMin && { thick_min: thickMin }),
                ...(thickMax && { thick_max: thickMax }),
              }).toString()}`} 
              className="text-sm text-blue-400 hover:underline"
            >
              View in Inventory
            </Link>
          </div>

          {isSearchLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : searchDies?.length === 0 ? (
            <div className="text-center py-12 bg-slate-900 border border-slate-850 rounded-2xl">
              <p className="text-slate-500">No dies found matching your search criteria.</p>
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

function StatusDistributionChart({ stats }) {
  const total = Object.values(stats).reduce((sum, val) => sum + val, 0)

  const statusThemeColors = {
    AVAILABLE: '#10b981', // Emerald
    RUNNING: '#3b82f6',   // Blue
    CLEANING: '#f59e0b',  // Amber
    POLISHING: '#8b5cf6', // Purple
    DAMAGED: '#f43f5e',   // Rose
    SCRAPPED: '#64748b',  // Slate
    MISSING: '#ef4444',   // Red
  }

  const radius = 50
  const circumference = 2 * Math.PI * radius
  let accumulatedPercent = 0

  const segments = Object.entries(stats)
    .filter(([_, count]) => count > 0)
    .map(([statusKey, count]) => {
      const pct = count / total
      const strokeDasharray = `${pct * circumference} ${circumference}`
      const strokeDashoffset = -accumulatedPercent * circumference
      accumulatedPercent += pct

      return {
        statusKey,
        count,
        pct: (pct * 100).toFixed(1),
        strokeDasharray,
        strokeDashoffset,
        color: statusThemeColors[statusKey] || '#64748b'
      }
    })

  return (
    <div className="glass-panel rounded-2xl p-6 shadow-xl flex flex-col justify-between h-full min-h-[260px] border border-slate-800/80">
      <div>
        <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading mb-1">Status Distribution</h3>
        <p className="text-slate-500 text-xs mb-4">Visual breakdown of registry assets.</p>
      </div>

      {total === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center py-6">
          <div className="w-16 h-16 rounded-full border-4 border-slate-850 border-t-blue-500 animate-spin mb-4" />
          <span className="text-slate-500 text-sm">No dies loaded</span>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-around gap-6 flex-grow">
          {/* Donut Chart SVG */}
          <div className="relative w-32 h-32 shrink-0">
            <svg className="w-full h-full" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r="50" fill="none" stroke="#111827" strokeWidth="10" />
              {segments.map((seg) => (
                <circle
                  key={seg.statusKey}
                  cx="70"
                  cy="70"
                  r="50"
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="10"
                  strokeDasharray={seg.strokeDasharray}
                  strokeDashoffset={seg.strokeDashoffset}
                  transform="rotate(-90 70 70)"
                  strokeLinecap="round"
                  className="transition-all duration-300 hover:stroke-[12] cursor-pointer"
                  title={`${seg.statusKey}: ${seg.count} (${seg.pct}%)`}
                />
              ))}
              <text x="70" y="65" textAnchor="middle" className="fill-slate-500 font-heading text-[9px] font-bold uppercase tracking-wider">
                Total
              </text>
              <text x="70" y="86" textAnchor="middle" className="fill-white font-heading text-2xl font-black">
                {total}
              </text>
            </svg>
          </div>

          {/* Legend Grid */}
          <div className="flex-grow space-y-1.5 w-full sm:w-auto">
            {segments.map((seg) => (
              <div key={seg.statusKey} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full dot-glow" style={{ backgroundColor: seg.color, color: seg.color }} />
                  <span className="font-semibold text-slate-300">{seg.statusKey}</span>
                </div>
                <div className="text-slate-400 font-mono">
                  <span className="text-slate-200 font-bold">{seg.count}</span>
                  <span className="text-[9px] text-slate-500 ml-1">({seg.pct}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DieBlueprint({ die }) {
  if (!die) return null

  const isRound = die.die_type === 'ROUND'

  return (
    <div className="relative glass-panel rounded-xl p-5 border border-slate-800/80 shadow-2xl blueprint-grid min-h-[280px] flex flex-col justify-between overflow-hidden">
      <div className="flex justify-between items-center mb-4 border-b border-slate-800/80 pb-3">
        <div>
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider font-heading block">Dimensions Blueprint</span>
          <span className="text-slate-500 text-[10px] block mt-0.5">Scale Vector CAD Simulation (mm)</span>
        </div>
        <span className="px-2.5 py-0.5 text-xxs font-mono font-bold bg-blue-950 text-blue-400 border border-blue-800/50 rounded-full">
          {die.die_type}
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center p-3">
        {isRound ? (
          <svg className="w-full max-w-[180px] h-[180px]" viewBox="0 0 200 200">
            <line x1="100" y1="10" x2="100" y2="190" className="blueprint-axis" />
            <line x1="10" y1="100" x2="190" y2="100" className="blueprint-axis" />
            {die.original_size && (
              <circle cx="100" cy="100" r="75" fill="none" className="blueprint-outline-secondary" />
            )}
            <circle 
              cx="100" 
              cy="100" 
              r={75 * (parseFloat(die.current_size || 0) / parseFloat(die.original_size || die.current_size || 1))} 
              fill="rgba(59, 130, 246, 0.06)" 
              className="blueprint-outline animate-dash" 
            />
            <circle cx="100" cy="100" r="3" fill="#3b82f6" />
            <g>
              <line x1="25" y1="100" x2="175" y2="100" className="blueprint-dim-line" strokeDasharray="3 3" />
              <path d="M 25 100 L 32 97 L 32 103 Z" fill="#10b981" />
              <path d="M 175 100 L 168 97 L 168 103 Z" fill="#10b981" />
              <rect x="72" y="88" width="56" height="15" rx="3" fill="#030712" />
              <text x="100" y="99" textAnchor="middle" className="blueprint-dim-text">
                Ø {die.current_size}
              </text>
            </g>
            {die.original_size && die.original_size !== die.current_size && (
              <g>
                <line x1="100" y1="25" x2="145" y2="25" className="blueprint-dim-line" />
                <circle cx="100" cy="25" r="2" fill="#10b981" />
                <text x="150" y="28" className="blueprint-dim-text" textAnchor="start">
                  Orig: Ø {die.original_size}
                </text>
              </g>
            )}
          </svg>
        ) : (
          (() => {
            const width = parseFloat(die.current_width || 0)
            const thickness = parseFloat(die.current_thickness || 0)
            const origWidth = parseFloat(die.original_width || width || 1)
            const origThick = parseFloat(die.original_thickness || thickness || 1)
            const radius = parseFloat(die.radius || 0)

            const maxVal = Math.max(origWidth, origThick)
            const scale = 130 / maxVal
            const w = width * scale
            const t = thickness * scale
            const ow = origWidth * scale
            const ot = origThick * scale
            const r = Math.min(radius * scale, Math.min(w, t) / 2)

            const x = 100 - w / 2
            const y = 100 - t / 2
            const ox = 100 - ow / 2
            const oy = 100 - ot / 2

            return (
              <svg className="w-full max-w-[180px] h-[180px]" viewBox="0 0 200 200">
                <line x1="100" y1="10" x2="100" y2="190" className="blueprint-axis" />
                <line x1="10" y1="100" x2="190" y2="100" className="blueprint-axis" />
                {die.original_width && (
                  <rect x={ox} y={oy} width={ow} height={ot} rx={r} ry={r} fill="none" className="blueprint-outline-secondary" />
                )}
                <rect 
                  x={x} 
                  y={y} 
                  width={w} 
                  height={t} 
                  rx={r} 
                  ry={r} 
                  fill="rgba(59, 130, 246, 0.06)" 
                  className="blueprint-outline animate-dash" 
                />
                <circle cx="100" cy="100" r="3" fill="#3b82f6" />
                <g>
                  <line x1={x} y1={y + t + 15} x2={x + w} y2={y + t + 15} className="blueprint-dim-line" />
                  <line x1={x} y1={y + t + 5} x2={x} y2={y + t + 20} className="blueprint-dim-line" strokeWidth="0.5" />
                  <line x1={x + w} y1={y + t + 5} x2={x + w} y2={y + t + 20} className="blueprint-dim-line" strokeWidth="0.5" />
                  <path d={`M ${x} ${y + t + 15} L ${x + 6} ${y + t + 12} L ${x + 6} ${y + t + 18} Z`} fill="#10b981" />
                  <path d={`M ${x + w} ${y + t + 15} L ${x + w - 6} ${y + t + 12} L ${x + w - 6} ${y + t + 18} Z`} fill="#10b981" />
                  <rect x="85" y={y + t + 7} width="30" height="14" rx="2" fill="#030712" />
                  <text x="100" y={y + t + 17} textAnchor="middle" className="blueprint-dim-text">
                    W: {die.current_width}
                  </text>
                </g>
                <g>
                  <line x1={x - 15} y1={y} x2={x - 15} y2={y + t} className="blueprint-dim-line" />
                  <line x1={x - 20} y1={y} x2={x - 5} y2={y} className="blueprint-dim-line" strokeWidth="0.5" />
                  <line x1={x - 20} y1={y + t} x2={x - 5} y2={y + t} className="blueprint-dim-line" strokeWidth="0.5" />
                  <path d={`M ${x - 15} ${y} L ${x - 18} ${y + 6} L ${x - 12} ${y + 6} Z`} fill="#10b981" />
                  <path d={`M ${x - 15} ${y + t} L ${x - 18} ${y + t - 6} L ${x - 12} ${y + t - 6} Z`} fill="#10b981" />
                  <text x={x - 18} y={y + t / 2 + 4} textAnchor="end" className="blueprint-dim-text">
                    T: {die.current_thickness}
                  </text>
                </g>
                {radius > 0 && (
                  <g>
                    <path d={`M ${x + w - r + r * Math.cos(Math.PI/4)} ${y + r - r * Math.sin(Math.PI/4)} L ${x + w + 12} ${y - 12}`} className="blueprint-dim-line" fill="none" strokeWidth="0.75" />
                    <circle cx={x + w - r + r * Math.cos(Math.PI/4)} cy={y + r - r * Math.sin(Math.PI/4)} r="2" fill="#10b981" />
                    <text x={x + w + 16} y={y - 10} className="blueprint-dim-text" textAnchor="start">
                      R: {die.radius}
                    </text>
                  </g>
                )}
              </svg>
            )
          })()
        )}
      </div>
      
      <div className="flex justify-between items-center text-slate-500 text-[9px] font-mono mt-3 pt-2 border-t border-slate-800/80">
        <span>Casing: {die.casing || '—'}</span>
        <span>Status: {die.status}</span>
      </div>
    </div>
  )
}

const isDieActive = (die) => {
  return ['AVAILABLE', 'RUNNING', 'CLEANING', 'POLISHING'].includes(die.status)
}

function DiesTable({ diesList, navigate, onDragStartDie, onDragEndDie }) {
  const { role } = useAuth()
  const { request } = useApi()
  const queryClient = useQueryClient()

  const canEdit = role === 'ROOT' || role === 'ADMIN'

  const [sortField, setSortField] = useState('die_id')
  const [sortOrder, setSortOrder] = useState('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const [selectedDieIds, setSelectedDieIds] = useState(new Set())
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkLocation, setBulkLocation] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  // Clear selection if the list of dies changes
  useEffect(() => {
    setSelectedDieIds(new Set())
  }, [diesList])

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
    setCurrentPage(1)
  }

  const sortedDies = useMemo(() => {
    return [...diesList].sort((a, b) => {
      let valA = a[sortField] || ''
      let valB = b[sortField] || ''
      
      if (sortField === 'category') {
        valA = a.die_type || ''
        valB = b.die_type || ''
      }
      
      if (sortField === 'current_size') {
        valA = a.die_type === 'ROUND' ? parseFloat(a.current_size || 0) : parseFloat(a.current_width || 0)
        valB = b.die_type === 'ROUND' ? parseFloat(b.current_size || 0) : parseFloat(b.current_width || 0)
      }
      
      if (typeof valA === 'string') {
        return sortOrder === 'asc' 
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA)
      } else {
        return sortOrder === 'asc' ? valA - valB : valB - valA
      }
    })
  }, [diesList, sortField, sortOrder])

  const paginatedDies = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedDies.slice(start, start + pageSize)
  }, [sortedDies, currentPage])

  const totalPages = Math.ceil(diesList.length / pageSize)

  const toggleSelectOne = (dieId) => {
    setSelectedDieIds(prev => {
      const next = new Set(prev)
      if (next.has(dieId)) {
        next.delete(dieId)
      } else {
        next.add(dieId)
      }
      return next
    })
  }

  const currentPaginatedDieIds = paginatedDies.map(d => d.die_id)
  const isAllSelected = currentPaginatedDieIds.length > 0 && currentPaginatedDieIds.every(id => selectedDieIds.has(id))

  const toggleSelectAll = () => {
    setSelectedDieIds(prev => {
      const next = new Set(prev)
      if (isAllSelected) {
        currentPaginatedDieIds.forEach(id => next.delete(id))
      } else {
        currentPaginatedDieIds.forEach(id => next.add(id))
      }
      return next
    })
  }

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus) return
    setIsUpdating(true)
    try {
      // Sequentially patch status of all selected dies
      for (const dieId of selectedDieIds) {
        await request(`/api/dies/${dieId}/`, {
          method: 'PATCH',
          body: JSON.stringify({ status: bulkStatus })
        })
      }
      setSelectedDieIds(new Set())
      setBulkStatus('')
      queryClient.invalidateQueries({ queryKey: ['dies'] })
      queryClient.invalidateQueries({ queryKey: ['allDiesStats'] })
      queryClient.invalidateQueries({ queryKey: ['searchDiesDashboard'] })
      alert(`Successfully updated status of ${selectedDieIds.size} dies to ${bulkStatus}.`)
    } catch (err) {
      console.error(err)
      alert(`Error updating statuses: ${err.message}`)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleBulkLocationUpdate = async () => {
    if (!bulkLocation.trim()) return
    setIsUpdating(true)
    try {
      // Sequentially patch location of all selected dies
      for (const dieId of selectedDieIds) {
        await request(`/api/dies/${dieId}/`, {
          method: 'PATCH',
          body: JSON.stringify({ location: bulkLocation.trim() })
        })
      }
      setSelectedDieIds(new Set())
      setBulkLocation('')
      queryClient.invalidateQueries({ queryKey: ['dies'] })
      queryClient.invalidateQueries({ queryKey: ['allDiesStats'] })
      queryClient.invalidateQueries({ queryKey: ['searchDiesDashboard'] })
      alert(`Successfully updated location of ${selectedDieIds.size} dies to "${bulkLocation}".`)
    } catch (err) {
      console.error(err)
      alert(`Error updating locations: ${err.message}`)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Floating Bulk Action Bar */}
      {selectedDieIds.size > 0 && (
        <div className="bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-4 flex flex-wrap items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center space-x-3">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 dot-glow animate-pulse" />
            <span className="text-sm font-semibold text-slate-200">
              <span className="font-extrabold text-blue-400">{selectedDieIds.size}</span> dies selected for batch edit
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            {/* Status Update Group */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Set status:</span>
              <select
                value={bulkStatus}
                disabled={isUpdating}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-1.5 text-xs text-slate-300 focus:outline-none"
              >
                <option value="">— Select Status —</option>
                <option value="AVAILABLE">Available</option>
                <option value="RUNNING">Running</option>
                <option value="CLEANING">Cleaning</option>
                <option value="POLISHING">Polishing</option>
                <option value="DAMAGED">Damaged</option>
                <option value="SCRAPPED">Scrapped</option>
                <option value="MISSING">Missing</option>
              </select>

              <button
                onClick={handleBulkStatusUpdate}
                disabled={!bulkStatus || isUpdating}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? 'Updating...' : 'Apply Status'}
              </button>
            </div>

            {/* Divider */}
            <div className="hidden md:block w-[1px] h-6 bg-slate-800" />

            {/* Location Update Group */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Set Location:</span>
              <input
                type="text"
                value={bulkLocation}
                disabled={isUpdating}
                onChange={(e) => setBulkLocation(e.target.value)}
                placeholder="e.g. Rack A - Shelf 3"
                className="bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none w-44"
              />

              <button
                onClick={handleBulkLocationUpdate}
                disabled={!bulkLocation.trim() || isUpdating}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? 'Updating...' : 'Apply Location'}
              </button>
            </div>

            {/* Divider */}
            <div className="hidden md:block w-[1px] h-6 bg-slate-800" />

            <button
              onClick={() => { setSelectedDieIds(new Set()); setBulkStatus(''); setBulkLocation(''); }}
              disabled={isUpdating}
              className="text-xs text-slate-400 hover:text-white px-3.5 py-2 rounded-xl border border-slate-800 hover:border-slate-700 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 text-xs font-semibold uppercase tracking-wider select-none">
              {canEdit && (
                <th className="py-4 px-6 w-12 text-center">
                  <input 
                    type="checkbox" 
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500/20 cursor-pointer w-4 h-4" 
                  />
                </th>
              )}
              <th className="py-4 px-6 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('die_id')}>
                Die ID {sortField === 'die_id' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
              </th>
              <th className="py-4 px-6 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('casing')}>
                Casing {sortField === 'casing' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
              </th>
              <th className="py-4 px-6 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('current_size')}>
                Size / Dimensions {sortField === 'current_size' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
              </th>
              <th className="py-4 px-6 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('location')}>
                Location {sortField === 'location' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
              </th>
              <th className="py-4 px-6 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('category')}>
                Category {sortField === 'category' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
              </th>
              <th className="py-4 px-6 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('status')}>
                Status {sortField === 'status' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
              </th>
              <th className="py-4 px-6 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('updated_at')}>
                Last Updated {sortField === 'updated_at' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
              </th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {paginatedDies.map((die) => {
              const active = isDieActive(die)
              const isSelected = selectedDieIds.has(die.die_id)
              return (
                <tr 
                  key={die.die_id} 
                  draggable={canEdit}
                  onDragStart={(e) => {
                    if (canEdit) {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('application/json', JSON.stringify({ type: 'die', id: die.die_id }));
                      if (onDragStartDie) onDragStartDie(die.die_id);
                    }
                  }}
                  onDragEnd={() => {
                    if (onDragEndDie) onDragEndDie();
                  }}
                  className={`hover:bg-slate-850/30 transition-colors duration-200 ${canEdit ? 'cursor-grab active:cursor-grabbing' : ''} ${isSelected ? 'bg-blue-600/5' : ''}`}
                >
                  {canEdit && (
                    <td className="py-4 px-6 w-12 text-center">
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => toggleSelectOne(die.die_id)}
                        className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500/20 cursor-pointer w-4 h-4" 
                      />
                    </td>
                  )}
                  <td className="py-4 px-6 text-white">
                    <h3 className="font-bold inline-block">{die.die_id}</h3>
                  </td>
                  <td className="py-4 px-6 text-slate-300">{die.casing}</td>
                  <td className="py-4 px-6 text-slate-300 font-semibold">
                    {die.die_type === 'ROUND' ? (
                      <span>Ø {die.current_size || '—'} mm</span>
                    ) : (
                      <span>
                        {die.current_width || '—'} × {die.current_thickness || '—'} mm
                        {die.radius ? ` (R: ${die.radius} mm)` : ''}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-slate-300">{die.location || '—'}</td>
                  <td className="py-4 px-6 text-slate-300">
                    <span className="px-2 py-0.5 text-xxs font-semibold bg-slate-800 rounded border border-slate-700/50">
                      {die.die_type}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                      active 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {die.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-400 text-xs">
                    {new Date(die.updated_at).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button 
                      onClick={() => navigate(`/dies/${die.die_id}`)}
                      className="bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition shadow-sm"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="bg-slate-950/20 border-t border-slate-800 px-6 py-4 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Showing Page {currentPage} of {totalPages} ({diesList.length} total)
          </span>
          <div className="flex space-x-2">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-40 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
            >
              Previous
            </button>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-40 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
            >
              Next
            </button>
          </div>
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
  const debouncedQ = useDebounce(q, 300)
  const [dieType, setDieType] = useState(searchParams.get('die_type') || '')
  const [statusVal, setStatusVal] = useState(searchParams.get('status') || '')
  const [casing, setCasing] = useState(searchParams.get('casing') || '')
  
  // Custom ranges
  const [sizeMin, setSizeMin] = useState(searchParams.get('size_min') || '')
  const [sizeMax, setSizeMax] = useState(searchParams.get('size_max') || '')
  const [widthMin, setWidthMin] = useState(searchParams.get('width_min') || '')
  const [widthMax, setWidthMax] = useState(searchParams.get('width_max') || '')
  const [thickMin, setThickMin] = useState(searchParams.get('thick_min') || '')
  const [thickMax, setThickMax] = useState(searchParams.get('thick_max') || '')
  
  const [showFilters, setShowFilters] = useState(!!(
    searchParams.get('die_type') || 
    searchParams.get('status') || 
    searchParams.get('casing') || 
    searchParams.get('size_min') || 
    searchParams.get('size_max') || 
    searchParams.get('width_min') || 
    searchParams.get('width_max') || 
    searchParams.get('thick_min') || 
    searchParams.get('thick_max')
  ))
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
    queryKey: ['dies', debouncedQ, dieType, statusVal, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax],
    queryFn: () => {
      let url = debouncedQ ? '/api/search/' : '/api/dies/'
      const params = new URLSearchParams()
      
      if (debouncedQ) params.append('q', debouncedQ)
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

  // Drag and Drop State & Handler Hooks
  const [activeDragType, setActiveDragType] = useState(null) // 'die' or 'set'
  const [dragOverNode, setDragOverNode] = useState(null) // { type: 'machine'|'set'|'unassigned', id: ... }

  const reallocateDieMutation = useMutation({
    mutationFn: ({ dieId, setId }) => request(`/api/dies/${dieId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ current_set: setId })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dies'] })
      queryClient.invalidateQueries({ queryKey: ['allDiesStats'] })
    }
  })

  const reallocateSetMutation = useMutation({
    mutationFn: ({ setId, machineId }) => request(`/api/sets/${setId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ machine: machineId })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dies'] })
      queryClient.invalidateQueries({ queryKey: ['machinesList'] })
    }
  })

  const handleDropOnMachine = (e, machineId) => {
    e.preventDefault()
    setDragOverNode(null)
    setActiveDragType(null)
    if (role !== 'ROOT' && role !== 'ADMIN') return
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'))
      if (data.type === 'set') {
        const { id: setId, currentMachineId } = data
        if (Number(currentMachineId) === Number(machineId)) return
        reallocateSetMutation.mutate({ setId, machineId })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleDropOnSet = (e, setId) => {
    e.preventDefault()
    setDragOverNode(null)
    setActiveDragType(null)
    if (role !== 'ROOT' && role !== 'ADMIN') return
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'))
      if (data.type === 'die') {
        const { id: dieId } = data
        reallocateDieMutation.mutate({ dieId, setId })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleDropOnUnassigned = (e) => {
    e.preventDefault()
    setDragOverNode(null)
    setActiveDragType(null)
    if (role !== 'ROOT' && role !== 'ADMIN') return
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'))
      if (data.type === 'die') {
        const { id: dieId } = data
        reallocateDieMutation.mutate({ dieId, setId: null })
      }
    } catch (err) {
      console.error(err)
    }
  }

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

  // Group dies into tree data structure (Memoized to prevent high-render CPU recalculations)
  const { diesBySet, unassignedDies, machinesWithData } = useMemo(() => {
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

    return { diesBySet, unassignedDies, machinesWithData }
  }, [dies, machinesList, setsList])

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

  const [selectedNode, setSelectedNode] = useState(null)
  const [treeSearch, setTreeSearch] = useState('')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Filtered machines list for the tree navigation search
  const filteredMachines = useMemo(() => {
    if (!treeSearch) return machinesWithData
    const query = treeSearch.toLowerCase()
    return machinesWithData.map(m => {
      const matchingSets = m.sets.filter(s => s.name.toLowerCase().includes(query))
      const machineMatches = m.name.toLowerCase().includes(query)
      if (machineMatches || matchingSets.length > 0) {
        return {
          ...m,
          sets: machineMatches ? m.sets : matchingSets
        }
      }
      return null
    }).filter(Boolean)
  }, [machinesWithData, treeSearch])

  const isSearchActive = useMemo(() => {
    return !!(q || dieType || statusVal || casing || sizeMin || sizeMax || widthMin || widthMax || thickMin || thickMax)
  }, [q, dieType, statusVal, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax])

  // Automatically select search node when search starts/ends
  useEffect(() => {
    if (isSearchActive) {
      setSelectedNode({ type: 'search' })
    } else {
      setSelectedNode(null)
    }
  }, [isSearchActive])

  // Set default selected node once data is loaded and no search is active
  useEffect(() => {
    if (!selectedNode && !isSearchActive) {
      if (machinesWithData && machinesWithData.length > 0) {
        setSelectedNode({ type: 'machine', id: machinesWithData[0].id })
      } else if (unassignedDies && unassignedDies.length > 0) {
        setSelectedNode({ type: 'unassigned' })
      }
    }
  }, [machinesWithData, unassignedDies, selectedNode, isSearchActive])

  // Compute active view based on selection and search status
  const activeView = useMemo(() => {
    if (isSearchActive && (!selectedNode || selectedNode.type === 'search')) {
      return 'search'
    }
    if (selectedNode) {
      return selectedNode.type
    }
    return 'placeholder'
  }, [selectedNode, isSearchActive])

  // Find currently selected machine details from active data
  const selectedMachine = useMemo(() => {
    if (selectedNode?.type === 'machine') {
      return machinesWithData.find(m => m.id === selectedNode.id)
    }
    return null
  }, [selectedNode, machinesWithData])

  // Find currently selected set details from active data
  const selectedSetData = useMemo(() => {
    if (selectedNode?.type === 'set') {
      for (const m of machinesWithData) {
        const s = m.sets.find(set => set.id === selectedNode.id)
        if (s) {
          return { set: s, machine: m }
        }
      }
    }
    return null
  }, [selectedNode, machinesWithData])

  // Find raw machine and set to show empty fallback details if filtered out
  const rawMachine = useMemo(() => {
    if (selectedNode?.type === 'machine') {
      return (machinesList || []).find(m => m.id === selectedNode.id)
    }
    return null
  }, [selectedNode, machinesList])

  const rawSetData = useMemo(() => {
    if (selectedNode?.type === 'set') {
      const s = (setsList || []).find(set => set.id === selectedNode.id)
      if (s) {
        const m = (machinesList || []).find(mach => mach.id === s.machine)
        return { set: s, machine: m }
      }
    }
    return null
  }, [selectedNode, setsList, machinesList])

  const canCreate = role === 'ROOT' || role === 'ADMIN'

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)] relative bg-slate-950 text-white font-sans">
      
      {/* Sidebar Overlay (Mobile only) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* LEFT PANEL - Tree Navigation */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-805 flex flex-col transform transition-transform duration-300 ease-in-out shrink-0 md:sticky md:top-0 md:h-[calc(100vh-64px)] md:transform-none md:z-auto ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${
          isSidebarCollapsed ? 'md:hidden' : 'md:flex'
        }`}
      >
        {/* Sidebar Header with Tree Search */}
        <div className="p-4 border-b border-slate-800 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200 text-xs tracking-wider uppercase">Inventory Explorer</span>
            {/* Close button for mobile */}
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-1.5 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          {/* Tree Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input 
              type="text"
              placeholder="Search machines or sets..."
              value={treeSearch}
              onChange={(e) => setTreeSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none transition-all duration-200"
            />
          </div>
        </div>

        {/* Tree Content */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div>
            {/* Search Results Tree Node */}
            {isSearchActive && (
              <div className="mb-4">
                <div
                  onClick={() => setSelectedNode({ type: 'search' })}
                  className={`flex items-center w-full rounded-xl transition-all duration-200 select-none cursor-pointer py-2.5 pl-3 pr-3 border-l-4 ${
                    selectedNode?.type === 'search'
                      ? 'bg-blue-600/10 text-white border-blue-500'
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border-transparent'
                  }`}
                >
                  <Search className={`h-4 w-4 shrink-0 mr-2 ${selectedNode?.type === 'search' ? 'text-blue-400' : 'text-slate-500'}`} />
                  <span className="text-xs font-bold truncate flex-1">Search Results</span>
                  <span className="bg-slate-950 text-blue-400 text-xxs font-bold px-2 py-0.5 rounded-full border border-slate-800 shrink-0">
                    {dies?.length || 0}
                  </span>
                </div>
              </div>
            )}

            <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-blue-500" />
              <span>Machines / Production Sets</span>
            </div>
            
            <div className="space-y-1 mt-2">
              {filteredMachines.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-500 italic">No matches found</div>
              ) : (
                filteredMachines.map(machine => {
                  const isMachineExpanded = treeSearch ? true : !!expandedMachines[machine.id]
                  const isMachineSelected = selectedNode?.type === 'machine' && selectedNode?.id === machine.id
                  const isMachineDragOver = dragOverNode?.type === 'machine' && dragOverNode?.id === machine.id
                  
                  return (
                    <div key={machine.id} className="space-y-0.5">
                      {/* Machine Node */}
                      <div 
                        className={`group flex items-center w-full rounded-xl transition-all duration-200 select-none border-l-4 ${
                          isMachineDragOver
                            ? 'bg-blue-600/30 text-white border-blue-500 ring-2 ring-blue-500/20 pl-2 pr-3 py-2'
                            : isMachineSelected 
                              ? 'bg-blue-600/10 text-white border-blue-500 pl-2 pr-3 py-2' 
                              : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border-transparent pl-2 pr-3 py-2 cursor-pointer'
                        }`}
                        onClick={() => setSelectedNode({ type: 'machine', id: machine.id })}
                        onDragOver={canCreate ? (e) => { if (activeDragType === 'set') e.preventDefault(); } : undefined}
                        onDragEnter={canCreate ? (e) => { if (activeDragType === 'set') setDragOverNode({ type: 'machine', id: machine.id }); } : undefined}
                        onDragLeave={canCreate ? () => setDragOverNode(null) : undefined}
                        onDrop={canCreate ? (e) => handleDropOnMachine(e, machine.id) : undefined}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleMachine(machine.id)
                          }}
                          className="p-1 hover:bg-slate-850 rounded transition mr-1"
                        >
                          {isMachineExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                          )}
                        </button>
                        <Cpu className={`h-4 w-4 shrink-0 mr-2 ${isMachineSelected ? 'text-blue-400' : 'text-slate-500'}`} />
                        <span className="text-xs font-semibold truncate flex-1">{machine.name}</span>
                        <span className="bg-slate-950 text-slate-500 text-xxs px-2 py-0.5 rounded-full border border-slate-800 shrink-0 font-medium">
                          {machine.totalDies}
                        </span>
                      </div>
                      
                      {/* Set Nodes (Children) */}
                      {isMachineExpanded && (
                        <div className="relative pl-4 space-y-0.5 ml-4 mt-0.5">
                          <div className="tree-branch-line" />
                          {machine.sets.map(set => {
                            const isSetSelected = selectedNode?.type === 'set' && selectedNode?.id === set.id
                            const activeCount = set.dies.filter(isDieActive).length
                            const isSetDragOver = dragOverNode?.type === 'set' && dragOverNode?.id === set.id
                            return (
                              <div key={set.id} className="relative pl-6">
                                <div className="tree-leaf-line" />
                                <div
                                  onClick={() => setSelectedNode({ type: 'set', id: set.id, machineId: machine.id })}
                                  draggable={canCreate}
                                  onDragStart={(e) => {
                                    if (canCreate) {
                                      e.dataTransfer.effectAllowed = 'move';
                                      e.dataTransfer.setData('application/json', JSON.stringify({ type: 'set', id: set.id, currentMachineId: machine.id }));
                                      setActiveDragType('set');
                                    }
                                  }}
                                  onDragEnd={() => {
                                    setActiveDragType(null);
                                    setDragOverNode(null);
                                  }}
                                  onDragOver={canCreate ? (e) => { if (activeDragType === 'die') e.preventDefault(); } : undefined}
                                  onDragEnter={canCreate ? (e) => { if (activeDragType === 'die') setDragOverNode({ type: 'set', id: set.id }); } : undefined}
                                  onDragLeave={canCreate ? () => setDragOverNode(null) : undefined}
                                  onDrop={canCreate ? (e) => handleDropOnSet(e, set.id) : undefined}
                                  className={`flex items-center w-full rounded-xl transition-all duration-200 select-none py-1.5 pl-3 pr-3 border-l-4 ${
                                    canCreate ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                                  } ${
                                    isSetDragOver
                                      ? 'bg-indigo-600/30 text-white border-indigo-500 ring-2 ring-indigo-500/20'
                                      : isSetSelected
                                        ? 'bg-indigo-600/10 text-white border-indigo-500'
                                        : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border-transparent'
                                  }`}
                                >
                                  <Layers className={`h-3.5 w-3.5 shrink-0 mr-2 ${isSetSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                                  <span className="text-xs font-medium truncate flex-1">{set.name}</span>
                                  <span className="flex items-center gap-1.5 text-indigo-400 text-xxs font-bold px-1.5 py-0.5 rounded-full bg-slate-950 border border-slate-800 shrink-0">
                                    {activeCount > 0 && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dot-glow shrink-0 animate-pulse" />
                                    )}
                                    {set.dies.length}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
 
             {/* Unassigned / Standalone Dies Node */}
             {unassignedDies.length > 0 && (
               <div className="pt-4 border-t border-slate-800/60 mt-4">
                 {(() => {
                   const isUnassignedDragOver = dragOverNode?.type === 'unassigned'
                   return (
                     <div
                       onClick={() => setSelectedNode({ type: 'unassigned' })}
                       onDragOver={canCreate ? (e) => { if (activeDragType === 'die') e.preventDefault(); } : undefined}
                       onDragEnter={canCreate ? (e) => { if (activeDragType === 'die') setDragOverNode({ type: 'unassigned' }); } : undefined}
                       onDragLeave={canCreate ? () => setDragOverNode(null) : undefined}
                       onDrop={canCreate ? (e) => handleDropOnUnassigned(e) : undefined}
                       className={`flex items-center w-full rounded-xl transition-all duration-200 select-none cursor-pointer py-2.5 pl-3 pr-3 border-l-4 ${
                         isUnassignedDragOver
                           ? 'bg-amber-600/30 text-white border-amber-500 ring-2 ring-amber-500/20'
                           : selectedNode?.type === 'unassigned'
                             ? 'bg-amber-600/10 text-white border-amber-500'
                             : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border-transparent'
                       }`}
                     >
                       <Sliders className={`h-4 w-4 shrink-0 mr-2 ${selectedNode?.type === 'unassigned' ? 'text-amber-400' : 'text-slate-500'}`} />
                       <span className="text-xs font-bold truncate flex-1">Unassigned Dies</span>
                       <span className="bg-slate-950 text-amber-400 text-xxs font-bold px-2 py-0.5 rounded-full border border-slate-800 shrink-0">
                         {unassignedDies.length}
                       </span>
                     </div>
                   )
                 })()}
               </div>
             )}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Content Area */}
      <div className="flex-1 min-w-0 bg-slate-950 flex flex-col">
        
        {/* Top Header & Navbar-like control */}
        <div className="bg-slate-900 border-b border-slate-800/60 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-30">
          <div className="flex items-center">
            {/* Sidebar toggle button (Mobile: Drawer, Desktop/Tablet: Collapse) */}
            <button 
              onClick={() => {
                if (window.innerWidth < 768) {
                  setIsSidebarOpen(!isSidebarOpen)
                } else {
                  setIsSidebarCollapsed(!isSidebarCollapsed)
                }
              }}
              className="p-2 bg-slate-950 border border-slate-800 hover:bg-slate-850 rounded-xl text-slate-400 hover:text-white transition shadow-sm mr-4"
              title="Toggle Sidebar"
            >
              {/* Mobile View: Hamburger Menu */}
              <span className="md:hidden">
                <Menu className="h-5 w-5" />
              </span>
              {/* Desktop View: Dynamic Chevrons */}
              <span className="hidden md:inline">
                {isSidebarCollapsed ? (
                  <ChevronRight className="h-5 w-5 text-blue-400" />
                ) : (
                  <ChevronLeft className="h-5 w-5" />
                )}
              </span>
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Die Registry Inventory</h1>
              <p className="text-slate-400 text-xs mt-0.5 hidden sm:block">Professional enterprise-grade inventory registry dashboard.</p>
            </div>
          </div>
        </div>

        {/* Inner Content Area */}
        <div className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8 overflow-y-auto">
          
          {/* Action Bar (Search & Filter Section) */}
          <div className="bg-slate-900 border border-slate-805 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
                <input 
                  type="text" 
                  placeholder='Search by Die ID, casing, location... (use quotes for exact match, e.g. "2.500")'
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none transition-all duration-350"
                />
              </div>
              
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center justify-center space-x-2 px-5 py-3.5 rounded-xl border font-bold transition-all duration-350 w-full md:w-auto ${
                  showFilters 
                    ? 'bg-blue-600/15 text-blue-400 border-blue-500/30' 
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <SlidersHorizontal className="h-5 w-5" />
                <span>Filters</span>
              </button>
            </div>

            {/* Secondary Actions Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-800/60">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExpandAll}
                  className="bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 px-4 py-2 rounded-xl text-xs font-semibold transition shadow-sm"
                >
                  Expand All
                </button>
                <button
                  type="button"
                  onClick={handleCollapseAll}
                  className="bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 px-4 py-2 rounded-xl text-xs font-semibold transition shadow-sm"
                >
                  Collapse All
                </button>
              </div>

              {canCreate && (
                <button 
                  onClick={() => setIsCreateOpen(true)}
                  className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2 rounded-xl font-bold shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-300 text-xs md:text-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add New Die</span>
                </button>
              )}
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3.5 text-slate-300 focus:border-blue-500 focus:outline-none"
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

          {/* Master Detail View Wrapper */}
          {isLoading ? (
            <div className="flex justify-center items-center py-24">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-8">
              <p className="text-rose-400 font-bold">Error loading inventory: {error.message}</p>
            </div>
          ) : !selectedNode ? (
            <div className="text-center py-24 bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-md">
              <p className="text-slate-400 text-lg">No selection. Select a machine or set from the navigation tree.</p>
            </div>
          ) : (
            <div>
              
              {/* SEARCH RESULTS VIEW */}
              {activeView === 'search' && (
                <div className="space-y-8 animate-fadeIn">
                  {/* Header */}
                  <div className="border-b border-slate-800 pb-5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      <Search className="h-4 w-4 text-blue-500" />
                      <span>Search & Filter Results</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-white">Matching Dies</h2>
                    <p className="text-slate-400 text-xs mt-1">Showing all dies matching active registry filters.</p>
                  </div>

                  {dies && dies.length > 0 ? (
                    <>
                      {/* Stat Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider font-bold">Total Matches</span>
                          <span className="text-2xl md:text-3xl font-black text-blue-400 mt-2">{dies.length}</span>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider font-bold">Active</span>
                          <span className="text-2xl md:text-3xl font-black text-emerald-400 mt-2">
                            {dies.filter(isDieActive).length}
                          </span>
                        </div>
                        <div className="bg-slate-900 border border-slate-805 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider font-bold">Inactive</span>
                          <span className="text-2xl md:text-3xl font-black text-rose-400 mt-2">
                            {dies.length - dies.filter(isDieActive).length}
                          </span>
                        </div>
                      </div>

                      {/* Dies Table */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Filtered Catalog</h3>
                        <DiesTable 
                          diesList={dies} 
                          navigate={navigate} 
                          onDragStartDie={(id) => setActiveDragType('die')}
                          onDragEndDie={() => { setActiveDragType(null); setDragOverNode(null); }}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center shadow-lg">
                      <Search className="h-12 w-12 text-slate-650 mx-auto mb-4 animate-pulse" />
                      <p className="text-slate-400 font-medium">No dies in the registry match the current search or filters.</p>
                    </div>
                  )}
                </div>
              )}

              {/* MACHINE DETAILS VIEW */}
              {activeView === 'machine' && (
                <div className="space-y-8">
                  {selectedMachine ? (
                    <>
                      {/* Header */}
                      <div className="border-b border-slate-800 pb-5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          <Cpu className="h-4 w-4 text-blue-500" />
                          <span>Machine Explorer</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-white">{selectedMachine.name}</h2>
                        <span className="inline-block px-2.5 py-1 text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-400 rounded-lg mt-2">
                          {selectedMachine.category_name || 'Standard Category'}
                        </span>
                      </div>

                      {/* Stat Cards */}
                      <div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Summary Statistics</h3>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition">
                            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Sets</span>
                            <span className="text-2xl md:text-3xl font-black text-white mt-2">{selectedMachine.sets.length}</span>
                          </div>
                          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition">
                            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Dies</span>
                            <span className="text-2xl md:text-3xl font-black text-white mt-2">{selectedMachine.totalDies}</span>
                          </div>
                          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition">
                            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider font-bold">Active Dies</span>
                            <span className="text-2xl md:text-3xl font-black text-emerald-400 mt-2">
                              {selectedMachine.sets.reduce((sum, s) => sum + s.dies.filter(isDieActive).length, 0)}
                            </span>
                          </div>
                          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition">
                            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider font-bold">Inactive Dies</span>
                            <span className="text-2xl md:text-3xl font-black text-rose-400 mt-2">
                              {selectedMachine.totalDies - selectedMachine.sets.reduce((sum, s) => sum + s.dies.filter(isDieActive).length, 0)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Sets Cards Section */}
                      <div className="pt-4">
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Layers className="h-4 w-4 text-indigo-400" />
                          <span>Assigned Sets</span>
                        </h3>
                        {selectedMachine.sets.length === 0 ? (
                          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 italic">
                            No sets found for this machine matching filters.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {selectedMachine.sets.map(set => {
                              const sTotal = set.dies.length
                              const sActive = set.dies.filter(isDieActive).length
                              const sInactive = sTotal - sActive
                              return (
                                <div
                                  key={set.id}
                                  onClick={() => setSelectedNode({ type: 'set', id: set.id, machineId: selectedMachine.id })}
                                  className="bg-slate-900/55 hover:bg-slate-900 border border-slate-850 hover:border-indigo-500/40 rounded-2xl p-5 cursor-pointer transition-all duration-300 shadow-md group relative overflow-hidden"
                                >
                                  {/* Hover Glow */}
                                  <div className="absolute inset-x-0 bottom-0 h-1 bg-indigo-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                                  
                                  <div className="flex items-center justify-between mb-4">
                                    <span className="font-extrabold text-white text-base group-hover:text-indigo-400 transition-colors">
                                      {set.name}
                                    </span>
                                    <span className="text-xs bg-slate-950 text-indigo-400 font-bold px-2 py-0.5 rounded-full border border-slate-800">
                                      {sTotal} {sTotal === 1 ? 'Die' : 'Dies'}
                                    </span>
                                  </div>
                                  <div className="flex gap-4 text-xs text-slate-400 border-t border-slate-800 pt-3">
                                    <div>
                                      <span className="text-emerald-400 font-bold">{sActive}</span> Active
                                    </div>
                                    <div>
                                      <span className="text-rose-400 font-bold">{sInactive}</span> Inactive
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    /* Fallback when selected machine is filtered out */
                    <div className="space-y-6">
                      <div className="border-b border-slate-800 pb-5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          <Cpu className="h-4 w-4 text-blue-500" />
                          <span>Machine Explorer</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-white">{rawMachine?.name || 'Machine'}</h2>
                      </div>
                      <div className="bg-slate-900 border border-slate-850 rounded-2xl p-12 text-center shadow-lg">
                        <Cpu className="h-12 w-12 text-slate-650 mx-auto mb-4 animate-pulse" />
                        <p className="text-slate-400 font-medium">No dies assigned to this machine match the current filters.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SET DETAILS VIEW */}
              {activeView === 'set' && (
                <div className="space-y-8">
                  {selectedSetData ? (
                    <>
                      {/* Header */}
                      <div className="border-b border-slate-800 pb-5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-505 uppercase tracking-wider mb-1">
                          <span>{selectedSetData.machine?.name}</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                          <span className="text-indigo-400">{selectedSetData.set.name}</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-white">{selectedSetData.set.name}</h2>
                        <p className="text-slate-400 text-xs mt-1">Assigned to machine: {selectedSetData.machine?.name}</p>
                      </div>

                      {/* Stat Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Dies</span>
                          <span className="text-2xl md:text-3xl font-black text-white mt-2">{selectedSetData.set.dies.length}</span>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider font-bold">Active Dies</span>
                          <span className="text-2xl md:text-3xl font-black text-emerald-400 mt-2">
                            {selectedSetData.set.dies.filter(isDieActive).length}
                          </span>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider font-bold">Inactive Dies</span>
                          <span className="text-2xl md:text-3xl font-black text-rose-400 mt-2">
                            {selectedSetData.set.dies.length - selectedSetData.set.dies.filter(isDieActive).length}
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      {(() => {
                        const total = selectedSetData.set.dies.length
                        const active = selectedSetData.set.dies.filter(isDieActive).length
                        const inactive = total - active
                        const activePct = total > 0 ? ((active / total) * 100).toFixed(1) : '0.0'
                        const inactivePct = total > 0 ? ((inactive / total) * 100).toFixed(1) : '0.0'
                        return (
                          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Operational Ratio</h3>
                            <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                              <span className="text-emerald-400">Active: {active} ({activePct}%)</span>
                              <span className="text-rose-400">Inactive: {inactive} ({inactivePct}%)</span>
                            </div>
                            <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden flex">
                              <div className="bg-emerald-500 h-full transition-all duration-550" style={{ width: `${activePct}%` }} />
                              <div className="bg-rose-500 h-full transition-all duration-550" style={{ width: `${inactivePct}%` }} />
                            </div>
                          </div>
                        )
                      })()}

                      {/* Dies Table */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Dies Inventory</h3>
                        <DiesTable 
                          diesList={selectedSetData.set.dies} 
                          navigate={navigate} 
                          onDragStartDie={(id) => setActiveDragType('die')}
                          onDragEndDie={() => { setActiveDragType(null); setDragOverNode(null); }}
                        />
                      </div>
                    </>
                  ) : (
                    /* Fallback when selected set is filtered out */
                    <div className="space-y-6">
                      <div className="border-b border-slate-800 pb-5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          <span>{rawSetData?.machine?.name || 'Machine'}</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                          <span className="text-indigo-400">{rawSetData?.set?.name || 'Set'}</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-white">{rawSetData?.set?.name || 'Set'}</h2>
                      </div>
                      <div className="bg-slate-900 border border-slate-805 rounded-2xl p-12 text-center shadow-lg">
                        <Layers className="h-12 w-12 text-slate-650 mx-auto mb-4 animate-pulse" />
                        <p className="text-slate-400 font-medium">No dies assigned to this set match the current filters.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* UNASSIGNED STANDALONE DIES VIEW */}
              {activeView === 'unassigned' && (
                <div className="space-y-8">
                  {/* Header */}
                  <div className="border-b border-slate-800 pb-5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      <Sliders className="h-4 w-4 text-amber-500" />
                      <span>Standalone Inventory</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-white">Unassigned / Standalone Dies</h2>
                    <p className="text-slate-400 text-xs mt-1">Production dies that are currently unassigned to any machine set.</p>
                  </div>

                  {unassignedDies.length > 0 ? (
                    <>
                      {/* Stat Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider font-bold">Total Standalone</span>
                          <span className="text-2xl md:text-3xl font-black text-amber-450 mt-2">{unassignedDies.length}</span>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider font-bold">Active</span>
                          <span className="text-2xl md:text-3xl font-black text-emerald-400 mt-2">
                            {unassignedDies.filter(isDieActive).length}
                          </span>
                        </div>
                        <div className="bg-slate-900 border border-slate-805 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider font-bold">Inactive</span>
                          <span className="text-2xl md:text-3xl font-black text-rose-400 mt-2">
                            {unassignedDies.length - unassignedDies.filter(isDieActive).length}
                          </span>
                        </div>
                      </div>

                      {/* Dies Table */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Dies Inventory</h3>
                        <DiesTable 
                          diesList={unassignedDies} 
                          navigate={navigate} 
                          onDragStartDie={(id) => setActiveDragType('die')}
                          onDragEndDie={() => { setActiveDragType(null); setDragOverNode(null); }}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center shadow-lg">
                      <Sliders className="h-12 w-12 text-slate-650 mx-auto mb-4 animate-pulse" />
                      <p className="text-slate-400 font-medium">No unassigned dies match the current filters.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">CAD Blueprint</h3>
                <DieBlueprint die={die} />
              </div>

              <div className="md:col-span-2 lg:col-span-1">
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
    return categories.filter(cat => 
      cat.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [categories, searchQuery])

  const filteredMachines = useMemo(() => {
    if (!machines) return []
    return machines.filter(mach => {
      const matchesSearch = mach.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (mach.category_name && mach.category_name.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesCategory = filterCategory ? String(mach.category) === String(filterCategory) : true
      return matchesSearch && matchesCategory
    })
  }, [machines, searchQuery, filterCategory])

  const filteredSets = useMemo(() => {
    if (!sets) return []
    return sets.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (s.machine_name && s.machine_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (s.category_name && s.category_name.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesMachine = filterMachine ? String(s.machine) === String(filterMachine) : true
      return matchesSearch && matchesMachine
    })
  }, [sets, searchQuery, filterMachine])

  // Form handlers
  const handleCatSubmit = (e) => {
    e.preventDefault()
    if (editingCat) {
      updateCategory.mutate({ id: editingCat.id, data: { name: catName } })
    } else {
      createCategory.mutate({ name: catName })
    }
  }

  const handleMachSubmit = async (e) => {
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

  const handleSetSubmit = async (e) => {
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
                  {filteredCategories.map(cat => (
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
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {isMachsLoading ? (
                <div className="text-center py-6">Loading...</div>
              ) : filteredMachines.length === 0 ? (
                <p className="text-slate-500 text-sm py-4">No matching machines found.</p>
              ) : (
                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                  {filteredMachines.map(mach => (
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
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
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
                        rows="2"
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

              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
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
                    {machines.map(mach => (
                      <option key={mach.id} value={mach.id}>{mach.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {isSetsLoading ? (
                <div className="text-center py-6">Loading...</div>
              ) : filteredSets.length === 0 ? (
                <p className="text-slate-500 text-sm py-4">No matching tool sets found.</p>
              ) : (
                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                  {filteredSets.map(s => (
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
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
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
                        rows="2"
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

// User Management Page (Root Only)
function UsersPage() {
  const { request } = useApi()
  const { role, username: currentUsername, token } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (role !== 'ROOT') {
      navigate('/')
    }
  }, [role, navigate])

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  
  const [usernameInput, setUsernameInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [currentPasswordInput, setCurrentPasswordInput] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [firstNameInput, setFirstNameInput] = useState('')
  const [lastNameInput, setLastNameInput] = useState('')
  const [roleInput, setRoleInput] = useState('REGULAR')
  const [isActiveInput, setIsActiveInput] = useState(true)
  
  const [formError, setFormError] = useState(null)

  const [activeTab, setActiveTab] = useState('users') // 'users' or 'backups'
  const [selectedBackup, setSelectedBackup] = useState(null)
  const [showRestoreConfirmModal, setShowRestoreConfirmModal] = useState(false)
  const [restoreConfirmInput, setRestoreConfirmInput] = useState('')

  const [isUploading, setIsUploading] = useState(false)

  const handleDownloadBackup = async (filename) => {
    try {
      const res = await fetch(`/api/backups/download_backup/?filename=${encodeURIComponent(filename)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!res.ok) {
        throw new Error('Download failed')
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert(err.message || 'Failed to download backup')
    }
  }

  const handleUploadFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.name.endsWith('.dump')) {
      alert('Only .dump files are allowed')
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    setIsUploading(true)
    try {
      const res = await request('/api/backups/upload_backup/', {
        method: 'POST',
        body: formData
      })
      alert(`Backup "${res.filename}" uploaded successfully!`)
      queryClient.invalidateQueries({ queryKey: ['backupsList'] })
    } catch (err) {
      alert(err.message || 'Failed to upload backup')
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  // Fetch users
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['usersListAdmin'],
    queryFn: () => request('/api/users/'),
    enabled: role === 'ROOT'
  })

  // Fetch backups
  const { data: backups, isLoading: isBackupsLoading, error: backupsError } = useQuery({
    queryKey: ['backupsList'],
    queryFn: () => request('/api/backups/'),
    enabled: role === 'ROOT' && activeTab === 'backups'
  })

  // Create Backup Mutation
  const createBackupMutation = useMutation({
    mutationFn: () => request('/api/backups/', {
      method: 'POST'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backupsList'] })
    },
    onError: (err) => {
      alert(err.message || 'Failed to create backup')
    }
  })

  // Delete Backup Mutation
  const deleteBackupMutation = useMutation({
    mutationFn: (filename) => request('/api/backups/delete_backup/', {
      method: 'POST',
      body: JSON.stringify({ filename })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backupsList'] })
    },
    onError: (err) => {
      alert(err.message || 'Failed to delete backup')
    }
  })

  // Restore Backup Mutation
  const restoreBackupMutation = useMutation({
    mutationFn: (filename) => request('/api/backups/restore/', {
      method: 'POST',
      body: JSON.stringify({ filename })
    }),
    onSuccess: () => {
      setShowRestoreConfirmModal(false)
      setSelectedBackup(null)
      setRestoreConfirmInput('')
      alert('Database restore completed successfully! Search index has been rebuilt.')
      window.location.reload()
    },
    onError: (err) => {
      alert(err.message || 'Failed to restore backup')
    }
  })

  // Create User Mutation
  const createUserMutation = useMutation({
    mutationFn: (data) => request('/api/users/', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['usersListAdmin'])
      closeForm()
    },
    onError: (err) => {
      setFormError(err.message || 'Failed to create user')
    }
  })

  // Update User Mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => request(`/api/users/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['usersListAdmin'])
      closeForm()
    },
    onError: (err) => {
      setFormError(err.message || 'Failed to update user')
    }
  })

  // Toggle user active status directly
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }) => request(`/api/users/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['usersListAdmin'])
    }
  })

  // Delete User Mutation
  const deleteUserMutation = useMutation({
    mutationFn: (id) => request(`/api/users/${id}/`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['usersListAdmin'])
    }
  })

  const openAddForm = () => {
    setEditingUser(null)
    setUsernameInput('')
    setPasswordInput('')
    setCurrentPasswordInput('')
    setEmailInput('')
    setFirstNameInput('')
    setLastNameInput('')
    setRoleInput('REGULAR')
    setIsActiveInput(true)
    setFormError(null)
    setIsFormOpen(true)
  }

  const openEditForm = (user) => {
    setEditingUser(user)
    setUsernameInput(user.username)
    setPasswordInput('')
    setCurrentPasswordInput('')
    setEmailInput(user.email || '')
    setFirstNameInput(user.first_name || '')
    setLastNameInput(user.last_name || '')
    setRoleInput(user.role)
    setIsActiveInput(user.is_active)
    setFormError(null)
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingUser(null)
    setCurrentPasswordInput('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setFormError(null)

    const payload = {
      username: usernameInput,
      email: emailInput,
      first_name: firstNameInput,
      last_name: lastNameInput,
      role: roleInput,
      is_active: isActiveInput
    }

    if (editingUser) {
      if (passwordInput.trim()) {
        payload.password = passwordInput
      }
      if (editingUser.username === currentUsername && (passwordInput.trim() || emailInput !== editingUser.email)) {
        payload.current_password = currentPasswordInput
      }
      updateUserMutation.mutate({ id: editingUser.id, data: payload })
    } else {
      if (!passwordInput.trim()) {
        setFormError('Password is required for new users')
        return
      }
      payload.password = passwordInput
      createUserMutation.mutate(payload)
    }
  }

  const handleToggleActive = (user) => {
    if (user.username === currentUsername) {
      alert('You cannot deactivate your own account.')
      return
    }
    toggleActiveMutation.mutate({ id: user.id, is_active: !user.is_active })
  }

  const handleDeleteUser = (user) => {
    if (user.username === currentUsername) {
      alert('You cannot delete your own account.')
      return
    }
    if (window.confirm(`Are you sure you want to permanently delete user "${user.username}"?`)) {
      deleteUserMutation.mutate(user.id)
    }
  }

  if (role !== 'ROOT') {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            {activeTab === 'users' ? 'User Administration' : 'System Backups'}
          </h1>
          <p className="text-slate-400 mt-1">
            {activeTab === 'users' 
              ? 'Manage administrative credentials, system roles, and account statuses.' 
              : 'Create, manage, and restore database backup archives (PostgreSQL custom format).'}
          </p>
        </div>
        {activeTab === 'users' ? (
          <button 
            onClick={openAddForm}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-3 rounded-xl font-semibold shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-300"
          >
            <Plus className="h-5 w-5" />
            <span>Create User</span>
          </button>
        ) : (
          <button 
            onClick={() => createBackupMutation.mutate()}
            disabled={createBackupMutation.isPending}
            className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-5 py-3 rounded-xl font-semibold shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all duration-300 disabled:opacity-50"
          >
            {createBackupMutation.isPending ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <Database className="h-5 w-5" />
            )}
            <span>{createBackupMutation.isPending ? 'Creating Backup...' : 'Create Backup Now'}</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-6 mb-8">
        <button 
          onClick={() => setActiveTab('users')}
          className={`pb-4 text-md font-semibold border-b-2 transition-all ${
            activeTab === 'users' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          User Management
        </button>
        <button 
          onClick={() => setActiveTab('backups')}
          className={`pb-4 text-md font-semibold border-b-2 transition-all ${
            activeTab === 'backups' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Database Backups
        </button>
      </div>

      {activeTab === 'users' && (
        isLoading ? (
          <div className="flex justify-center items-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-rose-500/10 border border-rose-500/20 rounded-xl p-8">
            <p className="text-rose-400 font-semibold">Error: {error.message}</p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-4.5 px-6">Username</th>
                    <th className="py-4.5 px-6 hidden sm:table-cell">Full Name</th>
                    <th className="py-4.5 px-6 hidden md:table-cell">Email</th>
                    <th className="py-4.5 px-6">Role</th>
                    <th className="py-4.5 px-6">Status</th>
                    <th className="py-4.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {users?.map((user) => {
                    const isSelf = user.username === currentUsername
                    return (
                      <tr key={user.id} className="hover:bg-slate-850/30 transition-colors duration-200">
                        <td className="py-4 px-6 font-bold text-white flex items-center space-x-2">
                          <span>{user.username}</span>
                          {isSelf && (
                            <span className="text-xxs bg-blue-500/15 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-semibold">
                              You
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-slate-300 hidden sm:table-cell">
                          {user.first_name || user.last_name ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '—'}
                        </td>
                        <td className="py-4 px-6 text-slate-300 hidden md:table-cell">{user.email || '—'}</td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                            user.role === 'ROOT' 
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
                              : user.role === 'ADMIN'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${user.is_active ? 'bg-emerald-500 shadow-md shadow-emerald-500/50' : 'bg-rose-500'}`} />
                            <span className={`text-sm font-medium ${user.is_active ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right space-x-2">
                          <button 
                            onClick={() => openEditForm(user)}
                            className="bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
                            title="Edit user"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleToggleActive(user)}
                            disabled={isSelf}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                              user.is_active 
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20 disabled:opacity-40' 
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                            }`}
                          >
                            {user.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user)}
                            disabled={isSelf}
                            className="bg-rose-500/5 hover:bg-rose-500/15 text-rose-500 hover:text-rose-400 border border-rose-500/10 p-2 rounded-xl text-xs transition disabled:opacity-40"
                            title={isSelf ? 'You cannot delete yourself' : 'Delete user'}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {activeTab === 'backups' && (
        isBackupsLoading ? (
          <div className="flex justify-center items-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : backupsError ? (
          <div className="text-center py-12 bg-rose-500/10 border border-rose-500/20 rounded-xl p-8">
            <p className="text-rose-400 font-semibold">Error: {backupsError.message}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Upload Backup & Actions */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-2">Upload Backup</h3>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                  Upload an offline database backup archive file (`.dump`) to make it available for restore.
                </p>
                <div 
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
                    isUploading 
                      ? 'border-blue-500/50 bg-blue-500/5' 
                      : 'border-slate-800 hover:border-blue-500/50 bg-slate-950/20 hover:bg-slate-950/40'
                  }`}
                  onClick={() => !isUploading && document.getElementById('backup-file-input').click()}
                >
                  {isUploading ? (
                    <RefreshCw className="h-10 w-10 text-blue-500 mx-auto mb-4 animate-spin" />
                  ) : (
                    <Upload className="h-10 w-10 text-slate-500 mx-auto mb-4" />
                  )}
                  <span className="text-sm font-bold text-slate-200 block">
                    {isUploading ? 'Uploading Dump File...' : 'Click to Upload Backup'}
                  </span>
                  <span className="text-xs text-slate-500 mt-2 block">
                    Only accepts `.dump` format
                  </span>
                  <input 
                    type="file" 
                    id="backup-file-input" 
                    accept=".dump"
                    className="hidden"
                    disabled={isUploading}
                    onChange={handleUploadFile}
                  />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h4 className="text-sm font-bold text-white mb-2 uppercase tracking-wider text-slate-400">Nightly Backups</h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  The system automatically takes a full database snapshot nightly at 2:00 AM. 
                  Backups older than 14 days are auto-pruned to conserve disk space.
                </p>
              </div>
            </div>

            {/* Right Column: Backups List */}
            <div className="lg:col-span-2">
              {!backups || backups.length === 0 ? (
                <div className="text-center py-20 bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl h-full flex flex-col justify-center items-center">
                  <Database className="h-12 w-12 text-slate-600 mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No backups found</h3>
                  <p className="text-slate-400 max-w-md mx-auto mb-8">
                    No database backup files exist in the `/backups` directory on the server.
                  </p>
                  <button
                    onClick={() => createBackupMutation.mutate()}
                    disabled={createBackupMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl font-semibold transition disabled:opacity-50 inline-flex items-center space-x-2 shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20"
                  >
                    {createBackupMutation.isPending ? (
                      <RefreshCw className="h-5 w-5 animate-spin" />
                    ) : (
                      <Plus className="h-5 w-5" />
                    )}
                    <span>Create Initial Backup</span>
                  </button>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                          <th className="py-4.5 px-6">Backup File</th>
                          <th className="py-4.5 px-6">Date Created</th>
                          <th className="py-4.5 px-6">Size</th>
                          <th className="py-4.5 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {backups.map((backup) => {
                          const dateStr = new Date(backup.created_at).toLocaleString()
                          return (
                            <tr key={backup.filename} className="hover:bg-slate-850/30 transition-colors duration-200">
                              <td className="py-4 px-6 font-bold text-white flex items-center space-x-2">
                                <Database className="h-4 w-4 text-slate-500" />
                                <span className="break-all">{backup.filename}</span>
                              </td>
                              <td className="py-4 px-6 text-slate-300">{dateStr}</td>
                              <td className="py-4 px-6 text-slate-300">
                                {backup.size_kb >= 1024 
                                  ? `${(backup.size_kb / 1024).toFixed(2)} MB` 
                                  : `${backup.size_kb.toFixed(1)} KB`}
                              </td>
                              <td className="py-4 px-6 text-right space-x-2 whitespace-nowrap">
                                <button
                                  onClick={() => handleDownloadBackup(backup.filename)}
                                  className="bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 p-2 rounded-xl text-xs font-semibold transition"
                                  title="Download Backup File"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedBackup(backup)
                                    setRestoreConfirmInput('')
                                    setShowRestoreConfirmModal(true)
                                  }}
                                  className="bg-rose-600/15 hover:bg-rose-600/30 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
                                >
                                  Restore
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Are you sure you want to permanently delete backup "${backup.filename}"?`)) {
                                      deleteBackupMutation.mutate(backup.filename)
                                    }
                                  }}
                                  disabled={deleteBackupMutation.isPending}
                                  className="bg-rose-500/5 hover:bg-rose-500/15 text-rose-500 hover:text-rose-400 border border-rose-500/10 p-2 rounded-xl text-xs transition disabled:opacity-40"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* Create / Edit User Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">
                {editingUser ? `Edit User: ${editingUser.username}` : 'Create Administrative User'}
              </h2>
              <button onClick={closeForm} className="text-slate-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {formError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl p-4 text-sm font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Username</label>
                <input 
                  type="text" 
                  required
                  disabled={!!editingUser}
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 disabled:opacity-50 disabled:bg-slate-950 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">First Name</label>
                  <input 
                    type="text" 
                    value={firstNameInput}
                    onChange={(e) => setFirstNameInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Last Name</label>
                  <input 
                    type="text" 
                    value={lastNameInput}
                    onChange={(e) => setLastNameInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Password {editingUser && <span className="text-slate-500 font-normal capitalize">(leave blank to keep current)</span>}
                </label>
                <input 
                  type="password" 
                  required={!editingUser}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                />
              </div>

              {editingUser && editingUser.username === currentUsername && (passwordInput.trim() || emailInput !== editingUser.email) && (
                <div>
                  <label className="block text-xs font-semibold text-rose-400 uppercase tracking-wider mb-2">
                    Current Password <span className="text-slate-500 font-normal capitalize">(required to save changes)</span>
                  </label>
                  <input 
                    type="password" 
                    required
                    value={currentPasswordInput}
                    onChange={(e) => setCurrentPasswordInput(e.target.value)}
                    className="w-full bg-slate-950 border border-rose-800/40 focus:border-rose-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none placeholder-rose-900/30"
                    placeholder="Enter current password to verify"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email</label>
                <input 
                  type="email" 
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Role</label>
                <select 
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  disabled={editingUser && (editingUser.role === 'ROOT' || editingUser.username === currentUsername)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 disabled:opacity-50 disabled:bg-slate-950 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
                >
                  {roleInput === 'ROOT' && (
                    <option value="ROOT">Root (Superuser)</option>
                  )}
                  <option value="REGULAR">Regular (Read-Only)</option>
                  <option value="ADMIN">Admin (Read-Write)</option>
                </select>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <input 
                  type="checkbox"
                  id="user-active-checkbox"
                  checked={isActiveInput}
                  onChange={(e) => setIsActiveInput(e.target.checked)}
                  disabled={editingUser && editingUser.username === currentUsername}
                  className="h-4.5 w-4.5 bg-slate-950 border border-slate-800 rounded focus:ring-0 text-blue-500"
                />
                <label htmlFor="user-active-checkbox" className="text-sm font-semibold text-slate-300 cursor-pointer">
                  Is Account Active
                </label>
              </div>

              <div className="border-t border-slate-800 pt-5 flex justify-end space-x-2">
                <button 
                  type="button" 
                  onClick={closeForm}
                  className="bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 shadow-md shadow-blue-500/10 hover:shadow-blue-500/20"
                >
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Database Restore Double Confirmation Modal */}
      {showRestoreConfirmModal && selectedBackup && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center space-x-2 text-rose-400">
                <AlertTriangle className="h-5 w-5" />
                <h2 className="text-xl font-bold text-white">Confirm Database Restore</h2>
              </div>
              <button 
                onClick={() => {
                  setShowRestoreConfirmModal(false)
                  setSelectedBackup(null)
                }} 
                className="text-slate-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-4 text-sm font-medium leading-relaxed font-sans">
                <strong>Warning:</strong> Restoring the database will overwrite all current data in the system (dies, machines, sets, users, history). Any modifications made since the backup was taken will be permanently lost.
              </div>

              <div>
                <p className="text-sm text-slate-300 mb-2">You are about to restore from:</p>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-white break-all flex items-center space-x-2">
                  <Database className="h-4 w-4 text-slate-500 flex-shrink-0" />
                  <span>{selectedBackup.filename}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Type <span className="text-rose-400 font-bold">RESTORE</span> to confirm:
                </label>
                <input 
                  type="text"
                  value={restoreConfirmInput}
                  onChange={(e) => setRestoreConfirmInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none placeholder-slate-700"
                  placeholder="Type RESTORE"
                />
              </div>

              <div className="border-t border-slate-800 pt-4 flex justify-end space-x-2">
                <button 
                  onClick={() => {
                    setShowRestoreConfirmModal(false)
                    setSelectedBackup(null)
                  }}
                  className="bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 px-5 py-2.5 rounded-xl text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (restoreConfirmInput === 'RESTORE') {
                      restoreBackupMutation.mutate(selectedBackup.filename)
                    }
                  }}
                  disabled={restoreConfirmInput !== 'RESTORE' || restoreBackupMutation.isPending}
                  className="bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800/40 disabled:text-rose-400/50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition shadow-md shadow-rose-500/10 hover:shadow-rose-500/20 disabled:shadow-none inline-flex items-center space-x-2"
                >
                  {restoreBackupMutation.isPending && (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  )}
                  <span>{restoreBackupMutation.isPending ? 'Restoring...' : 'Execute Restore'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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

// Session Timeout Warning Manager
function SessionTimeoutManager() {
  const { token, logout } = useAuth()
  const { request } = useApi()
  const navigate = useNavigate()
  const [showWarning, setShowWarning] = useState(false)
  const [countdown, setCountdown] = useState(120) // 2 minutes countdown
  const lastActivity = useRef(Date.now())

  // In production, idle limit is 28 minutes. Let's make it 28 * 60 * 1000.
  const IDLE_LIMIT = 28 * 60 * 1000
  const WARNING_LIMIT = 2 * 60 * 1000

  useEffect(() => {
    if (!token) {
      setShowWarning(false)
      return
    }

    const handleActivity = () => {
      lastActivity.current = Date.now()
    }

    // List of events indicating user activity
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach(event => window.addEventListener(event, handleActivity))

    const interval = setInterval(() => {
      const now = Date.now()
      const timeSinceLastActivity = now - lastActivity.current

      if (timeSinceLastActivity >= IDLE_LIMIT) {
        setShowWarning(true)
        const remaining = Math.max(0, Math.ceil((IDLE_LIMIT + WARNING_LIMIT - timeSinceLastActivity) / 1000))
        setCountdown(remaining)

        if (remaining <= 0) {
          clearInterval(interval)
          setShowWarning(false)
          logout()
          navigate('/login')
        }
      } else {
        setShowWarning(false)
      }
    }, 1000)

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity))
      clearInterval(interval)
    }
  }, [token, logout, navigate])

  const stayLoggedIn = async () => {
    try {
      await request('/api/auth/keep-alive/', { method: 'POST' })
      lastActivity.current = Date.now()
      setShowWarning(false)
    } catch (e) {
      // If session already expired, log out
      logout()
      navigate('/login')
      setShowWarning(false)
    }
  }

  if (!showWarning) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold font-heading text-slate-100 flex items-center gap-2">
          ⚠️ Session Timeout Warning
        </h3>
        <p className="mt-3 text-sm text-slate-300">
          You have been idle for a while. For security reasons, you will be logged out in <span className="text-green-400 font-mono font-bold">{countdown}</span> seconds.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => {
              logout()
              navigate('/login')
              setShowWarning(false)
            }}
            className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            Logout
          </button>
          <button
            onClick={stayLoggedIn}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-green-950/20 cursor-pointer"
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  )
}

// Main App Container
function AppContent() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!token) return

    // Establish EventSource connection
    const eventSource = new EventSource(`/api/events/?token=${encodeURIComponent(token)}`)

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        console.log('Real-time sync event received:', payload)
        
        // Invalidate all active queries to fetch fresh data from the server in the background
        queryClient.invalidateQueries()
      } catch (e) {
        console.error('Failed to parse event data:', e)
      }
    }

    eventSource.onerror = (err) => {
      console.error('EventSource connection error:', err)
    }

    return () => {
      eventSource.close()
    }
  }, [token, queryClient])

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500 selection:text-white">
      <Navbar />
      <SessionTimeoutManager />
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/dies/:id" element={<DieDetailPage />} />
        <Route path="/machines" element={<MachineSetsPage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/users" element={<UsersPage />} />
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
