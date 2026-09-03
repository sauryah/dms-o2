import { useState, useEffect } from 'react'
import { WifiOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export type ConnectionState = 'connected' | 'reconnecting' | 'disconnected'

export function ConnectionStatusBadge() {
  const { token } = useAuth()
  const [status, setStatus] = useState<ConnectionState>(() => (navigator.onLine && token ? 'connected' : 'disconnected'))

  useEffect(() => {
    if (!token) {
      setStatus('disconnected')
      return
    }

    const handleSSEStatus = (e: Event) => {
      const customEvent = e as CustomEvent<{ status: ConnectionState }>
      if (customEvent.detail?.status) {
        setStatus(customEvent.detail.status)
      }
    }

    const handleOnline = () => setStatus('reconnecting')
    const handleOffline = () => setStatus('disconnected')

    window.addEventListener('sse-status', handleSSEStatus)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('sse-status', handleSSEStatus)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [token])

  if (!token) return null

  if (status === 'connected') {
    return (
      <div 
        className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono select-none"
        title="Real-time Server-Sent Events stream connected"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-bold tracking-wider uppercase">LIVE</span>
      </div>
    )
  }

  if (status === 'reconnecting') {
    return (
      <div 
        className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-amber-950/40 border border-amber-500/30 text-amber-400 text-[10px] font-mono select-none"
        title="Attempting to re-establish real-time stream connection"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
        <span className="font-bold tracking-wider uppercase">SYNCING</span>
      </div>
    )
  }

  return (
    <div 
      className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-red-950/40 border border-red-500/30 text-red-400 text-[10px] font-mono select-none"
      title="Real-time event stream disconnected"
    >
      <WifiOff className="w-2.5 h-2.5" />
      <span className="font-bold tracking-wider uppercase">OFFLINE</span>
    </div>
  )
}
