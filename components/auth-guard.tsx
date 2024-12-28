'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    console.log('AuthGuard useEffect - Loading:', loading, 'User:', user?.email)
    if (!loading && !user) {
      console.log('User not authenticated, redirecting to login')
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    console.log('AuthGuard - Loading state')
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    console.log('AuthGuard - No user, returning null')
    return null
  }

  console.log('AuthGuard - Rendering children')
  return <>{children}</>
}

