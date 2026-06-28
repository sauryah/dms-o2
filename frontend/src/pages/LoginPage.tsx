import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AlertCircle, RefreshCw } from 'lucide-react'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [usernameInput, setUsernameInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput })
      })
      if (!res.ok) {
        throw new Error('Invalid username or password')
      }
      const data = await res.json()
      login(data.token, data.role, usernameInput)
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
      </div>
    </div>
  )
}

