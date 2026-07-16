import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useApi } from '../hooks/useApi'
import { DIE_STATUSES } from '../contracts/dieContracts'
import { Search, Compass, Settings, CornerDownLeft, Command, HelpCircle } from 'lucide-react'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

interface PaletteAction {
  id: string
  title: string
  subtitle?: string
  category: 'Navigation' | 'Status Updates' | 'Search Results'
  icon: React.ReactNode
  perform: () => void | Promise<void>
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const { role, token } = useAuth()
  const { request } = useApi()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  // Fetch search results from Go API with debounce
  useEffect(() => {
    if (!isOpen || !token) return
    if (query.trim().length === 0) {
      setSearchResults([])
      return
    }

    const controller = new AbortController()
    const fetchResults = async () => {
      try {
        const res = await request(`/api/go/search?q=${encodeURIComponent(query)}&limit=5`, { signal: controller.signal })
        const list = Array.isArray(res) ? res : (res?.results || [])
        setSearchResults(list)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error(err)
        }
      }
    }

    const timeout = setTimeout(fetchResults, 200)
    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [query, isOpen, token])

  // Build the list of static navigation commands
  const navigationCommands = useMemo<PaletteAction[]>(() => {
    const list: PaletteAction[] = [
      {
        id: 'nav-dashboard',
        title: 'Go to Dashboard',
        subtitle: 'View general statistics, activity logs, and status circles',
        category: 'Navigation',
        icon: <Compass className="h-4.5 w-4.5 text-blue-400" />,
        perform: () => { navigate('/'); onClose() }
      },
      {
        id: 'nav-wire-drawing-calculator',
        title: 'Go to Wire Drawing Calculator',
        subtitle: 'Precision elongation analysis and multi-pass schedule optimization',
        category: 'Navigation',
        icon: <Compass className="h-4.5 w-4.5 text-indigo-400" />,
        perform: () => { navigate('/wire-drawing-calculator'); onClose() }
      },
      {
        id: 'nav-inventory',
        title: 'Go to Die Inventory',
        subtitle: 'Browse and filter all extrusion dies in the catalog',
        category: 'Navigation',
        icon: <Compass className="h-4.5 w-4.5 text-indigo-400" />,
        perform: () => { navigate('/inventory'); onClose() }
      },
      {
        id: 'nav-machines',
        title: 'Go to Machine Sets',
        subtitle: 'Configure categories, machines, and die sets mapping',
        category: 'Navigation',
        icon: <Compass className="h-4.5 w-4.5 text-violet-400" />,
        perform: () => { navigate('/machines'); onClose() }
      },
      {
        id: 'nav-history',
        title: 'Go to Audit History',
        subtitle: 'View detailed system logs and operator audit trails',
        category: 'Navigation',
        icon: <Compass className="h-4.5 w-4.5 text-emerald-400" />,
        perform: () => { navigate('/history'); onClose() }
      }
    ]

    if (role === 'ROOT' || role === 'ADMIN') {
      list.push({
        id: 'nav-import',
        title: 'Go to Bulk Import',
        subtitle: 'Upload CSV/XLSX spreadsheets to create or update dies',
        category: 'Navigation',
        icon: <Compass className="h-4.5 w-4.5 text-amber-400" />,
        perform: () => { navigate('/import'); onClose() }
      })
    }

    if (role === 'ROOT') {
      list.push({
        id: 'nav-users',
        title: 'Go to Users & Backups',
        subtitle: 'Administer user accounts and manage database backups',
        category: 'Navigation',
        icon: <Compass className="h-4.5 w-4.5 text-rose-400" />,
        perform: () => { navigate('/users'); onClose() }
      })
    }

    return list
  }, [role, navigate, onClose])

  const canChangeStatus = role === 'ROOT' || role === 'ADMIN' || role === 'OPERATOR'
  const validStatuses = DIE_STATUSES

