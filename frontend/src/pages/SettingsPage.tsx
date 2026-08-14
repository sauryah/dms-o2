import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, ArrowLeft, Check, Eye, EyeOff, Sliders, Database, Shield } from 'lucide-react'
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

  useEffect(() => {
    if (!tolSuccess && !tolError) return
    const timer = setTimeout(() => {
      setTolSuccess('')
      setTolError('')
    }, 5000)
    return () => clearTimeout(timer)
  }, [tolSuccess, tolError])

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
      if (data.token) {
        login(data.token, data.refresh || '', role || '', username || '', undefined, isAuthorizedForTools)
      }
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-mono">
      {/* Settings Center Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-[#2a2a2a]">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs text-[#6b7280] hover:text-[#e4e4e4] bg-[#141414] border border-[#2a2a2a] px-3 py-1 rounded-sm transition font-mono uppercase cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-blue-500" />
          <span>Exit Settings</span>
        </button>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5 text-xs text-[#6b7280] uppercase tracking-wider mb-0.5">
            <Shield className="h-3.5 w-3.5 text-blue-500" />
            <span>01 SYSTEM CONFIGURATION</span>
          </div>
          <h1 className="text-base font-medium text-[#e4e4e4] uppercase tracking-[0.05em]">Facility Configuration Center</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sidebar tabbed navigation */}
        <div className="lg:col-span-3 space-y-2 select-none font-mono">
          <button
            onClick={() => setActiveTab('account')}
            role="tab"
            aria-selected={activeTab === 'account'}
            aria-controls="panel-account"
            className={`w-full text-left p-3 rounded-sm border flex items-center gap-3 transition cursor-pointer ${
              activeTab === 'account'
                ? 'bg-[#0f0f0f] border-blue-500/50 text-blue-400 font-bold'
                : 'bg-[#0f0f0f] border-[#1a1a1a] text-[#6b7280] hover:text-[#e4e4e4]'
            }`}
          >
            <KeyRound className="h-4 w-4 shrink-0" />
            <div>
              <span className="text-xs block font-bold uppercase">Account Credentials</span>
              <span className="text-[10px] text-[#6b7280] block font-normal mt-0.5">Password & identity</span>
            </div>
          </button>

          {(role === 'ADMIN' || role === 'ROOT') && (
            <button
              onClick={() => setActiveTab('tolerances')}
              role="tab"
              aria-selected={activeTab === 'tolerances'}
              aria-controls="panel-tolerances"
              className={`w-full text-left p-3 rounded-sm border flex items-center gap-3 transition cursor-pointer ${
                activeTab === 'tolerances'
                  ? 'bg-[#0f0f0f] border-blue-500/50 text-blue-400 font-bold'
                  : 'bg-[#0f0f0f] border-[#1a1a1a] text-[#6b7280] hover:text-[#e4e4e4]'
              }`}
            >
              <Sliders className="h-4 w-4 shrink-0" />
              <div>
                <span className="text-xs block font-bold uppercase">Wear Tolerances</span>
                <span className="text-[10px] text-[#6b7280] block font-normal mt-0.5">Alert limits & calibrations</span>
              </div>
            </button>
          )}

          {role === 'ROOT' && (
            <button
              onClick={() => setActiveTab('backups')}
              role="tab"
              aria-selected={activeTab === 'backups'}
              aria-controls="panel-backups"
              className={`w-full text-left p-3 rounded-sm border flex items-center gap-3 transition cursor-pointer ${
                activeTab === 'backups'
                  ? 'bg-[#0f0f0f] border-blue-500/50 text-blue-400 font-bold'
                  : 'bg-[#0f0f0f] border-[#1a1a1a] text-[#6b7280] hover:text-[#e4e4e4]'
              }`}
            >
              <Database className="h-4 w-4 shrink-0" />
              <div>
                <span className="text-xs block font-bold uppercase">Backup & Recovery</span>
                <span className="text-[10px] text-[#6b7280] block font-normal mt-0.5">Database dumps & imports</span>
              </div>
            </button>
          )}
        </div>

        {/* Dynamic settings viewport */}
        <div className="lg:col-span-9 bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-5 sm:p-6 shadow-2xl relative min-h-[420px] font-mono">
          
          {activeTab === 'account' && (
            <div id="panel-account" role="tabpanel" className="space-y-4 animate-fadeIn">
              <div className="pb-3 border-b border-[#1a1a1a]">
                <h2 className="text-xs font-medium text-[#e4e4e4] uppercase tracking-[0.05em]">01 UPDATE PASSWORD</h2>
                <span className="text-[#6b7280] text-xs block mt-0.5">Ensure strong authentication credentials to protect your account session.</span>
              </div>

              {/* Profile metadata panel */}
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm p-3 grid grid-cols-2 gap-4 text-xs font-mono select-none">
                <div>
                  <span className="text-[#6b7280] block uppercase text-[10px]">Active Operator</span>
                  <span className="text-[#e4e4e4] font-bold mt-0.5 block">{username}</span>
                </div>
                <div>
                  <span className="text-[#6b7280] block uppercase text-[10px]">Authorization Role</span>
                  <span className="text-blue-400 font-bold mt-0.5 block">{role}</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 font-mono">
                <div>
                  <label className="block text-[10px] font-bold text-[#6b7280] uppercase tracking-wider mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm px-3 py-2 pr-9 text-xs text-[#e4e4e4] placeholder-[#404040] focus:outline-none font-mono"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      aria-label={showCurrent ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-2 text-[#6b7280] hover:text-[#e4e4e4] cursor-pointer"
                    >
                      {showCurrent ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#6b7280] uppercase tracking-wider mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm px-3 py-2 pr-9 text-xs text-[#e4e4e4] placeholder-[#404040] focus:outline-none font-mono"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      aria-label={showNew ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-2 text-[#6b7280] hover:text-[#e4e4e4] cursor-pointer"
                    >
                      {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  {newPassword.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-[10px] uppercase font-bold text-[#6b7280] tracking-wider">Password Requirements</p>
                      <div className="flex flex-wrap gap-3 text-[10px] font-mono">
                        <span className={`flex items-center gap-1 ${newPassword.length >= 8 ? 'text-emerald-400' : 'text-[#404040]'}`}>
                          <Check className="h-3 w-3" />
                          Min 8 characters
                        </span>
                        <span className={`flex items-center gap-1 ${/\d/.test(newPassword) ? 'text-emerald-400' : 'text-[#404040]'}`}>
                          <Check className="h-3 w-3" />
                          At least 1 number
                        </span>
                        <span className={`flex items-center gap-1 ${/[a-zA-Z]/.test(newPassword) ? 'text-emerald-400' : 'text-[#404040]'}`}>
                          <Check className="h-3 w-3" />
                          At least 1 letter
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#6b7280] uppercase tracking-wider mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-blue-500 rounded-sm px-3 py-2 text-xs text-[#e4e4e4] placeholder-[#404040] focus:outline-none font-mono"
                    placeholder="Confirm new password"
                  />
                </div>

                {error && (
                  <div className="bg-[#141414] border border-red-500/30 rounded-sm px-3 py-2 text-xs text-red-400 font-mono">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="bg-[#141414] border border-emerald-500/30 rounded-sm px-3 py-2 text-xs text-emerald-400 flex items-center gap-1.5 font-mono">
                    <Check className="h-3.5 w-3.5" />
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#141414] hover:bg-[#1f1f1f] border border-blue-500/50 text-blue-400 hover:text-blue-300 font-bold py-2 px-4 rounded-sm transition disabled:opacity-40 cursor-pointer uppercase tracking-wider text-xs font-mono"
                >
                  {isSubmitting ? 'Updating Password...' : 'Update Password'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'tolerances' && (role === 'ADMIN' || role === 'ROOT') && (
            <div id="panel-tolerances" role="tabpanel" className="space-y-4 animate-fadeIn">
              <div className="pb-3 border-b border-[#1a1a1a]">
                <h2 className="text-xs font-medium text-[#e4e4e4] uppercase tracking-[0.05em]">01 DIE TOLERANCE CONFIGURATIONS</h2>
                <span className="text-[#6b7280] text-xs block mt-0.5">Configure maximum wear thresholds and warning limits per die profile type.</span>
              </div>

              {isLoadingTolerances ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin h-6 w-6 border border-[#2a2a2a] border-t-blue-500" />
                </div>
              ) : (
                <form onSubmit={handleSaveTolerances} className="space-y-4 font-mono">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Round Dies Settings Card */}
                    <div className="space-y-3 bg-[#0a0a0a] p-4 border border-[#1a1a1a] rounded-sm">
                      <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Round Dies Profile</h3>
                      <div>
                        <label className="block text-[10px] font-bold text-[#6b7280] uppercase tracking-wider mb-1">Max Wear Limit (mm)</label>
                        <input
                          type="number"
                          step="0.001"
                          min="0.001"
                          value={getToleranceField('ROUND', 'max_wear_mm')}
                          onChange={(e) => handleToleranceChange('ROUND', 'max_wear_mm', e.target.value)}
                          className="w-full bg-[#141414] border border-[#2a2a2a] rounded-sm px-3 py-1.5 text-xs text-[#e4e4e4] focus:outline-none focus:border-blue-500 font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-[#6b7280] uppercase tracking-wider mb-1">Warning (%)</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={getToleranceField('ROUND', 'warning_percentage')}
                            onChange={(e) => handleToleranceChange('ROUND', 'warning_percentage', e.target.value)}
                            className="w-full bg-[#141414] border border-[#2a2a2a] rounded-sm px-3 py-1.5 text-xs text-[#e4e4e4] focus:outline-none focus:border-blue-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#6b7280] uppercase tracking-wider mb-1">Critical (%)</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={getToleranceField('ROUND', 'critical_percentage')}
                            onChange={(e) => handleToleranceChange('ROUND', 'critical_percentage', e.target.value)}
                            className="w-full bg-[#141414] border border-[#2a2a2a] rounded-sm px-3 py-1.5 text-xs text-[#e4e4e4] focus:outline-none focus:border-blue-500 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Flat Dies Settings Card */}
                    <div className="space-y-3 bg-[#0a0a0a] p-4 border border-[#1a1a1a] rounded-sm">
                      <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider">Flat Dies Profile</h3>
                      <div>
                        <label className="block text-[10px] font-bold text-[#6b7280] uppercase tracking-wider mb-1">Max Wear Limit (mm)</label>
                        <input
                          type="number"
                          step="0.001"
                          min="0.001"
                          value={getToleranceField('FLAT', 'max_wear_mm')}
                          onChange={(e) => handleToleranceChange('FLAT', 'max_wear_mm', e.target.value)}
                          className="w-full bg-[#141414] border border-[#2a2a2a] rounded-sm px-3 py-1.5 text-xs text-[#e4e4e4] focus:outline-none focus:border-blue-500 font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-[#6b7280] uppercase tracking-wider mb-1">Warning (%)</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={getToleranceField('FLAT', 'warning_percentage')}
                            onChange={(e) => handleToleranceChange('FLAT', 'warning_percentage', e.target.value)}
                            className="w-full bg-[#141414] border border-[#2a2a2a] rounded-sm px-3 py-1.5 text-xs text-[#e4e4e4] focus:outline-none focus:border-blue-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#6b7280] uppercase tracking-wider mb-1">Critical (%)</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={getToleranceField('FLAT', 'critical_percentage')}
                            onChange={(e) => handleToleranceChange('FLAT', 'critical_percentage', e.target.value)}
                            className="w-full bg-[#141414] border border-[#2a2a2a] rounded-sm px-3 py-1.5 text-xs text-[#e4e4e4] focus:outline-none focus:border-blue-500 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {tolError && (
                    <div className="bg-[#141414] border border-red-500/30 rounded-sm px-3 py-2 text-xs text-red-400 font-mono">
                      {tolError}
                    </div>
                  )}

                  {tolSuccess && (
                    <div className="bg-[#141414] border border-emerald-500/30 rounded-sm px-3 py-2 text-xs text-emerald-400 flex items-center gap-1.5 font-mono">
                      <Check className="h-3.5 w-3.5" />
                      {tolSuccess}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmittingTolerances}
                    className="w-full bg-[#141414] hover:bg-[#1f1f1f] border border-blue-500/50 text-blue-400 hover:text-blue-300 font-bold py-2 px-4 rounded-sm transition disabled:opacity-40 cursor-pointer uppercase tracking-wider text-xs font-mono"
                  >
                    {isSubmittingTolerances ? 'Saving Configurations...' : 'Save Tolerance Configurations'}
                  </button>
                </form>
              )}
            </div>
          )}

          {activeTab === 'backups' && role === 'ROOT' && (
            <div id="panel-backups" role="tabpanel" className="space-y-4 animate-fadeIn font-mono">
              <div className="pb-3 border-b border-[#1a1a1a]">
                <h2 className="text-xs font-medium text-[#e4e4e4] uppercase tracking-[0.05em]">01 DATABASE BACKUP & RECOVERY</h2>
                <span className="text-[#6b7280] text-xs block mt-0.5">Generate PostgreSQL backup archives, upload dumps, or restore physical states.</span>
              </div>

              <BackupManager />
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
