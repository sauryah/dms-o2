import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AlertCircle, RefreshCw, Globe } from 'lucide-react'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [usernameInput, setUsernameInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [serverInfo, setServerInfo] = useState<{ hostname: string; ip: string } | null>(null)
  const [evictedInfo, setEvictedInfo] = useState<{ ip: string | null; at: string | null } | null>(() => {
    const reason = localStorage.getItem('dms_logout_reason')
    if (reason === 'session_evicted') {
      const ip = localStorage.getItem('dms_evicted_ip')
      let at = localStorage.getItem('dms_evicted_at')
      if (at) {
        try {
          at = new Date(at).toLocaleString()
        } catch { /* ignore parsing errors */ }
      }
      localStorage.removeItem('dms_logout_reason')
      localStorage.removeItem('dms_evicted_ip')
      localStorage.removeItem('dms_evicted_at')
      return { ip, at }
    }
    return null
  })

  useEffect(() => {
    fetch('/api/v1/server-info/')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setServerInfo(data) })
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/v1/auth/login/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ username: usernameInput, password: passwordInput })
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        const msg = errData.detail || (Array.isArray(errData.non_field_errors) ? errData.non_field_errors[0] : null) || errData.error || 'Invalid username or password'
        throw new Error(msg)
      }
      const data = await res.json()
      login(data.token, data.refresh, data.role, usernameInput, undefined, data.is_authorized_for_tools, data.authorized_tools)
      navigate('/')
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 blueprint-grid relative">
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none" />
      <div className="max-w-md w-full space-y-8 glass-panel border border-slate-800/60 p-10 rounded-2xl shadow-2xl relative z-10 animate-fadeIn">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-white tracking-tight font-heading">Sign In</h2>
          <p className="text-sm text-slate-400 mt-2">Enter your credentials to manage facility assets.</p>
        </div>

        {evictedInfo && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl p-4 text-xs font-sans animate-fadeIn text-left">
            <div className="flex items-center gap-2.5 mb-1.5">
              <AlertCircle className="h-4.5 w-4.5 text-amber-400 shrink-0" />
              <span className="font-bold text-amber-200">Session Evicted</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              This account was logged in from another device or browser. Your previous session was closed for security.
            </p>
            {(evictedInfo.ip || evictedInfo.at) && (
              <div className="mt-2 pt-2 border-t border-white/[0.04] text-[10px] text-slate-500 font-mono flex flex-wrap gap-x-4">
                {evictedInfo.ip && <span>IP: {evictedInfo.ip}</span>}
                {evictedInfo.at && <span>Time: {evictedInfo.at}</span>}
              </div>
            )}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 font-mono">Username</label>
              <input 
                type="text" 
                required
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full glass-input rounded-xl py-3 px-4 text-white focus:outline-none text-base focus-ring"
                autoComplete="username"
                aria-label="Username"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 font-mono">Password</label>
              <input 
                type="password" 
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full glass-input rounded-xl py-3 px-4 text-white focus:outline-none text-base focus-ring"
                autoComplete="current-password"
                aria-label="Password"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl p-3.5 text-xs font-medium flex items-center gap-2.5 font-sans animate-fadeIn">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-455" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition duration-300 btn-glow flex items-center justify-center space-x-2 disabled:opacity-50 focus-ring"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-white" />
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {serverInfo && (
          <div className="text-center mt-4 pt-4 border-t border-white/[0.04]">
            <p className="text-[10px] text-slate-500 font-mono flex items-center justify-center gap-1.5">
              <Globe className="h-3 w-3" />
              <span>LAN: https://{serverInfo.ip}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