  // Compile final actions list
  const actions = useMemo<PaletteAction[]>(() => {
    const list: PaletteAction[] = []
    const qLower = query.toLowerCase().trim()

    // 1. Check if input is a status change shortcut: "set die R-101 to RUNNING"
    const statusMatch = query.match(/set\s+die\s+([A-Za-z0-9-_]+)\s+to\s+([A-Za-z]+)/i)
    if (statusMatch && canChangeStatus) {
      const targetDieId = statusMatch[1].toUpperCase()
      const targetStatus = statusMatch[2].toUpperCase()
      
      if (validStatuses.includes(targetStatus as any)) {
        list.push({
          id: `status-direct-${targetDieId}-${targetStatus}`,
          title: `Set die ${targetDieId} to ${targetStatus}`,
          subtitle: `Execute status change operation immediately`,
          category: 'Status Updates',
          icon: <Settings className="h-4.5 w-4.5 text-amber-400 animate-spin-slow" />,
          perform: async () => {
            try {
              await request(`/api/dies/${targetDieId}/`, {
                method: 'PATCH',
                body: JSON.stringify({ status: targetStatus })
              })
              showToast(`Successfully updated ${targetDieId} status to ${targetStatus}.`, 'success')
              onClose()
            } catch (err) {
              showToast(`Failed to update die status: ${(err as Error).message}`, 'error')
            }
          }
        })
      }
    }

    // 2. Add API Search Results
    searchResults.forEach((die: any) => {
      // Navigation result
      list.push({
        id: `search-die-${die.die_id}`,
        title: `Go to Die: ${die.die_id}`,
        subtitle: `Type: ${die.die_type} | Casing: ${die.casing || 'N/A'} | Status: ${die.status}`,
        category: 'Search Results',
        icon: <Search className="h-4.5 w-4.5 text-blue-400" />,
        perform: () => { navigate(`/dies/${die.die_id}`); onClose() }
      })

      // If operator/admin, append status change suggestions for this die
      if (canChangeStatus && qLower.includes(die.die_id.toLowerCase())) {
        validStatuses.forEach(st => {
          if (st !== die.status) {
            list.push({
              id: `status-${die.die_id}-${st}`,
              title: `Set ${die.die_id} to ${st}`,
              subtitle: `Change state from current status (${die.status})`,
              category: 'Status Updates',
              icon: <Settings className="h-4.5 w-4.5 text-violet-400" />,
              perform: async () => {
                try {
                  await request(`/api/dies/${die.die_id}/`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status: st })
                  })
                  showToast(`Successfully updated ${die.die_id} to ${st}.`, 'success')
                  onClose()
                } catch (err) {
                  showToast(`Failed to update die status: ${(err as Error).message}`, 'error')
                }
              }
            })
          }
        })
      }
    })

    // 3. Add Navigation Commands matching input
    const filteredNav = navigationCommands.filter(cmd => 
      cmd.title.toLowerCase().includes(qLower) || 
      cmd.subtitle?.toLowerCase().includes(qLower)
    )
    list.push(...filteredNav)

    return list
  }, [query, searchResults, navigationCommands, canChangeStatus, navigate, onClose, request, showToast])

  // Reset active selection when query changes
  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  // Keyboard navigation handler
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex(prev => (prev + 1) % Math.max(1, actions.length))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex(prev => (prev - 1 + actions.length) % Math.max(1, actions.length))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (actions[activeIndex]) {
          actions[activeIndex].perform()
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, actions, activeIndex, onClose])

  // Auto-scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[activeIndex] as HTMLElement
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [activeIndex])

  if (!isOpen) return null

  // Group actions by category
  const categories = ['Status Updates', 'Search Results', 'Navigation'] as const
  const groupedActions = categories.reduce((acc, cat) => {
    acc[cat] = actions.filter(a => a.category === cat)
    return acc
  }, {} as Record<string, PaletteAction[]>)

  // Flat actions list reference indexes for grouping layout selection mapping
  let flatIndexCounter = 0
  const renderedCategories = categories.map(cat => {
    const catActions = groupedActions[cat]
    if (catActions.length === 0) return null

    return (
      <div key={cat} className="space-y-1.5 pb-3">
        <h4 className="text-[10px] font-bold font-mono tracking-widest text-slate-500 uppercase px-4 pt-2">
          {cat}
        </h4>
        <div className="space-y-0.5">
          {catActions.map(action => {
            const currentFlatIndex = flatIndexCounter++
            const isActive = currentFlatIndex === activeIndex
            return (
              <div
                key={action.id}
                onClick={() => action.perform()}
                className={`flex items-center justify-between px-4 py-2.5 mx-2 rounded-xl transition-all duration-200 cursor-pointer select-none group border-l-4 ${
                  isActive
                    ? 'bg-blue-600/15 border-blue-500 text-white shadow-lg shadow-blue-950/20'
                    : 'border-transparent text-slate-350 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`p-1.5 rounded-lg transition-colors duration-200 ${
                    isActive ? 'bg-blue-500/20' : 'bg-slate-900'
                  }`}>
                    {action.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate tracking-wide leading-tight">
                      {action.title}
                    </p>
                    {action.subtitle && (
                      <p className="text-[11px] text-slate-400 truncate mt-0.5 font-medium leading-none">
                        {action.subtitle}
                      </p>
                    )}
                  </div>
                </div>
                {isActive && (
                  <span className="flex items-center gap-1 text-[10px] font-bold font-mono text-blue-400 bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20 shrink-0">
                    <span>Select</span>
                    <CornerDownLeft className="h-3 w-3" />
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  })

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/65 backdrop-blur-md pt-20 p-4">
      {/* Backdrop Dismiss Click Area */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />
      
      {/* Command Palette Card Box */}
      <div className="relative w-full max-w-2xl bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-250 flex flex-col max-h-[500px] border-blue-500/10 hover:border-blue-500/20 transition-colors">
        
        {/* Glowing Neon Accent Border line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 shadow-[0_1px_10px_rgba(59,130,246,0.5)]" />
        
        {/* Search Bar Input section */}
        <div className="flex items-center border-b border-slate-800/80 px-4 py-4.5 gap-3.5 relative z-10">
          <Search className="h-5 w-5 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or die ID (e.g. R-101, 'Set die R-101 to RUNNING')..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none text-base font-medium tracking-wide"
          />
          <button 
            onClick={onClose}
            className="p-1 text-slate-500 hover:text-slate-350 rounded-lg hover:bg-slate-800/60 transition cursor-pointer"
          >
            <span className="text-xs font-mono font-bold border border-slate-800 px-1.5 py-0.5 rounded bg-slate-950/80">ESC</span>
          </button>
        </div>

        {/* Content Action Items List */}
        <div className="flex-1 overflow-y-auto py-2 divide-y divide-slate-800/30" ref={listRef}>
          {actions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <HelpCircle className="h-10 w-10 text-slate-500 animate-pulse mb-3" />
              <p className="text-sm font-bold text-slate-300">No matching commands or dies found</p>
              <p className="text-xs text-slate-450 mt-1 max-w-xs leading-normal">
                Try searching for existing die IDs, common navigation keywords, or use the status syntax: 'Set die ID to STATUS'.
              </p>
            </div>
          ) : (
            renderedCategories
          )}
        </div>

        {/* Footer shortcuts helper panel */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800/80 bg-slate-950/40 text-[11px] font-medium font-sans text-slate-450 tracking-wide select-none">
          <div className="flex items-center gap-4.5">
            <span className="flex items-center gap-1"><span className="border border-slate-800 px-1.5 py-0.5 rounded bg-slate-900 font-mono text-[9px]">↑↓</span> Move</span>
            <span className="flex items-center gap-1"><span className="border border-slate-800 px-1.5 py-0.5 rounded bg-slate-900 font-mono text-[9px]">Enter</span> Select</span>
          </div>
          <div className="flex items-center gap-1">
            <Command className="h-3 w-3" />
            <span>Search Command Palette</span>
          </div>
        </div>
      </div>
    </div>
  )
}
