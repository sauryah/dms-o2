import React, { createContext, useContext, useState, useEffect, useRef, Suspense, useCallback } from 'react'
import { 
  HashRouter as Router, 
  Routes, 
  Route, 
  useNavigate,
  Navigate
} from 'react-router-dom'
import { 
  QueryClient, 
  QueryClientProvider, 
  useQueryClient 
} from '@tanstack/react-query'

// Component & Page Imports
import { Navbar } from './components/Navbar'
import { ErrorBoundary } from './components/ErrorBoundary'
import { CommandPalette } from './components/CommandPalette'

// Lazy loaded page components for code splitting
const DashboardPage = React.lazy(() => import('./features/dashboard/components/DashboardPage').then(m => ({ default: m.DashboardPage })))
const InventoryPage = React.lazy(() => import('./features/inventory/components/InventoryPage').then(m => ({ default: m.InventoryPage })))
const DieDetailPage = React.lazy(() => import('./features/inventory/components/DieDetailPage').then(m => ({ default: m.DieDetailPage })))
const MachineSetsPage = React.lazy(() => import('./pages/MachineSetsPage').then(m => ({ default: m.MachineSetsPage })))
const ImportPage = React.lazy(() => import('./pages/ImportPage').then(m => ({ default: m.ImportPage })))
const UsersPage = React.lazy(() => import('./pages/UsersPage').then(m => ({ default: m.UsersPage })))
const HistoryPage = React.lazy(() => import('./pages/HistoryPage').then(m => ({ default: m.HistoryPage })))
const LoginPage = React.lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })))

// React Query Client
const queryClient = new QueryClient()

