'use client'

import { useAuth } from '@/contexts/auth-context'
import { LogOut } from 'lucide-react'

export function LogoutButton() {
  const { signOut } = useAuth()

  return (
    <button
      onClick={() => signOut()}
      className="text-foreground hover:text-muted-foreground"
    >
      <LogOut className="h-6 w-6" />
    </button>
  )
}

