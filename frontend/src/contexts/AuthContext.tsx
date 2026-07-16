import React, { createContext, useContext, useState, useEffect } from 'react'

let consecutiveRefreshFailures = 0

interface AuthContextValue {
  token: string | null
  refreshToken: string | null
  role: string | null
  username: string | null
  userId: number | null
  isAuthorizedForTools: boolean
  authorizedTools: string[]
  login: (newToken: string, refresh: string, userRole: string, userN: string, id?: number, authorizedForTools?: boolean, authTools?: string[]) => void
  logout: () => void
  setToken: React.Dispatch<React.SetStateAction<string | null>>
  setRefreshToken: React.Dispatch<React.SetStateAction<string | null>>
  handleRefreshFailure: () => number
  shouldBlockRefresh: () => boolean
  resetRefreshFailures: () => void
}

const AuthContext = createContext<AuthContextValue>(null as any)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('dms_token'))
  const [refreshToken, setRefreshToken] = useState<string | null>(() => localStorage.getItem('dms_refresh_token'))
  const [role, setRole] = useState<string | null>(() => localStorage.getItem('dms_role'))
  const [username, setUsername] = useState<string | null>(() => localStorage.getItem('dms_username'))
  const [userId, setUserId] = useState<number | null>(() => {
    const stored = localStorage.getItem('dms_user_id')
    return stored ? parseInt(stored, 10) : null
  })
  const [isAuthorizedForTools, setIsAuthorizedForTools] = useState<boolean>(() => {
    return localStorage.getItem('dms_authorized_for_tools') === 'true'
  })
  const [authorizedTools, setAuthorizedTools] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('dms_authorized_tools')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    if (token) {
      localStorage.setItem('dms_token', token)
    } else {
      localStorage.removeItem('dms_token')
    }
  }, [token])

  useEffect(() => {
    if (refreshToken) {
      localStorage.setItem('dms_refresh_token', refreshToken)
    } else {
      localStorage.removeItem('dms_refresh_token')
    }
  }, [refreshToken])

  useEffect(() => {
    if (role) {
      localStorage.setItem('dms_role', role)
    } else {
      localStorage.removeItem('dms_role')
    }
  }, [role])

  useEffect(() => {
    if (username) {
      localStorage.setItem('dms_username', username)
    } else {
      localStorage.removeItem('dms_username')
    }
  }, [username])

  useEffect(() => {
    if (userId !== null) {
      localStorage.setItem('dms_user_id', String(userId))
    } else {
      localStorage.removeItem('dms_user_id')
    }
  }, [userId])

  useEffect(() => {
    localStorage.setItem('dms_authorized_for_tools', String(isAuthorizedForTools))
  }, [isAuthorizedForTools])

  useEffect(() => {
    localStorage.setItem('dms_authorized_tools', JSON.stringify(authorizedTools))
  }, [authorizedTools])

  const login = (newToken: string, refresh: string, userRole: string, userN: string, id?: number, authorizedForTools?: boolean, authTools?: string[]) => {
    consecutiveRefreshFailures = 0
    setToken(newToken)
    setRefreshToken(refresh)
    setRole(userRole)
    setUsername(userN)
    if (id !== undefined) setUserId(id)
    if (authorizedForTools !== undefined) {
      setIsAuthorizedForTools(authorizedForTools)
    } else {
      setIsAuthorizedForTools(userRole === 'ROOT')
    }
    if (authTools !== undefined) {
      setAuthorizedTools(authTools)
    } else {
      setAuthorizedTools(userRole === 'ROOT' ? ['sizing-calculator', 'wire-drawing-calculator', 'die-wear', 'draw-optimizer'] : [])
    }
  }

  const logout = () => {
    consecutiveRefreshFailures = 0
    if (token) {
      fetch('/api/v1/auth/logout/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).catch(err => console.error('Failed to notify backend logout:', err))
    }
    setToken(null)
    setRefreshToken(null)
    setRole(null)
    setUsername(null)
    setUserId(null)
    setIsAuthorizedForTools(false)
    setAuthorizedTools([])
    localStorage.removeItem('dms_authorized_for_tools')
    localStorage.removeItem('dms_authorized_tools')
  }

  const handleRefreshFailure = () => {
    consecutiveRefreshFailures++
    if (consecutiveRefreshFailures >= 2) {
      logout()
      window.location.hash = '/login'
    }
    return consecutiveRefreshFailures
  }

  const shouldBlockRefresh = () => {
    return consecutiveRefreshFailures >= 2
  }

  const resetRefreshFailures = () => {
    consecutiveRefreshFailures = 0
  }

  return (
    <AuthContext.Provider value={{
      token,
      refreshToken,
      role,
      username,
      userId,
      isAuthorizedForTools: role === 'ROOT' || isAuthorizedForTools,
      authorizedTools: role === 'ROOT' ? ['sizing-calculator', 'wire-drawing-calculator', 'die-wear', 'draw-optimizer'] : authorizedTools,
      login,
      logout,
      setToken,
      setRefreshToken,
      handleRefreshFailure,
      shouldBlockRefresh,
      resetRefreshFailures
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

