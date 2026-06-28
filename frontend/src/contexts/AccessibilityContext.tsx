import React, { createContext, useContext, useState } from 'react'

const AccessibilityContext = createContext<(msg: string) => void>(() => {})

export function AnnouncementProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState('')
  const announce = (text: string) => {
    setMsg(text)
    setTimeout(() => setMsg(''), 1000)
  }
  return (
    <AccessibilityContext.Provider value={announce}>
      {children}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {msg}
      </div>
    </AccessibilityContext.Provider>
  )
}

export const useAnnouncer = () => useContext(AccessibilityContext)
