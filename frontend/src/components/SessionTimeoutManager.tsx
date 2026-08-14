import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useApi } from '../hooks/useApi'

export function SessionTimeoutManager() {
  const { token, logout } = useAuth()
  const { request } = useApi()
  const navigate = useNavigate()
  const [showWarning, setShowWarning] = useState(false)
  const [countdown, setCountdown] = useState(120)
  const lastActivity = useRef(Date.now())

  const IDLE_LIMIT = 28 * 60 * 1000
  const WARNING_LIMIT = 2 * 60 * 1000

  useEffect(() => {
    if (!token) {
      setShowWarning(false)
      return
    }

    // Reset last activity to current time when user logs in
    lastActivity.current = Date.now()

    const handleActivity = () => {
      lastActivity.current = Date.now()
    }

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
      logout()
      navigate('/login')
      setShowWarning(false)
    }
  }

  if (!showWarning) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0a0a0a]/80 font-mono">
      <div className="w-full max-w-md bg-[#0f0f0f] border border-[#2a2a2a] rounded-sm p-5 animate-fadeIn">
        <h3 className="text-xs font-medium uppercase tracking-[0.05em] text-[#e4e4e4] font-mono">
          SESSION TIMEOUT WARNING
        </h3>
        <p className="mt-2 text-xs text-[#6b7280] font-mono leading-relaxed">
          You have been idle for a while. For security reasons, you will be logged out in <span className="text-emerald-400 font-mono font-bold tabular-nums">{countdown}</span> seconds.
        </p>
        <div className="mt-4 pt-3 border-t border-[#1a1a1a] flex justify-end gap-2">
          <button
            onClick={() => {
              logout()
              navigate('/login')
              setShowWarning(false)
            }}
            className="px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider text-[#6b7280] hover:text-[#e4e4e4] bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] rounded-sm transition cursor-pointer"
          >
            Logout
          </button>
          <button
            onClick={stayLoggedIn}
            className="px-4 py-1.5 bg-[#141414] hover:bg-[#1f1f1f] text-emerald-400 hover:text-emerald-300 border border-emerald-500/50 text-xs font-mono uppercase tracking-wider rounded-sm transition cursor-pointer"
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  )
}
