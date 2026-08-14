import { useState, useEffect, useRef, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStatsQuery, useSearchQuery } from '../hooks/useDashboard'
import { useQuery } from '@tanstack/react-query'
import { Search, SlidersHorizontal } from 'lucide-react'

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
    AVAILABLE: '#10b981',
    RUNNING: '#3b82f6',
    CLEANING: '#f59e0b',
    POLISHING: '#8b5cf6',
    DAMAGED: '#f97316',
    SCRAPPED: '#ef4444',
    MISSING: '#6b7280',
    MAINTENANCE: '#f59e0b',
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
        color: statusThemeColors[statusKey] || '#6b7280'
      }
    })

  return (
    <div className="bg-[#0f0f0f] rounded-sm p-4 border border-[#1a1a1a] flex flex-col justify-between h-full min-h-[260px] font-mono">
      <div>
        <h3 className="text-xs font-medium text-[#e4e4e4] uppercase tracking-[0.05em] mb-0.5">02 STATUS DISTRIBUTION</h3>
        <p className="text-[#6b7280] text-[11px] mb-3">Visual breakdown of registry assets.</p>
      </div>

      {total === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center py-6">
          <div className="w-12 h-12 border border-[#2a2a2a] border-t-blue-500 animate-spin mb-3" />
          <span className="text-[#6b7280] text-xs font-mono uppercase">No dies loaded</span>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-around gap-4 flex-grow">
          {/* Donut Chart SVG */}
          <div className="relative w-28 h-28 shrink-0">
            <svg className="w-full h-full" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r="50" fill="none" stroke="#141414" strokeWidth="10" />
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
                    strokeWidth={active ? "12" : "10"}
                    strokeDasharray={isAnimated ? seg.strokeDasharray : `0 ${circumference}`}
                    strokeDashoffset={seg.strokeDashoffset}
                    transform="rotate(-90 70 70)"
                    strokeLinecap="butt"
                    onMouseEnter={() => setHoveredSegment(seg)}
                    onMouseLeave={() => setHoveredSegment(null)}
                    className="transition-all duration-300 ease-out cursor-pointer"
                  />
                )
              })}
              
              {hoveredSegment ? (
                <>
                  <text 
                    x="70" 
                    y="63" 
                    textAnchor="middle" 
                    className="text-[8px] font-mono font-medium uppercase tracking-wider"
                    style={{ fill: hoveredSegment.color }}
                  >
                    {hoveredSegment.statusKey}
                  </text>
                  <text 
                    x="70" 
                    y="82" 
                    textAnchor="middle" 
                    className="fill-[#e4e4e4] font-mono text-sm font-bold tabular-nums"
                  >
                    {hoveredSegment.count}
                  </text>
                  <text 
                    x="70" 
                    y="95" 
                    textAnchor="middle" 
                    className="fill-[#6b7280] font-mono text-[9px] tabular-nums"
                  >
                    {hoveredSegment.pct}%
                  </text>
                </>
              ) : (
                <>
                  <text x="70" y="65" textAnchor="middle" className="fill-[#6b7280] font-mono text-[9px] uppercase tracking-wider">
                    TOTAL
                  </text>
                  <text x="70" y="86" textAnchor="middle" className="fill-[#e4e4e4] font-mono text-xl font-bold tabular-nums">
                    {total}
                  </text>
                </>
              )}
            </svg>
          </div>

          {/* Legend Grid */}
          <div className="flex-grow space-y-1 w-full sm:w-auto font-mono">
            {segments.map((seg) => {
              const active = hoveredSegment?.statusKey === seg.statusKey
              return (
                <div 
                  key={seg.statusKey} 
                  onMouseEnter={() => setHoveredSegment(seg)}
                  onMouseLeave={() => setHoveredSegment(null)}
                  className={`flex items-center justify-between text-xs py-0.5 px-1.5 rounded-sm border-b border-[#1a1a1a] transition-colors cursor-pointer ${
                    active ? 'bg-[#141414] text-[#e4e4e4]' : 'hover:bg-[#141414] text-[#6b7280]'
                  }`}
                >
                  <div className="flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                    <span className={`text-[11px] uppercase tracking-wider ${active ? 'text-[#e4e4e4]' : 'text-[#6b7280]'}`}>{seg.statusKey}</span>
                  </div>
                  <div className="font-mono text-xs tabular-nums">
                    <span className="text-[#e4e4e4] font-medium">{seg.count}</span>
                    <span className="text-[10px] text-[#6b7280] ml-1">({seg.pct}%)</span>
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

  const [page, setPage] = useState(1)
  const pageSize = 24

  useEffect(() => {
    setPage(1)
  }, [debouncedQ, dieType, statusVal, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax])

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
    limit: String(pageSize),
    offset: String((page - 1) * pageSize),
  }, searchEnabled)
  const [sortOption, setSortOption] = useState<'default' | 'size_asc' | 'size_desc'>('default')
  const sortedSearchDies = useMemo(() => {
    const raw = searchDiesData?.results || []
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

  const statusBorderMap: Record<string, string> = {
    AVAILABLE: 'border-l-[#10b981]',
    RUNNING: 'border-l-[#3b82f6]',
    CLEANING: 'border-l-[#f59e0b]',
    POLISHING: 'border-l-[#8b5cf6]',
    DAMAGED: 'border-l-[#f97316]',
    SCRAPPED: 'border-l-[#ef4444]',
    MISSING: 'border-l-[#6b7280]',
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 font-mono">
      <div className="mb-5 pb-3 border-b border-[#2a2a2a] text-left">
        <h1 className="text-base md:text-lg font-medium text-[#e4e4e4] uppercase tracking-[0.05em]">
          01 DIE TRACKING DASHBOARD
        </h1>
        <p className="text-xs text-[#6b7280] mt-0.5">Overview of facility inventory and search portal.</p>
      </div>

      {isStatsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-5">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-5">
          <div className="bg-[#0f0f0f] border border-[#1a1a1a] border-l-2 border-l-blue-500 rounded-sm p-3 text-left flex flex-col justify-between min-h-[80px]">
            <span className="text-[#6b7280] text-[10px] uppercase tracking-wider font-mono">TOTAL DIES</span>
            <span className="text-xl font-bold font-mono text-[#e4e4e4] tabular-nums block mt-1">{totalCount}</span>
          </div>
          {Object.entries(stats).map(([statusKey, count]) => {
            const countVal = count as number
            const baselineCount = trendBaseline ? (trendBaseline[statusKey] as number || 0) : countVal
            const diff = countVal - baselineCount

            return (
              <div
                key={statusKey}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/inventory?status=${statusKey}`)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/inventory?status=${statusKey}`) } }}
                className={`border border-[#1a1a1a] hover:border-[#2a2a2a] border-l-2 ${statusBorderMap[statusKey] || 'border-l-[#6b7280]'} rounded-sm p-3 text-left flex flex-col justify-between min-h-[80px] cursor-pointer transition-colors bg-[#0f0f0f] hover:bg-[#141414] focus-ring`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] uppercase tracking-wider font-mono text-[#6b7280]">{statusKey}</span>
                  {diff > 0 ? (
                    <span className="text-emerald-400 font-bold flex items-center text-[9px] bg-[#141414] px-1 py-0.2 rounded-sm font-mono tabular-nums" title="Up from 24h baseline">
                      ▲ {diff}
                    </span>
                  ) : diff < 0 ? (
                    <span className="text-red-400 font-bold flex items-center text-[9px] bg-[#141414] px-1 py-0.2 rounded-sm font-mono tabular-nums" title="Down from 24h baseline">
                      ▼ {Math.abs(diff)}
                    </span>
                  ) : null}
                </div>
                <span className="text-xl font-bold font-mono text-[#e4e4e4] tabular-nums block mt-1">{String(count)}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Dashboard Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5 items-stretch">
        
        {/* Search Panel */}
        <div className="lg:col-span-2">
          <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-5 h-full flex flex-col justify-center font-mono">
            <div className="text-left mb-4">
              <h2 className="text-xs font-medium text-[#e4e4e4] uppercase tracking-[0.05em]">FIND A DIE</h2>
              <p className="text-[#6b7280] text-[11px] mt-0.5">Search by ID, casing, location, or status (e.g. R-101, 25x10, "2.500")</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-grow flex items-center" ref={searchRef}>
                <Search className="absolute left-3 h-4 w-4 text-[#6b7280]" />
                <input 
                  type="text" 
                  placeholder="SEARCH DIE ID, SIZE, CASING, MACHINE..."
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
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm py-2 pl-9 pr-24 text-[#e4e4e4] placeholder-[#404040] focus:outline-none transition-colors text-xs font-mono uppercase"
                />
                {searchEnabled && (
                  <span className="absolute right-2 bg-[#141414] border border-[#2a2a2a] text-blue-400 text-[10px] px-2 py-0.5 rounded-sm select-none font-mono">
                    {isSearchLoading ? '...' : `${searchDiesData?.total || 0} RESULTS`}
                  </span>
                )}

                {/* Search Dropdown Suggestions */}
                {showDropdown && q.trim() && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded-sm z-50 max-h-72 overflow-y-auto divide-y divide-[#1a1a1a] font-mono">
                    {isSearchLoading ? (
                      <div className="p-3 text-center text-[#6b7280] text-xs flex items-center justify-center space-x-2">
                        <div className="animate-spin h-3.5 w-3.5 border border-[#2a2a2a] border-t-blue-500"></div>
                        <span>Searching...</span>
                      </div>
                    ) : !searchDies || searchDies.length === 0 ? (
                      <div className="p-3 text-center text-[#6b7280] text-xs">
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
                              className={`p-2.5 cursor-pointer flex justify-between items-center transition-colors ${
                                isHighlighted ? 'bg-[#141414] border-l-2 border-blue-500' : 'hover:bg-[#141414]'
                              }`}
                            >
                              <div className="flex flex-col text-left">
                                <span className="font-bold text-[#e4e4e4] text-xs">{sizeStr}</span>
                                <span className="text-[10px] text-[#6b7280] mt-0.5">
                                  {die.die_type} • {die.die_id} • {die.rack_name && die.shelf ? `${die.rack_name} - S${die.shelf}` : 'NO LOCATION'}
                                </span>
                              </div>
                              <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider rounded-sm border border-[#2a2a2a] bg-[#141414] text-[#e4e4e4]">
                                {die.status}
                              </span>
                            </div>
                          )
                        })}
                        <div className="p-1.5 bg-[#0a0a0a] text-center text-[#6b7280] text-[9px] font-mono border-t border-[#1a1a1a]">
                          Use <kbd className="border border-[#2a2a2a] px-1 py-0.2 rounded-sm bg-[#141414] text-[#e4e4e4]">↓/↑</kbd> to navigate, <kbd className="border border-[#2a2a2a] px-1 py-0.2 rounded-sm bg-[#141414] text-[#e4e4e4]">ENTER</kbd> to open
                        </div>
                        {searchDiesData && searchDiesData.total > 6 && (
                          <div
                            onClick={() => {
                              setShowDropdown(false)
                              document.getElementById('search-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }}
                            className="p-2 bg-[#0a0a0a] text-center text-xs text-blue-400 hover:text-blue-300 font-mono uppercase cursor-pointer"
                          >
                            View all {searchDiesData.total} results below ↓
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center justify-center space-x-1.5 px-3 py-2 rounded-sm border text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                  showFilters 
                    ? 'bg-[#141414] text-blue-400 border-blue-500/50' 
                    : 'bg-[#141414] text-[#6b7280] hover:text-[#e4e4e4] border-[#2a2a2a]'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Filters</span>
              </button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-3 border-t border-[#1a1a1a] font-mono text-xs">
                <div>
                  <label className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">Type</label>
                  <select 
                    value={dieType}
                    onChange={(e) => { setDieType(e.target.value); setSizeMin(''); setSizeMax(''); setWidthMin(''); setWidthMax(''); setThickMin(''); setThickMax(''); }}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2 text-[#e4e4e4] focus:border-blue-500 focus:outline-none font-mono"
                  >
                    <option value="">ALL TYPES</option>
                    <option value="ROUND">ROUND</option>
                    <option value="FLAT">FLAT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">Status</label>
                  <select 
                    value={statusVal}
                    onChange={(e) => setStatusVal(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2 text-[#e4e4e4] focus:border-blue-500 focus:outline-none font-mono"
                  >
                    <option value="">ALL STATUSES</option>
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="RUNNING">RUNNING</option>
                    <option value="CLEANING">CLEANING</option>
                    <option value="POLISHING">POLISHING</option>
                    <option value="DAMAGED">DAMAGED</option>
                    <option value="SCRAPPED">SCRAPPED</option>
                    <option value="MISSING">MISSING</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">Casing</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 25x10"
                    value={casing}
                    onChange={(e) => setCasing(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2 text-[#e4e4e4] focus:border-blue-500 focus:outline-none font-mono"
                  />
                </div>

                {dieType === 'ROUND' && (
                  <div>
                    <label className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">Size Range (mm)</label>
                    <div className="flex gap-1.5">
                      <input 
                        type="number" 
                        step="0.001"
                        placeholder="MIN"
                        value={sizeMin}
                        onChange={(e) => setSizeMin(e.target.value)}
                        className="w-1/2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2 text-[#e4e4e4] focus:outline-none font-mono"
                      />
                      <input 
                        type="number" 
                        step="0.001"
                        placeholder="MAX"
                        value={sizeMax}
                        onChange={(e) => setSizeMax(e.target.value)}
                        className="w-1/2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2 text-[#e4e4e4] focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                )}

                {dieType === 'FLAT' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">Width (mm)</label>
                      <div className="flex gap-1.5">
                        <input 
                          type="number" 
                          step="0.001"
                          placeholder="MIN"
                          value={widthMin}
                          onChange={(e) => setWidthMin(e.target.value)}
                          className="w-1/2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2 text-[#e4e4e4] focus:outline-none font-mono"
                        />
                        <input 
                          type="number" 
                          step="0.001"
                          placeholder="MAX"
                          value={widthMax}
                          onChange={(e) => setWidthMax(e.target.value)}
                          className="w-1/2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2 text-[#e4e4e4] focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">Thickness (mm)</label>
                      <div className="flex gap-1.5">
                        <input 
                          type="number" 
                          step="0.001"
                          placeholder="MIN"
                          value={thickMin}
                          onChange={(e) => setThickMin(e.target.value)}
                          className="w-1/2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2 text-[#e4e4e4] focus:outline-none font-mono"
                        />
                        <input 
                          type="number" 
                          step="0.001"
                          placeholder="MAX"
                          value={thickMax}
                          onChange={(e) => setThickMax(e.target.value)}
                          className="w-1/2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2 text-[#e4e4e4] focus:outline-none font-mono"
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5 items-stretch">
        <div className="lg:col-span-2">
          <MaintenanceQueue />
        </div>
        <div className="lg:col-span-1">
          <RecentActivityFeed />
        </div>
      </div>

      {hasActiveFilter && (
        <div id="search-results" className="mt-6 border-t border-[#2a2a2a] pt-5">
          <div className="mb-4 flex justify-between items-center flex-wrap gap-3 font-mono">
            <h3 className="text-xs font-medium uppercase tracking-[0.05em] text-[#e4e4e4]">
              {q ? (
                <>SEARCH RESULTS FOR <span className="text-blue-400">"{q}"</span> <span className="text-[10px] text-[#6b7280] ml-2">({searchDiesData?.total || 0} MATCHING DIES)</span></>
              ) : (
                <>FILTERED RESULTS <span className="text-[10px] text-[#6b7280] ml-2">({searchDiesData?.total || 0} MATCHING DIES)</span></>
              )}
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-[#0f0f0f] border border-[#2a2a2a] px-2.5 py-1 rounded-sm text-xs text-[#6b7280]">
                <span className="uppercase text-[10px]">SORT:</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as any)}
                  className="bg-transparent text-[#e4e4e4] font-mono focus:outline-none cursor-pointer uppercase text-xs"
                >
                  <option value="default" className="bg-[#0f0f0f] text-[#e4e4e4]">RELEVANCE</option>
                  <option value="size_asc" className="bg-[#0f0f0f] text-[#e4e4e4]">SIZE: ASC</option>
                  <option value="size_desc" className="bg-[#0f0f0f] text-[#e4e4e4]">SIZE: DESC</option>
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
                className="text-xs text-blue-400 hover:opacity-80 uppercase font-mono"
              >
                View in Inventory →
              </Link>
            </div>
          </div>

          {isSearchLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : searchDiesData?.results?.length === 0 ? (
            <EmptyState
              title="NO DIES FOUND"
              description="No dies in inventory match your active search term or filter criteria. Try clearing search filters."
            />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

              {/* Pagination Controls */}
              {searchDiesData && searchDiesData.total > pageSize && (
                <div className="mt-5 flex justify-between items-center bg-[#0f0f0f] border border-[#1a1a1a] px-3 py-2 rounded-sm flex-wrap gap-3 font-mono">
                  <div className="text-xs text-[#6b7280]">
                    SHOWING <span className="font-bold text-[#e4e4e4] tabular-nums">{((page - 1) * pageSize) + 1}</span> TO{' '}
                    <span className="font-bold text-[#e4e4e4] tabular-nums">
                      {Math.min(page * pageSize, searchDiesData.total)}
                    </span>{' '}
                    OF <span className="font-bold text-[#e4e4e4] tabular-nums">{searchDiesData.total}</span> DIES
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={page === 1}
                      onClick={() => {
                        setPage(prev => Math.max(1, prev - 1))
                        window.scrollTo({ top: 350, behavior: 'smooth' })
                      }}
                      className="px-3 py-1 bg-[#141414] hover:bg-[#1f1f1f] disabled:opacity-40 text-xs font-mono uppercase text-[#e4e4e4] rounded-sm transition-colors border border-[#2a2a2a] cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      disabled={page * pageSize >= searchDiesData.total}
                      onClick={() => {
                        setPage(prev => prev + 1)
                        window.scrollTo({ top: 350, behavior: 'smooth' })
                      }}
                      className="px-3 py-1 bg-[#141414] hover:bg-[#1f1f1f] disabled:opacity-40 text-xs font-mono uppercase text-[#e4e4e4] rounded-sm transition-colors border border-[#2a2a2a] cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
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
    }).sort((a: any, b: any) => b.durationMs - a.durationMs)
  }, [diesList, historyData])

  if (isDiesLoading || isHistoryLoading) {
    return (
      <div className="bg-[#0f0f0f] rounded-sm p-4 border border-[#1a1a1a] h-full min-h-[280px] font-mono">
        <h3 className="text-xs font-medium text-[#e4e4e4] uppercase tracking-[0.05em] mb-3">03 MAINTENANCE DUE QUEUE</h3>
        <CardSkeleton />
      </div>
    )
  }

  return (
    <div className="bg-[#0f0f0f] rounded-sm p-4 border border-[#1a1a1a] h-full min-h-[280px] flex flex-col justify-between font-mono">
      <div>
        <h3 className="text-xs font-medium text-[#e4e4e4] uppercase tracking-[0.05em] mb-0.5">03 MAINTENANCE DUE QUEUE</h3>
        <p className="text-[#6b7280] text-[11px] mb-3">Dies currently undergoing maintenance, sorted by duration.</p>
        
        {maintenanceList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <span className="text-[#6b7280] text-xs uppercase">No dies currently in maintenance.</span>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-left text-xs font-mono text-[#e4e4e4]">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-[#6b7280] uppercase tracking-wider text-[11px]">
                  <th className="py-2 px-2.5">DIE ID</th>
                  <th className="py-2 px-2.5">TYPE</th>
                  <th className="py-2 px-2.5">STATUS</th>
                  <th className="py-2 px-2.5">DURATION</th>
                  <th className="py-2 px-2.5">LOCATION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {maintenanceList.map((die: any) => (
                  <tr
                    key={die.die_id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/dies/${die.die_id}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/dies/${die.die_id}`) } }}
                    className="hover:bg-[#1a1a1a] transition-colors cursor-pointer group"
                  >
                    <td className="py-2 px-2.5 font-bold text-[#e4e4e4] group-hover:text-blue-400 transition-colors font-mono">{die.die_id}</td>
                    <td className="py-2 px-2.5 text-[#6b7280]">{die.die_type}</td>
                    <td className="py-2 px-2.5">
                      <span className="px-1.5 py-0.5 rounded-sm border text-[10px] font-mono uppercase bg-[#141414] border-[#2a2a2a] text-[#e4e4e4]">
                        {die.status}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 font-mono text-[#6b7280] tabular-nums">{die.durationStr}</td>
                    <td className="py-2 px-2.5 text-[#6b7280]">{die.rack_name && die.shelf ? `${die.rack_name} - S${die.shelf}` : '—'}</td>
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
      <div className="bg-[#0f0f0f] rounded-sm p-4 border border-[#1a1a1a] h-full min-h-[280px] font-mono">
        <h3 className="text-xs font-medium text-[#e4e4e4] uppercase tracking-[0.05em] mb-3">04 RECENT ACTIVITY</h3>
        <CardSkeleton />
      </div>
    )
  }

  return (
    <div className="bg-[#0f0f0f] rounded-sm p-4 border border-[#1a1a1a] h-full min-h-[280px] flex flex-col font-mono">
      <div>
        <h3 className="text-xs font-medium text-[#e4e4e4] uppercase tracking-[0.05em] mb-0.5">04 RECENT ACTIVITY</h3>
        <p className="text-[#6b7280] text-[11px] mb-3">Last 10 updates across registry.</p>
      </div>

      <div className="flex-grow space-y-2 overflow-y-auto max-h-[300px] pr-1">
        {historyItems.length === 0 ? (
          <div className="text-center py-8 text-[#6b7280] text-xs">
            No recent activity logged.
          </div>
        ) : (
          historyItems.map((item: any) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/dies/${item.die_id}`)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/dies/${item.die_id}`) } }}
              className="flex items-start gap-2 p-1.5 rounded-sm hover:bg-[#141414] transition-colors cursor-pointer group border-b border-[#1a1a1a]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 shrink-0" />
              <div className="min-w-0 flex-grow text-xs leading-normal font-mono">
                <div className="flex justify-between items-baseline gap-2">
                  <span className="font-bold text-[#e4e4e4] group-hover:text-blue-400 transition-colors font-mono">{item.die_id}</span>
                  <span className="text-[9px] font-mono text-[#6b7280] shrink-0">{getRelativeTime(item.timestamp)}</span>
                </div>
                <p className="text-[#6b7280] mt-0.5 text-[11px]">
                  {item.field_name}: <span className="text-[#404040]">"{item.old_value || '—'}"</span> → <span className="text-[#e4e4e4] font-medium">"{item.new_value || '—'}"</span>
                </p>
                <p className="text-[9px] text-[#404040] mt-0.5">
                  BY <span className="text-[#6b7280]">{item.changed_by_username || 'System'}</span>
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
