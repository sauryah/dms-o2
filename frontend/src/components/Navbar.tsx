import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Layers, LogOut, LogIn, X, Menu } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth, useApi } from '../App'

export function Navbar() {
  const { username, role, logout } = useAuth()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
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
      queryFn: () => request('/api/go/search?limit=10000')
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
