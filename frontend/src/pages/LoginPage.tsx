import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AlertCircle, RefreshCw, Globe, Shield, KeyRound, ArrowLeft } from 'lucide-react'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [usernameInput, setUsernameInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [mfaPending, setMfaPending] = useState<{ token: string; username: string } | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [serverInfo, setServerInfo] = useState<{ hostname: string; ip: string } | null>(null)
  const [detectedClientIp, setDetectedClientIp] = useState<string>('')
  const [evictedInfo] = useState<{ ip: string | null; at: string | null } | null>(() => {
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

    // Non-blocking browser IP discovery (zero downloads, runs natively in browser)
    fetch('https://api64.ipify.org?format=json')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.ip) {
          setDetectedClientIp(data.ip)
          sessionStorage.setItem('dms_client_ip', data.ip)
        }
      })
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
      if (detectedClientIp) {
        headers['X-Client-Device-IP'] = detectedClientIp
      }

      if (mfaPending) {
        // MFA verification step
        const res = await fetch('/api/v1/auth/mfa/verify/', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            mfa_token: mfaPending.token,
            code: mfaCode.trim(),
            client_ip: detectedClientIp || undefined
          })
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          const msg = errData.detail || 'Invalid verification code'
          throw new Error(msg)
        }
        const data = await res.json()
        login(data.token, data.refresh, data.role, mfaPending.username, undefined, data.is_authorized_for_tools, data.authorized_tools)
        navigate('/')
        return
      }

      // Initial username/password step
      const res = await fetch('/api/v1/auth/login/', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          username: usernameInput,
          password: passwordInput,
          client_ip: detectedClientIp || undefined
        })
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        const msg = errData.detail || (Array.isArray(errData.non_field_errors) ? errData.non_field_errors[0] : null) || errData.error || 'Invalid username or password'
        throw new Error(msg)
      }
      const data = await res.json()
      if (data.mfa_required) {
        setMfaPending({ token: data.mfa_token, username: data.username })
        setMfaCode('')
        return
      }
      login(data.token, data.refresh, data.role, usernameInput, undefined, data.is_authorized_for_tools, data.authorized_tools)
      navigate('/')
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#0a0a0a] font-mono">
      <div className="max-w-sm w-full space-y-6 bg-[#0f0f0f] border border-[#2a2a2a] p-6 rounded-sm shadow-2xl font-mono">
        <div className="border-b border-[#1a1a1a] pb-3 text-left">
          <div className="flex items-center space-x-2 text-blue-400 mb-1">
            {mfaPending ? <KeyRound className="h-4 w-4 text-emerald-400" /> : <Shield className="h-4 w-4" />}
            <span className="text-xs uppercase tracking-wider font-bold">
              {mfaPending ? '02 TWO-FACTOR AUTH' : '01 SYSTEM ACCESS'}
            </span>
          </div>
          <h2 className="text-sm font-medium text-[#e4e4e4] uppercase tracking-[0.05em]">
            {mfaPending ? 'Security Verification' : 'Facility Credentials'}
          </h2>
          <p className="text-xs text-[#6b7280] mt-0.5">
            {mfaPending 
              ? `Enter the 6-digit TOTP code generated for user ${mfaPending.username}.`
              : 'Authenticate to manage manufacturing assets and line tools.'}
          </p>
        </div>

        {evictedInfo && !mfaPending && (
          <div className="bg-[#141414] border border-amber-500/30 text-amber-300 rounded-sm p-3 text-xs font-mono text-left">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span className="font-bold text-amber-200 uppercase">Session Evicted</span>
            </div>
            <p className="text-[#6b7280] leading-normal text-[11px]">
              Logged in from another location. Previous token revoked.
            </p>
            {(evictedInfo.ip || evictedInfo.at) && (
              <div className="mt-1.5 pt-1.5 border-t border-[#2a2a2a] text-[10px] text-[#6b7280] font-mono flex flex-wrap gap-x-3">
                {evictedInfo.ip && <span>IP: {evictedInfo.ip}</span>}
                {evictedInfo.at && <span>TIME: {evictedInfo.at}</span>}
              </div>
            )}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {mfaPending ? (
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-[#6b7280] uppercase tracking-wider mb-1 font-mono">
                  6-Digit Authenticator Code
                </label>
                <input 
                  type="text" 
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoFocus
                  required
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-[#0a0a0a] border border-emerald-500/60 focus:border-emerald-400 rounded-sm py-2.5 px-3 text-center text-lg tracking-[0.3em] text-emerald-300 focus:outline-none font-mono placeholder-[#404040]"
                  placeholder="000000"
                  autoComplete="one-time-code"
                  aria-label="6-Digit Verification Code"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-[#6b7280] uppercase tracking-wider mb-1 font-mono">Username</label>
                <input 
                  type="text" 
                  required
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm py-2 px-3 text-[#e4e4e4] focus:outline-none text-xs font-mono placeholder-[#404040]"
                  placeholder="Username ID"
                  autoComplete="username"
                  aria-label="Username"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#6b7280] uppercase tracking-wider mb-1 font-mono">Password</label>
                <input 
                  type="password" 
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm py-2 px-3 text-[#e4e4e4] focus:outline-none text-xs font-mono placeholder-[#404040]"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  aria-label="Password"
                />
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="bg-[#141414] border border-red-500/30 text-red-400 rounded-sm p-2.5 text-xs flex items-center gap-2 font-mono">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button 
            type="submit"
            disabled={loading || (mfaPending !== null && mfaCode.length < 6)}
            className={`w-full bg-[#141414] hover:bg-[#1f1f1f] border ${mfaPending ? 'border-emerald-500/50 text-emerald-400 hover:text-emerald-300' : 'border-blue-500/50 text-blue-400 hover:text-blue-300'} py-2 rounded-sm text-xs font-mono uppercase font-bold transition flex items-center justify-center space-x-1.5 disabled:opacity-40 cursor-pointer`}
          >
            {loading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <span>{mfaPending ? 'Verify & Sign In' : 'Sign In'}</span>
            )}
          </button>

          {mfaPending && (
            <button
              type="button"
              onClick={() => {
                setMfaPending(null)
                setMfaCode('')
                setErrorMsg(null)
              }}
              className="w-full text-[11px] text-[#6b7280] hover:text-[#9ca3af] flex items-center justify-center gap-1.5 py-1 font-mono transition cursor-pointer"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Back to Username / Password</span>
            </button>
          )}
        </form>

        {serverInfo && (
          <div className="text-center pt-3 border-t border-[#1a1a1a]">
            <p className="text-[10px] text-[#6b7280] font-mono flex items-center justify-center gap-1.5 uppercase">
              <Globe className="h-3 w-3 text-blue-500" />
              <span>HOST: {serverInfo.ip}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
