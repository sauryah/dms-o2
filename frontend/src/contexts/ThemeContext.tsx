import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

export type AppTheme = 'terminal' | 'classic' | 'light'

interface ThemeContextValue {
  theme: AppTheme
  setTheme: (newTheme: AppTheme) => boolean
  toggleTheme: () => boolean
  canChangeTheme: boolean
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'terminal',
  setTheme: () => false,
  toggleTheme: () => false,
  canChangeTheme: false,
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { role } = useAuth()
  const canChangeTheme = role === 'ROOT'

  const [theme, setInternalTheme] = useState<AppTheme>(() => {
    const saved = localStorage.getItem('dms_app_theme')
    return (saved === 'classic' || saved === 'terminal' || saved === 'light') ? (saved as AppTheme) : 'terminal'
  })

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.classList.remove('theme-terminal', 'theme-classic', 'theme-light')
    document.documentElement.classList.add(`theme-${theme}`)
    localStorage.setItem('dms_app_theme', theme)
  }, [theme])

  // Synchronize across browser tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'dms_app_theme' && (e.newValue === 'classic' || e.newValue === 'terminal' || e.newValue === 'light')) {
        setInternalTheme(e.newValue as AppTheme)
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const setTheme = (newTheme: AppTheme): boolean => {
    if (!canChangeTheme) {
      return false
    }
    setInternalTheme(newTheme)
    return true
  }

  const toggleTheme = (): boolean => {
    if (!canChangeTheme) {
      return false
    }
    setInternalTheme(prev => {
      if (prev === 'terminal') return 'classic'
      if (prev === 'classic') return 'light'
      return 'terminal'
    })
    return true
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, canChangeTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
