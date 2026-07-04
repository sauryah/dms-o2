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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-lg font-bold font-heading text-slate-100 flex items-center gap-2">
          Session Timeout Warning
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
