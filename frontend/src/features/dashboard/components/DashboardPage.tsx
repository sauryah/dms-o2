import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStatsQuery, useSearchQuery } from '../hooks/useDashboard'
import { useQuery } from '@tanstack/react-query'
import { Search, SlidersHorizontal } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { useDebounce } from '../../../hooks/useDebounce'
import { useApi } from '../../../hooks/useApi'
import { RoundDieCard } from './RoundDieCard'
import { FlatDieCard } from './FlatDieCard'
import { Skeleton, CardSkeleton } from '../../../components/Skeleton'
import { EmptyState } from '../../../components/EmptyState'

interface StatusDistributionChartProps {
  stats: Record<string, number>;
}

function StatusDistributionChart({ stats }: StatusDistributionChartProps) {
  const total = Object.values(stats).reduce((sum, val) => sum + val, 0)
  const [hoveredSegment, setHoveredSegment] = useState<any>(null)
  const [isAnimated, setIsAnimated] = useState(false)

  useEffect(() => {
    // Delay slightly to trigger the SVG draw-in animation on mount
    const timer = setTimeout(() => setIsAnimated(true), 50)
    return () => clearTimeout(timer)
  }, [])

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
              {segments.map((seg) => {
                const active = hoveredSegment?.statusKey === seg.statusKey
                return (
                  <circle
                    key={seg.statusKey}
                    cx="70"
                    cy="70"
                    r="50"
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={active ? "13" : "10"}
                    strokeDasharray={isAnimated ? seg.strokeDasharray : `0 ${circumference}`}
                    strokeDashoffset={seg.strokeDashoffset}
                    transform="rotate(-90 70 70)"
                    strokeLinecap="round"
                    onMouseEnter={() => setHoveredSegment(seg)}
                    onMouseLeave={() => setHoveredSegment(null)}
                    className="transition-all duration-500 ease-out cursor-pointer"
                  />
                )
              })}
              
              {hoveredSegment ? (
                <>
                  <text 
                    x="70" 
                    y="63" 
                    textAnchor="middle" 
                    className="font-heading text-[8px] font-black uppercase tracking-wider transition-all duration-300"
                    style={{ fill: hoveredSegment.color }}
                  >
                    {hoveredSegment.statusKey}
                  </text>
                  <text 
                    x="70" 
                    y="82" 
                    textAnchor="middle" 
                    className="fill-white font-heading text-base font-extrabold transition-all duration-300"
                  >
                    {hoveredSegment.count}
                  </text>
                  <text 
                    x="70" 
                    y="95" 
                    textAnchor="middle" 
                    className="fill-slate-400 font-heading text-[9px] font-semibold transition-all duration-300"
                  >
                    {hoveredSegment.pct}%
                  </text>
                </>
              ) : (
                <>
                  <text x="70" y="65" textAnchor="middle" className="fill-slate-500 font-heading text-[9px] font-bold uppercase tracking-wider">
                    Total
                  </text>
                  <text x="70" y="86" textAnchor="middle" className="fill-white font-heading text-2xl font-black">
                    {total}
                  </text>
                </>
              )}
            </svg>
          </div>

          {/* Legend Grid */}
          <div className="flex-grow space-y-1.5 w-full sm:w-auto">
            {segments.map((seg) => {
              const active = hoveredSegment?.statusKey === seg.statusKey
              return (
                <div 
                  key={seg.statusKey} 
                  onMouseEnter={() => setHoveredSegment(seg)}
                  onMouseLeave={() => setHoveredSegment(null)}
                  className={`flex items-center justify-between text-xs py-1 px-2 rounded-lg border-b border-slate-800/40 transition-colors duration-250 cursor-pointer ${
                    active ? 'bg-slate-850/60 border-slate-800/80 text-white' : 'hover:bg-slate-800/20'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full dot-glow" style={{ backgroundColor: seg.color }} />
                    <span className={`font-semibold transition-colors duration-200 ${active ? 'text-white' : 'text-slate-300'}`}>{seg.statusKey}</span>
                  </div>
                  <div className="text-slate-400 font-mono">
                    <span className="text-slate-200 font-bold">{seg.count}</span>
                    <span className="text-[9px] text-slate-500 ml-1">({seg.pct}%)</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { role } = useAuth()
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
  const [activeIndex, setActiveIndex] = useState(-1)
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



  const { request } = useApi()
  const [trendBaseline, setTrendBaseline] = useState<any>(null)

  // Fetch overall statistics
  const { data: statsData, isLoading: isStatsLoading } = useStatsQuery()

  useEffect(() => {
    if (!statsData || !statsData.stats) return
    
    const savedStr = localStorage.getItem('dms_stats_snapshot_24h')
    const now = Date.now()
    
    if (savedStr) {
      try {
        const parsed = JSON.parse(savedStr)
        setTrendBaseline(parsed.stats)
        
        // Update baseline if older than 24 hours
        if (now - parsed.timestamp > 24 * 60 * 60 * 1000) {
          localStorage.setItem('dms_stats_snapshot_24h', JSON.stringify({
            timestamp: now,
            stats: statsData.stats
          }))
        }
      } catch (e) {
        console.error(e)
      }
    } else {
      localStorage.setItem('dms_stats_snapshot_24h', JSON.stringify({
        timestamp: now,
        stats: statsData.stats
      }))
      setTrendBaseline(statsData.stats)
    }
  }, [statsData])

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
  const [sortOption, setSortOption] = useState<'default' | 'size_asc' | 'size_desc'>('default')
  const sortedSearchDies = useMemo(() => {
    const raw = searchDiesData || []
    if (sortOption === 'default') return raw
    return [...raw].sort((a, b) => {
      const sizeA = a.die_type === 'ROUND' ? parseFloat(String(a.current_size || '0')) : parseFloat(String(a.current_width || '0'))
      const sizeB = b.die_type === 'ROUND' ? parseFloat(String(b.current_size || '0')) : parseFloat(String(b.current_width || '0'))
      return sortOption === 'size_asc' ? sizeA - sizeB : sizeB - sizeA
    })
  }, [searchDiesData, sortOption])
  const searchDies = sortedSearchDies

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
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
          <div className="bg-gradient-to-tr from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 shadow-lg text-center flex flex-col justify-between min-h-[100px]">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Dies</span>
            <span className="text-3xl font-extrabold text-white block mt-1">{totalCount}</span>
          </div>
          {Object.entries(stats).map(([statusKey, count]) => {
            const countVal = count as number
            const baselineCount = trendBaseline ? (trendBaseline[statusKey] as number || 0) : countVal
            const diff = countVal - baselineCount
            
            return (
              <div 
                key={statusKey}
                onClick={() => navigate(`/inventory?status=${statusKey}`)}
                className={`border rounded-2xl p-4 shadow-lg text-center flex flex-col justify-between min-h-[100px] cursor-pointer hover:scale-[1.02] transition-all duration-350 ${statusColors[statusKey]}`}
              >
                <div className="flex items-center justify-between opacity-80 gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">{statusKey}</span>
                  {diff > 0 ? (
                    <span className="text-emerald-400 font-bold flex items-center text-[10px] bg-emerald-500/10 px-1 rounded" title="Up from 24h baseline">
                      ▲ +{diff}
                    </span>
                  ) : diff < 0 ? (
                    <span className="text-rose-400 font-bold flex items-center text-[10px] bg-rose-550/10 px-1 rounded" title="Down from 24h baseline">
                      ▼ {diff}
                    </span>
                  ) : null}
                </div>
                <span className="text-3xl font-extrabold block mt-2 text-left">{String(count)}</span>
              </div>
            )
          })}
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
              <div className="relative flex-grow flex items-center" ref={searchRef}>
                <Search className="absolute left-4 h-6 w-6 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Search Die ID, Size, Casing, Machine, Set, Location, Status..."
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setShowDropdown(true); setActiveIndex(-1); }}
                  onFocus={() => { setShowDropdown(true); setActiveIndex(-1); }}
                  onKeyDown={(e) => {
                    if (!showDropdown || !searchDies || searchDies.length === 0) return;
                    const maxLen = Math.min(searchDies.length, 6);
                    if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
                      e.preventDefault();
                      setActiveIndex(prev => (prev < maxLen - 1 ? prev + 1 : prev));
                    } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
                      e.preventDefault();
                      setActiveIndex(prev => (prev > -1 ? prev - 1 : prev));
                    } else if (e.key === 'Enter') {
                      if (activeIndex >= 0 && activeIndex < maxLen) {
                        e.preventDefault();
                        const selectedDie = searchDies[activeIndex];
                        navigate(`/dies/${selectedDie.die_id}`);
                        setQ('');
                        setShowDropdown(false);
                        setActiveIndex(-1);
                      }
                    } else if (e.key === 'Escape') {
                      setShowDropdown(false);
                      setActiveIndex(-1);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-3.5 pl-14 pr-28 text-white placeholder-slate-500 focus:outline-none transition-all duration-300 text-lg shadow-inner"
                />
                {searchEnabled && (
                  <span className="absolute right-4 bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-semibold px-2.5 py-1 rounded-lg select-none">
                    {isSearchLoading ? '...' : `${searchDies.length} ${searchDies.length === 1 ? 'result' : 'results'}`}
                  </span>
                )}

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
                        {searchDies.slice(0, 6).map((die: any, index: number) => {
                          const sizeStr = die.die_type === 'ROUND' 
                            ? `${die.current_size || '—'} mm` 
                            : `${die.current_width || '—'} × ${die.current_thickness || '—'} mm`
                          const isHighlighted = index === activeIndex
                          return (
                            <div 
                              key={die.die_id}
                              onClick={() => {
                                navigate(`/dies/${die.die_id}`)
                                setQ('')
                                setShowDropdown(false)
                                setActiveIndex(-1)
                              }}
                              className={`p-4 cursor-pointer flex justify-between items-center transition duration-150 ${
                                isHighlighted ? 'bg-slate-800/80 border-l-2 border-blue-500' : 'hover:bg-slate-800'
                              }`}
                            >
                              <div className="flex flex-col text-left">
                                <span className="font-bold text-white text-sm">{sizeStr}</span>
                                <span className="text-xs text-slate-400 mt-0.5">
                                  {die.die_type} • {die.die_id} • {die.location || 'No Location'}
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
                        <div className="p-2 bg-slate-950/60 text-center text-slate-500 text-[10px] font-mono border-t border-slate-800/40">
                          Use <kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-300 text-[9px]">↓/↑</kbd> or <kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-300 text-[9px]">Tab</kbd> to navigate, <kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-300 text-[9px]">Enter</kbd> to open
                        </div>
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

      {/* Maintenance Queue & Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8 items-stretch">
        <div className="lg:col-span-2">
          <MaintenanceQueue />
        </div>
        <div className="lg:col-span-1">
          <RecentActivityFeed />
        </div>
      </div>

      {hasActiveFilter && (
        <div className="mt-8 border-t border-slate-800/80 pt-8 border-dashed">
          <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
            <h3 className="text-lg font-semibold text-slate-300">
              {q ? (
                <>Search Results for <span className="text-blue-400">"{q}"</span> <span className="text-xs font-normal text-slate-400 ml-2">({searchDies?.length || 0} matching {searchDies?.length === 1 ? 'die' : 'dies'} found)</span></>
              ) : (
                <>Filtered Search Results <span className="text-xs font-normal text-slate-400 ml-2">({searchDies?.length || 0} matching {searchDies?.length === 1 ? 'die' : 'dies'} found)</span></>
              )}
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl shadow-inner text-xs font-semibold text-slate-400">
                <span>Sort:</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as any)}
                  className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
                >
                  <option value="default" className="bg-slate-950 text-slate-350">Relevance</option>
                  <option value="size_asc" className="bg-slate-950 text-slate-350">Size: Small to Large</option>
                  <option value="size_desc" className="bg-slate-950 text-slate-350">Size: Large to Small</option>
                </select>
              </div>

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
          </div>

          {isSearchLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : searchDies?.length === 0 ? (
            <EmptyState
              title="No Dies Found"
              description="No dies in inventory match your active search term or filter criteria. Try clearing search filters."
            />
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

function MaintenanceQueue() {
  const { request } = useApi()
  const navigate = useNavigate()

  // Fetch all dies
  const { data: diesList, isLoading: isDiesLoading } = useQuery<any>({
    queryKey: ['dashboardDiesList'],
    queryFn: () => request('/api/go/search?limit=10000')
  })

  // Fetch history of status changes
  const { data: historyData, isLoading: isHistoryLoading } = useQuery<any>({
    queryKey: ['statusHistoryList'],
    queryFn: () => request('/api/history/dashboard/?field=status&page_size=100')
  })

  const maintenanceList = useMemo(() => {
    if (!diesList) return []
    const rawDies = Array.isArray(diesList) ? diesList : []
    
    // Filter dies in CLEANING, POLISHING, MAINTENANCE
    const filtered = rawDies.filter((d: any) => 
      ['CLEANING', 'POLISHING', 'MAINTENANCE'].includes(d.status)
    )

    const historyItems = Array.isArray(historyData) ? historyData : []

    return filtered.map((d: any) => {
      // Find latest status transition for this die in history
      const match = historyItems.find((h: any) => 
        h.die_id === d.die_id && 
        h.new_value === d.status
      )
      
      const transitionTime = match ? new Date(match.timestamp).getTime() : new Date().getTime()
      const durationMs = Date.now() - transitionTime
      
      // Format duration
      let durationStr = 'Just now'
      if (durationMs > 0) {
        const mins = Math.floor(durationMs / 60000)
        const hours = Math.floor(mins / 60)
        const days = Math.floor(hours / 24)
        
        if (days > 0) {
          durationStr = `${days}d ${hours % 24}h ago`
        } else if (hours > 0) {
          durationStr = `${hours}h ${mins % 60}m ago`
        } else if (mins > 0) {
          durationStr = `${mins}m ago`
        }
      }

      return {
        ...d,
        durationMs,
        durationStr,
      }
    }).sort((a: any, b: any) => b.durationMs - a.durationMs) // Longest duration in state first
  }, [diesList, historyData])

  if (isDiesLoading || isHistoryLoading) {
    return (
      <div className="glass-panel rounded-2xl p-6 shadow-xl border border-slate-800/80 h-full min-h-[300px]">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading mb-4">Maintenance Due Queue</h3>
        <CardSkeleton />
      </div>
    )
  }

  return (
    <div className="glass-panel rounded-2xl p-6 shadow-xl border border-slate-800/80 h-full min-h-[300px] flex flex-col justify-between">
      <div>
        <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading mb-1">Maintenance Due Queue</h3>
        <p className="text-slate-500 text-xs mb-4">Dies currently undergoing maintenance, sorted by duration in state.</p>
        
        {maintenanceList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="text-slate-500 text-sm">No dies currently in maintenance.</span>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[350px] overflow-y-auto pr-1">
            <table className="w-full text-left text-xs font-sans text-slate-350">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Die ID</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {maintenanceList.map((die: any) => (
                  <tr 
                    key={die.die_id}
                    onClick={() => navigate(`/dies/${die.die_id}`)}
                    className="hover:bg-slate-800/35 transition duration-150 cursor-pointer group"
                  >
                    <td className="py-3 px-3 font-bold text-white group-hover:text-blue-400 transition-colors font-mono">{die.die_id}</td>
                    <td className="py-3 px-3">{die.die_type}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                        die.status === 'CLEANING'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : die.status === 'POLISHING'
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {die.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400">{die.durationStr}</td>
                    <td className="py-3 px-3 text-slate-450">{die.location || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function RecentActivityFeed() {
  const { request } = useApi()
  const navigate = useNavigate()

  const { data: historyData, isLoading } = useQuery<any>({
    queryKey: ['dashboardRecentHistoryList'],
    queryFn: () => request('/api/history/dashboard/?page_size=10')
  })

  const historyItems = Array.isArray(historyData) ? historyData : []

  const getRelativeTime = (timestamp: string) => {
    const ms = Date.now() - new Date(timestamp).getTime()
    if (ms <= 0) return 'Just now'
    const mins = Math.floor(ms / 60000)
    const hours = Math.floor(mins / 60)
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (mins > 0) return `${mins}m ago`
    return 'Just now'
  }

  if (isLoading) {
    return (
      <div className="glass-panel rounded-2xl p-6 shadow-xl border border-slate-800/80 h-full min-h-[300px]">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading mb-4">Recent Activity</h3>
        <CardSkeleton />
      </div>
    )
  }

  return (
    <div className="glass-panel rounded-2xl p-6 shadow-xl border border-slate-800/80 h-full min-h-[300px] flex flex-col">
      <div>
        <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading mb-1">Recent Activity</h3>
        <p className="text-slate-500 text-xs mb-4">Last 10 updates performed across extrusion dies.</p>
      </div>

      <div className="flex-grow space-y-3.5 overflow-y-auto max-h-[330px] pr-2 scrollbar-thin">
        {historyItems.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No recent activity logged.
          </div>
        ) : (
          historyItems.map((item: any) => (
            <div 
              key={item.id} 
              onClick={() => navigate(`/dies/${item.die_id}`)}
              className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-850/50 transition duration-150 cursor-pointer group"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
              <div className="min-w-0 flex-grow text-xs leading-normal">
                <div className="flex justify-between items-baseline gap-2">
                  <span className="font-bold text-white group-hover:text-blue-400 transition-colors font-mono">{item.die_id}</span>
                  <span className="text-[9px] font-mono text-slate-500 shrink-0">{getRelativeTime(item.timestamp)}</span>
                </div>
                <p className="text-slate-350 mt-1">
                  Updated <span className="font-semibold text-slate-200">{item.field_name}</span> from <span className="font-mono text-slate-400">"{item.old_value || '—'}"</span> to <span className="font-mono text-slate-300 font-bold">"{item.new_value || '—'}"</span>
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Changed by <span className="font-semibold text-slate-400">{item.changed_by_username || 'System'}</span>
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

