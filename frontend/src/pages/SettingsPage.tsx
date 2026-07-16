import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, ArrowLeft, Check, Eye, EyeOff, Sliders, Database } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useApi } from '../hooks/useApi'
import { BackupManager } from './users/BackupManager'

export function SettingsPage() {
  const { request } = useApi()
  const { username, role, login, isAuthorizedForTools } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<'account' | 'tolerances' | 'backups'>('account')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Die Tolerances config state
  const [tolerances, setTolerances] = useState<any[]>([])
  const [isLoadingTolerances, setIsLoadingTolerances] = useState(false)
  const [isSubmittingTolerances, setIsSubmittingTolerances] = useState(false)
  const [tolError, setTolError] = useState('')
  const [tolSuccess, setTolSuccess] = useState('')

  const fetchTolerances = async () => {
    setIsLoadingTolerances(true)
    setTolError('')
    try {
      const data = await request('/api/v1/tolerances/')
      setTolerances(data.results || [])
    } catch (err: any) {
      setTolError('Failed to load tolerance settings.')
    } finally {
      setIsLoadingTolerances(false)
    }
  }

  useEffect(() => {
    if (role === 'ADMIN' || role === 'ROOT') {
      fetchTolerances()
    }
  }, [role])

  const getToleranceField = (type: 'ROUND' | 'FLAT', field: 'max_wear_mm' | 'warning_percentage' | 'critical_percentage') => {
    const existing = tolerances.find(t => t.die_type === type)
    if (existing) {
      return existing[field]
    }
    if (field === 'max_wear_mm') {
      return type === 'ROUND' ? '0.050' : '0.100'
    }
    if (field === 'warning_percentage') return 70
    return 90
  }

  const handleToleranceChange = (type: 'ROUND' | 'FLAT', field: string, value: any) => {
    setTolerances(prev => {
      const existingIdx = prev.findIndex(t => t.die_type === type)
      if (existingIdx !== -1) {
        const updated = [...prev]
        updated[existingIdx] = { ...updated[existingIdx], [field]: value }
        return updated
      } else {
        const newItem = {
          die_type: type,
          max_wear_mm: type === 'ROUND' ? '0.050' : '0.100',
          warning_percentage: 70,
          critical_percentage: 90,
          [field]: value
        }
        return [...prev, newItem]
      }
    })
  }

  const handleSaveTolerances = async (e: React.FormEvent) => {
    e.preventDefault()
    setTolError('')
    setTolSuccess('')
    setIsSubmittingTolerances(true)

    try {
      const roundTol = tolerances.find(t => t.die_type === 'ROUND') || {
        die_type: 'ROUND',
        max_wear_mm: '0.050',
        warning_percentage: 70,
        critical_percentage: 90
      }
      const flatTol = tolerances.find(t => t.die_type === 'FLAT') || {
        die_type: 'FLAT',
        max_wear_mm: '0.100',
        warning_percentage: 70,
        critical_percentage: 90
      }

      const saveItem = async (item: any) => {
        const payload = {
          die_type: item.die_type,
          max_wear_mm: item.max_wear_mm,
          warning_percentage: parseInt(item.warning_percentage),
          critical_percentage: parseInt(item.critical_percentage)
        }
        if (item.id) {
          return await request(`/api/v1/tolerances/${item.id}/`, {
            method: 'PUT',
            body: JSON.stringify(payload)
          })
        } else {
          return await request('/api/v1/tolerances/', {
            method: 'POST',
            body: JSON.stringify(payload)
          })
        }
      }

      const resRound = await saveItem(roundTol)
      const resFlat = await saveItem(flatTol)
      setTolerances([resRound, resFlat])
      setTolSuccess('Tolerance configurations saved successfully.')
    } catch (err: any) {
      setTolError(err.message || 'Failed to save tolerance settings.')
    } finally {
      setIsSubmittingTolerances(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }

    setIsSubmitting(true)
    try {
      const data = await request('/api/auth/change-password/', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      })
      login(data.token, data.refresh || '', role || '', username || '', undefined, isAuthorizedForTools)
      setSuccess('Password changed successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setError(err.message || 'Failed to change password.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Settings Center Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-900/60">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-200 transition font-mono uppercase tracking-wider cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Exit Settings</span>
        </button>
        <div className="text-right">
          <h1 className="text-lg font-bold text-white tracking-tight">System Configuration Center</h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5 uppercase tracking-wider">Configure wear tolerances, account credentials, and recovery pipelines</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar tabbed navigation */}
        <div className="lg:col-span-3 space-y-2 select-none">
          <button
            onClick={() => setActiveTab('account')}
            className={`w-full text-left p-3.5 rounded-xl border flex items-center gap-3.5 transition cursor-pointer ${
              activeTab === 'account'
                ? 'bg-blue-600/10 border-blue-900/30 text-blue-400 font-semibold shadow-[0_0_12px_rgba(59,130,246,0.1)]'
                : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300 hover:bg-[#070d19]/45'
            }`}
          >
            <KeyRound className="h-4 w-4" />
            <div>
              <span className="text-xs block font-bold uppercase tracking-wider">Account Credentials</span>
              <span className="text-xs text-slate-500 block font-normal mt-0.5">Password & identity credentials</span>
            </div>
          </button>

          {(role === 'ADMIN' || role === 'ROOT') && (
            <button
              onClick={() => setActiveTab('tolerances')}
              className={`w-full text-left p-3.5 rounded-xl border flex items-center gap-3.5 transition cursor-pointer ${
                activeTab === 'tolerances'
                  ? 'bg-blue-600/10 border-blue-900/30 text-blue-400 font-semibold shadow-[0_0_12px_rgba(59,130,246,0.1)]'
                  : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300 hover:bg-[#070d19]/45'
              }`}
            >
              <Sliders className="h-4 w-4" />
              <div>
                <span className="text-xs block font-bold uppercase tracking-wider">Wear Tolerances</span>
                <span className="text-xs text-slate-500 block font-normal mt-0.5">Alert limits & calibrations</span>
              </div>
            </button>
          )}

          {role === 'ROOT' && (
            <button
              onClick={() => setActiveTab('backups')}
              className={`w-full text-left p-3.5 rounded-xl border flex items-center gap-3.5 transition cursor-pointer ${
                activeTab === 'backups'
                  ? 'bg-blue-600/10 border-blue-900/30 text-blue-400 font-semibold shadow-[0_0_12px_rgba(59,130,246,0.1)]'
                  : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300 hover:bg-[#070d19]/45'
              }`}
            >
              <Database className="h-4 w-4" />
              <div>
                <span className="text-xs block font-bold uppercase tracking-wider">Backup & Recovery</span>
                <span className="text-xs text-slate-500 block font-normal mt-0.5">Database dumps & imports</span>
              </div>
            </button>
          )}
        </div>

        {/* Dynamic settings viewport */}
        <div className="lg:col-span-9 bg-[#060a13]/85 backdrop-blur-md border border-slate-900 rounded-xl p-6 sm:p-8 shadow-2xl relative min-h-[420px]">
          
          {activeTab === 'account' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="pb-4 border-b border-slate-900/60">
                <h2 className="text-[#F8FAFC] text-sm font-semibold tracking-tight uppercase">Update Password</h2>
                <span className="text-slate-500 text-xs block mt-1 font-mono">Ensure a strong authentication secret to protect your account session</span>
              </div>

              {/* Profile metadata panel */}
              <div className="bg-slate-950/50 border border-slate-900/80 rounded-xl p-4 grid grid-cols-2 gap-4 text-xs font-mono select-none">
                <div>
                  <span className="text-slate-550 block uppercase font-bold text-[10px] tracking-wider">Active Operator</span>
                  <span className="text-[#F8FAFC] font-bold mt-1 block">{username}</span>
                </div>
                <div>
                  <span className="text-slate-550 block uppercase font-bold text-[10px] tracking-wider">Access Authorization</span>
                  <span className="text-blue-400 font-bold mt-1 block">{role}</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-[#03060c] border border-slate-900 rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/80 focus:ring-4 focus:ring-blue-950/20 transition-all font-mono"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                    >
                      {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-[#03060c] border border-slate-900 rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/80 focus:ring-4 focus:ring-blue-950/20 transition-all font-mono"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#03060c] border border-slate-900 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/80 focus:ring-4 focus:ring-blue-950/20 transition-all font-mono"
                    placeholder="Confirm new password"
                  />
                </div>

                {error && (
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-xs text-rose-400 font-mono">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-xs text-emerald-400 flex items-center gap-2 font-mono">
                    <Check className="h-4 w-4" />
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-500 hover:to-indigo-550 text-white font-bold py-3 px-6 rounded-xl transition shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer uppercase tracking-wider text-xs font-sans"
                >
                  {isSubmitting ? 'Changing Password...' : 'Change Password'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'tolerances' && (role === 'ADMIN' || role === 'ROOT') && (
            <div className="space-y-6 animate-fadeIn">
              <div className="pb-4 border-b border-slate-900/60">
                <h2 className="text-[#F8FAFC] text-sm font-semibold tracking-tight uppercase">Die Tolerance Configurations</h2>
                <span className="text-slate-500 text-xs block mt-1 font-mono">Configure maximum wear thresholds and warning limits per die profile type</span>
              </div>

              {isLoadingTolerances ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
                </div>
              ) : (
                <form onSubmit={handleSaveTolerances} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Round Dies Settings Card */}
                    <div className="space-y-4 bg-slate-950/40 p-5 border border-slate-900 rounded-xl">
                      <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Round Dies</h3>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Max Wear Limit (mm)</label>
                        <input
                          type="number"
                          step="0.001"
                          min="0.001"
                          value={getToleranceField('ROUND', 'max_wear_mm')}
                          onChange={(e) => handleToleranceChange('ROUND', 'max_wear_mm', e.target.value)}
                          className="w-full bg-[#03060c] border border-slate-900 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-550/80 focus:ring-4 focus:ring-blue-950/25 transition-all font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Warning (%)</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={getToleranceField('ROUND', 'warning_percentage')}
                            onChange={(e) => handleToleranceChange('ROUND', 'warning_percentage', e.target.value)}
                            className="w-full bg-[#03060c] border border-slate-900 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-550/80 focus:ring-4 focus:ring-blue-950/25 transition-all font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Critical (%)</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={getToleranceField('ROUND', 'critical_percentage')}
                            onChange={(e) => handleToleranceChange('ROUND', 'critical_percentage', e.target.value)}
                            className="w-full bg-[#03060c] border border-slate-900 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-550/80 focus:ring-4 focus:ring-blue-950/25 transition-all font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Flat Dies Settings Card */}
                    <div className="space-y-4 bg-slate-950/40 p-5 border border-slate-900 rounded-xl">
                      <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Flat Dies</h3>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Max Wear Limit (mm)</label>
                        <input
                          type="number"
                          step="0.001"
                          min="0.001"
                          value={getToleranceField('FLAT', 'max_wear_mm')}
                          onChange={(e) => handleToleranceChange('FLAT', 'max_wear_mm', e.target.value)}
                          className="w-full bg-[#03060c] border border-slate-900 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-550/80 focus:ring-4 focus:ring-blue-950/25 transition-all font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Warning (%)</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={getToleranceField('FLAT', 'warning_percentage')}
                            onChange={(e) => handleToleranceChange('FLAT', 'warning_percentage', e.target.value)}
                            className="w-full bg-[#03060c] border border-slate-900 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-550/80 focus:ring-4 focus:ring-blue-950/25 transition-all font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Critical (%)</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={getToleranceField('FLAT', 'critical_percentage')}
                            onChange={(e) => handleToleranceChange('FLAT', 'critical_percentage', e.target.value)}
                            className="w-full bg-[#03060c] border border-slate-900 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-550/80 focus:ring-4 focus:ring-blue-950/25 transition-all font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {tolError && (
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-xs text-rose-400 font-mono">
                      {tolError}
                    </div>
                  )}

                  {tolSuccess && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-xs text-emerald-400 flex items-center gap-2 font-mono">
                      <Check className="h-4 w-4" />
                      {tolSuccess}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmittingTolerances}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-500 hover:to-indigo-550 text-white font-bold py-3 px-6 rounded-xl transition shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer uppercase tracking-wider text-xs font-sans font-bold"
                  >
                    {isSubmittingTolerances ? 'Saving Configurations...' : 'Save Tolerance Configurations'}
                  </button>
                </form>
              )}
            </div>
          )}

          {activeTab === 'backups' && role === 'ROOT' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="pb-4 border-b border-slate-900/60">
                <h2 className="text-[#F8FAFC] text-sm font-semibold tracking-tight uppercase">Database Backup & Recovery</h2>
                <span className="text-slate-500 text-xs block mt-1 font-mono">Generate PostgreSQL backup archives, upload dumps, or restore physical states</span>
              </div>

              <BackupManager />
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
