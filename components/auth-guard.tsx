'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  console.log('🛡️ AuthGuard - Render State:', { 
    isAuthenticated: !!user, 
    loading,
    userEmail: user?.email 
  })

  useEffect(() => {
    console.log('🔒 AuthGuard - Effect Running:', { 
      isAuthenticated: !!user, 
      loading,
      userEmail: user?.email 
    })
    
    if (!loading && !user) {
      console.log('🚫 AuthGuard - Unauthorized, redirecting to login')
      router.replace('/login')
      return
    }

    if (!loading && user) {
      console.log('✅ AuthGuard - User authenticated:', user.email)
    }
  }, [user, loading, router])

  // Immediately redirect if not loading and no user
  if (!loading && !user) {
    console.log('🚫 AuthGuard - Immediate redirect triggered')
    router.replace('/login')
    return null
  }

  // Show loading state while checking auth
  if (loading) {
    console.log('⌛ AuthGuard - Showing loading state')
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Extra safety check - don't render if not authenticated
  if (!user) {
    console.log('🚫 AuthGuard - No user, preventing render')
    return null
  }

  console.log('✅ AuthGuard - Rendering protected content')
  return <>{children}</>
}

