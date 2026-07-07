import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'

import { Navbar } from './components/Navbar'
import { ErrorBoundary } from './components/ErrorBoundary'
import { CommandPalette } from './components/CommandPalette'
import { SessionTimeoutManager } from './components/SessionTimeoutManager'
import { AuthProvider, ToastProvider, NotificationProvider, AnnouncementProvider, useAuth, useToast, useNotifications, useAnnouncer } from './contexts'
import { useApi } from './hooks/useApi'
import { DIE_UPDATE_EVENT, SET_UPDATE_EVENT, MACHINE_UPDATE_EVENT, BACKUP_UPDATE_EVENT } from './contracts/dieContracts'

const DashboardPage = React.lazy(() => import('./features/dashboard/components/DashboardPage').then(m => ({ default: m.DashboardPage })))
const InventoryPage = React.lazy(() => import('./features/inventory/components/InventoryPage').then(m => ({ default: m.InventoryPage })))
const DieDetailPage = React.lazy(() => import('./features/inventory/components/DieDetailPage').then(m => ({ default: m.DieDetailPage })))
const MachineSetsPage = React.lazy(() => import('./pages/MachineSetsPage').then(m => ({ default: m.MachineSetsPage })))
const ImportPage = React.lazy(() => import('./pages/ImportPage').then(m => ({ default: m.ImportPage })))
const UsersPage = React.lazy(() => import('./pages/UsersPage').then(m => ({ default: m.UsersPage })))
const HistoryPage = React.lazy(() => import('./pages/HistoryPage').then(m => ({ default: m.HistoryPage })))
const LoginPage = React.lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })))
const SettingsPage = React.lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))

const queryClient = new QueryClient()

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

            const signature = `${payload.type}-${payload.data?.id || payload.data?.filename || ''}-${payload.data?.action || ''}`
            if (recentEvents.current.has(signature)) {
              return
            }
            recentEvents.current.add(signature)
            setTimeout(() => {
              recentEvents.current.delete(signature)
            }, 3000)

            queryClient.invalidateQueries()
            checkIndexStatus()

            if (payload.type === DIE_UPDATE_EVENT) {
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
            } else if (payload.type === SET_UPDATE_EVENT) {
              const msg = 'Die sets have been updated.'
              showToast(msg, 'info')
              addNotification('Die Sets Updated', msg, 'info')
              announce(msg)
            } else if (payload.type === MACHINE_UPDATE_EVENT) {
              const msg = 'Machine configurations have been updated.'
              showToast(msg, 'info')
              addNotification('Machines Updated', msg, 'info')
              announce(msg)
            } else if (payload.type === BACKUP_UPDATE_EVENT) {
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
  }, [token, queryClient, request, showToast, checkIndexStatus])

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500 selection:text-white">
      <Navbar />
      {rebuildStatus && rebuildStatus.status === 'rebuilding' && (
        <div className="bg-blue-950/80 border-b border-blue-500/20 px-6 py-3 flex items-center justify-between shadow-md animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 dot-glow glow-blue animate-pulse shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-white">Search index rebuilding...</span>
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
          <Route path="/settings" element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          } />
        </Routes>
      </Suspense>
    </div>
  )
}

interface ProtectedRouteProps {
  children: React.ReactElement
  allowedRoles?: string[]
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