// Debounce hook for input text
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
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
const AuthContext = createContext<any>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('dms_token'))
  const [role, setRole] = useState<string | null>(() => localStorage.getItem('dms_role'))
  const [username, setUsername] = useState<string | null>(() => localStorage.getItem('dms_username'))

  useEffect(() => {
    if (token) {
      localStorage.setItem('dms_token', token)
    } else {
      localStorage.removeItem('dms_token')
    }
  }, [token])

  useEffect(() => {
    if (role) {
      localStorage.setItem('dms_role', role)
    } else {
      localStorage.removeItem('dms_role')
    }
  }, [role])

  useEffect(() => {
    if (username) {
      localStorage.setItem('dms_username', username)
    } else {
      localStorage.removeItem('dms_username')
    }
  }, [username])

  const login = (newToken: string, userRole: string, userN: string) => {
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

// Premium Custom Toast Context & Provider
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const ToastContext = createContext<any>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Overlay Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-2xl border backdrop-blur-md transition-all duration-300 flex items-center gap-3 animate-fadeIn ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/20 text-emerald-400'
                : toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/20 text-rose-400'
                : 'bg-slate-900/90 border-slate-800/80 text-slate-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              toast.type === 'success'
                ? 'bg-emerald-400 dot-glow glow-emerald animate-pulse'
                : toast.type === 'error'
                ? 'bg-rose-400 dot-glow glow-rose animate-pulse'
                : 'bg-blue-400 dot-glow glow-blue animate-pulse'
            }`} />
            <span className="text-sm font-medium font-sans leading-snug">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

// Premium Custom Notification Center Context & Provider
interface NotificationItem {
  id: string
  title: string
  message: string
  timestamp: string
  type: 'info' | 'success' | 'error'
  unread: boolean
}

const NotificationContext = createContext<any>(null)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem('dms_notifications')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) return parsed
      } catch (e) {
        console.error(e)
      }
    }
    return []
  })

  useEffect(() => {
    localStorage.setItem('dms_notifications', JSON.stringify(notifications))
  }, [notifications])
  
  const addNotification = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const item: NotificationItem = {
      id: Math.random().toString(36).substring(2, 9),
      title,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type,
      unread: true
    }
    setNotifications(prev => [item, ...prev].slice(0, 20))
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })))
  }

  const unreadCount = notifications.filter(n => n.unread).length

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)

// Custom Accessibility Announcer Context & Provider
const AccessibilityContext = createContext<(msg: string) => void>(() => {})

export function AnnouncementProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState('')
  const announce = (text: string) => {
    setMsg(text)
    // Clear after a delay so screen reader is forced to announce even identical messages
    setTimeout(() => setMsg(''), 1000)
  }
  return (
    <AccessibilityContext.Provider value={announce}>
      {children}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {msg}
      </div>
    </AccessibilityContext.Provider>
  )
}

export const useAnnouncer = () => useContext(AccessibilityContext)

// API Fetch Helper with Retry Logic
export const useApi = () => {
  const { token, setToken } = useAuth()
  
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
  
  const request = async (url: string, options: any = {}) => {
    const headers = { ...options.headers }
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    const maxRetries = 3
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const res = await fetch(url, { ...options, headers })
        
        if (res.status === 401) {
          setToken(null)
          window.location.hash = '/login'
          throw new Error('Unauthorized')
        }
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          let errMsg = errorData.detail || errorData.error
          if (!errMsg && typeof errorData === 'object' && errorData !== null) {
            const fieldErrors = Object.entries(errorData).map(([key, val]) => {
              const valStr = Array.isArray(val) ? val.join(', ') : String(val)
              return `${key}: ${valStr}`
            })
            if (fieldErrors.length > 0) {
              errMsg = fieldErrors.join('; ')
            }
          }
          lastError = new Error(errMsg || 'Request failed')
          
          // Retry on 5xx errors, don't retry on 4xx (except 429)
          if (res.status < 500 && res.status !== 429) {
            throw lastError
          }
          
          // If last attempt, throw the error
          if (attempt === maxRetries - 1) {
            throw lastError
          }
          
          // Exponential backoff: 1s, 2s, 4s
          const delayMs = Math.pow(2, attempt) * 1000
          await sleep(delayMs)
          continue
        }
        
        if (res.status === 204) return null
        const data = await res.json()
        if (!options.keepMetadata && data && typeof data === 'object' && 'results' in data && Array.isArray(data.results)) {
          return data.results
        }
        return data
      } catch (error) {
        lastError = error as Error
        
        // Don't retry on client errors (4xx except 429)
        if (error instanceof TypeError || (error instanceof Error && error.message === 'Unauthorized')) {
          throw error
        }
        
        // If last attempt, throw the error
        if (attempt === maxRetries - 1) {
          throw error
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const delayMs = Math.pow(2, attempt) * 1000
        await sleep(delayMs)
      }
    }
    
    throw lastError || new Error('Request failed after retries')
  }

  return { request }
}

export const isDieActive = (die: any) => {
  return ['AVAILABLE', 'RUNNING', 'CLEANING', 'POLISHING'].includes(die.status)
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

const PageLoader = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center py-12 animate-fadeIn">
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 rounded-full border-4 border-slate-800/40 animate-pulse" />
      <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
    </div>
    <span className="mt-6 text-xs font-heading font-bold tracking-widest text-slate-400 uppercase animate-pulse">
      Loading Interface...
    </span>
  </div>
)

// Main App Container
function AppContent() {
  const { token } = useAuth()
  const { request } = useApi()
  const { showToast } = useToast()
  const { addNotification } = useNotifications()
  const announce = useAnnouncer()
  const queryClient = useQueryClient()
  const recentEvents = useRef(new Set<string>())
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)

  const [rebuildStatus, setRebuildStatus] = useState<{
    status: 'rebuilding' | 'ready' | 'error'
    progress: number
    total: number
    message?: string
  } | null>(null)
  const [isPolling, setIsPolling] = useState(false)

  const checkIndexStatus = useCallback(async () => {
    try {
      const data = await request('/api/go/index-status')
      if (data.status === 'rebuilding') {
        setRebuildStatus(data)
        setIsPolling(true)
      } else if (data.status === 'ready') {
        if (rebuildStatus && rebuildStatus.status === 'rebuilding') {
          showToast('Search index ready', 'success')
          addNotification('Index Rebuilt', 'Search index has been successfully rebuilt.', 'success')
          announce('Search index ready')
        }
        setRebuildStatus(null)
        setIsPolling(false)
      } else if (data.status === 'error') {
        showToast(`Search index rebuild failed: ${data.message || 'Unknown error'}`, 'error')
        setRebuildStatus(null)
        setIsPolling(false)
      }
    } catch (e) {
      console.error('Failed to fetch search index status:', e)
    }
  }, [request, rebuildStatus, showToast, addNotification, announce])

  // Poll search index status
  useEffect(() => {
    if (!token) {
      setIsPolling(false)
      setRebuildStatus(null)
      return
    }
    checkIndexStatus()
  }, [token])

  useEffect(() => {
    if (!isPolling || !token) return

    const interval = setInterval(() => {
      checkIndexStatus()
    }, 2000)

    return () => clearInterval(interval)
  }, [isPolling, token, checkIndexStatus])

  useEffect(() => {
    const handleTriggerPolling = () => {
      setIsPolling(true)
    }
    window.addEventListener('trigger-index-polling', handleTriggerPolling)
    return () => window.removeEventListener('trigger-index-polling', handleTriggerPolling)
  }, [])

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsPaletteOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleGlobalKey)
    return () => window.removeEventListener('keydown', handleGlobalKey)
  }, [])

  useEffect(() => {
    if (!token) return

    let eventSource: EventSource | null = null
    let isCancelled = false

    const connectSSE = async () => {
      try {
        const res = await request('/api/auth/sse-ticket/', { method: 'POST' })
        if (isCancelled) return

        const ticket = res.ticket
        if (!ticket) {
          console.error('Failed to get SSE ticket from response:', res)
          return
        }

        eventSource = new EventSource(`/api/events/?ticket=${encodeURIComponent(ticket)}`)

        eventSource.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data)
            console.log('Real-time sync event received:', payload)
            
            // Deduplicate events to prevent double alerts
            const signature = `${payload.type}-${payload.data?.id || payload.data?.filename || ''}-${payload.data?.action || ''}`
            if (recentEvents.current.has(signature)) {
              return
            }
            recentEvents.current.add(signature)
            setTimeout(() => {
              recentEvents.current.delete(signature)
            }, 3000)

            // Invalidate cache
            queryClient.invalidateQueries()

            // Construct dynamic notifications
            if (payload.type === 'die_update') {
              if (payload.data?.action === 'delete') {
                const msg = `Die ${payload.data.id} has been deleted.`
                showToast(msg, 'info')
                addNotification('Die Deleted', msg, 'info')
                announce(msg)
              } else if (payload.data?.action === 'bulk_import') {
                const msg = 'Bulk import of dies completed.'
                showToast(msg, 'success')
                addNotification('Bulk Import Completed', msg, 'success')
                announce(msg)
              } else if (payload.data?.action === 'save') {
                // Asynchronously fetch current state to present formatted message
                request(`/api/dies/${payload.data.id}/`)
                  .then(die => {
                    let locationMsg = ''
                    if (die.set_name) {
                      locationMsg = ` on Set ${die.set_name} (${die.machine_name || 'no machine'})`
                    } else if (die.location) {
                      locationMsg = ` in ${die.location}`
                    }
                    const msg = `Die ${die.die_id} is now ${die.status}${locationMsg}.`
                    showToast(msg, 'info')
                    addNotification('Die Updated', msg, 'info')
                    announce(msg)
                  })
                  .catch(() => {
                    const msg = `Die ${payload.data.id} was updated.`
                    showToast(msg, 'info')
                    addNotification('Die Updated', msg, 'info')
                    announce(msg)
                  })
              }
            } else if (payload.type === 'set_update') {
              const msg = 'Die sets have been updated.'
              showToast(msg, 'info')
              addNotification('Die Sets Updated', msg, 'info')
              announce(msg)
            } else if (payload.type === 'machine_update') {
              const msg = 'Machine configurations have been updated.'
              showToast(msg, 'info')
              addNotification('Machines Updated', msg, 'info')
              announce(msg)
            } else if (payload.type === 'backup_update') {
              const action = payload.data?.action
              const filename = payload.data?.filename || ''
              if (action === 'backup') {
                const msg = `Database backup "${filename}" created successfully.`
                showToast(msg, 'success')
                addNotification('Backup Created', msg, 'success')
                announce(msg)
              } else if (action === 'restore') {
                const msg = `Database restore from "${filename}" executed successfully.`
                showToast(msg, 'success')
                addNotification('System Restored', msg, 'success')
                announce(msg)
                setIsPolling(true)
              } else if (action === 'delete') {
                const msg = `Backup "${filename}" deleted.`
                showToast(msg, 'info')
                addNotification('Backup Deleted', msg, 'info')
                announce(msg)
              } else if (action === 'upload') {
                const msg = `Backup "${filename}" uploaded successfully.`
                showToast(msg, 'success')
                addNotification('Backup Uploaded', msg, 'success')
                announce(msg)
              }
            }
          } catch (e) {
            console.error('Failed to parse event data:', e)
          }
        }

        eventSource.onerror = (err) => {
          console.error('EventSource connection error:', err)
        }
      } catch (e) {
        console.error('Failed to establish SSE ticket connection:', e)
      }
    }

    connectSSE()

    return () => {
      isCancelled = true
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [token, queryClient, request, showToast])

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500 selection:text-white">
      <Navbar />
      {rebuildStatus && rebuildStatus.status === 'rebuilding' && (
        <div className="bg-blue-950/80 border-b border-blue-500/20 px-6 py-3 flex items-center justify-between shadow-md animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 dot-glow glow-blue animate-pulse shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-white">🔄 Search index rebuilding...</span>
              <span className="text-slate-400 ml-2 font-medium">System is synchronizing data after database restore. Search results may be incomplete.</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-32 bg-slate-805 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${rebuildStatus.progress}%` }}
              />
            </div>
            <span className="text-xs font-bold text-blue-405 font-mono">{rebuildStatus.progress}%</span>
          </div>
        </div>
      )}
      <SessionTimeoutManager />
      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={
            <ErrorBoundary>
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            </ErrorBoundary>
          } />
          <Route path="/inventory" element={
            <ErrorBoundary>
              <ProtectedRoute>
                <InventoryPage />
              </ProtectedRoute>
            </ErrorBoundary>
          } />
          <Route path="/dies/:id" element={
            <ErrorBoundary>
              <ProtectedRoute>
                <DieDetailPage />
              </ProtectedRoute>
            </ErrorBoundary>
          } />
          <Route path="/machines" element={
            <ErrorBoundary>
              <ProtectedRoute>
                <MachineSetsPage />
              </ProtectedRoute>
            </ErrorBoundary>
          } />
          <Route path="/import" element={
            <ErrorBoundary>
              <ProtectedRoute allowedRoles={['ADMIN', 'ROOT']}>
                <ImportPage />
              </ProtectedRoute>
            </ErrorBoundary>
          } />
          <Route path="/users" element={
            <ErrorBoundary>
              <ProtectedRoute allowedRoles={['ROOT']}>
                <UsersPage />
              </ProtectedRoute>
            </ErrorBoundary>
          } />
          <Route path="/history" element={
            <ErrorBoundary>
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            </ErrorBoundary>
          } />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </Suspense>
    </div>
  )
}

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { token, role } = useAuth()

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    return <Navigate to="/" replace />
  }

  return children
}


function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <NotificationProvider>
              <AnnouncementProvider>
                <Router>
                  <AppContent />
                </Router>
              </AnnouncementProvider>
            </NotificationProvider>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
