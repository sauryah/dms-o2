import React, { createContext, useContext, useState, useEffect } from 'react'

let consecutiveRefreshFailures = 0

interface AuthContextValue {
  token: string | null
  refreshToken: string | null
  role: string | null
  username: string | null
  userId: number | null
  login: (newToken: string, refresh: string, userRole: string, userN: string, id?: number) => void
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

  const login = (newToken: string, refresh: string, userRole: string, userN: string, id?: number) => {
    consecutiveRefreshFailures = 0
    setToken(newToken)
    setRefreshToken(refresh)
    setRole(userRole)
    setUsername(userN)
    if (id !== undefined) setUserId(id)
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

