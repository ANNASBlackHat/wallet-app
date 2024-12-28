'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

export function InstallPWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt')
        } else {
          console.log('User dismissed the install prompt')
        }
        setDeferredPrompt(null)
        setShowInstallPrompt(false)
      })
    }
  }

  if (!showInstallPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground p-4 rounded-lg shadow-lg">
      <p className="mb-2">Install Wallet AI for a better experience!</p>
      <Button onClick={handleInstallClick}>Install</Button>
    </div>
  )
}

