import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Layers, LogOut, LogIn, X, Menu, Bell, Settings } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../contexts/NotificationContext'
import { useApi } from '../hooks/useApi'

export function Navbar() {
  const { username, role, logout } = useAuth()
  const { notifications, unreadCount, markAllAsRead } = useNotifications()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const queryClient = useQueryClient()
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
      queryKey: ['dies', '', '', '', '', '', '', '', '', '', '', '10000'],
      queryFn: () => request('/api/go/search?limit=10000', { keepMetadata: true })
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

  return (
    <nav className="border-b border-slate-900 bg-slate-950/85 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link 
              to="/" 
              className="flex items-center space-x-3 text-white group" 
              onClick={() => setIsOpen(false)}
              onMouseEnter={prefetchDashboard}
              onTouchStart={prefetchDashboard}
            >
              <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg group-hover:scale-105 transition-transform duration-300 shadow-md shadow-blue-500/10">
                <Layers className="h-5 w-5 text-white" />
              </div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                DMS
              </span>
            </Link>
            
            <div className="hidden sm:flex items-center space-x-1">
              <NavLink 
                to="/" 
                onMouseEnter={prefetchDashboard}
                className={({ isActive }) => 
                  `px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border border-transparent ${
                    isActive 
                      ? 'bg-slate-900 text-white border-slate-800/80 shadow-inner' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                  }`
                }
              >
                Dashboard
              </NavLink>
              <NavLink 
                to="/inventory" 
                onMouseEnter={prefetchInventory}
                className={({ isActive }) => 
                  `px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border border-transparent ${
                    isActive 
                      ? 'bg-slate-900 text-white border-slate-800/80 shadow-inner' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                  }`
                }
              >
                Die Inventory
              </NavLink>
              <NavLink 
                to="/machines" 
                onMouseEnter={prefetchMachines}
                className={({ isActive }) => 
                  `px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border border-transparent ${
                    isActive 
                      ? 'bg-slate-900 text-white border-slate-800/80 shadow-inner' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                  }`
                }
              >
                Machine Sets
              </NavLink>
              <NavLink 
                to="/history" 
                className={({ isActive }) => 
                  `px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border border-transparent ${
                    isActive 
                      ? 'bg-slate-900 text-white border-slate-800/80 shadow-inner' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                  }`
                }
              >
                Audit History
              </NavLink>
              {(role === 'ROOT' || role === 'ADMIN') && (
                <NavLink 
                  to="/import" 
                  className={({ isActive }) => 
                    `px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border border-transparent ${
                      isActive 
                        ? 'bg-slate-900 text-white border-slate-800/80 shadow-inner' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
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
                    `px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border border-transparent ${
                      isActive 
                        ? 'bg-slate-900 text-white border-slate-800/80 shadow-inner' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                    }`
                  }
                >
                  Users
                </NavLink>
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
                <Link
                  to="/settings"
                  className="flex items-center space-x-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-sm transition-all duration-300"
                >
                  <Settings className="h-4 w-4" />
                </Link>
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

            {username && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications)
                    if (!showNotifications) {
                      markAllAsRead()
                    }
                  }}
                  className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-900/50 rounded-xl transition-all duration-300 border border-transparent hover:border-slate-800 cursor-pointer"
                  aria-label="Notification Center"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-slate-950 shadow-lg shadow-rose-950/20">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                    <div className="absolute right-0 mt-2.5 w-80 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <Bell className="h-4 w-4 text-blue-500" />
                          <span>Notifications</span>
                        </span>
                        {unreadCount > 0 && (
                          <button
                            onClick={() => markAllAsRead()}
                            className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition uppercase tracking-wider cursor-pointer"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/40">
                        {notifications.length === 0 ? (
                          <div className="py-10 text-center px-4">
                            <Bell className="h-8 w-8 text-slate-650 mx-auto animate-pulse mb-2.5" />
                            <p className="text-xs font-bold text-slate-400">No notifications yet</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">Real-time alerts will appear here</p>
                          </div>
                        ) : (
                          notifications.map((notif: any) => (
                            <div 
                              key={notif.id} 
                              className={`p-3.5 hover:bg-slate-800/40 transition duration-150 relative ${
                                notif.unread ? 'bg-blue-950/10' : ''
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                                  notif.type === 'success' 
                                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' 
                                    : notif.type === 'error'
                                    ? 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.5)]'
                                    : 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]'
                                }`} />
                                <div className="min-w-0 flex-1">
                                  <div className="flex justify-between items-baseline gap-2">
                                    <h5 className="text-xs font-bold text-slate-200 truncate">{notif.title}</h5>
                                    <span className="text-[9px] font-mono text-slate-500 shrink-0">{notif.timestamp}</span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 mt-1 leading-normal font-sans break-words">{notif.message}</p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
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
        <div className="sm:hidden border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-lg px-4 pt-2 pb-4 space-y-2.5 animate-menuSlideDown">
          <Link 
            to="/" 
            className="block text-slate-300 hover:text-white px-3.5 py-2.5 rounded-xl text-base font-semibold hover:bg-slate-900 transition-colors"
            onClick={() => setIsOpen(false)}
            onTouchStart={prefetchDashboard}
          >
            Dashboard
          </Link>
          <Link 
            to="/inventory" 
            className="block text-slate-300 hover:text-white px-3.5 py-2.5 rounded-xl text-base font-semibold hover:bg-slate-900 transition-colors"
            onClick={() => setIsOpen(false)}
            onTouchStart={prefetchInventory}
          >
            Die Inventory
          </Link>
          <Link 
            to="/machines" 
            className="block text-slate-300 hover:text-white px-3.5 py-2.5 rounded-xl text-base font-semibold hover:bg-slate-900 transition-colors"
            onClick={() => setIsOpen(false)}
            onTouchStart={prefetchMachines}
          >
            Machine Sets
          </Link>
          <Link 
            to="/history" 
            className="block text-slate-300 hover:text-white px-3.5 py-2.5 rounded-xl text-base font-semibold hover:bg-slate-900 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            Audit History
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
              <Link
                to="/settings"
                className="flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 py-2.5 rounded-xl text-sm font-semibold transition"
                onClick={() => setIsOpen(false)}
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
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
