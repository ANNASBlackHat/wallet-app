'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './auth-context'
import { syncPendingExpenses, getPendingExpenses } from '@/lib/expense-helpers'
import { useToast } from '@/components/ui/use-toast'

interface NetworkContextType {
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  lastSyncAttempt: Date | null
  syncNow: () => Promise<void>
}

const NetworkContext = createContext<NetworkContextType>({
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  lastSyncAttempt: null,
  syncNow: async () => {}
})

export const useNetwork = () => useContext(NetworkContext)

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [lastSyncAttempt, setLastSyncAttempt] = useState<Date | null>(null)
  const { userId } = useAuth()
  const { toast } = useToast()

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    if (!userId) return
    try {
      const pending = await getPendingExpenses(userId)
      setPendingCount(pending.length)
    } catch (error) {
      console.error('Error fetching pending count:', error)
    }
  }, [userId])

  // Sync function
  const syncNow = useCallback(async () => {
    if (!userId || !isOnline || isSyncing) return
    
    setIsSyncing(true)
    setLastSyncAttempt(new Date())
    
    try {
      await syncPendingExpenses(userId)
      await updatePendingCount()
      
      toast({
        title: 'Sync Complete',
        description: 'All pending expenses have been synchronized'
      })
    } catch (error) {
      console.error('Sync error:', error)
      toast({
        title: 'Sync Failed',
        description: 'Failed to sync some expenses. Will retry automatically when online.',
        variant: 'destructive'
      })
    } finally {
      setIsSyncing(false)
    }
  }, [userId, isOnline, isSyncing, toast, updatePendingCount])

  // Network status listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      syncNow() // Auto-sync when coming online
    }
    
    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial pending count
    updatePendingCount()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [syncNow, updatePendingCount])

  // Auto-sync every 5 minutes if there are pending items
  useEffect(() => {
    if (!pendingCount || !isOnline) return

    const interval = setInterval(syncNow, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [pendingCount, isOnline, syncNow])

  return (
    <NetworkContext.Provider value={{
      isOnline,
      isSyncing,
      pendingCount,
      lastSyncAttempt,
      syncNow
    }}>
      {children}
    </NetworkContext.Provider>
  )
} 