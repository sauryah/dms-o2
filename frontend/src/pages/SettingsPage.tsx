import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, ArrowLeft, Check, Eye, EyeOff, Sliders } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useApi } from '../hooks/useApi'

export function SettingsPage() {
  const { request } = useApi()
  const { username, role, login, isAuthorizedForTools } = useAuth()
  const navigate = useNavigate()

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
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition mb-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border-b border-slate-800 px-6 sm:px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600/20 rounded-xl">
              <KeyRound className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Settings</h1>
              <p className="text-sm text-slate-400 mt-0.5">Change your account password</p>
            </div>
          </div>
        </div>

        <div className="px-6 sm:px-8 py-6 space-y-6">
          <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500 block">Username</span>
                <span className="text-white font-semibold">{username}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Role</span>
                <span className="text-white font-semibold">{role}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pr-10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showCurrent ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pr-10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirm new password"
              />
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-sm text-rose-400">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-emerald-400 flex items-center gap-2">
                <Check className="h-4 w-4" />
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Changing Password...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>

      {(role === 'ADMIN' || role === 'ROOT') && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600/10 to-blue-600/10 border-b border-slate-800 px-6 sm:px-8 py-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-600/20 rounded-xl">
                <Sliders className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Die Tolerance Configurations</h2>
                <p className="text-sm text-slate-400 mt-0.5">Configure warning and critical wear thresholds per die type</p>
              </div>
            </div>
          </div>

          <div className="px-6 sm:px-8 py-6 space-y-6">
            {isLoadingTolerances ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
              </div>
            ) : (
              <form onSubmit={handleSaveTolerances} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Round Dies Section */}
                  <div className="space-y-4 bg-slate-950/40 p-5 border border-slate-800/60 rounded-xl">
                    <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">Round Dies</h3>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Max Wear Limit (mm)</label>
                      <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        value={getToleranceField('ROUND', 'max_wear_mm')}
                        onChange={(e) => handleToleranceChange('ROUND', 'max_wear_mm', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Warning Threshold (%)</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={getToleranceField('ROUND', 'warning_percentage')}
                          onChange={(e) => handleToleranceChange('ROUND', 'warning_percentage', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Critical Threshold (%)</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={getToleranceField('ROUND', 'critical_percentage')}
                          onChange={(e) => handleToleranceChange('ROUND', 'critical_percentage', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Flat Dies Section */}
                  <div className="space-y-4 bg-slate-950/40 p-5 border border-slate-800/60 rounded-xl">
                    <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">Flat Dies</h3>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Max Wear Limit (mm)</label>
                      <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        value={getToleranceField('FLAT', 'max_wear_mm')}
                        onChange={(e) => handleToleranceChange('FLAT', 'max_wear_mm', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Warning Threshold (%)</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={getToleranceField('FLAT', 'warning_percentage')}
                          onChange={(e) => handleToleranceChange('FLAT', 'warning_percentage', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Critical Threshold (%)</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={getToleranceField('FLAT', 'critical_percentage')}
                          onChange={(e) => handleToleranceChange('FLAT', 'critical_percentage', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {tolError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-sm text-rose-400">
                    {tolError}
                  </div>
                )}

                {tolSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-emerald-400 flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    {tolSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingTolerances}
                  className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold py-3 px-6 rounded-xl transition shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingTolerances ? 'Saving Configurations...' : 'Save Tolerance Configurations'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
