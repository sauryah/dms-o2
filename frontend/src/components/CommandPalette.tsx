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
        title: 'GO TO DASHBOARD',
        subtitle: 'View general statistics, activity logs, and status circles',
        category: 'Navigation',
        icon: <Compass className="h-3.5 w-3.5 text-blue-400" />,
        perform: () => { navigate('/'); onClose() }
      },
      {
        id: 'nav-wire-drawing-calculator',
        title: 'GO TO WIRE DRAWING CALCULATOR',
        subtitle: 'Precision elongation analysis and multi-pass schedule optimization',
        category: 'Navigation',
        icon: <Compass className="h-3.5 w-3.5 text-blue-400" />,
        perform: () => { navigate('/wire-drawing-calculator'); onClose() }
      },
      {
        id: 'nav-inventory',
        title: 'GO TO DIE INVENTORY',
        subtitle: 'Browse and filter all extrusion dies in the catalog',
        category: 'Navigation',
        icon: <Compass className="h-3.5 w-3.5 text-blue-400" />,
        perform: () => { navigate('/inventory'); onClose() }
      },
      {
        id: 'nav-machines',
        title: 'GO TO MACHINE SETS',
        subtitle: 'Configure categories, machines, and die sets mapping',
        category: 'Navigation',
        icon: <Compass className="h-3.5 w-3.5 text-blue-400" />,
        perform: () => { navigate('/machines'); onClose() }
      }
    ]

    if (role === 'ROOT' || role === 'ADMIN') {
      list.push({
        id: 'nav-history',
        title: 'GO TO AUDIT HISTORY',
        subtitle: 'View detailed system logs and operator audit trails',
        category: 'Navigation',
        icon: <Compass className="h-3.5 w-3.5 text-emerald-400" />,
        perform: () => { navigate('/history'); onClose() }
      })
      list.push({
        id: 'nav-import',
        title: 'GO TO BULK IMPORT',
        subtitle: 'Upload CSV/XLSX spreadsheets to create or update dies',
        category: 'Navigation',
        icon: <Compass className="h-3.5 w-3.5 text-amber-400" />,
        perform: () => { navigate('/import'); onClose() }
      })
    }

    if (role === 'ROOT') {
      list.push({
        id: 'nav-users',
        title: 'GO TO USERS & BACKUPS',
        subtitle: 'Administer user accounts and manage database backups',
        category: 'Navigation',
        icon: <Compass className="h-3.5 w-3.5 text-red-400" />,
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
          title: `SET DIE ${targetDieId} TO ${targetStatus}`,
          subtitle: `Execute status change operation immediately`,
          category: 'Status Updates',
          icon: <Settings className="h-3.5 w-3.5 text-amber-400" />,
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
        title: `DIE ${die.die_id}`,
        subtitle: `Type: ${die.die_type} | Casing: ${die.casing || 'N/A'} | Status: ${die.status}`,
        category: 'Search Results',
        icon: <Search className="h-3.5 w-3.5 text-blue-400" />,
        perform: () => { navigate(`/dies/${die.die_id}`); onClose() }
      })

      // Only show per-die status change suggestions when user types "status:" trigger
      if (canChangeStatus && /status\s*:/i.test(query)) {
        validStatuses.forEach(st => {
          if (st !== die.status) {
            list.push({
              id: `status-${die.die_id}-${st}`,
              title: `SET ${die.die_id} TO ${st}`,
              subtitle: `Change state from current status (${die.status})`,
              category: 'Status Updates',
              icon: <Settings className="h-3.5 w-3.5 text-amber-400" />,
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
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.getAttribute('contenteditable') === 'true') {
        if (e.key === 'Escape') {
          e.preventDefault()
          onClose()
        }
        return
      }

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

  // Group actions by category
  const categories = ['Navigation', 'Search Results', 'Status Updates'] as const
  const categoryLabels = {
    'Navigation': '01 NAVIGATION',
    'Search Results': '02 SEARCH RESULTS',
    'Status Updates': '03 STATUS UPDATES'
  }
  const groupedActions = categories.reduce((acc, cat) => {
    acc[cat] = actions.filter(a => a.category === cat)
    return acc
  }, {} as Record<string, PaletteAction[]>)

  // Compute stable per-category offset so each action gets a deterministic flat index
  const categoryOffsets = useMemo(() => {
    const offsets: Record<string, number> = {}
    let counter = 0
    for (const cat of categories) {
      offsets[cat] = counter
      counter += groupedActions[cat].length
    }
    return offsets
  }, [groupedActions])

  if (!isOpen) return null

  const renderedCategories = categories.map(cat => {
    const catActions = groupedActions[cat]
    if (catActions.length === 0) return null
    const catOffset = categoryOffsets[cat]

    return (
      <div key={cat} className="space-y-1 pb-2" role="group" aria-label={cat}>
        <h4 className="text-[10px] font-medium font-mono tracking-widest text-[#6b7280] uppercase px-3 pt-2">
          {categoryLabels[cat]}
        </h4>
        <div className="space-y-0.5">
          {catActions.map((action, localIdx) => {
            const currentFlatIndex = catOffset + localIdx
            const isActive = currentFlatIndex === activeIndex
            return (
              <div
                key={action.id}
                role="option"
                aria-selected={isActive}
                id={`palette-option-${currentFlatIndex}`}
                onClick={() => action.perform()}
                className={`flex items-center justify-between px-3 py-2 mx-1.5 rounded-sm transition-colors cursor-pointer select-none group border-l-2 font-mono ${
                  isActive
                    ? 'bg-[#141414] border-l-blue-500 text-[#e4e4e4]'
                    : 'border-transparent text-[#6b7280] hover:bg-[#141414] hover:text-[#e4e4e4]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-1 rounded-sm ${
                    isActive ? 'bg-[#1f1f1f] text-blue-400' : 'bg-[#0a0a0a]'
                  }`}>
                    {action.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate tracking-wider uppercase leading-tight text-[#e4e4e4]">
                      {action.title}
                    </p>
                    {action.subtitle && (
                      <p className="text-[10px] text-[#6b7280] truncate mt-0.5 font-mono leading-none">
                        {action.subtitle}
                      </p>
                    )}
                  </div>
                </div>
                {isActive && (
                  <span className="flex items-center gap-1 text-[9px] font-mono text-blue-400 bg-[#0a0a0a] px-1.5 py-0.5 rounded-sm border border-blue-500/30 shrink-0">
                    <span>SELECT</span>
                    <CornerDownLeft className="h-2.5 w-2.5" />
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
    <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-[#0a0a0a]/80 pt-12 sm:pt-16 p-4" role="dialog" aria-modal="true" aria-label="Command palette">
      {/* Backdrop Dismiss Click Area */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />
      
      {/* Command Palette Card Box */}
      <div className="relative w-full max-w-2xl bg-[#0f0f0f] border border-[#2a2a2a] rounded-sm overflow-hidden animate-fadeIn flex flex-col max-h-[480px] font-mono">
        
        {/* Search Bar Input section */}
        <div className="flex items-center border-b border-[#2a2a2a] px-3.5 py-2.5 gap-2.5 relative z-10 bg-[#0a0a0a]">
          <Search className="h-4 w-4 text-[#6b7280] shrink-0" />
          <input
            type="text"
            autoFocus
            role="combobox"
            aria-expanded={actions.length > 0}
            aria-controls="palette-listbox"
            aria-activedescendant={activeIndex >= 0 ? `palette-option-${activeIndex}` : undefined}
            aria-label="Search commands and dies"
            placeholder="Type command or die ID (e.g. R-101)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-[#e4e4e4] placeholder-[#404040] focus:outline-none text-xs font-mono tracking-wider uppercase"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close command palette"
            className="p-0.5 text-[#6b7280] hover:text-[#e4e4e4] rounded-sm hover:bg-[#141414] transition cursor-pointer"
          >
            <span className="text-[10px] font-mono border border-[#2a2a2a] px-1 py-0.5 rounded-sm bg-[#141414]">ESC</span>
          </button>
        </div>

        {/* Status syntax hint */}
        <div className="px-3 py-1 text-[10px] text-[#6b7280] border-b border-[#1a1a1a] bg-[#0f0f0f]">
          Type <span className="text-[#e4e4e4]">status:NAME</span> to update die status (e.g. <span className="text-[#e4e4e4]">status:RUNNING</span>)
        </div>

        {/* Content Action Items List */}
        <div id="palette-listbox" role="listbox" className="flex-1 overflow-y-auto py-1 divide-y divide-[#1a1a1a]" ref={listRef}>
          {actions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <HelpCircle className="h-8 w-8 text-[#404040] mb-2" />
              <p className="text-xs font-medium text-[#e4e4e4] uppercase tracking-wider">No matching commands or dies found</p>
              <p className="text-[11px] text-[#6b7280] mt-1 max-w-xs leading-normal font-mono">
                Try searching for existing die IDs or navigation keywords.
              </p>
            </div>
          ) : (
            renderedCategories
          )}
        </div>

        {/* Footer shortcuts helper panel */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-[#2a2a2a] bg-[#0a0a0a] text-[10px] font-mono text-[#6b7280] tracking-wide select-none">
          <div className="flex items-center space-x-3">
            <span className="flex items-center gap-1"><span className="border border-[#2a2a2a] px-1 py-0.2 rounded-sm bg-[#141414] text-[9px]">↑↓</span> MOVE</span>
            <span className="flex items-center gap-1"><span className="border border-[#2a2a2a] px-1 py-0.2 rounded-sm bg-[#141414] text-[9px]">ENTER</span> SELECT</span>
          </div>
          <div className="flex items-center gap-1">
            <Command className="h-3 w-3" />
            <span>COMMAND PALETTE</span>
          </div>
        </div>
      </div>
    </div>
  )
}
