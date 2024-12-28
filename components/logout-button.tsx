'use client'

import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export function LogoutButton() {
  const { signOut } = useAuth()

  return (
    <Button
      onClick={() => signOut()}
      variant="ghost"
      className="text-white hover:text-gray-300"
    >
      <LogOut className="h-5 w-5 mr-2" />
      Logout
    </Button>
  )
}

