import React, { createContext, useContext, useState } from 'react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastContextValue {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
}

const ToastContext = createContext<ToastContextValue>(null as any)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-2xl border backdrop-blur-md transition-all duration-300 flex items-center gap-3 animate-fadeIn ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/20 text-emerald-400'
                : toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/20 text-rose-400'
                : 'bg-slate-900/90 border-slate-800/80 text-slate-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              toast.type === 'success'
                ? 'bg-emerald-400 dot-glow glow-emerald animate-pulse'
                : toast.type === 'error'
                ? 'bg-rose-400 dot-glow glow-rose animate-pulse'
                : 'bg-blue-400 dot-glow glow-blue animate-pulse'
            }`} />
            <span className="text-sm font-medium font-sans leading-snug">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
