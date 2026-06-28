import React, { createContext, useContext, useState, useEffect } from 'react'

interface NotificationItem {
  id: string
  title: string
  message: string
  timestamp: string
  type: 'info' | 'success' | 'error'
  unread: boolean
}

interface NotificationContextValue {
  notifications: NotificationItem[]
  unreadCount: number
  addNotification: (title: string, message: string, type?: 'info' | 'success' | 'error') => void
  markAllAsRead: () => void
}

const NotificationContext = createContext<NotificationContextValue>(null as any)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem('dms_notifications')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) return parsed
      } catch (e) {
        console.error(e)
      }
    }
    return []
  })

  useEffect(() => {
    localStorage.setItem('dms_notifications', JSON.stringify(notifications))
  }, [notifications])

  const addNotification = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const item: NotificationItem = {
      id: Math.random().toString(36).substring(2, 9),
      title,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type,
      unread: true,
    }
    setNotifications(prev => [item, ...prev].slice(0, 20))
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })))
  }

  const unreadCount = notifications.filter(n => n.unread).length

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
