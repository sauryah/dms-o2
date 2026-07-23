import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { Navbar } from './components/Navbar'
import { ErrorBoundary } from './components/ErrorBoundary'
import { CommandPalette } from './components/CommandPalette'
import { SessionTimeoutManager } from './components/SessionTimeoutManager'
import { Footer } from './components/Footer'
import { AuthProvider, ToastProvider, NotificationProvider, AnnouncementProvider, useAuth, useToast, useNotifications, useAnnouncer } from './contexts'
import { useRealtimeSync } from './hooks/useRealtimeSync'
import { lazyWithRetry } from './utils/lazyWithRetry'

const DashboardPage = lazyWithRetry(() => import('./features/dashboard/components/DashboardPage').then(m => ({ default: m.DashboardPage })))
const InventoryPage = lazyWithRetry(() => import('./features/inventory/components/InventoryPage').then(m => ({ default: m.InventoryPage })))
const DieDetailPage = lazyWithRetry(() => import('./features/inventory/components/DieDetailPage').then(m => ({ default: m.DieDetailPage })))
const MachineSetsPage = lazyWithRetry(() => import('./pages/MachineSetsPage').then(m => ({ default: m.MachineSetsPage })))
const ImportPage = lazyWithRetry(() => import('./pages/ImportPage').then(m => ({ default: m.ImportPage })))
const UsersPage = lazyWithRetry(() => import('./pages/UsersPage').then(m => ({ default: m.UsersPage })))
const HistoryPage = lazyWithRetry(() => import('./pages/HistoryPage').then(m => ({ default: m.HistoryPage })))
const LoginPage = lazyWithRetry(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })))
const SettingsPage = lazyWithRetry(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const CalculatorPage = lazyWithRetry(() => import('./pages/CalculatorPage').then(m => ({ default: m.CalculatorPage })))
const ToolsPage = lazyWithRetry(() => import('./pages/ToolsPage').then(m => ({ default: m.ToolsPage })))
const WireDrawingCalculatorPage = lazyWithRetry(() => import('./pages/WireDrawingCalculatorPage').then(m => ({ default: m.WireDrawingCalculatorPage })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
    },
  },
})

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
  const { showToast } = useToast()
  const { addNotification } = useNotifications()
  const announce = useAnnouncer()
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
      const res = await fetch('/api/go/index-status', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      if (!res.ok) return
      const data = await res.json()
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
  }, [rebuildStatus, showToast, addNotification, announce, token])

  useRealtimeSync({
    onShowToast: showToast,
    onAddNotification: addNotification,
    onAnnounce: announce,
    onRebuildDetected: () => setIsPolling(true),
  })

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
    const interval = setInterval(checkIndexStatus, 2000)
    return () => clearInterval(interval)
  }, [isPolling, token, checkIndexStatus])

  useEffect(() => {
    const handleTriggerPolling = () => setIsPolling(true)
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

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500 selection:text-white flex flex-col">
      <div className="flex-grow">
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
            <Route path="/dies/*" element={
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
                <ProtectedRoute allowedRoles={['ADMIN', 'ROOT']}>
                  <HistoryPage />
                </ProtectedRoute>
              </ErrorBoundary>
            } />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/settings" element={
              <ErrorBoundary>
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              </ErrorBoundary>
            } />
            <Route path="/calculator" element={
              <ErrorBoundary>
                <ProtectedRoute requireToolAuth toolId="sizing-calculator">
                  <CalculatorPage />
                </ProtectedRoute>
              </ErrorBoundary>
            } />
            <Route path="/wire-drawing-calculator" element={
              <ErrorBoundary>
                <ProtectedRoute requireToolAuth toolId="wire-drawing-calculator">
                  <WireDrawingCalculatorPage />
                </ProtectedRoute>
              </ErrorBoundary>
            } />
            <Route path="/tools" element={
              <ErrorBoundary>
                <ProtectedRoute requireToolAuth>
                  <ToolsPage />
                </ProtectedRoute>
              </ErrorBoundary>
            } />
          </Routes>
        </Suspense>
      </div>
      <Footer />
    </div>
  )
}

interface ProtectedRouteProps {
  children: React.ReactElement
  allowedRoles?: string[]
  requireToolAuth?: boolean
  toolId?: string
}

export function ProtectedRoute({ children, allowedRoles, requireToolAuth, toolId }: ProtectedRouteProps) {
  const { token, role, isAuthorizedForTools, authorizedTools } = useAuth()

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    return <Navigate to="/" replace />
  }

  if (requireToolAuth) {
    const isRoot = role === 'ROOT'
    if (!isRoot && !isAuthorizedForTools) {
      return <Navigate to="/" replace />
    }
    if (toolId && !isRoot) {
      const userTools = authorizedTools || []
      if (!userTools.includes(toolId)) {
        return <Navigate to="/tools" replace />
      }
    }
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
