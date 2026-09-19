import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, ArrowLeft, Check, Eye, EyeOff, Sliders, Database, Shield, Palette, Terminal, Lock, Sun, RefreshCw, Copy, Download, ShieldAlert } from 'lucide-react'
import { useAuth, useTheme, useToast } from '../contexts'
import { useApi } from '../hooks/useApi'
import { BackupManager } from './users/BackupManager'

interface ToleranceConfig {
  id?: number | string
  die_type: 'ROUND' | 'FLAT'
  max_wear_mm: string | number
  warning_percentage: number | string
  critical_percentage: number | string
  [key: string]: unknown
}

export function SettingsPage() {
  const { request } = useApi()
  const { username, role, login, isAuthorizedForTools } = useAuth()
  const { theme, setTheme, canChangeTheme } = useTheme()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<'account' | 'appearance' | 'tolerances' | 'backups'>('account')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Backup Codes Authentication state
  const [isMfaEnabled, setIsMfaEnabled] = useState(false)
  const [backupCodesTotal, setBackupCodesTotal] = useState(0)
  const [backupCodesRemaining, setBackupCodesRemaining] = useState(0)
  const [isLoadingMfa, setIsLoadingMfa] = useState(false)
  const [generatedCodes, setGeneratedCodes] = useState<string[] | null>(null)
  const [generatePassword, setGeneratePassword] = useState('')
  const [disablePassword, setDisablePassword] = useState('')
  const [backupMode, setBackupMode] = useState<'idle' | 'generate_prompt' | 'view_codes' | 'disable'>('idle')
  const [mfaError, setMfaError] = useState('')
  const [mfaSuccess, setMfaSuccess] = useState('')
  const [copiedCodes, setCopiedCodes] = useState(false)

  const fetchUserProfile = useCallback(async () => {
    try {
      const data = await request('/api/v1/auth/me/')
      if (data) {
        setIsMfaEnabled(Boolean(data.is_mfa_enabled))
        setBackupCodesTotal(data.backup_codes_total || 0)
        setBackupCodesRemaining(data.backup_codes_remaining || 0)
      }
    } catch {
      // silent
    }
  }, [request])

  useEffect(() => {
    fetchUserProfile()
  }, [fetchUserProfile])

  const handleStartGenerateCodes = () => {
    setMfaError('')
    setMfaSuccess('')
    if (isMfaEnabled && backupCodesRemaining > 0) {
      setBackupMode('generate_prompt')
      setGeneratePassword('')
    } else {
      executeGenerateCodes('')
    }
  }

  const executeGenerateCodes = async (passwordToConfirm: string) => {
    setIsLoadingMfa(true)
    setMfaError('')
    setMfaSuccess('')
    try {
      const data = await request('/api/v1/auth/backup-codes/generate/', {
        method: 'POST',
        body: JSON.stringify({ password: passwordToConfirm || undefined })
      })
      setGeneratedCodes(data.codes || [])
      setBackupCodesTotal(data.count || (data.codes ? data.codes.length : 10))
      setBackupCodesRemaining(data.count || (data.codes ? data.codes.length : 10))
      setIsMfaEnabled(true)
      setBackupMode('view_codes')
      setGeneratePassword('')
      setMfaSuccess('New backup codes generated successfully.')
      showToast('10 Backup codes generated', 'success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate backup codes.'
      setMfaError(msg)
    } finally {
      setIsLoadingMfa(false)
    }
  }

  const handleCopyAllCodes = () => {
    if (!generatedCodes || generatedCodes.length === 0) return
    const textToCopy = [
      `DMS-O2 Security Backup Codes`,
      `Account: ${username}`,
      `Generated: ${new Date().toLocaleString()}`,
      `-----------------------------------------`,
      ...generatedCodes.map((c, i) => `${(i + 1).toString().padStart(2, ' ')}. ${c}`),
      `-----------------------------------------`,
      `Each code can only be used once for secondary sign-in.`
    ].join('\n')

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedCodes(true)
      showToast('All 10 backup codes copied to clipboard', 'info')
      setTimeout(() => setCopiedCodes(false), 2500)
    }).catch(() => {
      showToast('Failed to copy to clipboard', 'error')
    })
  }

  const handleDownloadCodes = () => {
    if (!generatedCodes || generatedCodes.length === 0) return
    const content = [
      `DMS-O2 Security Backup Codes`,
      `Account: ${username}`,
      `Generated: ${new Date().toISOString()}`,
      `-----------------------------------------`,
      ...generatedCodes.map((c, i) => `${(i + 1).toString().padStart(2, ' ')}. ${c}`),
      `-----------------------------------------`,
      `Store these codes safely in a secure password manager or vault.`,
      `Each code is single-use and will be invalidated once entered.`
    ].join('\n')

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `dms_o2_backup_codes_${username}_${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showToast('Backup codes file downloaded', 'success')
  }

  const handleConfirmDisable = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoadingMfa(true)
    setMfaError('')
    try {
      await request('/api/v1/auth/backup-codes/disable/', {
        method: 'POST',
        body: JSON.stringify({ password: disablePassword })
      })
      setIsMfaEnabled(false)
      setBackupCodesTotal(0)
      setBackupCodesRemaining(0)
      setGeneratedCodes(null)
      setBackupMode('idle')
      setDisablePassword('')
      setMfaSuccess('Backup codes authentication has been disabled.')
      showToast('Backup codes disabled', 'info')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to disable backup codes.'
      setMfaError(msg)
    } finally {
      setIsLoadingMfa(false)
    }
  }

  // Die Tolerances config state
  const [tolerances, setTolerances] = useState<ToleranceConfig[]>([])
  const [isLoadingTolerances, setIsLoadingTolerances] = useState(false)
  const [isSubmittingTolerances, setIsSubmittingTolerances] = useState(false)
  const [tolError, setTolError] = useState('')
  const [tolSuccess, setTolSuccess] = useState('')

  const fetchTolerances = useCallback(async () => {
    setIsLoadingTolerances(true)
    setTolError('')
    try {
      const data = await request('/api/v1/tolerances/')
      setTolerances(data.results || [])
    } catch (_err: unknown) {
      setTolError('Failed to load tolerance settings.')
    } finally {
      setIsLoadingTolerances(false)
    }
  }, [request])

  useEffect(() => {
    if (role === 'ADMIN' || role === 'ROOT') {
      fetchTolerances()
    }
  }, [role, fetchTolerances])

  useEffect(() => {
    if (!tolSuccess && !tolError) return
    const timer = setTimeout(() => {
      setTolSuccess('')
      setTolError('')
    }, 5000)
    return () => clearTimeout(timer)
  }, [tolSuccess, tolError])

  const getToleranceField = (type: 'ROUND' | 'FLAT', field: 'max_wear_mm' | 'warning_percentage' | 'critical_percentage') => {
    const existing = tolerances.find((t: ToleranceConfig) => t.die_type === type)
    if (existing) {
      return existing[field]
    }
    if (field === 'max_wear_mm') {
      return type === 'ROUND' ? '0.050' : '0.100'
    }
    if (field === 'warning_percentage') return 70
    return 90
  }

  const handleToleranceChange = (type: 'ROUND' | 'FLAT', field: string, value: unknown) => {
    setTolerances((prev: ToleranceConfig[]) => {
      const existingIdx = prev.findIndex((t: ToleranceConfig) => t.die_type === type)
      if (existingIdx !== -1) {
        const updated = [...prev]
        updated[existingIdx] = { ...updated[existingIdx], [field]: value }
        return updated
      } else {
        const newItem: ToleranceConfig = {
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
      const roundTol = tolerances.find((t: ToleranceConfig) => t.die_type === 'ROUND') || {
        die_type: 'ROUND',
        max_wear_mm: '0.050',
        warning_percentage: 70,
        critical_percentage: 90
      }
      const flatTol = tolerances.find((t: ToleranceConfig) => t.die_type === 'FLAT') || {
        die_type: 'FLAT',
        max_wear_mm: '0.100',
        warning_percentage: 70,
        critical_percentage: 90
      }

      const saveItem = async (item: ToleranceConfig) => {
        const payload = {
          die_type: item.die_type,
          max_wear_mm: item.max_wear_mm,
          warning_percentage: parseInt(String(item.warning_percentage), 10),
          critical_percentage: parseInt(String(item.critical_percentage), 10)
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save tolerance settings.'
      setTolError(msg)
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password.'
      setError(msg)
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

          <button
            onClick={() => setActiveTab('appearance')}
            role="tab"
            aria-selected={activeTab === 'appearance'}
            aria-controls="panel-appearance"
            className={`w-full text-left p-3 rounded-sm border flex items-center gap-3 transition cursor-pointer ${
              activeTab === 'appearance'
                ? 'bg-[#0f0f0f] border-blue-500/50 text-blue-400 font-bold'
                : 'bg-[#0f0f0f] border-[#1a1a1a] text-[#6b7280] hover:text-[#e4e4e4]'
            }`}
          >
            <Palette className="h-4 w-4 shrink-0" />
            <div>
              <span className="text-xs block font-bold uppercase">System Appearance</span>
              <span className="text-[10px] text-[#6b7280] block font-normal mt-0.5">Terminal, Classic & Light themes</span>
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

              {/* 02 Backup Codes Authentication Section */}
              <div className="pt-6 mt-6 border-t border-[#1a1a1a] space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="text-xs font-medium text-[#e4e4e4] uppercase tracking-[0.05em]">02 BACKUP CODES AUTHENTICATION</h2>
                    <span className="text-[#6b7280] text-xs block mt-0.5">
                      Secure sign-in with 10 single-use recovery codes. No mobile authenticator app required.
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isMfaEnabled && backupCodesRemaining > 0 ? (
                      <span className="flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-[10px] px-2.5 py-1 rounded-sm uppercase font-bold">
                        <Check className="h-3 w-3 text-emerald-400" />
                        Active ({backupCodesRemaining} / {backupCodesTotal} remaining)
                      </span>
                    ) : isMfaEnabled && backupCodesRemaining === 0 ? (
                      <span className="flex items-center gap-1.5 bg-amber-950/40 border border-amber-500/40 text-amber-300 text-[10px] px-2.5 py-1 rounded-sm uppercase font-bold">
                        <ShieldAlert className="h-3 w-3 text-amber-400" />
                        Exhausted (0 remaining)
                      </span>
                    ) : (
                      <span className="bg-[#141414] border border-[#2a2a2a] text-[#6b7280] text-[10px] px-2.5 py-1 rounded-sm uppercase font-bold">
                        Disabled
                      </span>
                    )}
                  </div>
                </div>

                {mfaError && (
                  <div className="bg-[#141414] border border-red-500/30 rounded-sm px-3 py-2 text-xs text-red-400 font-mono">
                    {mfaError}
                  </div>
                )}

                {mfaSuccess && (
                  <div className="bg-[#141414] border border-emerald-500/30 rounded-sm px-3 py-2 text-xs text-emerald-400 flex items-center gap-1.5 font-mono">
                    <Check className="h-3.5 w-3.5" />
                    {mfaSuccess}
                  </div>
                )}

                {backupMode === 'idle' && (
                  <div className="flex flex-wrap gap-2">
                    {!isMfaEnabled ? (
                      <button
                        type="button"
                        onClick={handleStartGenerateCodes}
                        disabled={isLoadingMfa}
                        className="bg-[#141414] hover:bg-[#1f1f1f] border border-emerald-500/50 text-emerald-400 hover:text-emerald-300 font-bold py-2 px-4 rounded-sm transition disabled:opacity-40 cursor-pointer uppercase tracking-wider text-xs font-mono flex items-center gap-2"
                      >
                        {isLoadingMfa ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                        <span>Generate 10 Backup Codes</span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleStartGenerateCodes}
                          disabled={isLoadingMfa}
                          className="bg-[#141414] hover:bg-[#1f1f1f] border border-emerald-500/50 text-emerald-400 hover:text-emerald-300 font-bold py-2 px-4 rounded-sm transition disabled:opacity-40 cursor-pointer uppercase tracking-wider text-xs font-mono flex items-center gap-2"
                        >
                          {isLoadingMfa ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                          <span>Generate New Backup Codes</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setBackupMode('disable'); setMfaError(''); }}
                          className="bg-[#141414] hover:bg-[#1f1f1f] border border-red-500/40 text-red-400 hover:text-red-300 font-bold py-2 px-4 rounded-sm transition cursor-pointer uppercase tracking-wider text-xs font-mono"
                        >
                          Disable Backup Codes
                        </button>
                      </>
                    )}
                  </div>
                )}

                {backupMode === 'generate_prompt' && (
                  <form onSubmit={(e) => { e.preventDefault(); executeGenerateCodes(generatePassword); }} className="space-y-4 bg-[#0a0a0a] border border-amber-500/30 p-4 rounded-sm">
                    <p className="text-xs text-amber-300 font-mono">
                      Regenerating backup codes will permanently invalidate your existing unused codes. Enter your password to continue:
                    </p>
                    <div>
                      <label className="block text-[10px] font-bold text-[#6b7280] uppercase tracking-wider mb-1 font-mono">
                        Account Password
                      </label>
                      <input
                        type="password"
                        required
                        autoFocus
                        value={generatePassword}
                        onChange={(e) => setGeneratePassword(e.target.value)}
                        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-amber-500 rounded-sm px-3 py-2 text-xs text-[#e4e4e4] focus:outline-none font-mono"
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isLoadingMfa || !generatePassword}
                        className="flex-1 bg-[#141414] hover:bg-[#1f1f1f] border border-emerald-500/60 text-emerald-400 py-2 rounded-sm text-xs font-bold font-mono uppercase transition disabled:opacity-40 cursor-pointer"
                      >
                        {isLoadingMfa ? 'Generating...' : 'Confirm & Generate 10 New Codes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setBackupMode('idle'); setGeneratePassword(''); }}
                        className="px-4 bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] text-[#9ca3af] py-2 rounded-sm text-xs font-mono transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {backupMode === 'view_codes' && generatedCodes && (
                  <div className="space-y-4 bg-[#0a0a0a] border border-emerald-500/40 p-4 rounded-sm">
                    <div className="flex items-start gap-2 text-xs text-amber-300 bg-[#141414] border border-amber-500/20 p-3 rounded-sm font-mono">
                      <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                      <div>
                        <span className="font-bold block uppercase text-[11px] text-amber-200">Save your backup codes now</span>
                        <span>These codes will not be shown again. Each code is single-use for secondary sign-in.</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-[#141414] p-3 rounded-sm border border-[#1a1a1a]">
                      {generatedCodes.map((code, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-[#0a0a0a] border border-[#2a2a2a] px-3 py-1.5 rounded-sm font-mono">
                          <span className="text-[10px] text-[#6b7280]">{(idx + 1).toString().padStart(2, '0')}.</span>
                          <span className="text-emerald-400 font-bold tracking-wider text-xs select-all">{code}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCopyAllCodes}
                        className="bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] hover:border-[#404040] text-[#e4e4e4] py-1.5 px-3 rounded-sm text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                      >
                        <Copy className="h-3.5 w-3.5 text-blue-400" />
                        <span>{copiedCodes ? 'Copied to Clipboard!' : 'Copy All Codes'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadCodes}
                        className="bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] hover:border-[#404040] text-[#e4e4e4] py-1.5 px-3 rounded-sm text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Download .TXT</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setBackupMode('idle'); setGeneratedCodes(null); }}
                        className="ml-auto bg-[#141414] hover:bg-[#1f1f1f] border border-emerald-500/60 text-emerald-400 py-1.5 px-4 rounded-sm text-xs font-mono font-bold uppercase transition cursor-pointer"
                      >
                        I Have Saved My Codes
                      </button>
                    </div>
                  </div>
                )}

                {backupMode === 'disable' && (
                  <form onSubmit={handleConfirmDisable} className="space-y-4 bg-[#0a0a0a] border border-red-500/30 p-4 rounded-sm">
                    <p className="text-xs text-red-400 font-mono">
                      Enter your account password to confirm disabling backup codes authentication:
                    </p>
                    <div>
                      <label className="block text-[10px] font-bold text-[#6b7280] uppercase tracking-wider mb-1 font-mono">
                        Account Password
                      </label>
                      <input
                        type="password"
                        required
                        autoFocus
                        value={disablePassword}
                        onChange={(e) => setDisablePassword(e.target.value)}
                        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-red-500 rounded-sm px-3 py-2 text-xs text-[#e4e4e4] focus:outline-none font-mono"
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isLoadingMfa || !disablePassword}
                        className="flex-1 bg-[#141414] hover:bg-[#1f1f1f] border border-red-500/60 text-red-400 py-2 rounded-sm text-xs font-bold font-mono uppercase transition disabled:opacity-40 cursor-pointer"
                      >
                        {isLoadingMfa ? 'Disabling...' : 'Confirm & Disable Backup Codes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setBackupMode('idle'); setDisablePassword(''); }}
                        className="px-4 bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] text-[#9ca3af] py-2 rounded-sm text-xs font-mono transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div id="panel-appearance" role="tabpanel" className="space-y-5 animate-fadeIn font-mono">
              <div className="pb-3 border-b border-[#1a1a1a] flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h2 className="text-xs font-medium text-[#e4e4e4] uppercase tracking-[0.05em]">01 SYSTEM THEME CONFIGURATION</h2>
                  <span className="text-[#6b7280] text-xs block mt-0.5">Choose the system-wide visual theme and typographic density for the manufacturing interface.</span>
                </div>
                {!canChangeTheme && (
                  <div className="flex items-center gap-1.5 bg-[#141414] border border-amber-500/30 text-amber-400 text-[10px] px-2.5 py-1 rounded-sm">
                    <Lock className="h-3 w-3" />
                    <span>ROOT PRIVILEGE REQUIRED</span>
                  </div>
                )}
              </div>

              {!canChangeTheme && (
                <div className="bg-[#141414] border border-[#2a2a2a] p-3 rounded-sm text-xs text-[#6b7280] flex items-center gap-2">
                  <Lock className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Theme configuration is system-wide and restricted to Root administrators. Contact your supervisor to adjust the active theme.</span>
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-3 md:grid-cols-2 gap-4 pt-1">
                {/* Theme Card 1: Terminal */}
                <div
                  onClick={() => {
                    if (canChangeTheme) {
                      setTheme('terminal')
                      showToast('System theme set to Dark Terminal (Bloomberg)', 'success')
                    }
                  }}
                  className={`border p-4 rounded-sm transition-all duration-150 relative ${
                    theme === 'terminal'
                      ? 'bg-[#141414] border-emerald-500/60 ring-1 ring-emerald-500/30'
                      : 'bg-[#0a0a0a] border-[#2a2a2a] hover:border-[#404040]'
                  } ${canChangeTheme ? 'cursor-pointer' : 'cursor-default opacity-85'}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm text-emerald-400">
                        <Terminal className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-[#e4e4e4] uppercase">Dark Terminal</h3>
                        <span className="text-[10px] text-[#6b7280]">Bloomberg Tape • Monospace</span>
                      </div>
                    </div>
                    {theme === 'terminal' && (
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] px-1.5 py-0.5 rounded-sm font-bold uppercase">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  {/* Live Preview Miniature */}
                  <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm p-2.5 mb-3 font-mono text-[10px] space-y-1.5">
                    <div className="flex justify-between items-center border-b border-[#1a1a1a] pb-1 text-[#6b7280]">
                      <span className="text-emerald-400 font-bold">01 TELEMETRY</span>
                      <span className="text-[#e4e4e4] tabular-nums">2.500 mm</span>
                    </div>
                    <div className="flex justify-between text-[#6b7280]">
                      <span>STATUS:</span>
                      <span className="text-emerald-400">AVAILABLE ▲</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#6b7280] leading-relaxed mb-3">
                    High-contrast #0a0a0a matte canvas, pure 1px flat dividers, uppercase telemetry, and monospace tabular numerical layout.
                  </p>

                  {canChangeTheme && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setTheme('terminal')
                        showToast('System theme set to Dark Terminal (Bloomberg)', 'success')
                      }}
                      disabled={theme === 'terminal'}
                      className={`w-full py-1.5 px-3 rounded-sm text-xs font-mono uppercase font-bold transition border cursor-pointer ${
                        theme === 'terminal'
                          ? 'bg-[#141414] border-emerald-500/40 text-emerald-400 cursor-default'
                          : 'bg-[#141414] hover:bg-[#1f1f1f] border-[#2a2a2a] text-[#e4e4e4]'
                      }`}
                    >
                      {theme === 'terminal' ? 'Applied (Current)' : 'Apply Terminal Theme'}
                    </button>
                  )}
                </div>

                {/* Theme Card 2: Classic Slate */}
                <div
                  onClick={() => {
                    if (canChangeTheme) {
                      setTheme('classic')
                      showToast('System theme set to Classic Slate (Industrial)', 'success')
                    }
                  }}
                  className={`border p-4 rounded-sm transition-all duration-150 relative ${
                    theme === 'classic'
                      ? 'bg-[#141414] border-blue-500/60 ring-1 ring-blue-500/30'
                      : 'bg-[#0a0a0a] border-[#2a2a2a] hover:border-[#404040]'
                  } ${canChangeTheme ? 'cursor-pointer' : 'cursor-default opacity-85'}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm text-blue-400">
                        <Palette className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-[#e4e4e4] uppercase">Classic Slate</h3>
                        <span className="text-[10px] text-[#6b7280]">Vibrant Midnight • Modern Sans-Serif</span>
                      </div>
                    </div>
                    {theme === 'classic' && (
                      <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[9px] px-1.5 py-0.5 rounded-sm font-bold uppercase">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  {/* Live Preview Miniature */}
                  <div className="bg-[#070B14] border border-[#17233D] rounded-md p-2.5 mb-3 font-sans text-[10px] space-y-1.5">
                    <div className="flex justify-between items-center border-b border-[#17233D] pb-1 text-[#8EA0BD]">
                      <span className="text-[#0090FF] font-bold">Die Telemetry</span>
                      <span className="text-[#F8FAFC]">2.500 mm</span>
                    </div>
                    <div className="flex justify-between text-[#8EA0BD]">
                      <span>Status:</span>
                      <span className="text-[#00E599] font-semibold">Available ▲</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#6b7280] leading-relaxed mb-3">
                    Deep midnight #070B14 canvas with #0C1322 cards, rounded geometry, vibrant status cards with glowing borders, and clean geometric sans-serif typography.
                  </p>

                  {canChangeTheme && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setTheme('classic')
                        showToast('System theme set to Classic Slate (Industrial)', 'success')
                      }}
                      disabled={theme === 'classic'}
                      className={`w-full py-1.5 px-3 rounded-sm text-xs font-mono uppercase font-bold transition border cursor-pointer ${
                        theme === 'classic'
                          ? 'bg-[#141414] border-blue-500/40 text-blue-400 cursor-default'
                          : 'bg-[#141414] hover:bg-[#1f1f1f] border-[#2a2a2a] text-[#e4e4e4]'
                      }`}
                    >
                      {theme === 'classic' ? 'Applied (Current)' : 'Apply Classic Theme'}
                    </button>
                  )}
                </div>

                {/* Theme Card 3: Precision Light */}
                <div
                  onClick={() => {
                    if (canChangeTheme) {
                      setTheme('light')
                      showToast('System theme set to Precision Light (Clean Slate)', 'success')
                    }
                  }}
                  className={`border p-4 rounded-sm transition-all duration-150 relative ${
                    theme === 'light'
                      ? 'bg-[#141414] border-amber-500/60 ring-1 ring-amber-500/30'
                      : 'bg-[#0a0a0a] border-[#2a2a2a] hover:border-[#404040]'
                  } ${canChangeTheme ? 'cursor-pointer' : 'cursor-default opacity-85'}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm text-amber-500">
                        <Sun className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-[#e4e4e4] uppercase">Precision Light</h3>
                        <span className="text-[10px] text-[#6b7280]">Clean Slate • High Contrast</span>
                      </div>
                    </div>
                    {theme === 'light' && (
                      <span className="bg-amber-500/10 text-amber-500 border border-amber-500/30 text-[9px] px-1.5 py-0.5 rounded-sm font-bold uppercase">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  {/* Live Preview Miniature */}
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-md p-2.5 mb-3 font-sans text-[10px] space-y-1.5 shadow-sm">
                    <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-1 text-[#475569]">
                      <span className="text-[#2563EB] font-bold">Die Telemetry</span>
                      <span className="text-[#0F172A] font-semibold">2.500 mm</span>
                    </div>
                    <div className="flex justify-between text-[#475569]">
                      <span>Status:</span>
                      <span className="text-[#059669] font-medium">Available</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#6b7280] leading-relaxed mb-3">
                    Ultra-clean #F8FAFC canvas with #FFFFFF surfaces, deep #0F172A typography, clean contrast, and crisp borders.
                  </p>

                  {canChangeTheme && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setTheme('light')
                        showToast('System theme set to Precision Light (Clean Slate)', 'success')
                      }}
                      disabled={theme === 'light'}
                      className={`w-full py-1.5 px-3 rounded-sm text-xs font-mono uppercase font-bold transition border cursor-pointer ${
                        theme === 'light'
                          ? 'bg-[#141414] border-amber-500/40 text-amber-500 cursor-default'
                          : 'bg-[#141414] hover:bg-[#1f1f1f] border-[#2a2a2a] text-[#e4e4e4]'
                      }`}
                    >
                      {theme === 'light' ? 'Applied (Current)' : 'Apply Light Theme'}
                    </button>
                  )}
                </div>
              </div>
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
