'use client'

import { useNetwork } from '@/contexts/network-status'
import { Button } from '@/components/ui/button'
import { Wifi, WifiOff, CloudOff, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export function NetworkStatus() {
  const { isOnline, isSyncing, pendingCount, syncNow } = useNetwork()

  if (isOnline && !pendingCount) return null

  return (
    <div className={cn(
      'fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-auto z-50',
      'flex items-center gap-2 p-3 rounded-lg shadow-lg',
      isOnline ? 'bg-blue-50 text-blue-900' : 'bg-yellow-50 text-yellow-900'
    )}>
      <div className="flex items-center gap-2 flex-1">
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4" />
            {pendingCount > 0 && (
              <span>
                {pendingCount} item{pendingCount !== 1 ? 's' : ''} pending sync
              </span>
            )}
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            <span>You're offline</span>
            {pendingCount > 0 && (
              <span className="ml-1">
                ({pendingCount} item{pendingCount !== 1 ? 's' : ''} pending)
              </span>
            )}
          </>
        )}
      </div>

      {isOnline && pendingCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => syncNow()}
          disabled={isSyncing}
          className="ml-2"
        >
          <RefreshCw className={cn(
            "h-4 w-4 mr-1",
            isSyncing && "animate-spin"
          )} />
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </Button>
      )}
    </div>
  )
} 