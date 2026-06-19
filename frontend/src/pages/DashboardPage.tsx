import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStatsQuery, useSearchQuery } from '../hooks/useDies'
import { Search, SlidersHorizontal } from 'lucide-react'
import { useAuth, useDebounce } from '../App'
import { RoundDieCard } from '../RoundDieCard'
import { FlatDieCard } from '../FlatDieCard'

interface StatusDistributionChartProps {
  stats: Record<string, number>;
}

function StatusDistributionChart({ stats }: StatusDistributionChartProps) {
  const total = Object.values(stats).reduce((sum, val) => sum + val, 0)

  const statusThemeColors: Record<string, string> = {
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
                >
                  <title>{`${seg.statusKey}: ${seg.count} (${seg.pct}%)`}</title>
                </circle>
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
                  <span className="w-2 h-2 rounded-full dot-glow" style={{ backgroundColor: seg.color }} />
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

export function DashboardPage() {
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
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch overall statistics
  const { data: statsData, isLoading: isStatsLoading } = useStatsQuery()

  // Fetch fuzzy search results if search query or filters exist
  const searchEnabled = !!(debouncedQ || dieType || statusVal || casing || sizeMin || sizeMax || widthMin || widthMax || thickMin || thickMax)
  const { data: searchDiesData, isLoading: isSearchLoading } = useSearchQuery({
    q: debouncedQ,
    die_type: dieType,
    status: statusVal,
    casing,
    size_min: sizeMin,
    size_max: sizeMax,
    width_min: widthMin,
    width_max: widthMax,
    thick_min: thickMin,
    thick_max: thickMax,
  }, searchEnabled)
  const searchDies = searchDiesData || []

  const hasActiveFilter = !!(q || dieType || statusVal || casing || sizeMin || sizeMax || widthMin || widthMax || thickMin || thickMax)

  const totalCount = statsData ? statsData.total : 0
  const stats = statsData ? statsData.stats : {
    AVAILABLE: 0,
    RUNNING: 0,
    CLEANING: 0,
    POLISHING: 0,
    DAMAGED: 0,
    SCRAPPED: 0,
    MISSING: 0
  }

  const statusColors: Record<string, string> = {
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
              <span className="text-3xl font-extrabold block mt-1">{String(count)}</span>
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
              <p className="text-slate-400 text-sm mt-1">Search examples: 12345, ceramic, toolroom, polishing, machine-1 (use quotes for exact match, e.g. "2.500")</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-grow" ref={searchRef}>
                <Search className="absolute left-4 top-3.5 h-6 w-6 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Search Die ID, Size, Casing, Machine, Set, Location, Status..."
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
                        {searchDies.slice(0, 6).map((die: any) => {
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
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="SCRAP">Scrap</option>
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
              {searchDies?.map((die: any) => 
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
