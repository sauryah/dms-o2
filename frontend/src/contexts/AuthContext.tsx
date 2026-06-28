import React, { createContext, useContext, useState, useEffect } from 'react'

interface AuthContextValue {
  token: string | null
  role: string | null
  username: string | null
  userId: number | null
  login: (newToken: string, userRole: string, userN: string, id?: number) => void
  logout: () => void
  setToken: React.Dispatch<React.SetStateAction<string | null>>
}

const AuthContext = createContext<AuthContextValue>(null as any)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('dms_token'))
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

  const login = (newToken: string, userRole: string, userN: string, id?: number) => {
    setToken(newToken)
    setRole(userRole)
    setUsername(userN)
    if (id !== undefined) setUserId(id)
  }

  const logout = () => {
    setToken(null)
    setRole(null)
    setUsername(null)
    setUserId(null)
  }

  return (
    <AuthContext.Provider value={{ token, role, username, userId, login, logout, setToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
