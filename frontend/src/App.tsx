import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { 
  HashRouter as Router, 
  Routes, 
  Route, 
  useNavigate
} from 'react-router-dom'
import { 
  QueryClient, 
  QueryClientProvider, 
  useQueryClient 
} from '@tanstack/react-query'

// Component & Page Imports
import { Navbar } from './components/Navbar'
import { ErrorBoundary } from './components/ErrorBoundary'
import { DashboardPage } from './pages/DashboardPage'
import { InventoryPage } from './pages/InventoryPage'
import { DieDetailPage } from './pages/DieDetailPage'
import { MachineSetsPage } from './pages/MachineSetsPage'
import { ImportPage } from './pages/ImportPage'
import { UsersPage } from './pages/UsersPage'
import { LoginPage } from './pages/LoginPage'

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
  const [token, setToken] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)

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
        if (data && typeof data === 'object' && 'results' in data && Array.isArray(data.results)) {
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

// Main App Container
function AppContent() {
  const { token } = useAuth()
  const { request } = useApi()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const recentEvents = useRef(new Set<string>())

  useEffect(() => {
    if (!token) return

    // Establish EventSource connection
    const eventSource = new EventSource(`/api/events/?token=${encodeURIComponent(token)}`)

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
            showToast(`Die ${payload.data.id} has been deleted.`, 'info')
          } else if (payload.data?.action === 'bulk_import') {
            showToast('Bulk import of dies completed.', 'success')
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
                showToast(`Die ${die.die_id} is now ${die.status}${locationMsg}.`, 'info')
              })
              .catch(() => {
                showToast(`Die ${payload.data.id} was updated.`, 'info')
              })
          }
        } else if (payload.type === 'set_update') {
          showToast('Die sets have been updated.', 'info')
        } else if (payload.type === 'machine_update') {
          showToast('Machine configurations have been updated.', 'info')
        } else if (payload.type === 'backup_update') {
          const action = payload.data?.action
          const filename = payload.data?.filename || ''
          if (action === 'backup') {
            showToast(`Database backup "${filename}" created successfully.`, 'success')
          } else if (action === 'restore') {
            showToast(`Database restore from "${filename}" executed successfully.`, 'success')
          } else if (action === 'delete') {
            showToast(`Backup "${filename}" deleted.`, 'info')
          } else if (action === 'upload') {
            showToast(`Backup "${filename}" uploaded successfully.`, 'success')
          }
        }
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
  }, [token, queryClient, request, showToast])

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500 selection:text-white">
      <Navbar />
      <SessionTimeoutManager />
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/inventory" element={<ErrorBoundary><InventoryPage /></ErrorBoundary>} />
        <Route path="/dies/:id" element={<ErrorBoundary><DieDetailPage /></ErrorBoundary>} />
        <Route path="/machines" element={<ErrorBoundary><MachineSetsPage /></ErrorBoundary>} />
        <Route path="/import" element={<ErrorBoundary><ImportPage /></ErrorBoundary>} />
        <Route path="/users" element={<ErrorBoundary><UsersPage /></ErrorBoundary>} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <Router>
              <AppContent />
            </Router>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
