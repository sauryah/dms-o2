import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Layers, LogOut, LogIn, X, Menu, Bell, Settings, Calculator, ChevronDown, Zap, Terminal, Palette, Sun } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth, useTheme, useToast, useNotifications } from '../contexts'
import { useApi } from '../hooks/useApi'

export function Navbar() {
  const { username, role, logout, isAuthorizedForTools, authorizedTools } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { showToast } = useToast()
  const { notifications, unreadCount, markAllAsRead } = useNotifications()
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showToolsDropdown, setShowToolsDropdown] = useState(false)
  const queryClient = useQueryClient()
  const notificationRef = useRef<HTMLDivElement>(null)
  const toolsDropdownRef = useRef<HTMLDivElement>(null)
  const toolsButtonRef = useRef<HTMLButtonElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
      if (toolsDropdownRef.current && !toolsDropdownRef.current.contains(e.target as Node)) {
        setShowToolsDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close other dropdowns when one opens
  const openTools = useCallback(() => {
    setShowNotifications(false)
    setShowToolsDropdown(true)
  }, [])

  const openNotifications = useCallback(() => {
    setShowToolsDropdown(false)
    setShowNotifications(prev => {
      if (!prev) markAllAsRead()
      return !prev
    })
  }, [markAllAsRead])

  const { request } = useApi()

  const prefetchDashboard = () => {
    queryClient.prefetchQuery({
      queryKey: ['allDiesStats'],
      queryFn: () => request('/api/go/stats')
    })
    queryClient.prefetchQuery({
      queryKey: ['searchDies', {}],
      queryFn: () => request('/api/go/search')
    })
  }

  const prefetchInventory = () => {
    queryClient.prefetchQuery({
      queryKey: ['dies', '', '', '', '', '', '', '', '', '', '', '500'],
      queryFn: () => request('/api/go/search?limit=500', { keepMetadata: true })
    })
    queryClient.prefetchQuery({
      queryKey: ['setsDropdownList'],
      queryFn: () => request('/api/sets/')
    })
    queryClient.prefetchQuery({
      queryKey: ['machinesList'],
      queryFn: () => request('/api/machines/')
    })
  }

  const prefetchMachines = () => {
    queryClient.prefetchQuery({
      queryKey: ['machinesList'],
      queryFn: () => request('/api/machines/')
    })
    queryClient.prefetchQuery({
      queryKey: ['setsList'],
      queryFn: () => request('/api/sets/')
    })
    queryClient.prefetchQuery({
      queryKey: ['machineCategories'],
      queryFn: () => request('/api/machines/categories/')
    })
  }

  // Keyboard handler for Tools dropdown
  const handleToolsKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowToolsDropdown(false)
      toolsButtonRef.current?.focus()
    } else if (e.key === 'ArrowDown' && showToolsDropdown) {
      e.preventDefault()
      const firstLink = toolsDropdownRef.current?.querySelector<HTMLElement>('a')
      firstLink?.focus()
    }
  }

  return (
    <nav className="border-b border-[#2a2a2a] bg-[#0a0a0a] sticky top-0 z-50 font-mono select-none">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex justify-between h-12">
          <div className="flex items-center space-x-6">
            <Link
              to="/"
              className="flex items-center space-x-2 text-[#e4e4e4] group"
              onClick={() => setIsOpen(false)}
              onMouseEnter={prefetchDashboard}
              onTouchStart={prefetchDashboard}
            >
              <div className="p-1 bg-[#141414] border border-[#2a2a2a] rounded-sm group-hover:border-blue-500 transition-colors">
                <Layers className="h-4 w-4 text-blue-400" />
              </div>
              <span className="font-bold text-sm tracking-widest text-[#e4e4e4] uppercase font-mono">
                DMS
              </span>
            </Link>

            <div className="hidden sm:flex items-center space-x-1">
              <NavLink
                to="/"
                onMouseEnter={prefetchDashboard}
                className={({ isActive }) =>
                  `px-2.5 py-1 text-xs font-medium uppercase tracking-wider transition-colors font-mono border ${
                    isActive
                      ? 'bg-[#141414] text-[#e4e4e4] border-[#2a2a2a] border-b-blue-500'
                      : 'text-[#6b7280] hover:text-[#e4e4e4] hover:bg-[#141414] border-transparent'
                  }`
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/inventory"
                onMouseEnter={prefetchInventory}
                className={({ isActive }) =>
                  `px-2.5 py-1 text-xs font-medium uppercase tracking-wider transition-colors font-mono border ${
                    isActive
                      ? 'bg-[#141414] text-[#e4e4e4] border-[#2a2a2a] border-b-blue-500'
                      : 'text-[#6b7280] hover:text-[#e4e4e4] hover:bg-[#141414] border-transparent'
                  }`
                }
              >
                Inventory
              </NavLink>
              <NavLink
                to="/machines"
                onMouseEnter={prefetchMachines}
                className={({ isActive }) =>
                  `px-2.5 py-1 text-xs font-medium uppercase tracking-wider transition-colors font-mono border ${
                    isActive
                      ? 'bg-[#141414] text-[#e4e4e4] border-[#2a2a2a] border-b-blue-500'
                      : 'text-[#6b7280] hover:text-[#e4e4e4] hover:bg-[#141414] border-transparent'
                  }`
                }
              >
                Machines
              </NavLink>
              {(role === 'ROOT' || role === 'ADMIN') && (
                <NavLink
                  to="/history"
                  className={({ isActive }) =>
                    `px-2.5 py-1 text-xs font-medium uppercase tracking-wider transition-colors font-mono border ${
                      isActive
                        ? 'bg-[#141414] text-[#e4e4e4] border-[#2a2a2a] border-b-blue-500'
                        : 'text-[#6b7280] hover:text-[#e4e4e4] hover:bg-[#141414] border-transparent'
                    }`
                  }
                >
                  Audit Log
                </NavLink>
              )}
              {/* Tools Dropdown */}
              {isAuthorizedForTools && (
                <div
                  className="relative"
                  ref={toolsDropdownRef}
                  onMouseEnter={openTools}
                  onMouseLeave={() => setShowToolsDropdown(false)}
                  onKeyDown={handleToolsKeyDown}
                >
                  <button
                    ref={toolsButtonRef}
                    type="button"
                    onClick={() => setShowToolsDropdown(!showToolsDropdown)}
                    aria-expanded={showToolsDropdown}
                    aria-haspopup="true"
                    className={`px-2.5 py-1 text-xs font-medium uppercase tracking-wider transition-colors font-mono border flex items-center gap-1 cursor-pointer select-none focus-ring ${
                      location.pathname.startsWith('/tools') || location.pathname === '/calculator' || location.pathname === '/wire-drawing-calculator' || location.pathname === '/die-series-generator' || location.pathname === '/die-set-planner'
                        ? 'bg-[#141414] text-[#e4e4e4] border-[#2a2a2a] border-b-blue-500'
                        : 'text-[#6b7280] hover:text-[#e4e4e4] hover:bg-[#141414] border-transparent'
                    }`}
                  >
                    <span>Tools</span>
                    <ChevronDown className={`h-3 w-3 transition-transform duration-150 ${showToolsDropdown ? 'rotate-180' : 'rotate-0'}`} />
                  </button>

                  {showToolsDropdown && (
                    <div className="absolute left-0 pt-1 w-64 z-50 animate-fadeIn">
                      <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-sm overflow-hidden font-mono">
                        <div className="p-1 space-y-0.5">
                          {(role === 'ROOT' || (authorizedTools || []).includes('sizing-calculator')) && (
                            <Link
                              to="/calculator"
                              onClick={() => setShowToolsDropdown(false)}
                              className="flex items-start gap-2 px-2.5 py-2 text-xs text-[#e4e4e4] hover:bg-[#141414] rounded-sm transition-colors"
                            >
                              <Calculator className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />
                              <div className="flex flex-col">
                                <span className="font-medium uppercase">Sizing Calculator</span>
                                <span className="text-[10px] text-[#6b7280]">Round & flat rectangular sizing</span>
                              </div>
                            </Link>
                          )}

                          {(role === 'ROOT' || (authorizedTools || []).includes('wire-drawing-calculator')) && (
                            <Link
                              to="/wire-drawing-calculator"
                              onClick={() => setShowToolsDropdown(false)}
                              className="flex items-start gap-2 px-2.5 py-2 text-xs text-[#e4e4e4] hover:bg-[#141414] rounded-sm transition-colors"
                            >
                              <Calculator className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />
                              <div className="flex flex-col">
                                <span className="font-medium uppercase">Wire Drawing Calc</span>
                                <span className="text-[10px] text-[#6b7280]">Precision elongation analysis</span>
                              </div>
                            </Link>
                          )}

                          {(role === 'ROOT' || (authorizedTools || []).includes('die-series-generator')) && (
                            <Link
                              to="/die-series-generator"
                              onClick={() => setShowToolsDropdown(false)}
                              className="flex items-start gap-2 px-2.5 py-2 text-xs text-[#e4e4e4] hover:bg-[#141414] rounded-sm transition-colors"
                            >
                              <Zap className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                              <div className="flex flex-col">
                                <span className="font-medium uppercase">Die Series Generator</span>
                                <span className="text-[10px] text-[#6b7280]">Target schedule calculation</span>
                              </div>
                            </Link>
                          )}

                          {(role === 'ROOT' || (authorizedTools || []).includes('die-set-planner')) && (
                            <Link
                              to="/die-set-planner"
                              onClick={() => setShowToolsDropdown(false)}
                              className="flex items-start gap-2 px-2.5 py-2 text-xs text-[#e4e4e4] hover:bg-[#141414] rounded-sm transition-colors"
                            >
                              <Calculator className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                              <div className="flex flex-col">
                                <span className="font-medium uppercase">Die Set Planner</span>
                                <span className="text-[10px] text-[#6b7280]">Build sets from inventory</span>
                              </div>
                            </Link>
                          )}

                          <div className="border-t border-[#2a2a2a] my-1" />

                          <Link
                            to="/tools"
                            onClick={() => setShowToolsDropdown(false)}
                            className="block text-center text-[10px] font-medium text-blue-400 hover:text-blue-300 py-1 hover:bg-[#141414] rounded-sm transition-colors uppercase tracking-wider"
                          >
                            View All Tools
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {(role === 'ROOT' || role === 'ADMIN') && (
                <NavLink
                  to="/import"
                  className={({ isActive }) =>
                    `px-2.5 py-1 text-xs font-medium uppercase tracking-wider transition-colors font-mono border ${
                      isActive
                        ? 'bg-[#141414] text-[#e4e4e4] border-[#2a2a2a] border-b-blue-500'
                        : 'text-[#6b7280] hover:text-[#e4e4e4] hover:bg-[#141414] border-transparent'
                    }`
                  }
                >
                  Bulk Import
                </NavLink>
              )}
              {role === 'ROOT' && (
                <NavLink
                  to="/users"
                  className={({ isActive }) =>
                    `px-2.5 py-1 text-xs font-medium uppercase tracking-wider transition-colors font-mono border ${
                      isActive
                        ? 'bg-[#141414] text-[#e4e4e4] border-[#2a2a2a] border-b-blue-500'
                        : 'text-[#6b7280] hover:text-[#e4e4e4] hover:bg-[#141414] border-transparent'
                    }`
                  }
                >
                  Users
                </NavLink>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {username ? (
              <div className="hidden sm:flex items-center space-x-3">
                <div className="text-right font-mono">
                  <span className="block text-xs font-medium text-[#e4e4e4]">{username}</span>
                  <span className="block text-[10px] text-[#6b7280] uppercase tracking-wider">{role}</span>
                </div>
                {role === 'ROOT' && (
                  <button
                    type="button"
                    onClick={() => {
                      toggleTheme()
                      const nextTheme = theme === 'terminal' ? 'Classic Slate (Industrial)' : theme === 'classic' ? 'Precision Light (Clean Slate)' : 'Dark Terminal (Bloomberg)'
                      showToast(`System theme switched to: ${nextTheme}`, 'info')
                    }}
                    title={`System Theme: ${theme === 'terminal' ? 'Dark Terminal' : theme === 'classic' ? 'Classic Slate' : 'Precision Light'} (Root Privilege: Click to Switch)`}
                    className="flex items-center gap-1.5 bg-[#141414] border border-[#2a2a2a] hover:border-blue-500/50 text-[#e4e4e4] px-2 py-1 rounded-sm text-xs font-mono transition-colors cursor-pointer"
                    aria-label="Switch System Theme"
                  >
                    {theme === 'terminal' ? (
                      <>
                        <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="hidden lg:inline text-[10px] text-emerald-400 uppercase font-bold tracking-wider">TERMINAL</span>
                      </>
                    ) : theme === 'classic' ? (
                      <>
                        <Palette className="h-3.5 w-3.5 text-blue-400" />
                        <span className="hidden lg:inline text-[10px] text-blue-400 uppercase font-bold tracking-wider">CLASSIC</span>
                      </>
                    ) : (
                      <>
                        <Sun className="h-3.5 w-3.5 text-amber-500" />
                        <span className="hidden lg:inline text-[10px] text-amber-500 uppercase font-bold tracking-wider">LIGHT</span>
                      </>
                    )}
                  </button>
                )}
                <Link
                  to="/settings"
                  className="flex items-center bg-[#141414] border border-[#2a2a2a] hover:border-[#3b82f6] text-[#e4e4e4] p-1.5 rounded-sm text-xs transition-colors"
                  aria-label="Settings"
                >
                  <Settings className="h-3.5 w-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => { logout(); navigate('/login'); setIsOpen(false); }}
                  className="flex items-center space-x-1.5 bg-[#141414] border border-[#2a2a2a] hover:border-red-500/50 text-[#e4e4e4] hover:text-red-400 px-2.5 py-1 rounded-sm text-xs uppercase font-mono tracking-wider transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex">
                <Link
                  to="/login"
                  className="flex items-center space-x-1.5 bg-[#141414] hover:bg-[#1f1f1f] text-blue-400 border border-blue-500/50 px-3 py-1 rounded-sm text-xs font-mono uppercase tracking-wider transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Login</span>
                </Link>
              </div>
            )}

            {username && (
              <div className="relative" ref={notificationRef}>
                <button
                  type="button"
                  onClick={openNotifications}
                  className="relative p-1.5 text-[#6b7280] hover:text-[#e4e4e4] hover:bg-[#141414] rounded-sm transition-colors border border-transparent hover:border-[#2a2a2a] cursor-pointer focus-ring"
                  aria-label="Notification Center"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white ring-1 ring-[#0a0a0a]" aria-label={`${unreadCount} unread notifications`}>
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-1.5 w-80 bg-[#0f0f0f] border border-[#2a2a2a] rounded-sm overflow-hidden z-50 animate-fadeIn font-mono">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a2a] bg-[#0a0a0a]">
                      <span className="text-xs font-medium text-[#e4e4e4] flex items-center gap-1.5 uppercase tracking-wider">
                        <Bell className="h-3.5 w-3.5 text-blue-400" />
                        <span>Notifications</span>
                      </span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => markAllAsRead()}
                          className="text-[10px] font-medium text-blue-400 hover:text-blue-300 transition uppercase tracking-wider cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-[#1a1a1a]">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center px-4">
                          <Bell className="h-6 w-6 text-[#404040] mx-auto mb-2" />
                          <p className="text-xs text-[#6b7280]">No notifications</p>
                        </div>
                      ) : (
                        notifications.map((notif: any) => (
                          <div
                            key={notif.id}
                            className={`p-3 hover:bg-[#141414] transition-colors relative ${
                              notif.unread ? 'bg-[#141414]/60' : ''
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${
                                notif.type === 'success'
                                  ? 'bg-emerald-400'
                                  : notif.type === 'error'
                                  ? 'bg-red-400'
                                  : 'bg-blue-400'
                              }`} />
                              <div className="min-w-0 flex-1">
                                <div className="flex justify-between items-baseline gap-2">
                                  <h5 className="text-xs font-medium text-[#e4e4e4] truncate uppercase">{notif.title}</h5>
                                  <span className="text-[9px] font-mono text-[#6b7280] shrink-0">{notif.timestamp}</span>
                                </div>
                                <p className="text-[11px] text-[#6b7280] mt-0.5 leading-normal break-words">{notif.message}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Menu Button */}
            <div className="flex sm:hidden">
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center justify-center p-1.5 rounded-sm text-[#6b7280] hover:text-[#e4e4e4] hover:bg-[#141414] border border-[#2a2a2a] focus-ring transition-colors"
                aria-expanded={isOpen}
                aria-controls="mobile-menu"
              >
                {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {isOpen && (
        <div id="mobile-menu" className="sm:hidden border-t border-[#2a2a2a] bg-[#0a0a0a] px-3 pt-2 pb-3 space-y-1 animate-menuSlideDown font-mono">
          <Link
            to="/"
            className="block text-[#e4e4e4] hover:bg-[#141414] px-3 py-2 rounded-sm text-xs uppercase tracking-wider font-mono transition-colors"
            onClick={() => setIsOpen(false)}
            onTouchStart={prefetchDashboard}
          >
            Dashboard
          </Link>
          <Link
            to="/inventory"
            className="block text-[#e4e4e4] hover:bg-[#141414] px-3 py-2 rounded-sm text-xs uppercase tracking-wider font-mono transition-colors"
            onClick={() => setIsOpen(false)}
            onTouchStart={prefetchInventory}
          >
            Die Inventory
          </Link>
          <Link
            to="/machines"
            className="block text-[#e4e4e4] hover:bg-[#141414] px-3 py-2 rounded-sm text-xs uppercase tracking-wider font-mono transition-colors"
            onClick={() => setIsOpen(false)}
            onTouchStart={prefetchMachines}
          >
            Machine Sets
          </Link>
          {(role === 'ROOT' || role === 'ADMIN') && (
            <Link
              to="/history"
              className="block text-[#e4e4e4] hover:bg-[#141414] px-3 py-2 rounded-sm text-xs uppercase tracking-wider font-mono transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Audit History
            </Link>
          )}
          {isAuthorizedForTools && (
            <div className="px-3 py-1.5 border-l border-[#2a2a2a] ml-2">
              <Link
                to="/tools"
                className="text-[#6b7280] hover:text-[#e4e4e4] text-xs uppercase tracking-wider block transition-colors py-1"
                onClick={() => setIsOpen(false)}
              >
                Tools Overview
              </Link>
              <div className="space-y-1 pl-2 mt-1">
                {(role === 'ROOT' || (authorizedTools || []).includes('sizing-calculator')) && (
                  <Link
                    to="/calculator"
                    className="flex items-center gap-2 text-xs text-[#e4e4e4] hover:text-blue-400 py-1 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <Calculator className="h-3.5 w-3.5 text-blue-400" />
                    <span>Sizing Calculator</span>
                  </Link>
                )}
                {(role === 'ROOT' || (authorizedTools || []).includes('wire-drawing-calculator')) && (
                  <Link
                    to="/wire-drawing-calculator"
                    className="flex items-center gap-2 text-xs text-[#e4e4e4] hover:text-blue-400 py-1 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <Calculator className="h-3.5 w-3.5 text-blue-400" />
                    <span>Wire Drawing Calc</span>
                  </Link>
                )}
                {(role === 'ROOT' || (authorizedTools || []).includes('die-series-generator')) && (
                  <Link
                    to="/die-series-generator"
                    className="flex items-center gap-2 text-xs text-[#e4e4e4] hover:text-amber-400 py-1 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    <span>Die Series Generator</span>
                  </Link>
                )}
                {(role === 'ROOT' || (authorizedTools || []).includes('die-set-planner')) && (
                  <Link
                    to="/die-set-planner"
                    className="flex items-center gap-2 text-xs text-[#e4e4e4] hover:text-emerald-400 py-1 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <Calculator className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Die Set Planner</span>
                  </Link>
                )}
              </div>
            </div>
          )}
          {(role === 'ROOT' || role === 'ADMIN') && (
            <Link
              to="/import"
              className="block text-[#e4e4e4] hover:bg-[#141414] px-3 py-2 rounded-sm text-xs uppercase tracking-wider font-mono transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Bulk Import
            </Link>
          )}
          {role === 'ROOT' && (
            <Link
              to="/users"
              className="block text-[#e4e4e4] hover:bg-[#141414] px-3 py-2 rounded-sm text-xs uppercase tracking-wider font-mono transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Users
            </Link>
          )}
          {username ? (
            <div className="pt-2 mt-2 border-t border-[#2a2a2a] flex flex-col space-y-2 px-3">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-[#e4e4e4]">{username}</span>
                <span className="text-[10px] text-[#6b7280] font-mono uppercase">{role}</span>
              </div>
              {role === 'ROOT' && (
                <button
                  type="button"
                  onClick={() => {
                    toggleTheme()
                    const nextTheme = theme === 'terminal' ? 'Classic Slate (Industrial)' : theme === 'classic' ? 'Precision Light (Clean Slate)' : 'Dark Terminal (Bloomberg)'
                    showToast(`System theme switched to: ${nextTheme}`, 'info')
                  }}
                  className="flex items-center justify-center space-x-2 bg-[#141414] hover:bg-[#1f1f1f] text-[#e4e4e4] border border-[#2a2a2a] py-1.5 rounded-sm text-xs uppercase font-mono tracking-wider transition cursor-pointer"
                >
                  {theme === 'terminal' ? (
                    <>
                      <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Theme: Terminal</span>
                    </>
                  ) : theme === 'classic' ? (
                    <>
                      <Palette className="h-3.5 w-3.5 text-blue-400" />
                      <span>Theme: Classic Slate</span>
                    </>
                  ) : (
                    <>
                      <Sun className="h-3.5 w-3.5 text-amber-500" />
                      <span>Theme: Precision Light</span>
                    </>
                  )}
                </button>
              )}
              <Link
                to="/settings"
                className="flex items-center justify-center space-x-2 bg-[#141414] hover:bg-[#1f1f1f] text-[#e4e4e4] border border-[#2a2a2a] py-1.5 rounded-sm text-xs uppercase font-mono tracking-wider transition"
                onClick={() => setIsOpen(false)}
              >
                <Settings className="h-3.5 w-3.5" />
                <span>Settings</span>
              </Link>
              <button
                type="button"
                onClick={() => { logout(); navigate('/login'); setIsOpen(false); }}
                className="w-full flex items-center justify-center space-x-2 bg-[#141414] hover:bg-red-950/30 text-red-400 border border-red-500/40 py-1.5 rounded-sm text-xs uppercase font-mono tracking-wider transition"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="pt-2 mt-2 border-t border-[#2a2a2a] px-3">
              <Link
                to="/login"
                className="w-full flex items-center justify-center space-x-2 bg-[#141414] hover:bg-[#1f1f1f] text-blue-400 border border-blue-500/50 py-1.5 rounded-sm text-xs uppercase font-mono tracking-wider transition"
                onClick={() => setIsOpen(false)}
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Login</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
